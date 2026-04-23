/**
 * ioswebble_add tool implementation
 *
 * Installs a package and generates boilerplate starter code.
 */

import * as fs from 'fs';
import * as path from 'path';

type Package = 'core' | 'profiles' | 'react' | 'detect';

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

type Framework =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'react-vite'
  | 'react-cra'
  | 'vue'
  | 'nuxt'
  | 'sveltekit'
  | 'angular'
  | 'html'
  | 'auto';

function detectFramework(projectPath: string): Framework {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return fs.existsSync(path.join(projectPath, 'index.html')) ? 'html' : 'auto';
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps?.next) {
    const hasAppRouter = ['app/layout.tsx', 'app/layout.jsx', 'src/app/layout.tsx', 'src/app/layout.jsx']
      .some(f => fs.existsSync(path.join(projectPath, f)));
    return hasAppRouter ? 'nextjs-app' : 'nextjs-pages';
  }
  if (deps?.nuxt) return 'nuxt';
  if (deps?.['@sveltejs/kit']) return 'sveltekit';
  if (deps?.react && deps?.vite) return 'react-vite';
  if (deps?.react) return 'react-cra';
  if (deps?.vue) return 'vue';
  if (deps?.['@angular/core']) return 'angular';
  if (fs.existsSync(path.join(projectPath, 'index.html'))) return 'html';
  return 'auto';
}

function getInstallCommand(pkg: Package): string {
  const names: Record<Package, string> = {
    core: '@ios-web-bluetooth/core',
    profiles: '@ios-web-bluetooth/profiles @ios-web-bluetooth/core',
    react: '@ios-web-bluetooth/react @ios-web-bluetooth/core',
    detect: '@ios-web-bluetooth/detect',
  };
  return `npm install ${names[pkg]}`;
}

function getStarterCode(pkg: Package, framework: Framework): string {
  switch (pkg) {
    case 'core':
      return `import { WebBLE } from '@ios-web-bluetooth/core'

const ble = new WebBLE()

async function connectToDevice() {
  // Request a BLE device with a service filter
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  })

  // Connect to the device's GATT server
  await device.connect()

  // Read a characteristic value
  const value = await device.read('heart_rate', 'heart_rate_measurement')
  console.log('Value:', value)

  // Subscribe to notifications
  const unsubscribe = device.subscribe('heart_rate', 'heart_rate_measurement', (dv) => {
    console.log('Notification:', dv)
  })

  // Listen for disconnection
  device.on('disconnected', () => {
    console.log('Device disconnected')
  })

  // Later: clean up
  // unsubscribe()
  // device.disconnect()
}`;

    case 'profiles':
      return `import { WebBLE } from '@ios-web-bluetooth/core'
import { HeartRateProfile, BatteryProfile, DeviceInfoProfile } from '@ios-web-bluetooth/profiles'

const ble = new WebBLE()

async function useProfiles() {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }],
    optionalServices: ['battery_service', 'device_information']
  })
  await device.connect()

  // Heart Rate Profile
  const hr = new HeartRateProfile(device)
  const unsub = hr.onHeartRate((data) => {
    console.log(\`Heart rate: \${data.bpm} bpm\`)
    console.log(\`Contact: \${data.contact}\`)
    if (data.energyExpended !== null) console.log(\`Energy: \${data.energyExpended} kJ\`)
    if (data.rrIntervals.length) console.log(\`RR intervals: \${data.rrIntervals}\`)
  })

  // Battery Profile
  const battery = new BatteryProfile(device)
  const level = await battery.readLevel()
  console.log(\`Battery: \${level}%\`)

  // Device Info Profile
  const info = new DeviceInfoProfile(device)
  const details = await info.readAll()
  console.log('Device info:', details)

  // Cleanup
  // unsub()
  // hr.stop()
}`;

    case 'react':
      if (framework === 'nextjs-app' || framework === 'nextjs-pages') {
        return `// In your layout or _app file:
import { WebBLEProvider } from '@ios-web-bluetooth/react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <WebBLEProvider config={{ apiKey: 'wbl_YOUR_API_KEY' }}>
      {children}
    </WebBLEProvider>
  )
}

// In a component:
import { useWebBLE, useDevice, useNotifications } from '@ios-web-bluetooth/react'

function HeartRateMonitor() {
  const { requestDevice, isAvailable, isExtensionInstalled } = useWebBLE()
  const [rawDevice, setRawDevice] = useState<BluetoothDevice | null>(null)
  const { isConnected, connect, disconnect } = useDevice(rawDevice)

  const handleConnect = async () => {
    const device = await requestDevice({
      filters: [{ services: ['heart_rate'] }]
    })
    if (device) {
      setRawDevice(device)
    }
  }

  return (
    <div>
      <p>Bluetooth: {isAvailable ? 'Available' : 'Not available'}</p>
      <p>Extension: {isExtensionInstalled ? 'Installed' : 'Not installed'}</p>
      <button onClick={handleConnect}>Connect</button>
      {isConnected && <button onClick={disconnect}>Disconnect</button>}
    </div>
  )
}`;
      }
      return `import { WebBLEProvider, useWebBLE, useDevice } from '@ios-web-bluetooth/react'

// Wrap your app:
function App() {
  return (
    <WebBLEProvider config={{ apiKey: 'wbl_YOUR_API_KEY' }}>
      <MyComponent />
    </WebBLEProvider>
  )
}

// Use in components:
function MyComponent() {
  const { requestDevice, isAvailable, isExtensionInstalled } = useWebBLE()
  const [rawDevice, setRawDevice] = useState<BluetoothDevice | null>(null)
  const { isConnected, connect, disconnect } = useDevice(rawDevice)

  const handleConnect = async () => {
    const device = await requestDevice({
      filters: [{ services: ['heart_rate'] }]
    })
    if (device) {
      setRawDevice(device)
    }
  }

  return (
    <div>
      <p>Bluetooth: {isAvailable ? 'Available' : 'Not available'}</p>
      <p>Extension: {isExtensionInstalled ? 'Installed' : 'Not installed'}</p>
      <button onClick={handleConnect}>Connect</button>
      {isConnected && <button onClick={disconnect}>Disconnect</button>}
    </div>
  )
}`;

    case 'detect':
      if (framework === 'html') {
        return `<!-- Add before </body> -->
<script src="https://ioswebble.com/webble.js" data-key="wbl_YOUR_API_KEY"></script>`;
      }
      if (framework === 'nextjs-app' || framework === 'nextjs-pages') {
        return `import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react'

export default function Layout({ children }) {
  return <IOSWebBLEProvider apiKey="wbl_YOUR_API_KEY">{children}</IOSWebBLEProvider>
}`;
      }
      return `import { initIOSWebBLE } from '@ios-web-bluetooth/detect'

// Call once at app startup
initIOSWebBLE({ key: 'wbl_YOUR_API_KEY' })`;
  }
}

