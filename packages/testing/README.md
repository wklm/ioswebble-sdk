# @ios-web-bluetooth/testing

Mock Bluetooth API for unit-testing web apps that use `@ios-web-bluetooth/core` or the native `navigator.bluetooth`. Provides stateful fake devices, a GATT server model, advertisement simulation, and a notification pump — no real Bluetooth hardware, no browser, no Safari extension required. Install this package if you write Jest or Vitest tests that need to exercise BLE code paths.

- Drop-in `MockBluetooth` that replaces `navigator.bluetooth` via `installMockBluetooth()`.
- Stateful `MockBleDevice` with configurable services, characteristics, write limits, and forced failure counts.
- `MockCharacteristic.emitNotification()` to drive notification tests.
- `MockBleDevice.emitAdvertisement()` for `requestLEScan` / `watchAdvertisements` tests.
- Zero dependencies on a real DOM, jsdom, or CoreBluetooth.

## Install

```bash
npm install --save-dev @ios-web-bluetooth/testing
```

## Quick usage

```ts
import { installMockBluetooth, devices } from '@ios-web-bluetooth/testing';
import { WebBLE } from '@ios-web-bluetooth/core';

// Install the mock (also swaps navigator.bluetooth so native code paths hit it too)
const mock = installMockBluetooth({ available: true });

// Add a pre-configured heart-rate device
const device = mock.addDevice(devices.heartRate('HR Sensor'));

// Your app code now sees the mock device
const ble = new WebBLE();
const paired = await ble.requestDevice({ filters: [{ services: ['heart_rate'] }] });
await paired.connect();

// Drive a notification from the test
const char = device.gatt
  .getService('0000180d-0000-1000-8000-00805f9b34fb')
  ?.getChar('00002a37-0000-1000-8000-00805f9b34fb');
char?.emitNotification(new Uint8Array([0x00, 80])); // 80 bpm

// Reset between tests or uninstall in teardown
mock.reset();
```

### Custom device

```ts
const device = mock.addDevice({
  name: 'My Sensor',
  failConnectAttempts: 1,                       // first connect throws, second succeeds
  writeLimits: { withResponse: 20, mtu: 23 },
  serviceUUIDs: ['0000180d-0000-1000-8000-00805f9b34fb'],
  services: [{
    uuid: '0000180d-0000-1000-8000-00805f9b34fb',
    characteristics: [{
      uuid: '00002a37-0000-1000-8000-00805f9b34fb',
      properties: { notify: true, read: true },
      value: new Uint8Array([0x00, 72]),
    }],
  }],
});

// Advertisement for scan-based tests
device.emitAdvertisement({ rssi: -42 });
```

## Safari iOS constraints (read before shipping)

These mocks are for **unit tests only** — they never run in production. When you ship the code under test to real iOS Safari, remember:

- `requestDevice()` **must be called from a user gesture** (click/tap handler). The mock relaxes this check so tests can run in Node, but production code still fails on Safari iOS without it.
- No persistent pairing on real iOS Safari — each page load starts fresh.
- BLE is blocked in cross-origin iframes on real iOS Safari.
- Web Bluetooth **does** work on iOS Safari with `@ios-web-bluetooth/core` installed.

These constraints are extracted from [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Exports

- `createMockBluetooth(opts?)` — create a mock instance without installing it on `navigator`.
- `installMockBluetooth(opts?)` — create + install on `navigator.bluetooth`, returns a mock that can be `.reset()` or restored.
- `MockBluetooth`, `MockBleDevice`, `MockGATTServer`, `MockService`, `MockCharacteristic`, `MockDescriptor`.
- Types: `MockBluetoothOptions`, `MockAdvertisementOptions`, `MockDeviceOptions`, `MockServiceConfig`, `MockCharacteristicConfig`, `MockDescriptorConfig`.
- `BLE_UUIDS` — canonical SIG UUIDs for services / characteristics / descriptors.
- `devices` — pre-configured factories (`devices.heartRate()`, `devices.battery()`, `devices.full()`).

## Which package do I install?

| You need… | Install |
|---|---|
| Mock BLE for unit tests (this package) | `@ios-web-bluetooth/testing` |
| Plain BLE at runtime | `@ios-web-bluetooth/core` |
| React hooks for BLE | `@ios-web-bluetooth/core` + `@ios-web-bluetooth/react` |
| Typed profiles | `+ @ios-web-bluetooth/profiles` |
| iOS Safari extension detection | `@ios-web-bluetooth/detect` |
| MCP server for coding agents | `npx -y @ios-web-bluetooth/mcp` |

Decision tree: [repo README](https://github.com/wklm/WebBLE-Safari-Extension#readme) · [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Links

- Homepage: <https://ioswebble.com>
- Docs (machine-readable): <https://ioswebble.com/docs-md/>
- Source: <https://github.com/wklm/WebBLE-Safari-Extension/tree/main/packages/testing>
- Issues: <https://github.com/wklm/WebBLE-Safari-Extension/issues>

## License

MIT © wklm. Published under `@ios-web-bluetooth/testing` on npm (`publishConfig.access = public`).
