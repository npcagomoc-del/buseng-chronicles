# Copy, improve and contribute

Fork this repository on GitHub, clone your fork, then follow [SETUP](docs/SETUP.md). Create a branch, make one focused improvement, run checks/tests/build, and open a pull request with screenshots or a short clip for visual changes. A source ZIP also works if you do not need Git history.

If you publish a fork, update its release links and download badge to your own owner/repository/asset names. Use your own signing identity and release checksums. Do not present a modified APK as NPC's unchanged Version 1.

## Where to work

- src/model.ts and src/physics.ts: one-button gameplay, trajectory and catches.
- src/buseng-behavior.ts: reachable movement and score progression.
- src/renderer.ts and actor/effect modules: sprites, gestures, gaze, rice/fire/teleport/slap drawing.
- src/sound.ts and audio modules: volume routing, voices, music and cancellation.
- src/settings.ts and src/storage.ts: controls and local preferences.
- public/assets: bundled art, audio, font and licenses. Check ASSETS before redistributing assets.
- tests: behavior tests plus tests/visual-harness.html for deterministic visual states.
- android: Capacitor native wrapper; sync after web build.

## Preserve the game

Keep charge/release easy to learn, the actual plate visible, the aiming arc accurate, the third-perfect/fourth-fire ordering, fair frozen plate during flight, score progression and instant retry. Preserve selected character, volume/motion preferences and existing best score. Support tall-phone portrait, desktop and landscape without stretching sprites or changing physics unintentionally.

For motion changes, inspect whole sequences (approach/contact/recovery), both characters, left/right target positions, full/reduced motion, pause and retry. Browser fixture states are controlled render evidence; do not present them as earned Android gameplay. Physical device/audio checks must be stated separately.

Run `pnpm check`, `pnpm test` and `pnpm build`. Add meaningful regression coverage for behavior changes; do not write tests that only pin prose. Keep strict types and focused modules. Explain what changed, why and what you actually tested.

## Respect and privacy

Keep humor about the rice/game situation. Do not make disability or protected characteristics the punchline. Respect original creators, the reference people, Mang Inasal and other brands; no endorsement is implied. Code is MIT; meme media/likeness/sounds are not broadly licensed by this repository. Prefer original/replacement assets you have permission to share.

Do not add ads, paid character unlocks, tracking, secrets or destructive reset/migration behavior without discussing it. Never commit .env, tokens, keys, signing files, SDK paths, raw captures/logs or local credentials. See SECURITY.md. Contributions of code are under this project's MIT terms; disclose any separate asset license.

If using AI tools, start with [the contributor prompt](docs/AI-CONTRIBUTOR-PROMPT.md) and verify their changes yourself.
