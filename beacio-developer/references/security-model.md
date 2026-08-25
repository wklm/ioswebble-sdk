# Security Model

Seven security boundaries in the IPC architecture:

1. **Origin validation** — URL-component-based matching on every inbound message
2. **Tab isolation** — per-tab caches and device registries
3. **URL hashing** — SHA-256 hash in UserDefaults keys, no raw URLs stored
4. **No wildcard postMessage** — explicit origin on all `postMessage` calls
5. **Darwin notification trust** — accepted risk: unauthenticated wake-up, trust in App Group entitlement isolation
6. **IPCFileLock** — POSIX `flock()` fail-closed advisory lock
7. **Circuit-breaker** — 3-consecutive-timeout anti-abuse mechanism

## App Group Trust
The App Group entitlement (`group.com.ioswebble.app`) serves as the sole trust boundary between extension and companion app processes. No HMAC signing or authentication tokens are used.

→ Full source: `docs/IPC_ARCHITECTURE.md`
