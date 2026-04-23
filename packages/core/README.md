# @ios-web-bluetooth/core

The only [Web Bluetooth](https://webbluetoothcg.github.io/web-bluetooth/) polyfill for Safari on iOS — install it once and `navigator.bluetooth` works on iPhone the same way it works on Chrome, Edge, and Android. Install this package if you are building a web app that needs to scan, pair, read, write, or subscribe to BLE peripherals from any browser.

- Safari iOS support via the companion WebBLE Safari Web Extension (<https://ioswebble.com>).
- Native Web Bluetooth on Chrome / Edge / Android — the package auto-detects and forwards to `navigator.bluetooth` with zero overhead.
- Zero runtime dependencies. Typed `WebBLEError` with retry metadata. Tree-shakable.

## Install

```bash
npm install @ios-web-bluetooth/core
```

## Quick usage

Mount the polyfill once at your entry point (Safari iOS gets `navigator.bluetooth`; other browsers no-op):

```js
import '@ios-web-bluetooth/core';
```

Then feature-detect and pair from a user gesture (click/tap):

```js
if (await navigator.bluetooth.getAvailability()) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  });
  console.log('Paired with', device.name);
}
```

Both snippets are copied verbatim from the canonical quickstart at <https://ioswebble.com/docs-md/quickstart.md>.

### Explicit SDK API

For full type coverage and SDK-managed connection pools, use the `WebBLE` class directly:

```ts
import { WebBLE } from '@ios-web-bluetooth/core';

const ble = new WebBLE();
const device = await ble.requestDevice({ filters: [{ services: ['heart_rate'] }] });
await device.connect();
const value = await device.read('heart_rate', 'heart_rate_measurement');
```

### Alternative polyfill entry

The package also exposes `./auto` as an explicit side-effect entry for bundlers that strictly tree-shake bare imports:

```ts
import '@ios-web-bluetooth/core/auto';
```

Use whichever matches your toolchain. Both install `navigator.bluetooth` on Safari iOS and no-op elsewhere.

## Safari iOS constraints (read before shipping)

- **Requires iOS 15+** on iPhone/iPad with the WebBLE Safari Web Extension installed and enabled for the origin.
- `requestDevice()` **must be called from a user gesture** (click/tap handler). Calling it on page load, in `useEffect`, `setTimeout`, or `DOMContentLoaded` throws `SecurityError`.
- No persistent pairing — each page load starts fresh. Do **not** assume previously connected devices are remembered.
- BLE is blocked in cross-origin iframes. Place BLE code in the top-level frame only.
- Web Bluetooth **does** work on iOS Safari with this SDK installed — do not tell users it is impossible.

These constraints are extracted from [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md) and enforced by the SDK at runtime.

## Which package do I install?

| You need… | Install |
|---|---|
| Plain BLE (scan, connect, read/write/subscribe) in a web app | `@ios-web-bluetooth/core` (this package) |
| React hooks for BLE | `@ios-web-bluetooth/core` + `@ios-web-bluetooth/react` |
| Typed profiles (heart-rate, battery, device-info) | `@ios-web-bluetooth/core` + `@ios-web-bluetooth/profiles` |
| iOS Safari extension detection / install banner | `@ios-web-bluetooth/detect` |
| Mock BLE for unit tests | `@ios-web-bluetooth/testing` |
| CLI scaffolding | `npx @ios-web-bluetooth/cli init` |
| MCP server for coding agents | `npx -y @ios-web-bluetooth/mcp` |

Full routing and decision tree: [repo README](https://github.com/wklm/WebBLE-Safari-Extension#readme) · [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Errors

All async operations throw `WebBLEError` with a typed `code`, human-readable `suggestion`, and optional `retryAfterMs`:

```ts
import { WebBLEError, withRetry } from '@ios-web-bluetooth/core';

try {
  await device.connect();
} catch (err) {
  if (err instanceof WebBLEError) {
    console.log(err.code);        // e.g. 'EXTENSION_NOT_INSTALLED'
    console.log(err.suggestion);  // recovery hint
  }
}
```

Error codes include `BLUETOOTH_UNAVAILABLE`, `EXTENSION_NOT_INSTALLED`, `PERMISSION_DENIED`, `USER_CANCELLED`, `DEVICE_NOT_FOUND`, `DEVICE_DISCONNECTED`, `CONNECTION_TIMEOUT`, `CONNECTION_LIMIT_REACHED`, `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `CHARACTERISTIC_NOT_READABLE`, `CHARACTERISTIC_NOT_WRITABLE`, `CHARACTERISTIC_NOT_NOTIFIABLE`, `GATT_OPERATION_FAILED`, `SCAN_ALREADY_IN_PROGRESS`, `WRITE_INCOMPLETE`, `TIMEOUT`.

## API surface (abridged)

- `new WebBLE(options?)` — SDK instance with optional `maxConnections`.
- `requestDevice(options)`, `getDevices()`, `getAvailability()`.
- `WebBLEDevice` — `connect()`, `connectWithRetry()`, `disconnect()`, `read()`, `write()`, `writeAuto()`, `writeFragmented()`, `subscribe()`, `subscribeAsync()`, `notifications()` (async iterable), `on('disconnected' | 'queue-overflow' | 'subscription-lost' | 'reconnected', …)`.
- Utilities: `resolveUUID()`, `getServiceName()`, `getCharacteristicName()`, `detectPlatform()`, `withRetry()`.

Full machine-readable reference: <https://ioswebble.com/docs-md/api-reference.md>.

## For AI coding agents

Install the MCP server to get install plans, examples, and spec citations as tool calls:

```bash
npx -y @ios-web-bluetooth/mcp
```

Agents can ingest the full corpus at <https://ioswebble.com/llms-full.txt>.

## Attribution (distribution telemetry)

When the polyfill mounts, it looks for a `data-webble-attr="…"` attribute on
any `<script>` in the DOM and — if the value matches the pinned token regex
`^webble_\d{6}_(mcp|cdn|direct|github|npm)_[a-z0-9]{12,40}$` — fires a single
`sdk_loaded_origin` beacon to `https://beacon.ioswebble.com/beacon`. This
closes the attribution round-trip: the distribution channel (Cursor MCP
install, CDN bootstrap, npm loader, GitHub clone, direct download) stamps a
token when it ships the SDK; the hook reports back when the SDK actually
runs in a page. No token ⇒ no beacon.

The beacon is fire-and-forget, non-blocking (`navigator.sendBeacon` first,
`fetch({keepalive:true})` fallback), and deduplicated per tab via
`sessionStorage.webble_sdk_loaded_emitted`. The payload is minimal:
`{event, attribution_token, props:{sdk_version, platform}}` — no user,
device, page URL, or cookie data is collected.

Opt out by either:

- Adding `data-webble-no-telemetry` to the attributed `<script>` tag, or
- Setting `globalThis.__WEBBLE_NO_TELEMETRY__ = true` before the polyfill
  mounts.

Self-hosters can redirect the endpoint via `globalThis.__WEBBLE_BEACON_URL__`.

## Links

- Homepage: <https://ioswebble.com>
- Docs (human): <https://ioswebble.com/docs>
- Docs (machine-readable): <https://ioswebble.com/docs-md/>
- API reference: <https://ioswebble.com/docs-md/api-reference.md>
- Source: <https://github.com/wklm/WebBLE-Safari-Extension/tree/main/packages/core>
- Issues: <https://github.com/wklm/WebBLE-Safari-Extension/issues>

## License

MIT © wklm.
