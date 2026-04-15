import { useState, useCallback, useEffect, useRef } from 'react';
import { WebBLEError } from '@ios-web-bluetooth/core';
import type { WebBLEDevice } from '@ios-web-bluetooth/core';
import type { ConnectionOptions, ConnectionState, UseDeviceReturn } from '../types';

const DEFAULT_RECONNECT_ATTEMPTS = 3;
const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_RECONNECT_BACKOFF = 2;

/**
 * Hook for managing the lifecycle of a specific Bluetooth device.
 *
 * Handles GATT connection, service discovery, disconnect events,
 * and optional auto-reconnect with exponential backoff. Pass `null`
 * when no device has been selected yet.
 *
 * @param device - The {@link WebBLEDevice} to manage, or `null`.
 * @param options - Optional auto-reconnect configuration.
 *
 * @example
 * ```tsx
 * import { useBluetooth, useDevice } from '@ios-web-bluetooth/react';
 * import type { WebBLEDevice } from '@ios-web-bluetooth/core';
 *
 * function DevicePanel() {
 *   const { requestDevice } = useBluetooth();
 *   const [device, setDevice] = useState<WebBLEDevice | null>(null);
 *   const {
 *     isConnected, isConnecting, error,
 *     connect, disconnect,
 *   } = useDevice(device, { autoReconnect: true });
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
 *       {isConnected && <button onClick={disconnect}>Disconnect</button>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDevice(
  device: WebBLEDevice | null,
  options?: ConnectionOptions,
): UseDeviceReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => (
    device?.connected ? 'connected' : 'disconnected'
  ));
  const [services, setServices] = useState<BluetoothRemoteGATTService[]>([]);
  const [error, setError] = useState<WebBLEError | null>(null);
  const [autoReconnect, setAutoReconnectState] = useState(options?.autoReconnect ?? false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCancelledRef = useRef(false);
  const optionsRef = useRef(options);
  const connectionStateRef = useRef(connectionState);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  // Keep refs in sync
  useEffect(() => {
    optionsRef.current = options;
    setAutoReconnectState(options?.autoReconnect ?? false);
  }, [options]);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const loadServices = useCallback(async (target: WebBLEDevice): Promise<void> => {
    const getPrimaryServices = (target as WebBLEDevice & {
      getPrimaryServices?: () => Promise<BluetoothRemoteGATTService[]>;
    }).getPrimaryServices;

    if (typeof getPrimaryServices !== 'function') {
      setServices([]);
      return;
    }

    const discoveredServices = await getPrimaryServices.call(target);
    setServices(discoveredServices);
  }, []);

  const scheduleReconnect = useCallback((attempt: number) => {
    if (!device || !autoReconnect || reconnectCancelledRef.current) {
      return;
    }

    const opts = optionsRef.current;
    const maxAttempts = opts?.reconnectAttempts ?? DEFAULT_RECONNECT_ATTEMPTS;
    if (attempt > maxAttempts) {
      return;
    }

    const baseDelay = opts?.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;
    const multiplier = opts?.reconnectBackoffMultiplier ?? DEFAULT_RECONNECT_BACKOFF;
    const delayMs = baseDelay * Math.max(1, Math.pow(multiplier, attempt - 1));
    opts?.onReconnectAttempt?.(attempt, delayMs);
    setReconnectAttempt(attempt);

    clearReconnectTimer();
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        await device.connect();
        if (!device.connected && connectionStateRef.current !== 'connected') {
          throw new WebBLEError('GATT_OPERATION_FAILED', 'Failed to reconnect device');
        }

        setError(null);
        setReconnectAttempt(0);
        setConnectionState('connected');
        loadServices(device).catch(() => {});
        optionsRef.current?.onReconnectSuccess?.(attempt);
      } catch (reconnectError) {
        const reconnectFailure = WebBLEError.from(reconnectError);
        const willRetry = attempt < maxAttempts;
        setError(reconnectFailure);
        optionsRef.current?.onReconnectFailure?.(reconnectFailure, attempt, willRetry);
        if (willRetry) {
          scheduleReconnect(attempt + 1);
        }
      }
    }, delayMs);
  }, [autoReconnect, clearReconnectTimer, device, loadServices]);

  const connect = useCallback(async () => {
    if (!device) {
      setError(new WebBLEError('INVALID_PARAMETER', 'No device available'));
      return;
    }

    reconnectCancelledRef.current = false;
    clearReconnectTimer();

    try {
      setError(null);
      setConnectionState('connecting');
      await device.connect();
      setConnectionState(device.connected ? 'connected' : 'disconnected');
      setReconnectAttempt(0);

      try {
        await loadServices(device);
      } catch (serviceError) {
        setError(WebBLEError.from(serviceError));
      }
    } catch (err) {
      setError(WebBLEError.from(err));
      setConnectionState('disconnected');
    }
  }, [clearReconnectTimer, device, loadServices]);

  const disconnect = useCallback(() => {
    if (!device) return;

    reconnectCancelledRef.current = true;
    clearReconnectTimer();
    setReconnectAttempt(0);

    try {
      setError(null);
      setConnectionState('disconnecting');
      device.disconnect();
    } catch (err) {
      setError(WebBLEError.from(err));
    } finally {
      setConnectionState('disconnected');
    }

    setServices([]);
  }, [clearReconnectTimer, device]);

  const setAutoReconnect = useCallback((value: boolean) => {
    setAutoReconnectState(value);
    if (!value) {
      clearReconnectTimer();
      setReconnectAttempt(0);
    }
  }, [clearReconnectTimer]);

  // Sync device state and handle disconnect/reconnect events
  useEffect(() => {
    reconnectCancelledRef.current = false;
    clearReconnectTimer();
    setError(null);
    setReconnectAttempt(0);

    if (!device) {
      setConnectionState('disconnected');
      setServices([]);
      return;
    }

    setConnectionState(device.connected ? 'connected' : 'disconnected');
    if (device.connected) {
      loadServices(device).catch(() => {});
    }

    const offDisconnect = device.on('disconnected', () => {
      setConnectionState('disconnected');
      setServices([]);
      if (autoReconnect && !reconnectCancelledRef.current) {
        scheduleReconnect(1);
      }
    });

    const offReconnect = device.on('reconnected', () => {
      setConnectionState('connected');
      setReconnectAttempt(0);
      loadServices(device).catch(() => {});
    });

    return () => {
      reconnectCancelledRef.current = true;
      offDisconnect();
      offReconnect();
      clearReconnectTimer();
    };
  }, [autoReconnect, clearReconnectTimer, device, loadServices, scheduleReconnect]);

  // Cleanup on unmount
  useEffect(() => () => {
    reconnectCancelledRef.current = true;
    clearReconnectTimer();
  }, [clearReconnectTimer]);

  return {
    device,
    connectionState,
    isConnected,
    isConnecting,
    services,
    error,
    connect,
    disconnect,
    autoReconnect,
    setAutoReconnect,
    reconnectAttempt,
  };
}
