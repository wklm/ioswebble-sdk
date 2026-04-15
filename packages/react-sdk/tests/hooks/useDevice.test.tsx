import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WebBLEProvider } from '../../src/core/WebBLEProvider';
import { useDevice } from '../../src/hooks/useDevice';

/**
 * Factory for creating mock WebBLEDevice objects that match the interface
 * expected by useDevice: connect(), disconnect(), getPrimaryServices(),
 * watchAdvertisements(), forget(), on(), off(), subscribe(), raw, id, name, connected.
 */
function createMockDevice(overrides: Record<string, any> = {}) {
  const device: Record<string, any> = {
    id: 'test-device-id',
    name: 'Test Device',
    raw: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      gatt: {
        connected: false,
        requestConnectionPriority: jest.fn().mockResolvedValue(undefined),
      },
    },
    connected: false,
    connect: jest.fn().mockImplementation(async () => {
      device.connected = true;
    }),
    disconnect: jest.fn().mockImplementation(() => {
      device.connected = false;
    }),
    getPrimaryServices: jest.fn().mockResolvedValue([]),
    on: jest.fn().mockReturnValue(jest.fn()),
    off: jest.fn(),
    ...overrides,
  };
  return device;
}

describe('useDevice Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WebBLEProvider>{children}</WebBLEProvider>
  );

  let mockDevice: ReturnType<typeof createMockDevice>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDevice = createMockDevice();
  });

  describe('Device connection', () => {
    it('should connect to a device', async () => {
      const { result } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);

      await act(async () => {
        await result.current.connect();
      });

      expect(mockDevice.connect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should disconnect from a device', async () => {
      const { result } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      // First connect
      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(mockDevice.disconnect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockDevice.connect.mockRejectedValue(error);

      const { result } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(error.message);
      expect(result.current.isConnected).toBe(false);
    });

  });

  describe('Service discovery', () => {
    it('should get primary services', async () => {
      const mockServices = [
        { uuid: 'service-1', isPrimary: true },
        { uuid: 'service-2', isPrimary: true }
      ];
      mockDevice.getPrimaryServices.mockResolvedValue(mockServices);

      const { result } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      // Connect first
      await act(async () => {
        await result.current.connect();
      });

      // Services should be fetched automatically after connection
      await waitFor(() => {
        expect(result.current.services).toEqual(mockServices);
      });
    });

    it('should handle service discovery errors', async () => {
      const error = new Error('Service discovery failed');
      mockDevice.getPrimaryServices.mockRejectedValue(error);

      const { result } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe(error.message);
        expect(result.current.services).toEqual([]);
      });
    });
  });

  describe('Event handling', () => {
    it('should handle disconnect events', async () => {
      // Capture the disconnect callback passed to device.on('disconnected', fn)
      let disconnectCallback: (() => void) | null = null;
      mockDevice.on.mockImplementation((event: string, fn: () => void) => {
        if (event === 'disconnected') disconnectCallback = fn;
        return jest.fn(); // unsub fn
      });

      const { result } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      // Connect first
      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.isConnected).toBe(true);

      // Simulate disconnect event
      if (disconnectCallback) {
        act(() => {
          disconnectCallback!();
        });
      }

      expect(result.current.isConnected).toBe(false);
    });

    it('should clean up event listeners on unmount', () => {
      const unsubFn = jest.fn();
      mockDevice.on.mockReturnValue(unsubFn);

      const { unmount } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      unmount();

      // The useEffect cleanup calls the unsub function returned by device.on()
      expect(unsubFn).toHaveBeenCalled();
    });
  });

  describe('Hook return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useDevice(mockDevice as any), { wrapper });

      expect(result.current).toHaveProperty('device');
      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('isConnecting');
      expect(result.current).toHaveProperty('services');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('connect');
      expect(result.current).toHaveProperty('disconnect');
      expect(result.current).toHaveProperty('connectionState');
      expect(result.current).toHaveProperty('autoReconnect');
      expect(result.current).toHaveProperty('setAutoReconnect');
      expect(result.current).toHaveProperty('reconnectAttempt');
    });

    it('should handle null device gracefully', () => {
      const { result } = renderHook(() => useDevice(null), { wrapper });

      expect(result.current.device).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.services).toEqual([]);
    });
  });
});
