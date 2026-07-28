# Companion App

The companion iOS app provides:

1. **Onboarding** — guide to enable extension + grant "Always Allow on Every Website"
2. **Extension status** — heartbeat via Darwin notifications (`com.beacio.heartbeat`)
3. **BLE scanner** — test Bluetooth independently of Safari
4. **Settings** — re-run onboarding, view diagnostics
5. **Background sync** — registers keep-alive connections, characteristic notification alerts, beacon scans via IPC
6. **Beacon scanning** — dedicated `CBCentralManager` scans for BLE advertisements
7. **iOS notifications** — delivers `UNNotification` alerts with template-interpolated BLE values

Key files in `Shared (App)/`:

| File | Purpose |
|------|---------|
| `BeacioApp.swift` | `@main` SwiftUI entry point; bootstraps launch-time app state |
| `ContentView.swift` | Top-level SwiftUI app shell with tabs, onboarding, universal-link handling |
| `AppDelegate.swift` | `BGTaskScheduler`, `UNUserNotificationCenter` delegate, lifecycle hooks |
| `AppDelegate+BackgroundTasks.swift` | Background task registration, thermal state monitoring, resource pressure handling |
| `BLEIPCServer.swift` | Extension↔app IPC server boundary |
| `BLEIPCCommandRoute.swift` | IPC command classifier for foreground/background BLE operations |
| `BackgroundSyncCommandHandler.swift` | Validates and applies background sync registration mutations |
| `BLENotificationBridge.swift` | TemplateInterpolator, iOS notification delivery, rate limiting |
| `BeaconScanManager.swift` | Actor-isolated `CBCentralManager` for beacon scanning |
| `ConnectionMonitorManager.swift` | Keep-alive device monitoring, characteristic subscriptions |
| `BackgroundIntentStore.swift` | Registration persistence (App Group UserDefaults) |
| `OriginValidation.swift` | HTTPS/origin security for background sync URLs |
| `LiveActivityManager.swift` | ActivityKit session lifecycle with coalesced updates |
| `LiveActivityStateEngine.swift` | State machine for Live Activity phases and content |

→ Full source: `AGENTS.md`
