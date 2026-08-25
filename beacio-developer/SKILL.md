---
name: beacio-developer
description: Guides extension development for beacio — the iOS Safari Web Extension that provides Web Bluetooth API support. Trigger when working on Swift CoreBluetooth code, BLE Safari extension internals, companion-app IPC relay, background sync, beacon scanning, Live Activities, simulator verification, Xcode MCP tools, or any task touching the beacio monorepo's native Swift or TypeScript extension shell.
license: MIT
metadata:
  author: Copyright 2026 wklm
  version: '1.0.0'
---

# beacio Developer Skill

## Rules (always follow these)

1. **Read AGENTS.md first** — every task begins by reading `AGENTS.md` at the repo root for project conventions, architecture overview, and task workflow phases (Orient → Plan → Implement → Verify → Report).
2. **Always build after changes** — run `BuildProject` + `GetBuildLog` via Xcode MCP, or `xcodebuild … 2>&1 | xcsift -w` and verify `"errors": 0`.
3. **Always verify on simulator** — after building, run the full verification loop: install → launch → screenshot → inspect → interact.
4. **Never expose CoreBluetooth to web context** — all BLE state lives in native Swift. JS classes are thin message-forwarding proxies. → [references/swift-best-practices.md](references/swift-best-practices.md)
5. **Uppercase UUID strings** for all handler/cache keys — mismatched case causes silent lookup failures. → [references/swift-best-practices.md](references/swift-best-practices.md)

## Architecture

### IPC Architecture
- **ipc-architecture.md** — dual-channel async protocol (App Group UserDefaults + Darwin notifications), command/response lifecycle, event delivery, mode switching, concurrency model, backpressure, failure modes. → Full source: `docs/IPC_ARCHITECTURE.md`

### Message Flow
- **message-flow.md** — the 4-layer JS-to-native pipeline: Web Page (injected.js) → Content Script (content.js) → Background (background.js) → Native Swift (SafariWebExtensionHandler). Thin JS shell + fat native pattern. → Full source: `AGENTS.md`

### Extension Core
- **extension-core.md** — native-side BLE engine: BLEManager, BLEPeripheralDelegate, ContinuationStore, TSProtocolHandler, MessageHandlerRegistry, UUIDResolver, EventQueue, RequestContext. → Full source: `AGENTS.md`

### Companion App
- **companion-app.md** — SwiftUI app shell, onboarding, dashboard. BeacioApp, AppDelegate, BLEIPCServer, IPC routing. → Full source: `AGENTS.md`

### Language Best Practices
- **swift-best-practices.md** — Swift MUST/MUST NOT rules, AIDEV-NOTE annotations, code readability principles. → Full source: `AGENTS.md`
- **ts-best-practices.md** — TypeScript thin shell proxy pattern, strict typing, message forwarding. → Full source: `AGENTS.md`

### Verification & Tooling
- **verification-loop.md** — 5-phase workflow: Build → Install → Launch → Screenshot → Inspect → Interact. → Full source: `COMMANDS.md`
- **simulator-tools.md** — xcsift, axe, magick usage, coordinate system, crash detection. → Full source: `COMMANDS.md`
- **xcode-mcp-tools.md** — catalog of 17 Xcode MCP tools with usage rules. → Full source: `AGENTS.md`

### Background Sync
- **background-sync.md** — ConnectionMonitorManager, BLENotificationBridge, BeaconScanManager, BackgroundIntentStore, OriginValidation, quotas. → Full source: `docs/IPC_ARCHITECTURE.md`

### Security Model
- **security-model.md** — seven security boundaries: origin validation, tab isolation, URL hashing, no wildcard postMessage, Darwin notification trust, IPCFileLock, circuit-breaker. → Full source: `docs/IPC_ARCHITECTURE.md`

### Live Activities
- **live-activities.md** — ActivityKit integration, LiveActivityManager, LiveActivityStateEngine, Dynamic Island views. → Full source: `AGENTS.md`

### AIDEV-NOTE Annotations
- **aidev-note-policy.md** — four annotation tiers: general, SPEC-AMBIGUITY, SECURITY, PERF. → Full source: `AGENTS.md`
