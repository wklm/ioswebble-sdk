# @ios-web-bluetooth/profiles

Typed, pre-built Bluetooth Low Energy device profiles — heart rate, battery, device info — layered on top of [`@ios-web-bluetooth/core`](https://www.npmjs.com/package/@ios-web-bluetooth/core). Install this package when you want a typed parser for a standard Bluetooth SIG profile instead of hand-rolling a `DataView` decoder.

- Heart-rate monitor: `onHeartRate(cb)`, `readSensorLocation()`, `resetEnergyExpended()`.
- Battery service: battery-level read + notification.
- Device Information service: manufacturer, model, firmware, serial.
- `defineProfile(config)` factory for custom GATT profiles.
- Works on Safari iOS, Chrome, Edge, Android — same code path.

## Install

```bash
npm install @ios-web-bluetooth/core @ios-web-bluetooth/profiles
```

## Quick usage

Mount the core polyfill once at your app entry, then drive any profile from a device the user paired via a gesture.

```ts
import '@ios-web-bluetooth/core';
import { WebBLE } from '@ios-web-bluetooth/core';
import { HeartRateProfile } from '@ios-web-bluetooth/profiles';

const ble = new WebBLE();
const device = await ble.requestDevice({ filters: [{ services: ['heart_rate'] }] });

const hr = new HeartRateProfile(device);
await hr.connect();

hr.onHeartRate((data) => {
  console.log(`${data.bpm} BPM, contact: ${data.contact}`);
  console.log('RR intervals:', data.rrIntervals);
});

const location = await hr.readSensorLocation(); // 0=Other, 1=Chest, 2=Wrist
hr.stop(); // unsubscribe all
```

Call `profile.stop()` as soon as the user leaves the live monitoring view — profiles wrap notifications internally, so prompt cleanup helps both responsiveness and battery life.

## Safari iOS constraints (read before shipping)

- `requestDevice()` **must be called from a user gesture** (click/tap handler). Calling it on page load, in `useEffect`, `setTimeout`, or `DOMContentLoaded` throws `SecurityError`.
- No persistent pairing — each page load starts fresh. Do **not** assume previously connected devices are remembered.
- BLE is blocked in cross-origin iframes. Place BLE code in the top-level frame only.
- Web Bluetooth **does** work on iOS Safari with `@ios-web-bluetooth/core` installed.

These constraints are extracted from [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Available profiles

| Profile | Entry | Methods |
|---|---|---|
| Heart Rate (0x180D) | `@ios-web-bluetooth/profiles` · `HeartRateProfile` | `connect`, `onHeartRate`, `readSensorLocation`, `resetEnergyExpended`, `stop` |
| Battery (0x180F) | `BatteryProfile` | `connect`, `readLevel`, `onLevelChange`, `stop` |
| Device Information (0x180A) | `DeviceInfoProfile` | `readManufacturer`, `readModel`, `readFirmware`, `readSerial` |
| Custom | `defineProfile(config)` | Factory for your own GATT profile with typed parsers |

Subpath entries are also published for tree-shaking: `@ios-web-bluetooth/profiles/heart-rate`, `/battery`, `/device-info`.

## Which package do I install?

| You need… | Install |
|---|---|
| Plain BLE (scan/connect/read/write) | `@ios-web-bluetooth/core` |
| Typed device profiles (this package) | `+ @ios-web-bluetooth/profiles` |
| React hooks | `+ @ios-web-bluetooth/react` |
| iOS Safari extension detection / install banner | `+ @ios-web-bluetooth/detect` |
| Mock BLE for unit tests | `+ @ios-web-bluetooth/testing` |
| MCP server for coding agents | `npx -y @ios-web-bluetooth/mcp` |

Decision tree: [repo README](https://github.com/wklm/WebBLE-Safari-Extension#readme) · [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Links

- Homepage: <https://ioswebble.com>
- Docs (machine-readable): <https://ioswebble.com/docs-md/>
- Recipes (heart-rate, battery, CGM, lock, beacon): <https://ioswebble.com/docs-md/recipes.md>
- Source: <https://github.com/wklm/WebBLE-Safari-Extension/tree/main/packages/profiles>
- Issues: <https://github.com/wklm/WebBLE-Safari-Extension/issues>

## License

MIT © wklm. Published under `@ios-web-bluetooth/profiles` on npm (`publishConfig.access = public`).
