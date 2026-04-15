import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { WebBLEProvider, useWebBLE } from '../../src/core/WebBLEProvider';
import { WebBLEDevice } from '@ios-web-bluetooth/core';

const mockBluetooth = (navigator as Navigator & { bluetooth: {
  getAvailability: jest.Mock;
  requestDevice: jest.Mock;
  getDevices: jest.Mock;
  requestLEScan: jest.Mock;
} }).bluetooth;

describe('WebBLEProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBluetooth.getAvailability = jest.fn().mockResolvedValue(true);
    mockBluetooth.requestDevice = jest.fn();
    mockBluetooth.getDevices = jest.fn().mockResolvedValue([]);
    mockBluetooth.requestLEScan = jest.fn();
  });

  it('renders children and provides context', async () => {
    const TestComponent = () => {
      const context = useWebBLE();
      return <div>{context.isLoading ? 'Loading' : 'Ready'}</div>;
    };

    render(
      <WebBLEProvider>
        <div>Child</div>
        <TestComponent />
      </WebBLEProvider>,
    );

    expect(screen.getByText('Child')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Ready')).toBeInTheDocument());
  });

  it('tracks requested devices with WebBLEDevice wrappers', async () => {
    const rawDevice = new (((globalThis as unknown) as { BluetoothDevice: new () => { id: string; name: string; gatt?: unknown } }).BluetoothDevice)();
    rawDevice.id = 'device-1';
    rawDevice.name = 'Wrapped';
    mockBluetooth.requestDevice = jest.fn().mockResolvedValue(rawDevice);

    const TestComponent = () => {
      const { requestDevice, devices } = useWebBLE();

      React.useEffect(() => {
        void requestDevice({ acceptAllDevices: true });
      }, [requestDevice]);

      return <div>{devices[0] instanceof WebBLEDevice ? 'Wrapped device' : 'Missing device'}</div>;
    };

    render(
      <WebBLEProvider>
        <TestComponent />
      </WebBLEProvider>,
    );

    await waitFor(() => expect(screen.getByText('Wrapped device')).toBeInTheDocument());
  });

  it('reuses cached wrappers returned from getDevices', async () => {
    const rawDevice = new (((globalThis as unknown) as { BluetoothDevice: new () => { id: string; name: string; gatt?: unknown } }).BluetoothDevice)();
    rawDevice.id = 'device-1';
    rawDevice.name = 'Cached';
    mockBluetooth.getDevices = jest.fn().mockResolvedValue([rawDevice, rawDevice]);

    const seen: WebBLEDevice[][] = [];

    const TestComponent = () => {
      const { getDevices } = useWebBLE();

      React.useEffect(() => {
        void getDevices().then((devices) => {
          seen.push(devices);
        });
      }, [getDevices]);

      return <div>Loaded</div>;
    };

    render(
      <WebBLEProvider>
        <TestComponent />
      </WebBLEProvider>,
    );

    await waitFor(() => expect(seen[0]).toBeDefined());
    expect(seen[0][0]).toBe(seen[0][1]);
  });
});
