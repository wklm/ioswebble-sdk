# Changelog

All notable changes to `@ios-web-bluetooth/core` will be documented in this file.

## Unreleased

- Pre-release docs and packaging polish for the `2.0.0-beta` line.
- Documented the `import '@ios-web-bluetooth/core/auto'` setup path in the README so installation guidance does not depend on a noisy `postinstall` message.
- Added dedicated power-management guidance covering user-gesture requirements, notification async iterator usage, queue sizing, and conservative cleanup patterns for Safari iOS BLE sessions.
- Prepared lightweight CI bundle-size tracking to watch for accidental package growth without changing runtime behavior.
