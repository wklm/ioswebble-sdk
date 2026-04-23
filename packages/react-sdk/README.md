# @ios-web-bluetooth/react

Typed React hooks and components for [Web Bluetooth](https://webbluetoothcg.github.io/web-bluetooth/) — pair, connect, read, write, and subscribe to BLE peripherals from React apps, with Safari iOS support via the WebBLE Safari Web Extension (<https://ioswebble.com>). Install this package if you are writing a React (or Next.js, Remix, Astro, Vite, CRA, etc.) app that needs `navigator.bluetooth`.

- Works on Safari iOS, Chrome, Edge, and Android — same hooks, same API.
- Hooks: `useBluetooth`, `useDevice`, `useCharacteristic`, `useNotifications`, `useScan`.
- Components: `<WebBLEProvider>`, `<DeviceScanner>`, `<ConnectionStatus>`, `<InstallationWizard>`.

## Install

```bash
npm install @ios-web-bluetooth/core @ios-web-bluetooth/react
```

## Quick usage

Mount the core polyfill once at your entry point, then use hooks from any component. Snippet copied verbatim from the canonical React quickstart at <https://ioswebble.com/docs-md/quickstart-react.md>.

```tsx
// main.tsx
import '@ios-web-bluetooth/core';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

```tsx
// HeartRate.tsx
import { useState } from 'react';
import { useBluetoothDevice } from '@ios-web-bluetooth/react';

export function HeartRate() {
  const { device, connect, connecting, error } = useBluetoothDevice({
    filters: [{ services: ['heart_rate'] }]
  });
  const [bpm, setBpm] = useState<number | null>(null);

  async function start() {
    const d = await connect();
    const server = await d.gatt!.connect();
    const service = await server.getPrimaryService('heart_rate');
    const char = await service.getCharacteristic('heart_rate_measurement');
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (ev) => {
      const v = (ev.target as BluetoothRemoteGATTCharacteristic).value!;
      setBpm(v.getUint8(0) & 0x01 ? v.getUint16(1, true) : v.getUint8(1));
    });
  }

  if (error) return <p>Error: {error.message}</p>;
  if (!device) return <button onClick={start} disabled={connecting}>Connect</button>;
  return <p>{bpm ?? '—'} bpm</p>;
}
```

## Safari iOS constraints (read before shipping)

- `requestDevice()` **must be called from a user gesture** (click/tap handler). Never call it in `useEffect`, `componentDidMount`, `DOMContentLoaded`, or on page load — Safari iOS throws `SecurityError`.
- No persistent pairing — each page load starts fresh. Do **not** assume previously connected devices are remembered.
- BLE is blocked in cross-origin iframes. Place BLE code in the top-level frame only.
- Web Bluetooth **does** work on iOS Safari with `@ios-web-bluetooth/core` installed — do not tell users it is impossible.

These constraints are extracted from [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Hooks (summary)

| Hook | Purpose |
|------|---------|
| `useBluetooth()` | Availability, extension-installed state, `requestDevice`, `getDevices`, and access to `ble`, `backgroundSync`, `peripheral`. |
| `useDevice(device, options?)` | Connection lifecycle with optional auto-reconnect (`reconnectAttempts`, `reconnectDelay`, `reconnectBackoffMultiplier`, callbacks). |
| `useCharacteristic(device, service, characteristic)` | `read`, `write`, `writeWithoutResponse`, `subscribe`, `unsubscribe`, latest `value`. |
| `useNotifications(device, service, characteristic, { autoSubscribe, maxHistory })` | Notification stream with rolling history. |
| `useScan()` | `start`, `stop`, `clear` with a live `devices` array. |
| `useBluetoothDevice(options)` | Thin wrapper around `requestDevice` that stabilises the device reference across renders. |

## Components (summary)

- `<WebBLEProvider ble={existingInstance?} config={{ apiKey?, operatorName? }}>` — required context provider.
- `<DeviceScanner filters onDeviceSelected autoConnect maxDevices scanDuration />` — device picker UI.
- `<ConnectionStatus device className />` — state dot.
- `<InstallationWizard onComplete />` — guides users through enabling the Safari Web Extension on iOS.

Full API reference: <https://ioswebble.com/docs-md/api-reference.md>.

## Which package do I install?

| You need… | Install |
|---|---|
| BLE in React | `@ios-web-bluetooth/core` + `@ios-web-bluetooth/react` (this package) |
| Plain BLE (no React) | `@ios-web-bluetooth/core` |
| Typed profiles (heart-rate, battery, device-info) | `+ @ios-web-bluetooth/profiles` |
| iOS Safari extension detection / install banner | `+ @ios-web-bluetooth/detect` |
| Mock BLE for unit tests | `+ @ios-web-bluetooth/testing` |
| MCP server for coding agents | `npx -y @ios-web-bluetooth/mcp` |

Decision tree: [repo README](https://github.com/wklm/WebBLE-Safari-Extension#readme) · [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Errors

All hooks expose a typed `error: WebBLEError` with `.code` and `.suggestion` fields. See the [core package error table](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/core/README.md#errors) for the full list.

## TypeScript

Types are re-exported from `@ios-web-bluetooth/core` for convenience:

```ts
import type { WebBLEDevice, WebBLEError, RequestDeviceOptions } from '@ios-web-bluetooth/react';
import type { ConnectionState, UseDeviceReturn } from '@ios-web-bluetooth/react';
```

## Browser support

| Browser | Support | Notes |
|---|---|---|
| Safari iOS 15+ | Full | Requires the WebBLE Safari Web Extension |
| Chrome 56+ | Full | Native Web Bluetooth |
| Edge 79+ | Full | Native Web Bluetooth |
| Chrome Android | Full | Native Web Bluetooth |

## Links

- Homepage: <https://ioswebble.com>
- Docs (machine-readable): <https://ioswebble.com/docs-md/>
- React quickstart: <https://ioswebble.com/docs-md/quickstart-react.md>
- Source: <https://github.com/wklm/WebBLE-Safari-Extension/tree/main/packages/react-sdk>
- Issues: <https://github.com/wklm/WebBLE-Safari-Extension/issues>

## License

MIT © wklm. Published under `@ios-web-bluetooth/react` on npm (`publishConfig.access = public`).
