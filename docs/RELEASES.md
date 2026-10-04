# Releases and package details

| Release | Download | Notes |
|---|---|---|
| [Version 1 / v1.0.0](https://github.com/npcagomoc-del/buseng-chronicles/releases/tag/v1.0.0) | [Android APK](https://github.com/npcagomoc-del/buseng-chronicles/releases/download/v1.0.0/Buseng-Chronicles-v1.0.0.apk) | First public release; reviewed 0.1.9 APK renamed unchanged |

## Android package

| Field | Value |
|---|---|
| File | Buseng-Chronicles-v1.0.0.apk |
| Size | 10,121,147 bytes (about 9.65 MiB) |
| Application ID | com.busengchronicles.game |
| App name | Buseng Chronicles |
| Internal versionName / versionCode | 0.1.9 / 9 |
| Minimum Android | 7.0 / API 24 |
| Target/compile SDK | 36 |
| Signing | Android debug certificate; same identity as NPC's prior preview |
| SHA-256 | e5d5b27178a23871f2a5c764fefd1a61659c83ea85635242fa1ad5444c7e2772 |
| Offline | Gameplay art, audio and fonts are bundled |
| Declared permission | android.permission.INTERNET |
| User data | Local best score, character and sound/motion preferences |

The APK and checksum are GitHub **Release assets**. GitHub's separate Packages tab is for registries such as npm/container packages; this game does not require a registry package to install. Source is available through Clone/Download ZIP and the release's automatic source archives.

## Source/build package

The package.json name is buseng-chronicles and its internal version remains 0.1.9 to match the reviewed APK. It is marked private to avoid accidental npm publication. The code is MIT licensed; asset/font/likeness rights are separate (ASSETS.md). TypeScript/Vite provide the browser game, Capacitor provides the Android wrapper, pnpm locks dependencies, and Bun runs the tests. See SETUP.md for builds and AI-CONTRIBUTOR-PROMPT.md for an installation prompt.

## Download count

The README badge counts this APK's release downloads. Repeat downloads and automated verification downloads count too; it does not count unique people, installs or button clicks. Read the public release API's APK asset download_count for the current value. Badge caching can delay updates.

## Checks and remaining playtests

Version 1 passed 73 behavior tests, type/build/style checks, package-asset parity and independent visual/integrity review. Android emulator checks covered a real scored throw, pause/resume, defeat/retry, settings persistence and confirmed score reset. Physical Huawei performance/audio, older Android behavior and an earned native high-perfect streak remain playtest items. This is a public debug-signed download, not a Play Store release.
