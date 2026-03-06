import { renderHook, act } from '@testing-library/react';
import { useConnection } from '../../src/hooks/useConnection';
import { useWebBLE } from '../../src/core/WebBLEProvider';
import { ConnectionPriority } from '../../src/types';

// Mock the useWebBLE hook
jest.mock('../../src/core/WebBLEProvider', () => ({
  useWebBLE: jest.fn()
}));

describe('useConnection', () => {
  let mockDevice: any;
  let mockGatt: any;

  beforeEach(() => {
    mockGatt = {
      connected: false,
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    mockDevice = {
      id: 'test-device',
      name: 'Test Device',
      gatt: mockGatt,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      watchAdvertisements: jest.fn()
    };

    (useWebBLE as jest.Mock).mockReturnValue({
      bluetooth: {},
      devices: [mockDevice]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have disconnected state initially', () => {
      const { result } = renderHook(() => useConnection('test-device'));
      
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.rssi).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle missing device ID', () => {
      const { result } = renderHook(() => useConnection());
      
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.rssi).toBeNull();
    });
  });

  describe('Connect', () => {
    it('should connect to device successfully', async () => {
      mockGatt.connect.mockResolvedValue(mockGatt);
      const { result } = renderHook(() => useConnection('test-device'));
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(mockGatt.connect).toHaveBeenCalled();
      expect(result.current.connectionState).toBe('connected');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockGatt.connect.mockRejectedValue(error);
      const { result } = renderHook(() => useConnection('test-device'));
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.error).toBe(error);
    });

    it('should not connect if already connected', async () => {
      mockGatt.connected = true;
      const { result } = renderHook(() => useConnection('test-device'));
      
      // Set initial state to connected
      act(() => {
        result.current.setConnectionState?.('connected');
      });
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(mockGatt.connect).not.toHaveBeenCalled();
    });

    it('should set connecting state during connection', async () => {
      let resolveConnect: any;
      mockGatt.connect.mockImplementation(() => new Promise(resolve => {
        resolveConnect = resolve;
      }));
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      // Start connection in a non-blocking way
      let connectPromise: Promise<void>;
      act(() => {
        connectPromise = result.current.connect();
      });
      
      // Check connecting state immediately after starting
      expect(result.current.connectionState).toBe('connecting');
      
      // Resolve the connection
      await act(async () => {
        resolveConnect(mockGatt);
        await connectPromise!;
      });
      
      expect(result.current.connectionState).toBe('connected');
    });

    it('should handle missing device', async () => {
      (useWebBLE as jest.Mock).mockReturnValue({
        bluetooth: {},
        devices: []
      });
      
      const { result } = renderHook(() => useConnection('non-existent'));
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.error?.message).toContain('Device not found');
    });
  });

  describe('Disconnect', () => {
    it('should disconnect from device successfully', async () => {
      mockGatt.connected = true;
      const { result } = renderHook(() => useConnection('test-device'));
      
      // Set initial state to connected
      act(() => {
        result.current.setConnectionState?.('connected');
      });
      
      await act(async () => {
        await result.current.disconnect();
      });
      
      expect(mockGatt.disconnect).toHaveBeenCalled();
      expect(result.current.connectionState).toBe('disconnected');
    });

    it('should handle disconnect errors', async () => {
      // Suppress console.error for this test as we're testing error handling
      const originalError = console.error;
      console.error = jest.fn();
      
      mockGatt.connected = true;
      const error = new Error('Disconnect failed');
      mockGatt.disconnect.mockImplementation(() => {
        throw error;
      });
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      // Set to connected state
      act(() => {
        result.current.setConnectionState?.('connected');
      });
      
      await act(async () => {
        await result.current.disconnect();
      });
      
      expect(result.current.error).toBe(error);
      
      // Restore console.error
      console.error = originalError;
    });

    it('should not disconnect if already disconnected', async () => {
      mockGatt.connected = false;
      const { result } = renderHook(() => useConnection('test-device'));
      
      await act(async () => {
        await result.current.disconnect();
      });
      
      expect(mockGatt.disconnect).not.toHaveBeenCalled();
    });

    it('should set disconnecting state during disconnection', async () => {
      mockGatt.connected = true;
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      act(() => {
        result.current.setConnectionState?.('connected');
      });
      
      let disconnectPromise: Promise<void>;
      act(() => {
        disconnectPromise = result.current.disconnect();
      });
      
      expect(result.current.connectionState).toBe('disconnecting');
      
      await act(async () => {
        await disconnectPromise!;
      });
      
      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  describe('Connection Parameters', () => {
    it('should get connection parameters', async () => {
      const mockParams = {
        connectionInterval: 20,
        slaveLatency: 0,
        supervisionTimeout: 100
      };
      
      mockDevice.getConnectionParameters = jest.fn().mockResolvedValue(mockParams);
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      let params;
      await act(async () => {
        params = await result.current.getConnectionParameters();
      });
      
      expect(params).toEqual(mockParams);
      expect(mockDevice.getConnectionParameters).toHaveBeenCalled();
    });

    it('should handle missing getConnectionParameters method', async () => {
      const { result } = renderHook(() => useConnection('test-device'));
      
      let params;
      await act(async () => {
        params = await result.current.getConnectionParameters();
      });
      
      expect(params).toBeNull();
    });

    it('should request connection priority', async () => {
      mockDevice.requestConnectionPriority = jest.fn().mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      await act(async () => {
        await result.current.requestConnectionPriority('high' as ConnectionPriority);
      });
      
      expect(mockDevice.requestConnectionPriority).toHaveBeenCalledWith('high');
    });

    it('should handle connection priority errors', async () => {
      const error = new Error('Priority change failed');
      mockDevice.requestConnectionPriority = jest.fn().mockRejectedValue(error);
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      await act(async () => {
        await result.current.requestConnectionPriority('high' as ConnectionPriority);
      });
      
      expect(result.current.error).toBe(error);
    });
  });

  describe('RSSI Monitoring', () => {
    it('should update RSSI from advertisements', async () => {
      let advertisementCallback: any;
      mockDevice.addEventListener.mockImplementation((event: string, callback: any) => {
        if (event === 'advertisementreceived') {
          advertisementCallback = callback;
        }
      });
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      // Start monitoring
      await act(async () => {
        await result.current.startRssiMonitoring?.();
      });
      
      // Simulate advertisement with RSSI
      act(() => {
        advertisementCallback?.({ rssi: -55 });
      });
      
      expect(result.current.rssi).toBe(-55);
    });

    it('should stop RSSI monitoring', async () => {
      const { result, unmount } = renderHook(() => useConnection('test-device'));
      
      await act(async () => {
        await result.current.startRssiMonitoring?.();
      });
      
      // Unmount will trigger cleanup
      unmount();
      
      expect(mockDevice.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Connection Events', () => {
    it('should handle disconnection events', async () => {
      let disconnectCallback: any;
      mockDevice.addEventListener.mockImplementation((event: string, callback: any) => {
        if (event === 'gattserverdisconnected') {
          disconnectCallback = callback;
        }
      });
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      // Set to connected first
      act(() => {
        result.current.setConnectionState?.('connected');
      });
      
      // Trigger disconnect event
      act(() => {
        disconnectCallback?.();
      });
      
      expect(result.current.connectionState).toBe('disconnected');
    });

    it('should auto-reconnect if enabled', async () => {
      jest.useFakeTimers();
      
      let disconnectCallback: any;
      mockDevice.addEventListener.mockImplementation((event: string, callback: any) => {
        if (event === 'gattserverdisconnected') {
          disconnectCallback = callback;
        }
      });
      
      mockGatt.connect.mockResolvedValue(mockGatt);
      
      const { result } = renderHook(() => useConnection('test-device'));
      
      // Enable auto-reconnect
      act(() => {
        result.current.setAutoReconnect?.(true);
      });
      
      // Set to connected
      act(() => {
        result.current.setConnectionState?.('connected');
      });
      
      // Trigger disconnect
      act(() => {
        disconnectCallback?.();
      });
      
      // Fast-forward time for reconnect timeout
      await act(async () => {
        jest.advanceTimersByTime(1100);
      });
      
      expect(mockGatt.connect).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      mockGatt.connected = true;
      
      const { unmount } = renderHook(() => useConnection('test-device'));
      
      unmount();
      
      expect(mockDevice.removeEventListener).toHaveBeenCalled();
      expect(mockGatt.disconnect).toHaveBeenCalled();
    });

    it('should cleanup when device ID changes', async () => {
      const { rerender } = renderHook(
        ({ deviceId }) => useConnection(deviceId),
        { initialProps: { deviceId: 'test-device' } }
      );
      
      rerender({ deviceId: 'new-device' });
      
      expect(mockDevice.removeEventListener).toHaveBeenCalled();
    });
  });
});