import { useCallback, useMemo } from 'react';
import { useWebBLE } from '../core/WebBLEProvider';
import { WebBLEError } from '@ios-web-bluetooth/core';
import type { WebBLEDevice } from '@ios-web-bluetooth/core';
import type { UseBluetoothReturn, RequestDeviceOptions } from '../types';

/**
 * Primary hook for Web Bluetooth operations.
 *
 * Provides simplified access to Bluetooth device requesting, availability
 * checking, and extension detection. Wraps the {@link WebBLEProvider}
 * context with convenience methods and automatic error handling.
 *
 * Must be used inside a {@link WebBLEProvider}.
 *
 * @returns An object with availability flags, device request methods, and error state.
 *
 * @example
 * ```tsx
 * import { useBluetooth } from '@ios-web-bluetooth/react';
 *
 * function HeartRateButton() {
 *   const { isAvailable, isSupported, requestDevice, error } = useBluetooth();
 *
 *   const handleConnect = async () => {
 *     const device = await requestDevice({
 *       filters: [{ services: ['heart_rate'] }],
 *     });
 *     if (device) {
 *       console.log('Connected to', device.name);
 *     }
 *   };
 *
 *   if (!isSupported) return <p>Bluetooth not supported</p>;
 *   if (!isAvailable) return <p>Bluetooth not available</p>;
 *
 *   return (
 *     <div>
 *       <button onClick={handleConnect}>Connect HR Monitor</button>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBluetooth(): UseBluetoothReturn {
  const context = useWebBLE();
  const ble = context.core as UseBluetoothReturn['ble'];

  const isSupported = useMemo(() => ble.isSupported, [ble]);
  const backgroundSync = useMemo(() => ble.backgroundSync, [ble]);
  const peripheral = useMemo(() => ble.peripheral, [ble]);

  // Wrapper for requestDevice with simplified error handling
  const requestDevice = useCallback(async (options: RequestDeviceOptions = { acceptAllDevices: true }): Promise<WebBLEDevice | null> => {
    try {
      return await context.requestDevice(options);
    } catch (error) {
      const candidate = WebBLEError.from(error);
      if (candidate.code === 'USER_CANCELLED') {
        return null;
      }
      throw error;
    }
  }, [context]);

  // Wrapper for getDevices
  const getDevices = useCallback(async () => context.getDevices(), [context]);

  return {
    isAvailable: context.isAvailable,
    isExtensionInstalled: context.isExtensionInstalled,
    extensionInstallState: context.extensionInstallState,
    isSupported,
    ble,
    backgroundSync,
    peripheral,
    requestDevice,
    getDevices,
    error: context.error
  };
}
