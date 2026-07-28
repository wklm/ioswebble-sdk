# IPC Architecture

beacio uses a dual-channel async protocol between the Safari Web Extension process and the companion app process.

**Data channel**: App Group UserDefaults (`group.com.ioswebble.app`) — JSON-encoded commands, responses, and events.
**Signaling channel**: Darwin notifications (`CFNotificationCenter`) — wake-up signals only, no payload.

## Command/Response Lifecycle

Commands flow: serialize → register continuation → write to UserDefaults → signal via Darwin → pick up by companion → process FIFO per tab → respond → deliver → ack.

Timeouts: 15s standard, 10s peripheral operations.

## Mode Switching

Two runtime modes:
- `.standalone` — extension handles BLE directly (default)
- `.ipcRelay` — extension forwards to companion app

Switch triggers: startup notification, liveness polling (15s check / 45s threshold), circuit-breaker (3 consecutive timeouts), shutdown notification.

## Event Delivery

Events are keyed by tab (`ipc.evt.<tabId>`) or URL (`ipc.evt.url.<hash>`). Batching with per-type caps and 2000-event global max (`IPCEventBatch.maxEvents`).

## Concurrency Model

IPCFileLock (POSIX `flock()`) protects UserDefaults I/O. Mutex protects in-memory state. Sendable conformance on all shared types.

## Failure Modes

12 documented failure modes including: app killed, slow/unresponsive, extension restart, Darwin coalesced, UserDefaults bloat, IPC backpressure, dead-letter commands, orphaned scans.

→ Full source: `docs/IPC_ARCHITECTURE.md`
