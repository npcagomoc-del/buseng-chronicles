$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) { $taskNode = (Get-Command node -ErrorAction Stop).Source }
$taskSdk = $env:ANDROID_HOME
if ([string]::IsNullOrWhiteSpace($taskSdk)) { $taskSdk = Join-Path $taskRoot '.tools/android-sdk' }
$taskJava = $env:JAVA_HOME
if ([string]::IsNullOrWhiteSpace($taskJava)) {
    $taskJavaFolder = Get-ChildItem -LiteralPath (Join-Path $taskRoot '.tools/jdk21') -Directory | Select-Object -First 1
    if ($null -eq $taskJavaFolder) { throw 'Install JDK 21 and set JAVA_HOME first.' }
    $taskJava = $taskJavaFolder.FullName
}
if (-not (Test-Path -LiteralPath (Join-Path $taskJava 'bin/java.exe'))) { throw 'JAVA_HOME must point to JDK 21 or newer.' }
if (-not (Test-Path -LiteralPath (Join-Path $taskSdk 'platforms/android-36/android.jar'))) { throw 'Install Android SDK platform 36 and build-tools 36.0.0 first.' }
$env:JAVA_HOME = $taskJava
$env:ANDROID_HOME = $taskSdk
if ([string]::IsNullOrWhiteSpace($env:GRADLE_USER_HOME)) {
    $env:GRADLE_USER_HOME = Join-Path $env:LOCALAPPDATA 'BusengGradle'
}
$taskJavaOptions = $env:JAVA_TOOL_OPTIONS
$taskSocketTemp = Join-Path $taskRoot '.tools/gradle/tmp'
New-Item -ItemType Directory -Path $taskSocketTemp -Force | Out-Null
$env:JAVA_TOOL_OPTIONS = ($taskJavaOptions + ' -Djdk.net.unixdomain.tmpdir="' + $taskSocketTemp + '"').Trim()
$taskSdkProperty = 'sdk.dir=' + $taskSdk.Replace([char]92, [char]47) + [Environment]::NewLine
[IO.File]::WriteAllText((Join-Path $taskRoot 'android/local.properties'), $taskSdkProperty)
Push-Location -LiteralPath $taskRoot
try {
    & $taskNode (Join-Path $taskRoot 'node_modules/typescript/bin/tsc') --noEmit
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed.' }
    & $taskNode (Join-Path $taskRoot 'node_modules/vite/bin/vite.js') build
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    & $taskNode (Join-Path $taskRoot 'node_modules/@capacitor/cli/bin/capacitor') sync android
    if ($LASTEXITCODE -ne 0) { throw 'Android asset sync failed.' }
    Push-Location -LiteralPath (Join-Path $taskRoot 'android')
    try {
        & (Join-Path $taskRoot 'android/gradlew.bat') --no-daemon --no-watch-fs --max-workers=1 '-Dorg.gradle.internal.instrumentation.agent=false' assembleDebug --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Android compilation failed.' }
    } finally { Pop-Location }
    $taskOutput = Join-Path $taskRoot 'releases'
    New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
    $taskVersion = (Get-Content -LiteralPath (Join-Path $taskRoot 'package.json') -Raw | ConvertFrom-Json).version
    $taskApk = Join-Path $taskOutput "Buseng-Chronicles-v$taskVersion-preview.apk"
    Copy-Item -LiteralPath (Join-Path $taskRoot 'android/app/build/outputs/apk/debug/app-debug.apk') -Destination $taskApk -Force
    (Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash.ToLower() | Set-Content -LiteralPath "$taskApk.sha256" -Encoding ascii
    Write-Output "Installable preview APK: $taskApk"
} finally {
    Pop-Location
    $env:JAVA_TOOL_OPTIONS = $taskJavaOptions
}
