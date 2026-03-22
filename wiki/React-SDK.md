# React SDK

`@ios-web-bluetooth/react` provides React hooks and UI components for BLE apps.

## Install

```bash
npm install @ios-web-bluetooth/react @ios-web-bluetooth/core
```

Add `@ios-web-bluetooth/detect` too if you want automatic iOS Safari install prompts.

## Provider Setup

```tsx
import { WebBLEProvider } from '@ios-web-bluetooth/react';

function App() {
  return (
    <WebBLEProvider>
      <MyBluetoothUI />
    </WebBLEProvider>
  );
}
```

You can also use the namespace style shown in the README:

```tsx
import { WebBLE } from '@ios-web-bluetooth/react';

function App() {
  return (
    <WebBLE.Provider>
      <MyBluetoothUI />
    </WebBLE.Provider>
  );
}
```

## Core Hooks

- `useBluetooth()` for availability checks and device requests
- `useDevice(device)` for connection lifecycle and services
- `useCharacteristic(characteristic)` for read/write operations
- `useNotifications(characteristic)` for subscription state and history
- `useScan()` for scanning UX
- `useConnection(device)` for connection state helpers
- `useProfile(ProfileClass, device)` for profile-based integrations

## Example

```tsx
import { useState } from 'react';
import { WebBLEProvider, useBluetooth, useDevice } from '@ios-web-bluetooth/react';

function DevicePanel() {
  const { requestDevice, isAvailable, isSupported } = useBluetooth();
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const { connect, disconnect, isConnected, isConnecting } = useDevice(device);

  const handlePair = async () => {
    const nextDevice = await requestDevice({
      filters: [{ services: ['heart_rate'] }],
    });
    if (nextDevice) {
      setDevice(nextDevice);
    }
  };

  if (!isSupported) return <p>Bluetooth not supported</p>;
  if (!isAvailable) return <p>Bluetooth not available</p>;

  return (
    <div>
      {!device && <button onClick={handlePair}>Pair device</button>}
      {device && !isConnected && (
        <button onClick={connect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      )}
      {isConnected && <button onClick={disconnect}>Disconnect</button>}
    </div>
  );
}

export default function App() {
  return (
    <WebBLEProvider>
      <DevicePanel />
    </WebBLEProvider>
  );
}
```

## Common Components

- `DeviceScanner`
- `ServiceExplorer`
- `ConnectionStatus`
- `InstallationWizard`

## Safari iOS Rule

Even in React, `requestDevice()` must still run from a user gesture. Do not call it from `useEffect`.

## More Detail

- React package README: <https://github.com/wklm/ioswebble-sdk/blob/main/packages/react-sdk/README.md>
- Hosted docs: <https://ioswebble.com/docs#react-sdk>
