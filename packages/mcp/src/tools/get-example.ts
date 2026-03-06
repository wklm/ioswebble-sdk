/**
 * ioswebble_get_example tool implementation
 *
 * Returns complete, copy-pasteable code examples for common BLE use cases.
 * All examples use the real @wklm/core and @wklm/profiles APIs.
 */

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

type UseCase =
  | 'heart-rate'
  | 'battery'
  | 'device-info'
  | 'custom-profile'
  | 'react-hooks'
  | 'scan-filter'
  | 'notifications';

const EXAMPLES: Record<UseCase, { title: string; description: string; code: string }> = {
  'heart-rate': {
    title: 'Heart Rate Monitor',
    description: 'Connect to a heart rate sensor and stream BPM data using HeartRateProfile.',
    code: `import { WebBLE } from '@wklm/core'
import { HeartRateProfile } from '@wklm/profiles'

async function monitorHeartRate() {
  const ble = new WebBLE()

  // Check Bluetooth availability
  const available = await ble.getAvailability()
  if (!available) {
    console.error('Bluetooth is not available')
    return
  }

  // Request a heart rate device
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  })

  // Connect to GATT server
  await device.connect()
  console.log(\`Connected to: \${device.name ?? device.id}\`)

  // Create Heart Rate profile
  const hr = new HeartRateProfile(device)

  // Read sensor location (0=Other, 1=Chest, 2=Wrist, ...)
  try {
    const location = await hr.readSensorLocation()
    const locationNames = ['Other', 'Chest', 'Wrist', 'Finger', 'Hand', 'Ear Lobe', 'Foot']
    console.log(\`Sensor location: \${locationNames[location] ?? 'Unknown'}\`)
  } catch {
    console.log('Sensor location not available')
  }

  // Subscribe to heart rate measurements
  const unsubscribe = hr.onHeartRate((data) => {
    console.log(\`Heart rate: \${data.bpm} bpm\`)

    if (data.contact !== null) {
      console.log(\`Sensor contact: \${data.contact ? 'Yes' : 'No'}\`)
    }
    if (data.energyExpended !== null) {
      console.log(\`Energy expended: \${data.energyExpended} kJ\`)
    }
    if (data.rrIntervals.length > 0) {
      console.log(\`RR intervals: \${data.rrIntervals.map(r => r.toFixed(3) + 's').join(', ')}\`)
    }
  })

  // Handle disconnection
  device.on('disconnected', () => {
    console.log('Device disconnected')
    unsubscribe()
  })

  // To stop later:
  // unsubscribe()
  // hr.stop()
  // device.disconnect()
}

monitorHeartRate()`,
  },

  'battery': {
    title: 'Battery Level Monitor',
    description: 'Read and subscribe to battery level changes using BatteryProfile.',
    code: `import { WebBLE } from '@wklm/core'
import { BatteryProfile } from '@wklm/profiles'

async function monitorBattery() {
  const ble = new WebBLE()

  const device = await ble.requestDevice({
    filters: [{ services: ['battery_service'] }]
  })

  await device.connect()
  console.log(\`Connected to: \${device.name ?? device.id}\`)

  const battery = new BatteryProfile(device)

  // Read current battery level (0-100)
  const level = await battery.readLevel()
  console.log(\`Battery level: \${level}%\`)

  // Subscribe to battery level changes
  const unsubscribe = battery.onLevelChange((level) => {
    console.log(\`Battery level changed: \${level}%\`)
  })

  // Handle disconnection
  device.on('disconnected', () => {
    console.log('Device disconnected')
    unsubscribe()
  })
}

monitorBattery()`,
  },

  'device-info': {
    title: 'Device Information Reader',
    description: 'Read all device information fields using DeviceInfoProfile.',
    code: `import { WebBLE } from '@wklm/core'
import { DeviceInfoProfile } from '@wklm/profiles'

async function readDeviceInfo() {
  const ble = new WebBLE()

  const device = await ble.requestDevice({
    filters: [{ services: ['device_information'] }]
  })

  await device.connect()
  console.log(\`Connected to: \${device.name ?? device.id}\`)

  const info = new DeviceInfoProfile(device)

  // Read all fields at once (missing fields return undefined)
  const details = await info.readAll()
  console.log('Device Information:')
  if (details.manufacturerName) console.log(\`  Manufacturer: \${details.manufacturerName}\`)
  if (details.modelNumber) console.log(\`  Model: \${details.modelNumber}\`)
  if (details.serialNumber) console.log(\`  Serial: \${details.serialNumber}\`)
  if (details.firmwareRevision) console.log(\`  Firmware: \${details.firmwareRevision}\`)
  if (details.hardwareRevision) console.log(\`  Hardware: \${details.hardwareRevision}\`)
  if (details.softwareRevision) console.log(\`  Software: \${details.softwareRevision}\`)

  // Or read individual fields:
  // const manufacturer = await info.readManufacturerName()
  // const model = await info.readModelNumber()
  // const serial = await info.readSerialNumber()
  // const firmware = await info.readFirmwareRevision()
  // const hardware = await info.readHardwareRevision()
  // const software = await info.readSoftwareRevision()

  device.disconnect()
}

readDeviceInfo()`,
  },

  'custom-profile': {
    title: 'Custom BLE Profile with defineProfile()',
    description: 'Create a typed profile for any BLE service using defineProfile().',
    code: `import { WebBLE } from '@wklm/core'
import { defineProfile } from '@wklm/profiles'

// Define a custom profile for an environmental sensor
const EnvironmentProfile = defineProfile({
  name: 'Environment Sensor',
  service: 'environmental_sensing',   // 0x181A — Bluetooth SIG name
  characteristics: {
    temperature: {
      uuid: '2a6e',                   // Temperature characteristic
      parse: (dv: DataView) => dv.getInt16(0, true) / 100, // Celsius
    },
    humidity: {
      uuid: '2a6f',                   // Humidity characteristic
      parse: (dv: DataView) => dv.getUint16(0, true) / 100, // Percent
    },
    pressure: {
      uuid: '2a6d',                   // Pressure characteristic
      parse: (dv: DataView) => dv.getUint32(0, true) / 10, // Pascals
    },
  },
})

async function readEnvironment() {
  const ble = new WebBLE()

  const device = await ble.requestDevice({
    filters: [{ services: ['environmental_sensing'] }]
  })

  await device.connect()

  const env = new EnvironmentProfile(device)

  // Read typed values — return types are inferred from parse functions
  const temp = await env.readChar('temperature')   // number (Celsius)
  const hum = await env.readChar('humidity')        // number (%)
  const pres = await env.readChar('pressure')       // number (Pa)

  console.log(\`Temperature: \${temp.toFixed(1)}C\`)
  console.log(\`Humidity: \${hum.toFixed(1)}%\`)
  console.log(\`Pressure: \${pres.toFixed(0)} Pa\`)

  // Subscribe to temperature changes
  const unsub = env.subscribeChar('temperature', (celsius) => {
    console.log(\`Temperature update: \${celsius.toFixed(1)}C\`)
  })

  // Cleanup
  // unsub()
  // env.stop()
  // device.disconnect()
}

readEnvironment()`,
  },

  'react-hooks': {
    title: 'React Integration with @wklm/react',
    description: 'Full React app with WebBLEProvider, hooks, and heart rate display.',
    code: `import React, { useState } from 'react'
import {
  WebBLEProvider,
  useWebBLE,
  useDevice,
  useNotifications,
} from '@wklm/react'

// 1. Wrap your app with WebBLEProvider
function App() {
  return (
    <WebBLEProvider config={{ apiKey: 'wbl_YOUR_API_KEY' }}>
      <HeartRateApp />
    </WebBLEProvider>
  )
}

// 2. Use hooks in your components
function HeartRateApp() {
  const { requestDevice, isAvailable, isExtensionInstalled, error } = useWebBLE()
  const [rawDevice, setRawDevice] = useState<BluetoothDevice | null>(null)
  const { isConnected, isConnecting, connect, disconnect, services } = useDevice(rawDevice)

  const handleScan = async () => {
    const device = await requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: ['battery_service']
    })
    if (device) {
      setRawDevice(device)
    }
  }

  if (!isAvailable) {
    return <p>Bluetooth not available. {!isExtensionInstalled && 'Install the WebBLE extension.'}</p>
  }

  return (
    <div>
      <h1>Heart Rate Monitor</h1>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}

      {!rawDevice && (
        <button onClick={handleScan}>Scan for Heart Rate Sensor</button>
      )}

      {rawDevice && !isConnected && (
        <button onClick={connect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      )}

      {isConnected && (
        <div>
          <p>Connected to: {rawDevice?.name ?? rawDevice?.id}</p>
          <p>Services discovered: {services.length}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  )
}

export default App`,
  },

  'scan-filter': {
    title: 'Scan with Filters',
    description: 'Various ways to filter BLE device scans using requestDevice options.',
    code: `import { WebBLE } from '@wklm/core'

const ble = new WebBLE()

// 1. Filter by service UUID (most common)
async function scanByService() {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  })
  return device
}

// 2. Filter by device name prefix
async function scanByName() {
  const device = await ble.requestDevice({
    filters: [{ namePrefix: 'Polar' }]
  })
  return device
}

// 3. Filter by exact name
async function scanByExactName() {
  const device = await ble.requestDevice({
    filters: [{ name: 'Polar H10' }]
  })
  return device
}

// 4. Multiple filters (OR — matches any)
async function scanMultipleFilters() {
  const device = await ble.requestDevice({
    filters: [
      { services: ['heart_rate'] },
      { services: ['cycling_power'] },
      { namePrefix: 'Wahoo' },
    ]
  })
  return device
}

// 5. Accept all devices (no filter)
async function scanAll() {
  const device = await ble.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['heart_rate', 'battery_service']
  })
  return device
}

// 6. With optional services (for accessing services not in the filter)
async function scanWithOptional() {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }],
    optionalServices: ['battery_service', 'device_information']
  })
  return device
}

// 7. Check availability first
async function safeConnect() {
  const available = await ble.getAvailability()
  if (!available) {
    throw new Error('Bluetooth not available')
  }
  return ble.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  })
}`,
  },

  'notifications': {
    title: 'BLE Notifications (Callback & AsyncIterator)',
    description: 'Two patterns for receiving BLE notifications: subscribe callback and async iterator.',
    code: `import { WebBLE } from '@wklm/core'

const ble = new WebBLE()

async function notificationPatterns() {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  })
  await device.connect()

  // --- Pattern 1: Callback with subscribe() ---
  // Returns an unsubscribe function
  const unsubscribe = device.subscribe(
    'heart_rate',                 // service name or UUID
    'heart_rate_measurement',     // characteristic name or UUID
    (value: DataView) => {
      const flags = value.getUint8(0)
      const is16bit = (flags & 0x01) !== 0
      const bpm = is16bit ? value.getUint16(1, true) : value.getUint8(1)
      console.log(\`Heart rate: \${bpm} bpm\`)
    }
  )

  // Stop receiving notifications later:
  // unsubscribe()

  // --- Pattern 2: AsyncIterator with notifications() ---
  // Use for-await-of to process values as they arrive
  for await (const value of device.notifications('heart_rate', 'heart_rate_measurement')) {
    const flags = value.getUint8(0)
    const is16bit = (flags & 0x01) !== 0
    const bpm = is16bit ? value.getUint16(1, true) : value.getUint8(1)
    console.log(\`Heart rate: \${bpm} bpm\`)

    // Break to stop the iterator (automatically calls stopNotifications)
    if (bpm > 200) break
  }

  // --- Pattern 3: Read + Notify with raw UUIDs ---
  // You can use short hex UUIDs, full UUIDs, or Bluetooth SIG names
  const batteryLevel = await device.read('180f', '2a19')  // battery service + level
  console.log(\`Battery: \${batteryLevel.getUint8(0)}%\`)

  device.subscribe('180f', '2a19', (value) => {
    console.log(\`Battery changed: \${value.getUint8(0)}%\`)
  })

  // --- Disconnection handling ---
  device.on('disconnected', () => {
    console.log('Device disconnected — all subscriptions auto-cleaned up')
  })
}

notificationPatterns()`,
  },
};

export async function getExampleTool(useCase: UseCase): Promise<ToolResult> {
  const example = EXAMPLES[useCase];

  const output = [
    `## ${example.title}`,
    '',
    example.description,
    '',
    '```typescript',
    example.code,
    '```',
  ];

  return {
    content: [{ type: 'text', text: output.join('\n') }],
  };
}
