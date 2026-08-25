# Extension Core

The native-side BLE engine lives in `Shared (Extension)/`. Key files:

| File | Purpose |
|------|---------|
| `SafariWebExtensionHandler.swift` | Main native handler — entry point for all JS messages |
| `SafariWebExtensionHandler+Errors.swift` | DOMException mapping, error categorization, retry guidance |
| `BLEManager.swift` | Singleton `CBCentralManager` wrapper (async/await), connection state persistence via App Group UserDefaults |
| `BLEPeripheralDelegate.swift` | Per-peripheral delegate, concurrent continuation fan-out for GATT operations |
| `ContinuationStore.swift` | Array-based continuation containers reused by async BLE operations |
| `TSProtocolHandler.swift` | TypeScript protocol message handler, routes all message types |
| `UUIDResolver.swift` | UUID canonicalization (name↔UUID), Bluetooth SIG tables, filter validation |
| `EventQueue.swift` | Bounded thread-safe event queue (1000 events max) with 4-level priority (low → critical) |
| `RequestContext.swift` | Request/response context per message |

## EventQueue Priority System

Events are dispatched to the web context in priority order, not insertion order:

| Priority | Event Types |
|----------|------------|
| **critical (3)** | `CONNECTION_STATE_CHANGED`, `GATT_SERVER_DISCONNECTED` |
| **high (2)** | `CHARACTERISTIC_VALUE_CHANGED`, `NOTIFICATION_RECEIVED`, read/write responses |
| **normal (1)** | Most events (discovery, service enumeration, scan results) |
| **low (0)** | `ADVERTISEMENT_RECEIVED` (non-blocking, highest volume) |

**Drain behavior**: Critical events drain before high, high before normal, normal before low (single-pass bucket sort at `EventQueue.swift:325-335`). **Overflow eviction**: when full (1000 events), the oldest lowest-priority event is evicted first (`EventQueue.swift:173-195`).

`Shared (Extension)/` holds all extension logic. `iOS (Extension)/` is a thin target entry point (entitlements + Info.plist only).

→ Full source: `AGENTS.md`
