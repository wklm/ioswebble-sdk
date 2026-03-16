import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebBLE } from '../core/WebBLEProvider';
import type { UseConnectionReturn, ConnectionState, ConnectionParameters, ConnectionPriority } from '../types';

/**
 * useConnection - Hook for managing device connection parameters
 * 
 * @param deviceId - The ID of the device
 * @returns Connection state and control methods
 */
export function useConnection(deviceId?: string): UseConnectionReturn {
  const webble = useWebBLE();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [rssi, setRssi] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [autoReconnect, setAutoReconnect] = useState(false);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<(() => Promise<void>) | null>(null);

  // Get device from context
  useEffect(() => {
    if (!deviceId || !webble?.devices) return;

    const device = webble.devices.find(d => d.id === deviceId);
    if (device) {
      deviceRef.current = device;
      
      // Set initial connection state
      if (device.gatt?.connected) {
        setConnectionState('connected');
      }

      // Setup event listeners
      const handleDisconnect = () => {
        setConnectionState('disconnected');
        if (autoReconnect && connectRef.current) {
          // Auto-reconnect after a delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (deviceRef.current && !deviceRef.current.gatt?.connected) {
              connectRef.current?.();
            }
          }, 1000);
        }
      };

      const handleAdvertisement = (event: any) => {
        if (event.rssi !== undefined) {
          setRssi(event.rssi);
        }
      };

      device.addEventListener?.('gattserverdisconnected', handleDisconnect);
      device.addEventListener?.('advertisementreceived', handleAdvertisement);

      // Store cleanup function
      cleanupRef.current = () => {
        device.removeEventListener?.('gattserverdisconnected', handleDisconnect);
        device.removeEventListener?.('advertisementreceived', handleAdvertisement);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      return () => {
        cleanupRef.current?.();
      };
    }
    return undefined;
  }, [deviceId, webble, autoReconnect]);

  const connect = useCallback(async (): Promise<void> => {
    if (!deviceRef.current) {
      setError(new Error('Device not found'));
      return;
    }

    if (connectionState === 'connected' || connectionState === 'connecting') {
      return;
    }

    try {
      setError(null);
      setConnectionState('connecting');
      
      const gatt = await deviceRef.current.gatt?.connect();
      if (gatt) {
        setConnectionState('connected');
      } else {
        throw new Error('Failed to connect to GATT server');
      }
    } catch (err) {
      setError(err as Error);
      setConnectionState('disconnected');
      // Don't re-throw to prevent unhandled promise rejection
    }
  }, [connectionState]);

  // Store connect function in ref for auto-reconnect
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (!deviceRef.current) {
      return;
    }

    if (connectionState === 'disconnected' || connectionState === 'disconnecting') {
      return;
    }

    try {
      setError(null);
      setConnectionState('disconnecting');
      
      await Promise.resolve(); // Allow state to update
      deviceRef.current.gatt?.disconnect();
      setConnectionState('disconnected');
    } catch (err) {
      setError(err as Error);
      // Don't re-throw to prevent unhandled promise rejection
    }
  }, [connectionState]);

  const getConnectionParameters = useCallback(async (): Promise<ConnectionParameters | null> => {
    if (!deviceRef.current) {
      return null;
    }

    // Check if device supports getConnectionParameters
    if ('getConnectionParameters' in deviceRef.current) {
      try {
        return await (deviceRef.current as any).getConnectionParameters();
      } catch (err) {
        setError(err as Error);
        return null;
      }
    }

    return null;
  }, []);

  const requestConnectionPriority = useCallback(async (priority: ConnectionPriority): Promise<void> => {
    if (!deviceRef.current) {
      setError(new Error('Device not found'));
      return;
    }

    // Check if device supports requestConnectionPriority
    if ('requestConnectionPriority' in deviceRef.current) {
      try {
        await (deviceRef.current as any).requestConnectionPriority(priority);
      } catch (err) {
        setError(err as Error);
      }
    }
  }, []);

  const startRssiMonitoring = useCallback(async (): Promise<void> => {
    if (!deviceRef.current) return;
    
    // Start watching advertisements for RSSI updates
    if ('watchAdvertisements' in deviceRef.current) {
      try {
        await (deviceRef.current as any).watchAdvertisements();
      } catch (err) {
        setError(err as Error);
      }
    }
  }, []);

  const stopRssiMonitoring = useCallback((): void => {
    // Stop monitoring would be done by removing event listeners
    // which is handled in cleanup
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (deviceRef.current?.gatt?.connected) {
        try {
          deviceRef.current.gatt.disconnect();
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Public methods for testing
  const publicSetConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
  }, []);

  const publicSetAutoReconnect = useCallback((value: boolean) => {
    setAutoReconnect(value);
  }, []);

  return {
    connectionState,
    rssi,
    connect,
    disconnect,
    getConnectionParameters,
    requestConnectionPriority,
    error,
    setConnectionState: publicSetConnectionState,
    setAutoReconnect: publicSetAutoReconnect,
    startRssiMonitoring,
    stopRssiMonitoring,
    autoReconnect
  };
}
