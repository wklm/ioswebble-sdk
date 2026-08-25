---
name: beacio-sdk-consumer
description: Ship Web Bluetooth on iOS / iPhone Safari via the beacio SDK. Trigger when users ask about navigator.bluetooth, Web Bluetooth, GATT, BLE from a website on iPhone, Safari Web Extension for Bluetooth, @beacio/* packages, or connecting to BLE devices from a web page on iOS.
license: MIT
metadata:
  author: Copyright 2026 wklm
  version: '1.0.0'
---

# beacio SDK Consumer

## Rules

1. **Verify iOS Safari context** — gate code behind `window.beacioIOS === true`.
2. **HTTPS required** — page must be served over HTTPS (localhost exempted).
3. **requestDevice() needs a user gesture** — click/tap handler only. Never in useEffect or page load.
4. **Never expose CoreBluetooth to web content** — the SDK handles this.

## Integration

### Quickstart
- **quickstart.md** — 60-second install: App Store → enable extension → npm install / CDN → verify. → Full source: https://beacio.com/docs-md/quickstart.md

### API Reference
- **api-reference.md** — complete method/event/error surface for `navigator.bluetooth` and `window.beacioIOS`. → Full source: https://beacio.com/docs-md/api-reference.md

### Troubleshooting
- **troubleshooting.md** — four canonical failure modes: Extension not detected, Device disconnects, GATT operation failed, Notifications not firing. → Full source: https://beacio.com/docs-md/troubleshooting/

### Recipes
- **recipes.md** — six runnable HTML snippets: Heart Rate, Battery, CGM, Lock, Beacon, Peripheral Chat. → Full source: https://beacio.com/docs-md/recipes.md

## Hard Constraints
- iOS 26.2+ required
- "Allow on Every Website" must be ticked in Safari Settings
- Extension active only while Safari foregrounded (unless backgroundSync registered)
- Use human-readable UUID names (`'heart_rate'`), not hex (`'0x180D'`)
