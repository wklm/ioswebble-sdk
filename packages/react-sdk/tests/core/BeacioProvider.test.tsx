import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BeacioProvider, useBeacio } from '../../src/core/BeacioProvider';
import { BeacioDevice } from '@beacio/core';

const mockBluetooth = (navigator as Navigator & { bluetooth: {
  getAvailability: jest.Mock;
  requestDevice: jest.Mock;
  getDevices: jest.Mock;
  requestLEScan: jest.Mock;
} }).bluetooth;

describe('BeacioProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBluetooth.getAvailability = jest.fn().mockResolvedValue(true);
    mockBluetooth.requestDevice = jest.fn();
    mockBluetooth.getDevices = jest.fn().mockResolvedValue([]);
    mockBluetooth.requestLEScan = jest.fn();
  });

  it('renders children and provides context', async () => {
    const TestComponent = () => {
      const context = useBeacio();
      return <div>{context.isLoading ? 'Loading' : 'Ready'}</div>;
    };

    render(
      <BeacioProvider>
        <div>Child</div>
        <TestComponent />
      </BeacioProvider>,
    );

    expect(screen.getByText('Child')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Ready')).toBeInTheDocument());
  });

  it('tracks requested devices with BeacioDevice wrappers', async () => {
    const rawDevice = new (((globalThis as unknown) as { BluetoothDevice: new () => { id: string; name: string; gatt?: unknown } }).BluetoothDevice)();
    rawDevice.id = 'device-1';
    rawDevice.name = 'Wrapped';
    mockBluetooth.requestDevice = jest.fn().mockResolvedValue(rawDevice);

    const TestComponent = () => {
      const { requestDevice, devices } = useBeacio();

      React.useEffect(() => {
        void requestDevice({ acceptAllDevices: true });
      }, [requestDevice]);

      return <div>{devices[0] instanceof BeacioDevice ? 'Wrapped device' : 'Missing device'}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(screen.getByText('Wrapped device')).toBeInTheDocument());
  });

  it('reuses cached wrappers returned from getDevices', async () => {
    const rawDevice = new (((globalThis as unknown) as { BluetoothDevice: new () => { id: string; name: string; gatt?: unknown } }).BluetoothDevice)();
    rawDevice.id = 'device-1';
    rawDevice.name = 'Cached';
    mockBluetooth.getDevices = jest.fn().mockResolvedValue([rawDevice, rawDevice]);

    const seen: BeacioDevice[][] = [];

    const TestComponent = () => {
      const { getDevices } = useBeacio();

      React.useEffect(() => {
        void getDevices().then((devices) => {
          seen.push(devices);
        });
      }, [getDevices]);

      return <div>Loaded</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(seen[0]).toBeDefined());
    expect(seen[0][0]).toBe(seen[0][1]);
  });

  it('sets isAvailable to false and isLoading to false when getAvailability rejects', async () => {
    mockBluetooth.getAvailability = jest.fn().mockRejectedValue(new Error('Bluetooth unavailable'));

    const TestComponent = () => {
      const { isAvailable, isLoading } = useBeacio();
      if (isLoading) return <div>Loading</div>;
      return <div>{isAvailable ? 'Available' : 'Unavailable'}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(screen.getByText('Unavailable')).toBeInTheDocument());
  });

  it('does not expose error when getAvailability rejects (core swallows)', async () => {
    // Beacio.getAvailability() catches internally and returns false, so
    // the provider's catch block never fires and error remains null.
    mockBluetooth.getAvailability = jest.fn().mockRejectedValue(new Error('fail'));

    let capturedError: unknown = 'sentinel';
    const TestComponent = () => {
      const { error, isLoading } = useBeacio();
      if (!isLoading) capturedError = error;
      return <div>{isLoading ? 'Loading' : 'Done'}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument());
    expect(capturedError).toBeNull();
  });

  it('returns null and sets error when requestDevice fails', async () => {
    mockBluetooth.requestDevice = jest.fn().mockRejectedValue(new Error('GATT operation failed'));

    let capturedResult: BeacioDevice | null | undefined;
    const TestComponent = () => {
      const { requestDevice, error } = useBeacio();

      React.useEffect(() => {
        void requestDevice({ acceptAllDevices: true }).then((result) => {
          capturedResult = result;
        });
      }, [requestDevice]);

      return <div>{error ? `Error: ${error.message}` : 'No error'}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Error:/)).toBeInTheDocument());
    expect(capturedResult).toBeNull();
  });

  /**
   * Render a provider whose child fires one requestDevice() and reports the
   * provider's `error` as text. Resolves only once the requestDevice promise
   * has SETTLED, so an assertion can never pass by out-racing the setError
   * commit (the initial render also shows "No error").
   */
  const renderRequestDeviceOnce = async () => {
    let settled = false;
    let capturedResult: BeacioDevice | null | undefined;

    const TestComponent = () => {
      const { requestDevice, error } = useBeacio();

      React.useEffect(() => {
        void requestDevice({ acceptAllDevices: true }).then((result) => {
          capturedResult = result;
          settled = true;
        });
      }, [requestDevice]);

      return <div>{error ? `Error(${error.code}): ${error.message}` : 'No error'}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(settled).toBe(true));
    return { getResult: () => capturedResult };
  };

  // Web Bluetooth OVERLOADS NotFoundError: Chromium maps CHOOSER_CANCELLED,
  // NO_BLUETOOTH_ADAPTER, CHOSEN_DEVICE_VANISHED and friends all onto
  // NotFoundError (third_party/blink/renderer/modules/bluetooth/bluetooth_error.cc
  // lines 148-178). The ONLY discriminator between "user dismissed the chooser"
  // and a genuine failure is the message, and the beacio polyfill reproduces
  // Chromium's cancellation string verbatim (src/extension/page-bootstrap.ts:384,
  // src/beacio/api/bluetooth.ts:563). These two tests pin BOTH sides of that
  // fork, so a suppression fix can never degrade into "swallow every error".
  it('does not set error on user cancellation (NotFoundError)', async () => {
    mockBluetooth.requestDevice = jest.fn().mockRejectedValue(
      new DOMException('User cancelled the requestDevice() chooser.', 'NotFoundError'),
    );

    const { getResult } = await renderRequestDeviceOnce();

    expect(mockBluetooth.requestDevice).toHaveBeenCalled();
    expect(getResult()).toBeNull();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('DOES set error when a NotFoundError is a genuine failure, not a cancellation', async () => {
    mockBluetooth.requestDevice = jest.fn().mockRejectedValue(
      new DOMException("User selected a device that doesn't exist anymore.", 'NotFoundError'),
    );

    const { getResult } = await renderRequestDeviceOnce();

    expect(getResult()).toBeNull();
    expect(screen.getByText(/^Error\(DEVICE_NOT_FOUND\):/)).toBeInTheDocument();
  });

  it('tracks multiple devices from successive requestDevice calls', async () => {
    const makeRawDevice = (id: string, name: string) => {
      const d = new (((globalThis as unknown) as { BluetoothDevice: new () => { id: string; name: string; gatt?: unknown } }).BluetoothDevice)();
      d.id = id;
      d.name = name;
      return d;
    };

    let callCount = 0;
    mockBluetooth.requestDevice = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(makeRawDevice(`device-${callCount}`, `Device ${callCount}`));
    });

    const TestComponent = () => {
      const { requestDevice, devices } = useBeacio();

      React.useEffect(() => {
        void (async () => {
          await requestDevice({ acceptAllDevices: true });
          await requestDevice({ acceptAllDevices: true });
        })();
      }, [requestDevice]);

      return <div>Count: {devices.length}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(screen.getByText('Count: 2')).toBeInTheDocument());
  });

  it('does not duplicate a device with the same id on repeated requestDevice calls', async () => {
    const rawDevice = new (((globalThis as unknown) as { BluetoothDevice: new () => { id: string; name: string; gatt?: unknown } }).BluetoothDevice)();
    rawDevice.id = 'device-dup';
    rawDevice.name = 'Duplicate';
    mockBluetooth.requestDevice = jest.fn().mockResolvedValue(rawDevice);

    const TestComponent = () => {
      const { requestDevice, devices } = useBeacio();

      React.useEffect(() => {
        void (async () => {
          await requestDevice({ acceptAllDevices: true });
          await requestDevice({ acceptAllDevices: true });
        })();
      }, [requestDevice]);

      return <div>Count: {devices.length}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(mockBluetooth.requestDevice).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('provides a stable context reference across re-renders', async () => {
    const snapshots: ReturnType<typeof useBeacio>[] = [];

    const TestComponent = () => {
      const context = useBeacio();
      snapshots.push(context);
      return <div>Render {snapshots.length}</div>;
    };

    const { rerender } = render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Render/)).toBeInTheDocument());

    rerender(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(snapshots.length).toBeGreaterThanOrEqual(2));
    // requestDevice callback should be referentially stable between renders
    const last = snapshots[snapshots.length - 1];
    const prev = snapshots[snapshots.length - 2];
    expect(last.requestDevice).toBe(prev.requestDevice);
    expect(last.stopScan).toBe(prev.stopScan);
  });

  it('throws when useBeacio is used outside of BeacioProvider', () => {
    const TestComponent = () => {
      useBeacio();
      return <div>Should not render</div>;
    };

    // Suppress the expected error boundary output
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useBeacio must be used within a BeacioProvider');

    spy.mockRestore();
  });

  it('cleans up event listener on unmount', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <BeacioProvider>
        <div>Child</div>
      </BeacioProvider>,
    );

    await waitFor(() => expect(addSpy).toHaveBeenCalledWith('beacio:extension:ready', expect.any(Function)));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('beacio:extension:ready', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('exposes error from getDevices failure and returns previous devices', async () => {
    const rawDevice = new (((globalThis as unknown) as { BluetoothDevice: new () => { id: string; name: string; gatt?: unknown } }).BluetoothDevice)();
    rawDevice.id = 'device-1';
    rawDevice.name = 'First';
    mockBluetooth.requestDevice = jest.fn().mockResolvedValue(rawDevice);

    const TestComponent = () => {
      const { requestDevice, getDevices, devices, error } = useBeacio();

      React.useEffect(() => {
        void (async () => {
          await requestDevice({ acceptAllDevices: true });
          // Now make getDevices fail
          mockBluetooth.getDevices = jest.fn().mockRejectedValue(new Error('Network error'));
          await getDevices();
          // Should return existing devices as fallback
        })();
      }, [requestDevice, getDevices]);

      return <div>{error ? `Err: ${error.message}` : `Devices: ${devices.length}`}</div>;
    };

    render(
      <BeacioProvider>
        <TestComponent />
      </BeacioProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Err: Network error/)).toBeInTheDocument());
  });
});
