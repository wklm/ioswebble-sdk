import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WebBLEProvider } from '../../src/core/WebBLEProvider';
import { useDevice } from '../../src/hooks/useDevice';

describe('useDevice Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WebBLEProvider>{children}</WebBLEProvider>
  );

  let mockDevice: any;
  let mockGattServer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock GATT server
    mockGattServer = {
      connected: false,
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      getPrimaryService: jest.fn(),
      getPrimaryServices: jest.fn().mockResolvedValue([])
    };
    
    // Create mock device
    mockDevice = new (global as any).BluetoothDevice();
    mockDevice.id = 'test-device-id';
    mockDevice.name = 'Test Device';
    mockDevice.gatt = mockGattServer;
    mockDevice.watchAdvertisements = jest.fn().mockResolvedValue(undefined);
    mockDevice.unwatchAdvertisements = jest.fn();
    mockDevice.forget = jest.fn().mockResolvedValue(undefined);
    mockDevice.addEventListener = jest.fn();
    mockDevice.removeEventListener = jest.fn();
  });

  describe('Device connection', () => {
    it('should connect to a device', async () => {
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(mockGattServer.connect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should disconnect from a device', async () => {
      mockGattServer.connected = true;
      
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      // First connect
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(true);
      
      // Then disconnect
      act(() => {
        result.current.disconnect();
      });
      
      expect(mockGattServer.disconnect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockGattServer.connect.mockRejectedValue(error);
      
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.error).toBe(error);
      expect(result.current.isConnected).toBe(false);
    });

    it('should set connection priority', async () => {
      const requestConnectionPriority = jest.fn().mockResolvedValue(undefined);
      mockDevice.gatt.requestConnectionPriority = requestConnectionPriority;
      
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      await act(async () => {
        await result.current.setConnectionPriority('high');
      });
      
      expect(requestConnectionPriority).toHaveBeenCalledWith('high');
      expect(result.current.connectionPriority).toBe('high');
    });
  });

  describe('Service discovery', () => {
    it('should get primary services', async () => {
      const mockServices = [
        { uuid: 'service-1', isPrimary: true },
        { uuid: 'service-2', isPrimary: true }
      ];
      mockGattServer.getPrimaryServices.mockResolvedValue(mockServices);
      
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
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
      mockGattServer.getPrimaryServices.mockRejectedValue(error);
      
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe(error);
        expect(result.current.services).toEqual([]);
      });
    });
  });

  describe('Advertisement watching', () => {
    it('should watch advertisements', async () => {
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      await act(async () => {
        await result.current.watchAdvertisements();
      });
      
      expect(mockDevice.watchAdvertisements).toHaveBeenCalled();
      expect(result.current.isWatchingAdvertisements).toBe(true);
    });

    it('should stop watching advertisements', async () => {
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      // Start watching
      await act(async () => {
        await result.current.watchAdvertisements();
      });
      
      expect(result.current.isWatchingAdvertisements).toBe(true);
      
      // Stop watching
      act(() => {
        result.current.unwatchAdvertisements();
      });
      
      // unwatchAdvertisements is not yet part of the Web Bluetooth spec
      // The function just updates state for now
      expect(result.current.isWatchingAdvertisements).toBe(false);
    });
  });

  describe('Device management', () => {
    it('should forget a device', async () => {
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      await act(async () => {
        await result.current.forget();
      });
      
      expect(mockDevice.forget).toHaveBeenCalled();
    });

    it('should handle forget errors gracefully', async () => {
      const error = new Error('Forget failed');
      mockDevice.forget.mockRejectedValue(error);
      
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      await act(async () => {
        await result.current.forget();
      });
      
      expect(result.current.error).toBe(error);
    });
  });

  describe('Event handling', () => {
    it('should handle disconnect events', async () => {
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      // Connect first
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(true);
      
      // Simulate disconnect event
      const disconnectHandler = mockDevice.addEventListener.mock.calls.find(
        call => call[0] === 'gattserverdisconnected'
      )?.[1];
      
      if (disconnectHandler) {
        act(() => {
          disconnectHandler();
        });
      }
      
      expect(result.current.isConnected).toBe(false);
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      unmount();
      
      expect(mockDevice.removeEventListener).toHaveBeenCalledWith(
        'gattserverdisconnected',
        expect.any(Function)
      );
    });
  });

  describe('Hook return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useDevice(mockDevice), { wrapper });
      
      expect(result.current).toHaveProperty('device');
      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('isConnecting');
      expect(result.current).toHaveProperty('services');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('connect');
      expect(result.current).toHaveProperty('disconnect');
      expect(result.current).toHaveProperty('watchAdvertisements');
      expect(result.current).toHaveProperty('unwatchAdvertisements');
      expect(result.current).toHaveProperty('isWatchingAdvertisements');
      expect(result.current).toHaveProperty('forget');
      expect(result.current).toHaveProperty('connectionPriority');
      expect(result.current).toHaveProperty('setConnectionPriority');
    });

    it('should handle null device gracefully', () => {
      const { result } = renderHook(() => useDevice(null), { wrapper });
      
      expect(result.current.device).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.services).toEqual([]);
    });
  });
});