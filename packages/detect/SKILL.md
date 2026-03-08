---
name: ioswebble
description: Web Bluetooth SDK — scan, connect, read/write BLE devices from web apps (iOS Safari + Chrome)
trigger: bluetooth ble web-bluetooth ios safari navigator.bluetooth requestDevice webble ioswebble bluetooth-scan gatt connect-device heart-rate-monitor ble-profile bluetooth-low-energy
---

<!-- Canonical SKILL.md lives at packages/skill/SKILL.md. This is a copy for npm distribution. -->

# WebBLE SDK Integration

## What this does
WebBLE is a Web Bluetooth SDK for web apps. It works on Chrome natively and on iOS Safari via a companion app + Safari extension. The SDK provides scan, connect, read/write/subscribe operations for BLE devices.

## Package Routing Table

| You want to... | Install | Scope |
|---|---|---|
| Scan, connect, read/write BLE devices | `npm install @ios-web-bluetooth/core` | @ios-web-bluetooth |
| Use typed device profiles (heart rate, battery, device info) | `npm install @ios-web-bluetooth/profiles` | @ios-web-bluetooth |
| React hooks and components for BLE | `npm install @ios-web-bluetooth/react` | @ios-web-bluetooth |
| Detect iOS Safari extension, show install banner | `npm install @ios-web-bluetooth/detect` | @ios-web-bluetooth |
| AI agent MCP tools | `npx -y @ios-web-bluetooth/mcp` | @ios-web-bluetooth |
| CLI scaffolding | `npx ioswebble init` | @ios-web-bluetooth |

**Scope**: All packages are published under `@ios-web-bluetooth/*`.

## Quick Start (iOS Safari detection — this package)

```typescript
import { initIOSWebBLE } from '@ios-web-bluetooth/detect'
initIOSWebBLE({})
```

For the full SDK integration guide, see the canonical SKILL.md in `@ios-web-bluetooth/skill` or https://ioswebble.com/llms-full.txt

## Rules
- Do NOT modify existing `navigator.bluetooth` calls
- Use `@ios-web-bluetooth/core` for BLE operations, `@ios-web-bluetooth/detect` only for extension detection
- API key is optional (campaign tracking only)
- Requires HTTPS (localhost excepted)
