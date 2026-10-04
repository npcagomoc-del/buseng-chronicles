# Install, run and build

## Requirements

- Git; Node.js 24 or newer; pnpm 12.9.1 (install with `npm install --global pnpm@12.9.1`); Bun for `pnpm test`.
- For Android builds: JDK 21, Android Studio/SDK platform 36 and build-tools 36.0.0. Accept the Android SDK licenses.
- The lockfile pins the dependency graph. Use `pnpm install --frozen-lockfile`, not a blanket upgrade.

Official installers and instructions: [Node.js](https://nodejs.org/en/download), [pnpm](https://pnpm.io/installation), and [Bun](https://bun.sh/docs/installation). The clean-source checks used Node 24.19.0, pnpm 12.9.1 and Bun 1.3.14.

## Web / PC (Windows, macOS or Linux)

```sh
git clone https://github.com/npcagomoc-del/buseng-chronicles.git
cd buseng-chronicles
pnpm install --frozen-lockfile
pnpm dev
```

Open Vite's printed URL. Stop the foreground server with Ctrl+C. Development/testing is local; a GitHub account is only needed for publishing or contributions.

```sh
pnpm check
pnpm test
pnpm build
pnpm preview --host 127.0.0.1 --port 4174 --strictPort
```

For a phone browser on the same Wi-Fi, run the preview with `--host 0.0.0.0` and use your PC's LAN address. Allow firewall access only if you choose to expose it. The Android APK needs neither the PC nor Wi-Fi after installation.

## Android / Windows

Set JAVA_HOME to JDK 21 and ANDROID_HOME to your Android SDK directory. Open a new terminal after setting them. Then run `Build-Android.cmd` (or `powershell -NoProfile -ExecutionPolicy Bypass -File Build-Android.ps1`). The script checks/types/builds the web game, syncs Capacitor, runs Gradle assembleDebug and writes an APK/hash to releases. It creates android/local.properties locally; never commit that file.

Without JAVA_HOME/ANDROID_HOME, the helper looks for optional project-local JDK/SDK tools. Those tools are intentionally not in this repository. Install/set the requirements on a fresh clone. The helper also uses a local temporary directory for Gradle's Windows sockets and restores JAVA_TOOL_OPTIONS afterward.

## Android / macOS or Linux

Set JAVA_HOME and ANDROID_HOME for your machine. Set the SDK location in an ignored android/local.properties file if Gradle needs it.

```sh
pnpm build
pnpm exec cap sync android
cd android
chmod +x gradlew
./gradlew assembleDebug
```

The output is android/app/build/outputs/apk/debug/app-debug.apk. To install on your connected test device: `adb install -r app/build/outputs/apk/debug/app-debug.apk` from android/. Do not clear app data or uninstall unless you intentionally want to lose the locally saved score/preferences.

## Release identity

The public Version 1 asset is the unchanged reviewed 0.1.9 debug APK. A fresh clone uses your own machine's debug signing certificate, so it may not install over NPC's APK. Use a separate test device/profile or deliberately uninstall with awareness of data loss. Do not request or commit NPC's private signing key. For a production release, create your own signing setup and plan versionCode upgrades.

No production store signing, Play Store upload or monetization setup is included.
