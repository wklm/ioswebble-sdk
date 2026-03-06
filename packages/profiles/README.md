# @wklm/profiles

Pre-built BLE device profiles -- heart rate, battery, device info. Typed parsers for Bluetooth GATT characteristics.

## Install

```bash
npm install @wklm/profiles @wklm/core
```

## Usage

```typescript
import { WebBLE } from '@wklm/core';
import { HeartRateProfile } from '@wklm/profiles';

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

## Available profiles

- **`HeartRateProfile`** -- `onHeartRate(cb)`, `readSensorLocation()`, `resetEnergyExpended()`
- **`BatteryProfile`** -- battery level reads and notifications
- **`DeviceInfoProfile`** -- manufacturer, model, firmware, serial number
- **`defineProfile(config)`** -- factory to create custom profiles with typed parsers

## AI agent integration

MCP server for coding agents (Claude Code, Cursor, Copilot):

```
npx -y @wklm/mcp
```

Full SDK reference for LLM context: <https://ioswebble.com/llms-full.txt>

## Two scopes

The **`@wklm/*`** packages (`core`, `profiles`, `react`) are the cross-browser BLE SDK -- they work on any platform with Web Bluetooth support (Chrome, Edge, iOS Safari via the extension). The **`@wklm/*`** packages (`detect`, `cli`, `mcp`, `skill`) handle iOS-specific extension detection, install prompts, and agent tooling. Use both together for full iOS Safari coverage.
