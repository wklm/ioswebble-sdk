import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnection } from '../../src/hooks/useConnection';
import { useBluetooth } from '../../src/hooks/useBluetooth';
import { useDevice } from '../../src/hooks/useDevice';

jest.mock('../../src/hooks/useBluetooth');
jest.mock('../../src/hooks/useDevice');

const mockUseBluetooth = useBluetooth as jest.MockedFunction<typeof useBluetooth>;
const mockUseDevice = useDevice as jest.MockedFunction<typeof useDevice>;

function createDevice(id = 'device-1') {
  return {
    id,
    name: `Device ${id}`,
  } as any;
}

describe('useConnection', () => {
  const mockRequestDevice = jest.fn();
  const mockDeviceConnect = jest.fn();
  const mockDeviceDisconnect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseBluetooth.mockReturnValue({
      isAvailable: true,
      isExtensionInstalled: false,
      extensionInstallState: 'not-installed',
      isSupported: true,
      ble: {} as any,
      backgroundSync: {} as any,
      peripheral: {} as any,
      requestDevice: mockRequestDevice,
      getDevices: jest.fn(),
      error: null,
    });

    mockUseDevice.mockImplementation((device) => ({
      device,
      connectionState: device ? 'disconnected' : 'disconnected',
      isConnected: false,
      isConnecting: false,
      services: [],
      error: null,
      connect: mockDeviceConnect,
      disconnect: mockDeviceDisconnect,
      autoReconnect: false,
      setAutoReconnect: jest.fn(),
      reconnectAttempt: 0,
    }));
  });

  it('requests a device and then connects through useDevice', async () => {
    const selectedDevice = createDevice();
    mockRequestDevice.mockResolvedValue(selectedDevice);

    const { result } = renderHook(() => useConnection({ filters: [{ services: ['heart_rate'] }] }));

    let connectPromise: Promise<void>;
    act(() => {
      connectPromise = result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.device).toBe(selectedDevice);
    });

    await act(async () => {
      await connectPromise!;
    });

    expect(mockRequestDevice).toHaveBeenCalledWith({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: undefined,
      acceptAllDevices: false,
    });
    expect(mockDeviceConnect).toHaveBeenCalledTimes(1);
  });

  it('reuses useDevice.connect for an already selected device', async () => {
    const selectedDevice = createDevice();
    mockRequestDevice.mockResolvedValue(selectedDevice);

    const { result } = renderHook(() => useConnection());

    let initialConnectPromise: Promise<void>;
    act(() => {
      initialConnectPromise = result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.device).toBe(selectedDevice);
    });

    await act(async () => {
      await initialConnectPromise!;
    });

    expect(mockRequestDevice).toHaveBeenCalledTimes(1);
    expect(mockDeviceConnect).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.connect();
    });

    expect(mockRequestDevice).toHaveBeenCalledTimes(1);
    expect(mockDeviceConnect).toHaveBeenCalledTimes(2);
  });

  it('maps useDevice state into connected status and services', async () => {
    const selectedDevice = createDevice();
    mockRequestDevice.mockResolvedValue(selectedDevice);
    mockUseDevice.mockImplementation((device) => ({
      device,
      connectionState: device ? 'connected' : 'disconnected',
      isConnected: Boolean(device),
      isConnecting: false,
      services: device ? [{ uuid: '180d' }] as any : [],
      error: null,
      connect: mockDeviceConnect,
      disconnect: mockDeviceDisconnect,
      autoReconnect: false,
      setAutoReconnect: jest.fn(),
      reconnectAttempt: 0,
    }));

    const { result } = renderHook(() => useConnection());

    let connectPromise: Promise<void>;
    act(() => {
      connectPromise = result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.device).toBe(selectedDevice);
    });

    await act(async () => {
      await connectPromise!;
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.services).toEqual([{ uuid: '180d' }]);
  });

  it('does not surface an error for user-cancelled picker flows', async () => {
    mockRequestDevice.mockResolvedValue(null);
    const { result } = renderHook(() => useConnection());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('disconnects through useDevice and clears the selected device', async () => {
    const selectedDevice = createDevice();
    mockRequestDevice.mockResolvedValue(selectedDevice);
    const { result } = renderHook(() => useConnection());

    let connectPromise: Promise<void>;
    act(() => {
      connectPromise = result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.device).toBe(selectedDevice);
    });

    await act(async () => {
      await connectPromise!;
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockDeviceDisconnect).toHaveBeenCalledTimes(1);
    expect(result.current.device).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});
