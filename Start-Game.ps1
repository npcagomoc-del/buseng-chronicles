$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskUrl = 'http://127.0.0.1:4174'
$runtimeNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$taskNode = if (Test-Path -LiteralPath $runtimeNode) { $runtimeNode } else { (Get-Command node -ErrorAction Stop).Source }
$taskVite = Join-Path $taskRoot 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist\index.html'))) { throw 'Run pnpm build first.' }
$alreadyRunning = $false
try {
    $response = Invoke-WebRequest -Uri $taskUrl -UseBasicParsing -TimeoutSec 2
    $alreadyRunning = $response.Content -match 'Buseng Chronicles'
    if (-not $alreadyRunning) { throw 'Port 4174 belongs to another application.' }
} catch {
    if ($_.Exception.Message -eq 'Port 4174 belongs to another application.') { throw }
}
if (-not $alreadyRunning) {
    $taskLogs = Join-Path $taskRoot '.tools'
    New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
    $taskArgs = @(('"' + $taskVite + '"'), 'preview', '--host', '0.0.0.0', '--port', '4174', '--strictPort')
    $taskProcess = Start-Process -FilePath $taskNode -ArgumentList $taskArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskLogs 'game-server.log') -RedirectStandardError (Join-Path $taskLogs 'game-server-error.log')
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
        Start-Sleep -Milliseconds 400
        try {
            $response = Invoke-WebRequest -Uri $taskUrl -UseBasicParsing -TimeoutSec 1
            if ($response.Content -match 'Buseng Chronicles') { $alreadyRunning = $true; break }
        } catch {}
        if ($taskProcess.HasExited) { break }
    }
    if (-not $alreadyRunning) { throw 'Preview did not start. Check .tools\game-server-error.log.' }
}
Start-Process $taskUrl
Write-Host "PC: $taskUrl"
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -eq 'Dhcp' } | ForEach-Object { Write-Host ('Phone on same Wi-Fi: http://' + $_.IPAddress + ':4174') }
Write-Host 'The preview keeps running after this launcher closes.'
