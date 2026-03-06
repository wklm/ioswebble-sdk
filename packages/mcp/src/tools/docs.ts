/**
 * ioswebble_docs tool implementation
 *
 * Returns documentation for a given topic. All API references match the real
 * source code in @wklm/core, @wklm/profiles, and @wklm/react.
 */

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

type Topic = 'quickstart' | 'api' | 'react' | 'profiles' | 'errors';

const DOCS: Record<Topic, string> = {
  quickstart: `# iOSWebBLE Quick Start

## What is iOSWebBLE?
iOSWebBLE brings the Web Bluetooth API to iOS Safari via a companion app + Safari Web Extension.
Your existing Web Bluetooth code works unchanged. You only need to add a detection snippet for iOS.

## Step 1: Install packages

\`\`\`bash
# Core BLE SDK
npm install @wklm/core

# Optional: typed BLE profiles
npm install @wklm/profiles

# Optional: React hooks & components
npm install @wklm/react

# Optional: iOS detection + install banner
npm install @wklm/detect
\`\`\`

## Step 2: Add code

\`\`\`typescript
import { WebBLE } from '@wklm/core'

const ble = new WebBLE()

// Check platform support
console.log(ble.platform)     // 'ios-extension' | 'chrome' | 'unsupported'
console.log(ble.isSupported)  // true | false

// Request a device
const device = await ble.requestDevice({
  filters: [{ services: ['heart_rate'] }]
})

// Connect and read
await device.connect()
const value = await device.read('heart_rate', 'heart_rate_measurement')

// Subscribe to notifications
const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', (dv) => {
  console.log('BPM data:', dv)
})

// Handle disconnection
device.on('disconnected', () => console.log('Disconnected'))

// Cleanup
unsub()
device.disconnect()
\`\`\`

## Step 3: Add iOS detection (optional)

\`\`\`typescript
import { initIOSWebBLE } from '@wklm/detect'
initIOSWebBLE({ key: 'wbl_YOUR_API_KEY' })
\`\`\`

This shows an install banner on iOS Safari if the WebBLE extension is not installed.
It is a no-op on Chrome/Android where Web Bluetooth is natively supported.

## Important notes
- Requires HTTPS (localhost is exempted)
- \`requestDevice()\` must be triggered by a user gesture (button click)
- Works alongside native Web Bluetooth on Chrome/Android
- Do NOT modify existing \`navigator.bluetooth\` calls`,

  api: `# iOSWebBLE API Reference

## @wklm/core

### class WebBLE
Entry point for BLE operations.

\`\`\`typescript
import { WebBLE } from '@wklm/core'
const ble = new WebBLE(options?: WebBLEOptions)
\`\`\`

**Properties**:
- \`platform: Platform\` — Detected platform: \`'ios-extension'\` | \`'chrome'\` | \`'unsupported'\`
- \`isSupported: boolean\` — Whether Web Bluetooth is available

**Methods**:
- \`requestDevice(options?: RequestDeviceOptions): Promise<WebBLEDevice>\` — Open device picker
  - \`options.filters\`: Array of \`{ services?, name?, namePrefix? }\`
  - \`options.acceptAllDevices\`: boolean (no filter)
  - \`options.optionalServices\`: string[] (additional services to access)
- \`getAvailability(): Promise<boolean>\` — Check if Bluetooth is available

---

### class WebBLEDevice
Represents a connected BLE device. Wraps BluetoothDevice with caching and cleanup.

**Properties**:
- \`id: string\` — Device identifier
- \`name: string | undefined\` — Device name (if advertised)
- \`connected: boolean\` — Current connection state
- \`raw: BluetoothDevice\` — Underlying Web Bluetooth device

**Methods**:
- \`connect(): Promise<void>\` — Connect to GATT server
- \`disconnect(): void\` — Disconnect and clean up all subscriptions
- \`read(service: string, characteristic: string): Promise<DataView>\` — Read a characteristic value
- \`write(service: string, characteristic: string, value: BufferSource): Promise<void>\` — Write with response
- \`writeWithoutResponse(service: string, characteristic: string, value: BufferSource): Promise<void>\` — Write without response
- \`subscribe(service: string, characteristic: string, callback: (value: DataView) => void): () => void\` — Subscribe to notifications; returns unsubscribe function
- \`notifications(service: string, characteristic: string): AsyncIterable<DataView>\` — Async iterator for notifications
- \`on(event: 'disconnected', fn: () => void): void\` — Add disconnect listener
- \`off(event: 'disconnected', fn: () => void): void\` — Remove disconnect listener

**UUID resolution**: Service and characteristic parameters accept:
- Bluetooth SIG names: \`'heart_rate'\`, \`'battery_level'\`
- 4-hex shorthand: \`'180d'\`, \`'2a37'\`
- 8-hex shorthand: \`'0000180d'\`
- Full 128-bit UUIDs: \`'0000180d-0000-1000-8000-00805f9b34fb'\`

---

### class WebBLEError
Typed BLE error with error code and recovery suggestion.

\`\`\`typescript
import { WebBLEError } from '@wklm/core'
\`\`\`

**Properties**:
- \`code: WebBLEErrorCode\` — Machine-readable error code
- \`suggestion: string\` — Human-readable recovery hint
- \`message: string\` — Error message

**Static methods**:
- \`WebBLEError.from(error: unknown, fallbackCode?: WebBLEErrorCode): WebBLEError\` — Wrap any error into a WebBLEError with auto-detected code

---

### UUID utilities

\`\`\`typescript
import { resolveUUID, getServiceName, getCharacteristicName } from '@wklm/core'
\`\`\`

- \`resolveUUID(nameOrUUID: string): string\` — Resolve name/short-UUID to full 128-bit UUID
- \`getServiceName(uuid: string): string | undefined\` — Reverse lookup: UUID to service name
- \`getCharacteristicName(uuid: string): string | undefined\` — Reverse lookup: UUID to characteristic name`,

  react: `# @wklm/react — React SDK

## Setup

\`\`\`tsx
import { WebBLEProvider } from '@wklm/react'

function App() {
  return (
    <WebBLEProvider config={{
      apiKey: 'wbl_YOUR_API_KEY',      // Optional: enables iOS install prompt
      operatorName: 'MyApp',            // Optional: shown in install prompt
      autoConnect: false,               // Optional
      retryAttempts: 3,                 // Optional
    }}>
      <YourApp />
    </WebBLEProvider>
  )
}
\`\`\`

## Hooks

### useWebBLE()
Main context hook. Must be inside \`<WebBLEProvider>\`.

\`\`\`typescript
const {
  isAvailable,            // boolean — Bluetooth API available
  isExtensionInstalled,   // boolean — WebBLE extension detected
  isLoading,              // boolean — initial availability check
  isScanning,             // boolean — LE scan active
  devices,                // BluetoothDevice[] — discovered devices
  error,                  // Error | null
  core,                   // WebBLE instance (if @wklm/core installed)
  requestDevice,          // (options?) => Promise<BluetoothDevice | null>
  getDevices,             // () => Promise<BluetoothDevice[]>
  requestLEScan,          // (options?) => Promise<BluetoothLEScan | null>
  stopScan,               // () => void
} = useWebBLE()
\`\`\`

### useDevice(device)
Manage a specific Bluetooth device.

\`\`\`typescript
const {
  device,              // BluetoothDevice | null
  isConnected,         // boolean
  isConnecting,        // boolean
  services,            // BluetoothRemoteGATTService[]
  error,               // Error | null
  connect,             // () => Promise<void>
  disconnect,          // () => void
  forget,              // () => Promise<void>
} = useDevice(bluetoothDevice)
\`\`\`

### useNotifications(characteristic, options?)
Subscribe to characteristic notifications.

\`\`\`typescript
const {
  isSubscribed,     // boolean
  value,            // DataView | null — latest value
  history,          // NotificationEntry[] — { timestamp, value }
  subscribe,        // () => Promise<void>
  unsubscribe,      // () => Promise<void>
  clear,            // () => void — clear history
  error,            // Error | null
} = useNotifications(characteristic, {
  autoSubscribe: true,   // auto-subscribe when characteristic is available
  maxHistory: 100,       // max notification history entries
})
\`\`\`

### Other hooks
- \`useBluetooth()\` — low-level Bluetooth API access
- \`useCharacteristic()\` — read/write characteristic values
- \`useScan()\` — BLE scanning control
- \`useConnection()\` — connection lifecycle management
- \`useProfile()\` — typed profile integration

## Components
- \`<DeviceScanner />\` — ready-made device scanner UI
- \`<ServiceExplorer />\` — browse services and characteristics
- \`<ConnectionStatus />\` — connection state indicator
- \`<InstallationWizard />\` — iOS extension install guide`,

  profiles: `# @wklm/profiles — Typed BLE Profiles

## Built-in profiles

### HeartRateProfile
Service: \`heart_rate\` (0x180D)

\`\`\`typescript
import { HeartRateProfile } from '@wklm/profiles'
import type { HeartRateData } from '@wklm/profiles'

const hr = new HeartRateProfile(device)

// Subscribe to heart rate measurements
const unsub = hr.onHeartRate((data: HeartRateData) => {
  data.bpm              // number — beats per minute
  data.contact          // boolean | null — sensor contact
  data.energyExpended   // number | null — kJ
  data.rrIntervals      // number[] — RR intervals in seconds
})

// Read sensor location (0=Other, 1=Chest, 2=Wrist, ...)
const location = await hr.readSensorLocation()

// Reset energy expended counter
await hr.resetEnergyExpended()

// Stop all subscriptions
hr.stop()
\`\`\`

### BatteryProfile
Service: \`battery_service\` (0x180F)

\`\`\`typescript
import { BatteryProfile } from '@wklm/profiles'

const battery = new BatteryProfile(device)

const level = await battery.readLevel()  // 0-100
const unsub = battery.onLevelChange((level) => {
  console.log(\`Battery: \${level}%\`)
})
battery.stop()
\`\`\`

### DeviceInfoProfile
Service: \`device_information\` (0x180A)

\`\`\`typescript
import { DeviceInfoProfile } from '@wklm/profiles'
import type { DeviceInfo } from '@wklm/profiles'

const info = new DeviceInfoProfile(device)

// Read all fields at once
const details: DeviceInfo = await info.readAll()
details.manufacturerName  // string | undefined
details.modelNumber       // string | undefined
details.serialNumber      // string | undefined
details.firmwareRevision  // string | undefined
details.hardwareRevision  // string | undefined
details.softwareRevision  // string | undefined
details.systemId          // DataView | undefined

// Or read individually
const manufacturer = await info.readManufacturerName()
const model = await info.readModelNumber()
\`\`\`

## Custom profiles with defineProfile()

\`\`\`typescript
import { defineProfile } from '@wklm/profiles'

const MyProfile = defineProfile({
  name: 'My Sensor',
  service: '12345678-1234-1234-1234-123456789abc',
  characteristics: {
    temperature: {
      uuid: '12345678-1234-1234-1234-123456789abd',
      parse: (dv: DataView) => dv.getInt16(0, true) / 100,
    },
    humidity: {
      uuid: '12345678-1234-1234-1234-123456789abe',
      parse: (dv: DataView) => dv.getUint16(0, true) / 100,
    },
  },
})

const profile = new MyProfile(device)
await profile.connect()

// Typed read — return type inferred from parse function
const temp = await profile.readChar('temperature')  // number
const hum = await profile.readChar('humidity')       // number

// Typed subscribe
const unsub = profile.subscribeChar('temperature', (celsius) => {
  console.log(\`Temp: \${celsius}C\`)
})

profile.stop()
\`\`\`

## BaseProfile
All profiles extend \`BaseProfile\`:

\`\`\`typescript
abstract class BaseProfile {
  constructor(device: WebBLEDevice)
  connect(): Promise<void>
  stop(): void                          // unsubscribe all
  protected read(characteristic: string): Promise<DataView>
  protected write(characteristic: string, value: BufferSource): Promise<void>
  protected subscribe(characteristic: string, callback: (dv: DataView) => void): () => void
}
\`\`\``,

  errors: `# iOSWebBLE Error Reference

All errors are instances of \`WebBLEError\` from \`@wklm/core\`.

\`\`\`typescript
import { WebBLEError } from '@wklm/core'

try {
  const device = await ble.requestDevice({ ... })
} catch (e) {
  if (e instanceof WebBLEError) {
    console.log(e.code)        // 'DEVICE_NOT_FOUND'
    console.log(e.suggestion)  // human-readable fix
  }
}
\`\`\`

## Error codes

| Code | When | Suggestion |
|------|------|------------|
| \`BLUETOOTH_UNAVAILABLE\` | Browser/device doesn't support BLE | Check browser + Bluetooth enabled |
| \`EXTENSION_NOT_INSTALLED\` | iOS Safari without WebBLE extension | Add @wklm/detect for install banner |
| \`PERMISSION_DENIED\` | User denied Bluetooth permission | Must trigger from user gesture |
| \`DEVICE_NOT_FOUND\` | No matching device in scan | Check filters, device power, range |
| \`DEVICE_DISCONNECTED\` | GATT op on disconnected device | Call device.connect() first |
| \`CONNECTION_TIMEOUT\` | Device didn't respond in time | Check range, device state |
| \`SERVICE_NOT_FOUND\` | Service UUID not on device | Check UUID, add to optionalServices |
| \`CHARACTERISTIC_NOT_FOUND\` | Characteristic UUID not in service | Verify UUID against device spec |
| \`CHARACTERISTIC_NOT_READABLE\` | Read on non-readable char | Use subscribe() for notify-only |
| \`CHARACTERISTIC_NOT_WRITABLE\` | Write on non-writable char | Check char properties |
| \`CHARACTERISTIC_NOT_NOTIFIABLE\` | Subscribe on non-notify char | Use read() for polling |
| \`GATT_OPERATION_FAILED\` | Generic GATT failure | Check connection, retry |
| \`SCAN_ALREADY_IN_PROGRESS\` | Duplicate scan request | Wait for current scan to finish |
| \`USER_CANCELLED\` | User dismissed device picker | No action needed |
| \`TIMEOUT\` | Operation timed out | Check connectivity, retry |

## Auto-detection
\`WebBLEError.from(error)\` automatically classifies native errors by inspecting the message:
- "User cancelled" -> \`USER_CANCELLED\`
- "no devices found" -> \`DEVICE_NOT_FOUND\`
- "No Services matching" -> \`SERVICE_NOT_FOUND\`
- "GATT Server is disconnected" -> \`DEVICE_DISCONNECTED\`
- And more — see errors.ts for the full mapping`,
};

export async function docsTool(topic: Topic): Promise<ToolResult> {
  const doc = DOCS[topic];

  return {
    content: [{ type: 'text', text: doc }],
  };
}
