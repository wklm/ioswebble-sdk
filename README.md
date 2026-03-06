# iOSWebBLE SDK

Web Bluetooth SDK for iOS Safari. Scan, connect, and talk to BLE devices from any web app.

## Packages

| Package | Purpose | Size |
|---------|---------|------|
| [`@wklm/core`](packages/core) | BLE scanning, connecting, GATT read/write/subscribe | ~4KB gzip |
| [`@wklm/detect`](packages/detect) | iOS extension detection + install banner | ~2KB gzip |
| [`@wklm/profiles`](packages/profiles) | Typed BLE profiles (heart rate, battery, etc.) | Optional |
| [`@wklm/react-sdk`](packages/react-sdk) | React hooks (`useDevice`, `useCharacteristic`) | Optional |
| [`@wklm/cli`](packages/cli) | CLI tooling | Optional |
| [`@wklm/mcp`](packages/mcp) | MCP server for AI coding agents | Optional |

## Quick Start

```bash
npm install @wklm/core @wklm/detect
```

```typescript
import { initIOSWebBLE, isIOSSafari } from '@wklm/detect';
import { WebBLE, WebBLEError } from '@wklm/core';

// 1. On iOS Safari, detect the extension and prompt install if missing
if (isIOSSafari()) {
  await initIOSWebBLE({
    operatorName: 'MyApp',
    banner: { mode: 'sheet' },
    onReady: () => console.log('Extension ready'),
  });
}

// 2. Scan and connect (works on iOS Safari + Chrome + Edge)
const ble = new WebBLE();
const device = await ble.requestDevice({
  filters: [{ services: ['heart_rate'] }],
});

await device.connect();

// 3. Read a value
const value = await device.read('heart_rate', 'heart_rate_measurement');
console.log('Heart rate:', value.getUint8(1));

// 4. Subscribe to notifications
const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', (v) => {
  console.log('Heart rate:', v.getUint8(1));
});

// 5. Clean up
unsub();
await device.disconnect();
```

For plain HTML (no bundler):

```html
<script src="https://ioswebble.com/webble.js"></script>
```

## Error Handling

All errors are `WebBLEError` instances with a typed `code` and a human-readable `suggestion`:

```typescript
try {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }],
  });
  await device.connect();
} catch (err) {
  if (err instanceof WebBLEError) {
    console.log(err.code);       // e.g. 'DEVICE_NOT_FOUND'
    console.log(err.suggestion); // 'No matching devices in range'
  }
}
```

## AI Agent Integration

MCP server for coding agents (Claude Code, Cursor, Copilot):

```
npx -y @wklm/mcp
```

Full SDK reference for LLM context: <https://ioswebble.com/llms-full.txt>

## Documentation

Each package has its own README with full API reference:

- [`@wklm/core` README](packages/core/README.md) -- scanning, connecting, GATT operations, error codes
- [`@wklm/detect` README](packages/detect/README.md) -- extension detection, install banners, React provider

## License

Proprietary. See individual package licenses.
