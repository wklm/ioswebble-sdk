# Recipes

Copy-paste runnable snippets. Assumes extension is installed and `@beacio/core` is loaded.

## Heart Rate

```js
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['heart_rate'] }]
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService('heart_rate');
const char = await service.getCharacteristic('heart_rate_measurement');
await char.startNotifications();
char.addEventListener('characteristicvaluechanged', (ev) => {
  const v = ev.target.value;
  const bpm = v.getUint8(0) & 0x01 ? v.getUint16(1, true) : v.getUint8(1);
  console.log(`${bpm} bpm`);
});
```

## Battery Level

```js
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['battery_service'] }]
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService('battery_service');
const char = await service.getCharacteristic('battery_level');
const level = (await char.readValue()).getUint8(0); // 0–100
console.log(`${level}% battery`);
```

## CGM (Continuous Glucose Monitor)

```js
const CGM_SERVICE = 0x181f;
const CGM_MEASUREMENT = 0x2aa7;

const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: [CGM_SERVICE] }]
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService(CGM_SERVICE);
const char = await service.getCharacteristic(CGM_MEASUREMENT);
await char.startNotifications();
function decodeSFLOAT(val) {
  let mantissa = val & 0x0FFF;
  let exp = (val >> 12) & 0xF;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (exp >= 0x8) exp -= 0x10;
  return mantissa * Math.pow(10, exp);
}
char.addEventListener('characteristicvaluechanged', (ev) => {
  const v = ev.target.value;
  const glucose = decodeSFLOAT(v.getUint16(2, true));
  console.log(`glucose mg/dL=${glucose.toFixed(1)}`);
});
```

## Lock

```js
const LOCK_SERVICE = '0000fee0-0000-1000-8000-00805f9b34fb';
const LOCK_COMMAND = '0000fee1-0000-1000-8000-00805f9b34fb';

const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: [LOCK_SERVICE] }]
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService(LOCK_SERVICE);
const char = await service.getCharacteristic(LOCK_COMMAND);
// Example: 0x02 = unlock, followed by an auth token negotiated at pairing
const authToken = new Uint8Array([0xde, 0xad, 0xbe, 0xef]); // Replace with your negotiated auth token
await char.writeValue(new Uint8Array([0x02, ...authToken]));
```

Real locks require vendor authentication handshakes — consult your lock's integration spec.

## Beacon (premium)

```js
if (!('beacioIOS' in window)) throw new Error('Requires companion app');

const reg = await window.beacioIOS.backgroundSync.registerBeaconScanning({
  filters: [{ services: ['heart_rate'] }],
  cooldownSeconds: 30,
  template: {
    title: 'Beacon in range',
    body: 'Detected {{deviceName}} at {{timestamp}}',
    url: 'https://example.com/beacon-hit'
  }
});
console.log('registered', reg.id);
// later: reg.unregister();
```

Template placeholders: `{{deviceName}}`, `{{device.id}}`, `{{value.hex}}`, `{{value.utf8}}`, `{{timestamp}}`.

## Peripheral Chat (premium)

```js
if (!('beacioIOS' in window)) throw new Error('Requires companion app');

const CHAT_SERVICE = '12345678-1234-5678-1234-56789abcdef0';
const CHAT_CHAR    = '12345678-1234-5678-1234-56789abcdef1';

const record = await window.beacioIOS.peripheral.addService({
  uuid: CHAT_SERVICE,
  characteristics: [{
    uuid: CHAT_CHAR,
    properties: ['read', 'write', 'notify'],
    value: new TextEncoder().encode('hello')
  }]
});

window.beacioIOS.peripheral.onwriterequest = (ev) => {
  const msg = new TextDecoder().decode(ev.value);
  console.log('central wrote:', msg);
};

await window.beacioIOS.peripheral.startAdvertising({
  localName: 'beacio Chat',
  serviceUUIDs: [CHAT_SERVICE]
});
```

→ Canonical docs: https://beacio.com/docs/recipes
