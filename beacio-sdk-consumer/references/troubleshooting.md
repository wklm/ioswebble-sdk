# Troubleshooting

## Extension Not Detected

**Symptom:** `getAvailability()` returns `false`, `requestDevice()` rejects with `NotSupportedError`, or `navigator.bluetooth` is `undefined`.

| Cause | Fix |
|-------|-----|
| Extension not enabled | Settings → Apps → Safari → Extensions → beacio → toggle on |
| "Always Allow" not granted | Tap `A`A in address bar → Manage Extensions → grant access |
| Private Browsing tab | Safari disables extensions in Private Browsing. Use a standard tab. |
| iOS too old | Requires iOS 26.2+. Check Settings → General → About. |
| App never launched | Open beacio app at least once from home screen. |
| Non-HTTPS origin | Serve over HTTPS. `localhost` is exempt. |
| Polyfill didn't load | Verify `<script src="...">` not blocked by CSP. For npm, import on client side. |

---

## Device Disconnects

**Symptom:** `gattserverdisconnected` fires unexpectedly, or GATT ops throw `NetworkError`.

| Cause | Fix |
|-------|-----|
| Safari backgrounded | Keep tab active, or register keep-alive via `backgroundSync.requestBackgroundConnection()` |
| Peripheral out of range | Reconnect on `gattserverdisconnected` event (avoid auto-reconnect loops) |
| Another app claimed peripheral | Disconnect competing apps/tabs, then reconnect. |
| Supervision timeout | Keep characteristic notifications subscribed to maintain link layer activity. |
| iOS deep sleep | Treat as normal disconnect; reconnect on user action. |

---

## GATT Operation Failed

**Symptom:** `readValue`/`writeValue`/`startNotifications`/`getPrimaryService`/`getCharacteristic` rejects.

| Cause | Fix |
|-------|-----|
| Service not in filters/optionalServices | Include every service you plan to use at `requestDevice()` time: `optionalServices: ['battery_service']` |
| Characteristic absent | Enumerate with `service.getCharacteristics()` and log actual UUIDs. |
| Unsupported operation | Check `char.properties` before calling: `read`, `write`, `notify`, `indicate`. |
| Stale GATT handles after reconnect | Re-call `getPrimaryService` + `getCharacteristic` after each reconnect. |
| Payload too large | Chunk writes to ≤ 20 bytes. |
| Pairing required | Accept the system pairing dialog. For persistent issues, "Forget This Device" in Bluetooth settings. |

---

## Notifications Not Firing

**Symptom:** `registerCharacteristicNotifications` or `registerBeaconScanning` registers successfully but no OS notification appears.

| Cause | Fix |
|-------|-----|
| Notification permission denied | Call `backgroundSync.requestPermission()` first. If denied, user must flip toggle in Settings → Notifications → beacio. |
| Companion app not running | User must open beacio app at least once. |
| Cooldown throttling | Default 5s dedup interval. Set a shorter `cooldownSeconds` (minimum 5s). |
| Template URL cross-origin | Ensure `template.url` is same-origin. |
| Condition never matches | Use `operator: 'always'` or `operator: 'changed'` for always-fire. |
| Focus / Do Not Disturb | User adds beacio to their Focus allow-list. |
| Beacon missing service UUID | Beacon must advertise service UUID in primary advertisement packet, not just scan-response. |

→ Canonical docs: https://beacio.com/docs/troubleshooting
