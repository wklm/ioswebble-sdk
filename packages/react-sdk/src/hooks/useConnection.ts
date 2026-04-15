import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { WebBLEError } from '@ios-web-bluetooth/core';
import type { WebBLEDevice } from '@ios-web-bluetooth/core';
import { useBluetooth } from './useBluetooth';
import { useDevice } from './useDevice';
import type {
  UseConnectionOptions,
  UseConnectionReturn,
  ConnectionStatus,
  ConnectionOptions,
} from '../types';

/**
 * All-in-one hook for single-device Bluetooth connections.
 *
 * Composes {@link useBluetooth} (device requesting) and {@link useDevice}
 * (connection lifecycle) into one call. Covers the full flow from device
 * picker to connected GATT session with a single `connect()` trigger.
 *
 * For multi-device scenarios use `useBluetooth()` + `useDevice()` directly.
 *
 * @param options - Scan filters, optional services, and reconnect configuration.
 *
 * @example
 * ```tsx
 * import { useConnection } from '@ios-web-bluetooth/react';
 *
 * function HeartRatePanel() {
 *   const { device, status, isConnected, connect, disconnect, error } =
 *     useConnection({
 *       filters: [{ services: ['heart_rate'] }],
 *       autoReconnect: true,
 *     });
 *
 *   return (
 *     <div>
 *       <button onClick={connect} disabled={status === 'requesting' || status === 'connecting'}>
 *         {status === 'idle' ? 'Connect' : status}
 *       </button>
 *       {isConnected && <p>Connected to {device?.name}</p>}
 *       {error && <p>Error: {error.message}</p>}
 *       {isConnected && <button onClick={disconnect}>Disconnect</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useConnection(options: UseConnectionOptions = {}): UseConnectionReturn {
  const { requestDevice } = useBluetooth();
  const [selectedDevice, setSelectedDevice] = useState<WebBLEDevice | null>(null);
  // AIDEV-NOTE: 'requesting' is a local-only status covering the browser device picker
  // dialog period. It is not part of useDevice's ConnectionState.
  const [isRequesting, setIsRequesting] = useState(false);

  // Derive ConnectionOptions from UseConnectionOptions for useDevice
  const connectionOptions = useMemo((): ConnectionOptions | undefined => {
    if (options.autoReconnect === undefined) return undefined;

    if (typeof options.autoReconnect === 'boolean') {
      return { autoReconnect: options.autoReconnect };
    }

    // AutoReconnectOptions object — map fields to ConnectionOptions
    const reconnect = options.autoReconnect;
    return {
      autoReconnect: true,
      reconnectAttempts: reconnect.maxAttempts,
      reconnectDelay: reconnect.initialDelay,
      reconnectBackoffMultiplier: reconnect.backoffMultiplier,
    };
  }, [options.autoReconnect]);

  const {
    connectionState,
    isConnected,
    services,
    error: deviceError,
    connect: deviceConnect,
    disconnect: deviceDisconnect,
  } = useDevice(selectedDevice, connectionOptions);
  const pendingConnectResolveRef = useRef<(() => void) | null>(null);
  const pendingConnectAfterSelectionRef = useRef(false);

  // Composite status: local requesting state takes priority, then useDevice state
  const status: ConnectionStatus = useMemo(() => {
    if (isRequesting) return 'requesting';
    if (!selectedDevice) return 'idle';
    switch (connectionState) {
      case 'connecting': return 'connecting';
      case 'connected': return 'connected';
      case 'disconnected': return 'disconnected';
      case 'disconnecting': return 'disconnected';
      default: return 'idle';
    }
  }, [isRequesting, selectedDevice, connectionState]);

  const [error, setError] = useState<WebBLEError | null>(null);

  // Expose the most recent error from either the request phase or useDevice
  const activeError = error ?? deviceError;

  useEffect(() => {
    if (!selectedDevice || !pendingConnectAfterSelectionRef.current) {
      return;
    }

    pendingConnectAfterSelectionRef.current = false;
    let isCancelled = false;

    const finishPendingConnect = () => {
      if (isCancelled) {
        return;
      }

      pendingConnectResolveRef.current?.();
      pendingConnectResolveRef.current = null;
    };

    void (async () => {
      try {
        await deviceConnect();
      } finally {
        finishPendingConnect();
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [deviceConnect, selectedDevice]);

  useEffect(() => () => {
    pendingConnectAfterSelectionRef.current = false;
    pendingConnectResolveRef.current?.();
    pendingConnectResolveRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (isRequesting) {
      return;
    }

    if (selectedDevice) {
      setError(null);
      await deviceConnect();
      return;
    }

    try {
      setError(null);
      setIsRequesting(true);

      const device = await requestDevice({
        filters: options.filters,
        optionalServices: options.optionalServices,
        acceptAllDevices: options.acceptAllDevices ?? (!options.filters?.length),
      });

      if (!device) {
        return;
      }

      await new Promise<void>((resolve) => {
        pendingConnectResolveRef.current = resolve;
        pendingConnectAfterSelectionRef.current = true;
        setSelectedDevice(device);
      });
    } catch (err) {
      const candidate = WebBLEError.from(err);
      if (candidate.code !== 'USER_CANCELLED') {
        setError(candidate);
      }
    } finally {
      setIsRequesting(false);
    }
  }, [
    deviceConnect,
    isRequesting,
    options.acceptAllDevices,
    options.filters,
    options.optionalServices,
    requestDevice,
    selectedDevice,
  ]);

  const disconnect = useCallback(() => {
    deviceDisconnect();
    setSelectedDevice(null);
    setError(null);
  }, [deviceDisconnect]);

  return {
    device: selectedDevice,
    status,
    isConnected,
    connect,
    disconnect,
    services,
    error: activeError,
  };
}
