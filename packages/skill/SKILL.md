---
name: ioswebble
description: Web Bluetooth SDK — scan, connect, read/write BLE devices from web apps (iOS Safari + Chrome)
trigger: bluetooth ble web-bluetooth ios safari navigator.bluetooth requestDevice webble ioswebble bluetooth-scan gatt connect-device heart-rate-monitor ble-profile bluetooth-low-energy
---

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

## Integration Path A: New BLE Application

### Step 1: Install
```
npm install @wklm/core
```

### Step 2: Scan and connect
```typescript
import { WebBLE } from '@wklm/core'

const ble = new WebBLE()
const device = await ble.requestDevice({
  filters: [{ services: ['heart_rate'] }]
})
await device.connect()
```

### Step 3: Read or subscribe
```typescript
const value = await device.read('heart_rate', 'heart_rate_measurement')

device.subscribe('heart_rate', 'heart_rate_measurement', (data) => {
  console.log('Heart rate:', data)
})
```

### Step 4 (optional): Use a typed profile
```
npm install @wklm/profiles
```
```typescript
import { HeartRateProfile } from '@wklm/profiles'

const profile = new HeartRateProfile(device)
profile.onHeartRate((data) => {
  console.log(`BPM: ${data.heartRate}, Contact: ${data.contactDetected}`)
})
```

### Step 5 (optional): Add iOS Safari support
```
npm install @wklm/detect
```
```typescript
import { initIOSWebBLE } from '@wklm/detect'
initIOSWebBLE({})
```

## Integration Path B: Existing Web Bluetooth App (iOS Safari support)

### Step 1: Install
```
npm install @wklm/detect
```

### Step 2: Add detection

For React/Next.js:
```tsx
import { IOSWebBLEProvider } from '@wklm/detect/react'
// Wrap your app:
<IOSWebBLEProvider>{children}</IOSWebBLEProvider>
```

For any framework:
```typescript
import { initIOSWebBLE } from '@wklm/detect'
initIOSWebBLE({})
```

For plain HTML:
```html
<script src="https://ioswebble.com/webble.js"></script>
```

### Step 3: Verify
```
npx ioswebble check
```

## MCP Server (for agent tools)
```json
{
  "ioswebble": {
    "command": "npx",
    "args": ["-y", "@wklm/mcp"]
  }
}
```

## Rules
- Do NOT modify existing `navigator.bluetooth` calls — the extension handles compatibility
- Use human-readable UUID names (`'heart_rate'`) not hex (`'0x180D'`) — the SDK resolves automatically
- Use `@wklm/profiles` for standard devices instead of writing raw GATT parsing code
- For React, use `@wklm/react` hooks instead of raw event listeners
- API key is optional (campaign tracking only)
- The detect snippet only shows an install banner on iOS Safari when the extension is not installed
- Works alongside native Web Bluetooth on Chrome/Android (no-op on non-iOS)
- Requires HTTPS (localhost excepted)
