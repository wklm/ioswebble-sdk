# API Reference

beacio exposes two API surfaces:

- **`navigator.bluetooth`** — standard W3C Web Bluetooth API, portable across browsers.
- **`window.beacioIOS`** — iOS-only vendor-prefixed surface (peripheral mode, background sync, beacon scanning). Feature-detect with `'beacioIOS' in window`.

---

## Standard surface — `navigator.bluetooth`

### `requestDevice(options)`
Prompts user to select a BLE peripheral. Requires user gesture (click/tap).
```js
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['heart_rate'] }],
  optionalServices: ['battery_service']
});
```
→ Returns `BluetoothDevice`. Rejects with `NotFoundError` if user cancels.

### `getAvailability()`
Reports whether the extension is reachable on this origin.
```js
if (!(await navigator.bluetooth.getAvailability())) {
  alert('Enable the beacio extension on this site');
}
```

### `device.gatt.connect()` / `.disconnect()`
```js
const server = await device.gatt.connect();
device.addEventListener('gattserverdisconnected', () => console.log('dropped'));
device.gatt.disconnect();
```

### GATT service discovery
```js
const service = await server.getPrimaryService('heart_rate');
const char = await service.getCharacteristic('heart_rate_measurement');
```

### Read / write / notify
```js
const level = (await char.readValue()).getUint8(0);
await char.writeValue(new Uint8Array([0x01, 0x02]));
await char.startNotifications();
char.addEventListener('characteristicvaluechanged', (ev) => {
  const v = ev.target.value; // DataView
});
char.stopNotifications();
```

**W3C Spec references:**
- [requestDevice](https://webbluetoothcg.github.io/web-bluetooth/#dom-bluetooth-requestdevice)
- [getAvailability](https://webbluetoothcg.github.io/web-bluetooth/#dom-bluetooth-getavailability)
- [gatt.connect](https://webbluetoothcg.github.io/web-bluetooth/#dom-bluetoothremotegattserver-connect)

---

## Premium surface — `window.beacioIOS`

```ts
interface BeacioIOS {
  readonly peripheral: BeacioPeripheralManager;
  readonly backgroundSync: BeacioBackgroundSync;
  getCapabilities(): Promise<BeacioCapabilities>;
}
```

### `peripheral` — GATT-server mode
Advertise a custom GATT server from the web page:
- `peripheral.addService(definition)` — register GATT service + characteristics
- `peripheral.startAdvertising(options?)` / `.stopAdvertising()`
- Events: `onwriterequest`, `onsubscriptionchange`, `onconnectionstatechange`

### `backgroundSync` — background operations
Keep connections alive and deliver notifications while Safari is backgrounded:
```ts
interface BeacioBackgroundSync {
  requestPermission(): Promise<'granted' | 'denied' | 'prompt'>;
  requestBackgroundConnection(options): Promise<BackgroundRegistration>;
  registerCharacteristicNotifications(options): Promise<BackgroundRegistration>;
  registerBeaconScanning(options): Promise<BackgroundRegistration>;
  getRegistrations(): Promise<BackgroundRegistration[]>;
  unregister(id: string): Promise<void>;
  update(id: string, template: Partial<NotificationTemplate>): Promise<void>;
  destroy(): void;
}
```

| Category | Actual API |
|----------|-----------|
| backgroundSync | `backgroundSync.requestBackgroundConnection` |
| notifications | `backgroundSync.registerCharacteristicNotifications` |
| beacons | `backgroundSync.registerBeaconScanning` |
| peripheral | `peripheral` manager |
| liveActivity | Companion-app-managed (no direct JS API yet) |

→ Canonical docs: https://beacio.com/docs/api-reference
