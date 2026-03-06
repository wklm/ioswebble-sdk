# @wklm/core

Web Bluetooth SDK -- scan, connect, read/write BLE devices from web apps (iOS Safari).

## Install

```bash
npm install @wklm/core
```

## Selective imports & tree-shaking

Zero dependencies. `sideEffects: false` enables tree-shaking -- only what you import ships to the browser.

```typescript
// Full SDK (~4KB gzipped)
import { WebBLE, WebBLEDevice, WebBLEError } from '@wklm/core';

// Just UUID helpers (~1KB gzipped)
import { resolveUUID, getServiceName } from '@wklm/core';

// Just platform detection (~0.5KB gzipped)
import { detectPlatform } from '@wklm/core';
```

You do **not** need `@wklm/profiles` or `@wklm/react-sdk` for basic BLE operations. `@wklm/core` is fully self-contained.

## Scanning for devices

### Filter by service UUID

```typescript
import { WebBLE } from '@wklm/core';

const ble = new WebBLE();
const device = await ble.requestDevice({
  filters: [{ services: ['heart_rate'] }],
});
```

### Filter by name or name prefix

```typescript
// Exact name match
const device = await ble.requestDevice({
  filters: [{ name: 'MyDevice' }],
  optionalServices: ['heart_rate'],
});

// Name prefix (matches "MyDevice-001", "MyDevice-002", etc.)
const device = await ble.requestDevice({
  filters: [{ namePrefix: 'My' }],
  optionalServices: ['heart_rate'],
});
```

### Combined filters

```typescript
const device = await ble.requestDevice({
  filters: [
    { services: ['heart_rate'] },
    { name: 'MyDevice', services: ['battery_service'] },
  ],
});
```

### Accept all devices

```typescript
const device = await ble.requestDevice({
  acceptAllDevices: true,
  optionalServices: ['heart_rate', 'battery_service'],
});
```

### Error handling for scanning

```typescript
import { WebBLE, WebBLEError } from '@wklm/core';

const ble = new WebBLE();
try {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }],
  });
} catch (err) {
  if (err instanceof WebBLEError) {
    switch (err.code) {
      case 'USER_CANCELLED':
        // User dismissed the device picker
        break;
      case 'DEVICE_NOT_FOUND':
        // No matching devices in range
        break;
      case 'BLUETOOTH_UNAVAILABLE':
        // Bluetooth is off or unsupported
        break;
      case 'EXTENSION_NOT_INSTALLED':
        // iOS Safari: WebBLE extension not active
        break;
    }
    console.log(err.suggestion); // Human-readable recovery hint
  }
}
```

> **iOS Safari note:** The WebBLE Safari extension must be installed and enabled under Settings > Apps > Safari > Extensions. Use `@wklm/detect` to auto-prompt users when the extension is missing.

## Connecting & GATT service access

### Connect and read a characteristic

```typescript
await device.connect();
const value = await device.read('heart_rate', 'heart_rate_measurement');
console.log('Heart rate:', value.getUint8(1));
```

### Write a characteristic

```typescript
const data = new Uint8Array([0x01, 0x00]);
await device.write('battery_service', 'battery_level', data);
```

### UUID formats

You can use Bluetooth SIG short names or full 128-bit UUIDs interchangeably:

```typescript
// These are equivalent:
await device.read('heart_rate', 'heart_rate_measurement');
await device.read('0000180d-0000-1000-8000-00805f9b34fb', '00002a37-0000-1000-8000-00805f9b34fb');
```

Use `resolveUUID()` to convert names to full UUIDs:

```typescript
import { resolveUUID, getServiceName } from '@wklm/core';

resolveUUID('heart_rate');               // '0000180d-0000-1000-8000-00805f9b34fb'
getServiceName('0000180d-0000-1000-8000-00805f9b34fb'); // 'heart_rate'
```

> **Service discovery note:** The SDK handles GATT tree traversal internally. You don't need to manually discover services or get characteristic handles -- just pass the service and characteristic identifiers to `read()`, `write()`, or `subscribe()`.

## Notifications & subscriptions

### Callback-based

```typescript
const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', (value) => {
  console.log('Heart rate:', value.getUint8(1));
});

// Later: clean up before disconnecting
unsub();
```

### Async iterable

```typescript
for await (const value of device.notifications('heart_rate', 'heart_rate_measurement')) {
  console.log('Heart rate:', value.getUint8(1));
  if (shouldStop) break;
}
```

## Connection lifecycle & cleanup

### Graceful disconnect

Always clean up subscriptions before disconnecting:

```typescript
const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', callback);

// When done:
unsub();                  // 1. Remove subscription
await device.disconnect(); // 2. Then disconnect
```

### Handle unexpected disconnections

```typescript
device.on('disconnected', () => {
  console.log('Device disconnected');
  // Fires for both intentional disconnect() calls and unexpected drops
});
```

### Reconnection pattern

```typescript
async function connectWithRetry(ble: WebBLE, maxRetries = 3) {
  let device: WebBLEDevice | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      device = await ble.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      await device.connect();
      return device;
    } catch (err) {
      if (err instanceof WebBLEError && err.code === 'USER_CANCELLED') {
        throw err; // Don't retry if user cancelled
      }
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}
```

