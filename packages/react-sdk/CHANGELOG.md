# Changelog

All notable changes to `@beacio/react` will be documented in this file.

## 1.2.0 — 2026-07-28

- First stable release aligned with `@beacio/core@1.2.0` (`peerDependencies` now `^1.2.0`).
- No breaking changes to the hook/component API relative to 1.0.0; internal maintenance and packaging alignment only.

## 2.0.0-beta.2 — 2026-06-03

- Pre-release docs and packaging polish for the `2.0.0-beta` line.
- Clarified installation and Safari iOS setup so React consumers add `@beacio/core/auto` explicitly instead of relying on implicit install-time messaging.
- Expanded guidance for user-gesture-safe `requestDevice()` calls and cleanup of live notification subscriptions in React component lifecycles.
- Prepared lightweight CI bundle-size tracking shared with the package workspace to catch accidental distribution growth early.
