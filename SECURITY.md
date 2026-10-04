# Security and privacy

This is a client-side game with local score/preferences. There is no required account, backend database, advertising SDK or in-game telemetry. Release counters use GitHub's aggregate asset-download count; they do not identify players or prove installs.

Never commit environment files, API/OAuth tokens, private keys, signing keystores, cloud credentials, device/account details, raw logs or machine-specific SDK paths. The root/Android ignore rules exclude these, but exclusions alone are not a secret scan. Review the actual staged files and run a secret scanner before pushing. Do not add secrets to issue screenshots or pull requests.

The published APK is debug-signed and includes only the compiled app, assets and public certificate; private signing keys are not distributed. Do not use its debug identity for a production store release. Contributions must not disable platform security checks or require a creator's signing key.

If you discover an exposed secret, do not post the value publicly. Contact the repository owner through their GitHub profile, rotate/revoke the affected credential, and coordinate removal. For ordinary bugs, use Issues without sensitive data. No guaranteed response SLA or bug bounty is offered.

Dependencies and the lockfile are public; review upgrades. Download APKs from this repository's official release and compare its checksum. The app declares Internet permission; packaged gameplay works offline. This is not a security guarantee for modified forks.
