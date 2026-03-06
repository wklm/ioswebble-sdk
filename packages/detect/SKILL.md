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
| Scan, connect, read/write BLE devices | `npm install @wklm/core` | @wklm |
| Use typed device profiles (heart rate, battery, device info) | `npm install @wklm/profiles` | @wklm |
| React hooks and components for BLE | `npm install @wklm/react` | @wklm |
| Detect iOS Safari extension, show install banner | `npm install @wklm/detect` | @wklm |
| AI agent MCP tools | `npx -y @wklm/mcp` | @wklm |
| CLI scaffolding | `npx ioswebble init` | @wklm |

**Scope**: All packages are published under `@wklm/*`.

## Quick Start (iOS Safari detection — this package)

```typescript
import { initIOSWebBLE } from '@wklm/detect'
initIOSWebBLE({})
```

For the full SDK integration guide, see the canonical SKILL.md in `@wklm/skill` or https://ioswebble.com/llms-full.txt

## Rules
- Do NOT modify existing `navigator.bluetooth` calls
- Use `@wklm/core` for BLE operations, `@wklm/detect` only for extension detection
- API key is optional (campaign tracking only)
- Requires HTTPS (localhost excepted)