### Full lifecycle example

```typescript
import { WebBLE, WebBLEError } from '@wklm/core';

const ble = new WebBLE();

// 1. Check availability
if (!ble.isSupported) {
  console.log('Web Bluetooth not available');
  // On iOS Safari, suggest installing the WebBLE extension
}

// 2. Scan
const device = await ble.requestDevice({
  filters: [{ services: ['heart_rate'] }],
});

// 3. Connect
await device.connect();

// 4. Subscribe
const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', (value) => {
  console.log('Heart rate:', value.getUint8(1));
});

// 5. Handle disconnection
device.on('disconnected', () => {
  console.log('Connection lost');
});

// 6. Clean up when done
unsub();
await device.disconnect();
```

## Error handling

All SDK errors are `WebBLEError` instances with a typed `code` and a human-readable `suggestion`:

```typescript
import { WebBLEError } from '@wklm/core';

try {
  await device.connect();
  const value = await device.read('heart_rate', 'heart_rate_measurement');
} catch (err) {
  if (err instanceof WebBLEError) {
    console.log(err.code);       // e.g. 'SERVICE_NOT_FOUND'
    console.log(err.message);    // Technical detail
    console.log(err.suggestion); // User-facing recovery hint
  }
}
```

**Error codes:**

| Code | When |
|------|------|
| `BLUETOOTH_UNAVAILABLE` | Bluetooth is off or not supported |
| `EXTENSION_NOT_INSTALLED` | iOS Safari: extension not active |
| `PERMISSION_DENIED` | User denied Bluetooth permission |
| `USER_CANCELLED` | User dismissed the device picker |
| `DEVICE_NOT_FOUND` | No matching devices in range |
| `DEVICE_DISCONNECTED` | Device disconnected during operation |
| `CONNECTION_TIMEOUT` | Connection attempt timed out |
| `SERVICE_NOT_FOUND` | Requested GATT service not on device |
| `CHARACTERISTIC_NOT_FOUND` | Requested characteristic not on device |
| `CHARACTERISTIC_NOT_READABLE` | Characteristic doesn't support read |
| `CHARACTERISTIC_NOT_WRITABLE` | Characteristic doesn't support write |
| `CHARACTERISTIC_NOT_NOTIFIABLE` | Characteristic doesn't support notifications |
| `GATT_OPERATION_FAILED` | Generic GATT operation failure |
| `SCAN_ALREADY_IN_PROGRESS` | Another scan is already running |
| `TIMEOUT` | Operation timed out |

## API

### `WebBLE`

| Member | Description |
|--------|-------------|
| `new WebBLE(options?)` | Create SDK instance |
| `requestDevice(options?): Promise<WebBLEDevice>` | Scan and select a BLE device |
| `getAvailability(): Promise<boolean>` | Check if Bluetooth is available |
| `platform: Platform` | Current platform (`'ios-safari'`, `'chrome'`, `'unsupported'`) |
| `isSupported: boolean` | Whether Web Bluetooth is available |

### `WebBLEDevice`

| Member | Description |
|--------|-------------|
| `id: string` | Unique device identifier |
| `name: string \| undefined` | Advertised device name |
| `connect(): Promise<void>` | Connect to the device |
| `disconnect(): void` | Disconnect from the device |
| `read(service, characteristic): Promise<DataView>` | Read a characteristic value |
| `write(service, characteristic, value): Promise<void>` | Write a value (`ArrayBuffer` or `Uint8Array`) |
| `subscribe(service, characteristic, callback): () => void` | Subscribe to notifications; returns unsubscribe function |
| `notifications(service, characteristic): AsyncIterable<DataView>` | Async iterable of notification values |
| `on('disconnected', listener): void` | Listen for disconnection events |

### `WebBLEError`

| Member | Description |
|--------|-------------|
| `code: WebBLEErrorCode` | Typed error code (see table above) |
| `message: string` | Error detail |
| `suggestion: string` | Human-readable recovery hint |
| `WebBLEError.from(error, fallbackCode)` | Wrap unknown errors |

### Utility functions

| Function | Description |
|----------|-------------|
| `resolveUUID(name): string` | Convert Bluetooth SIG name to full 128-bit UUID |
| `getServiceName(uuid): string \| undefined` | Get human-readable service name from UUID |
| `getCharacteristicName(uuid): string \| undefined` | Get human-readable characteristic name from UUID |
| `detectPlatform(): Platform` | Returns `'ios-safari'`, `'chrome'`, or `'unsupported'` |

## AI agent integration

MCP server for coding agents (Claude Code, Cursor, Copilot):

```
npx -y @wklm/mcp
```

Full SDK reference for LLM context: <https://ioswebble.com/llms-full.txt>

## Two scopes

The **`@wklm/*`** packages (`core`, `profiles`, `react`) are the cross-browser BLE SDK -- they work on any platform with Web Bluetooth support (Chrome, Edge, iOS Safari via the extension). The **`@wklm/*`** packages (`detect`, `cli`, `mcp`, `skill`) handle iOS-specific extension detection, install prompts, and agent tooling. Use both together for full iOS Safari coverage.