export async function addTool(projectPath: string, pkg: Package): Promise<ToolResult> {
  const framework = detectFramework(projectPath);
  const installCmd = getInstallCommand(pkg);
  const starterCode = getStarterCode(pkg, framework);

  const lines: string[] = [];
  lines.push(`## Install @ios-web-bluetooth/${pkg === 'detect' ? '' : ''}${pkg === 'detect' ? '@ios-web-bluetooth/detect' : `@ios-web-bluetooth/${pkg}`}`);
  lines.push('');
  lines.push(`Detected framework: **${framework}**`);
  lines.push('');
  lines.push('### 1. Install');
  lines.push('```');
  lines.push(installCmd);
  lines.push('```');
  lines.push('');
  lines.push('### 2. Starter code');
  lines.push('```typescript');
  lines.push(starterCode);
  lines.push('```');

  if (pkg === 'core') {
    lines.push('');
    lines.push('### Tip');
    lines.push('Add `@ios-web-bluetooth/profiles` for typed helpers: `HeartRateProfile`, `BatteryProfile`, `DeviceInfoProfile`.');
  }
  if (pkg === 'profiles') {
    lines.push('');
    lines.push('### Tip');
    lines.push('Use `defineProfile()` to create custom profiles for your own BLE peripherals.');
  }
  if (pkg === 'react') {
    lines.push('');
    lines.push('### Available hooks');
    lines.push('- `useWebBLE()` — context: isAvailable, requestDevice, devices, error');
    lines.push('- `useDevice(device)` — connect, disconnect, isConnected, services');
    lines.push('- `useNotifications(characteristic)` — subscribe, value, history');
    lines.push('- `useCharacteristic()` — read/write characteristic values');
    lines.push('- `useScan()` — BLE scanning control');
    lines.push('- `useConnection()` — connection lifecycle');
    lines.push('- `useProfile()` — typed profile integration');
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
