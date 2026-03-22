# iOSWebBLE SDK Wiki

Welcome to the public wiki for [`wklm/ioswebble-sdk`](https://github.com/wklm/ioswebble-sdk).

iOSWebBLE is the SDK layer that makes Web Bluetooth work in Safari on iPhone while staying compatible with native Web Bluetooth in Chrome and Edge.

## Start Here

- New to the SDK: [Getting Started](Getting-Started)
- Need the core BLE API: [Core SDK](Core-SDK)
- Need iOS Safari extension detection and install prompts: [Extension Detection](Extension-Detection)
- Building a React app: [React SDK](React-SDK)
- Need background BLE alerts and monitoring: [Background Sync](Background-Sync)
- Hitting integration issues: [Troubleshooting](Troubleshooting)
- Want runnable samples: [Examples](Examples)

## Package Map

| Package | Purpose |
|---|---|
| `@ios-web-bluetooth/core` | Core BLE SDK and Safari iOS polyfill |
| `@ios-web-bluetooth/detect` | iOS Safari detection and install banners |
| `@ios-web-bluetooth/react` | React hooks and UI components |
| `@ios-web-bluetooth/profiles` | Typed device profiles for common BLE services |
| `@ios-web-bluetooth/testing` | Mock BLE tools for tests |
| `@ios-web-bluetooth/mcp` | MCP server for AI coding agents |

## Quick Start

```bash
npm install @ios-web-bluetooth/core @ios-web-bluetooth/detect
```

```typescript
import { initIOSWebBLE, isIOSSafari } from '@ios-web-bluetooth/detect';
import { WebBLE } from '@ios-web-bluetooth/core';

if (isIOSSafari()) {
  await initIOSWebBLE({
    operatorName: 'MyApp',
    banner: { mode: 'sheet' },
  });
}

const ble = new WebBLE();
const device = await ble.requestDevice({
  filters: [{ services: ['heart_rate'] }],
});

await device.connect();
const value = await device.read('heart_rate', 'heart_rate_measurement');
console.log(value.getUint8(1));
```

## Key Links

- Website docs: <https://ioswebble.com/docs>
- Install page: <https://ioswebble.com/install>
- Repo README: <https://github.com/wklm/ioswebble-sdk/blob/main/README.md>
- Core README: <https://github.com/wklm/ioswebble-sdk/blob/main/packages/core/README.md>
- Detect README: <https://github.com/wklm/ioswebble-sdk/blob/main/packages/detect/README.md>
- React README: <https://github.com/wklm/ioswebble-sdk/blob/main/packages/react-sdk/README.md>
