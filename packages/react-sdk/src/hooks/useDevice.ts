import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseDeviceReturn {
  device: BluetoothDevice | null;
  isConnected: boolean;
  isConnecting: boolean;
  services: BluetoothRemoteGATTService[];
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  watchAdvertisements: () => Promise<void>;
  unwatchAdvertisements: () => void;
  isWatchingAdvertisements: boolean;
  forget: () => Promise<void>;
  connectionPriority: 'low' | 'balanced' | 'high' | null;
  setConnectionPriority: (priority: 'low' | 'balanced' | 'high') => Promise<void>;
}

/**
 * Hook for managing the lifecycle of a specific Bluetooth device.
 *
 * Handles GATT connection, service discovery, disconnect events,
 * advertisement watching, and connection priority. Pass `null` when
 * no device has been selected yet.
 *
 * @param device - The {@link BluetoothDevice} to manage, or `null`.
 * @returns Device state (connection, services, errors) and control methods.
 *
 * @example
 * ```tsx
 * import { useBluetooth, useDevice } from '@wklm/react';
 *
 * function DevicePanel() {
 *   const { requestDevice } = useBluetooth();
 *   const [device, setDevice] = useState<BluetoothDevice | null>(null);
 *   const {
 *     isConnected, isConnecting, services, error,
 *     connect, disconnect,
 *   } = useDevice(device);
 *
 *   const handlePair = async () => {
 *     const d = await requestDevice({
 *       filters: [{ services: ['heart_rate'] }],
 *     });
 *     if (d) setDevice(d);
 *   };
 *
 *   return (
 *     <div>
 *       {!device && <button onClick={handlePair}>Pair</button>}
 *       {device && !isConnected && (
 *         <button onClick={connect} disabled={isConnecting}>
 *           {isConnecting ? 'Connecting...' : 'Connect'}
 *         </button>
 *       )}
 *       {isConnected && (
 *         <>
 *           <p>Services: {services.length}</p>
 *           <button onClick={disconnect}>Disconnect</button>
 *         </>
 *       )}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDevice(device: BluetoothDevice | null): UseDeviceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [services, setServices] = useState<BluetoothRemoteGATTService[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isWatchingAdvertisements, setIsWatchingAdvertisements] = useState(false);
  const [connectionPriority, setConnectionPriorityState] = useState<'low' | 'balanced' | 'high' | null>(null);
  
  const disconnectHandlerRef = useRef<(() => void) | null>(null);

  // Connect to the device
  const connect = useCallback(async () => {
    if (!device?.gatt) {
      setError(new Error('Device does not support GATT'));
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);
      
      await device.gatt.connect();
      setIsConnected(true);
      
      // Discover services
      try {
        const discoveredServices = await device.gatt.getPrimaryServices();
        setServices(discoveredServices);
      } catch (serviceError) {
        setError(serviceError as Error);
      }
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [device]);

  // Disconnect from the device
  const disconnect = useCallback(() => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setIsConnected(false);
    setServices([]);
  }, [device]);

  // Watch for advertisements
  const watchAdvertisements = useCallback(async () => {
    if (!device) {
      setError(new Error('No device to watch'));
      return;
    }

    try {
      setError(null);
      await device.watchAdvertisements();
      setIsWatchingAdvertisements(true);
    } catch (err) {
      setError(err as Error);
    }
  }, [device]);

  // Stop watching advertisements
  const unwatchAdvertisements = useCallback(() => {
    if (!device) return;
    
    try {
      // Note: Web Bluetooth doesn't have unwatchAdvertisements yet
      // This is a placeholder for when it's added to the spec
      // For now, just update the state
      setIsWatchingAdvertisements(false);
    } catch (err) {
      setError(err as Error);
    }
  }, [device]);

  // Forget the device
  const forget = useCallback(async () => {
    if (!device) {
      setError(new Error('No device to forget'));
      return;
    }

    try {
      setError(null);
      await device.forget();
      setIsConnected(false);
      setServices([]);
    } catch (err) {
      setError(err as Error);
    }
  }, [device]);

  // Set connection priority
  const setConnectionPriority = useCallback(async (priority: 'low' | 'balanced' | 'high') => {
    if (!device?.gatt) {
      setError(new Error('Device does not support GATT'));
      return;
    }

    try {
      setError(null);
      if ('requestConnectionPriority' in device.gatt) {
        await (device.gatt as any).requestConnectionPriority(priority);
        setConnectionPriorityState(priority);
      } else {
        setError(new Error('Connection priority not supported'));
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [device]);

  // Set up event listeners
  useEffect(() => {
    if (!device) return;

    const handleDisconnect = () => {
      setIsConnected(false);
      setServices([]);
    };

    disconnectHandlerRef.current = handleDisconnect;
    device.addEventListener('gattserverdisconnected', handleDisconnect);

    return () => {
      device.removeEventListener('gattserverdisconnected', handleDisconnect);
    };
  }, [device]);

  return {
    device,
    isConnected,
    isConnecting,
    services,
    error,
    connect,
    disconnect,
    watchAdvertisements,
    unwatchAdvertisements,
    isWatchingAdvertisements,
    forget,
    connectionPriority,
    setConnectionPriority
  };
}