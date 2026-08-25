# Background Sync

The companion app maintains BLE connections and delivers iOS notifications even when Safari is not active.

## Components

| Component | Purpose |
|-----------|---------|
| `ConnectionMonitorManager` | Keep-alive device monitoring, characteristic subscriptions |
| `BLENotificationBridge` | Template interpolation (`{{value.utf8}}`, `{{deviceName}}`), `UNNotification` delivery, rate limiting |
| `BeaconScanManager` | Actor-isolated `CBCentralManager` for BLE advertisement scanning with service UUID filters |
| `BackgroundIntentStore` | Registration persistence via App Group UserDefaults, survives app restart |
| `OriginValidation` | HTTPS required, same-origin URL validation |

## Security Caps
- 50 intents per origin
- 200 global registration cap
- 200 char template value max
- 30-day registration expiry
- 10 notifications/intent/hour rate limit

## Background Task Limitations

Background scan hold duration is capped at **25 seconds** (`bgTaskScanHoldDuration` in `AppConstants.swift:326`). BGAppRefreshTask scheduling is opportunistic — the system does not guarantee exact run times or continuous relay execution. Factors affecting reliability:

- **Thermal state**: Task execution is throttled or suspended when the device is hot
- **Battery**: Low-power mode reduces task frequency
- **System load**: High CPU/memory pressure delays or drops background tasks
- **App usage patterns**: Tasks are budgeted based on how frequently the user opens the companion app

→ See also `docs/IPC_ARCHITECTURE.md` §Background tasks and `AppDelegate+BackgroundTasks.swift` for thermal state handling.
