import { useCallback, useMemo } from 'react';
import { useWebBLE } from '../core/WebBLEProvider';
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
  
  // Check if browser supports Web Bluetooth (natively or via extension)
  const isSupported = useMemo(() => {
    // Check for secure context
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return false;
    }
    
    // Check for Bluetooth API or extension
    return !!(navigator?.bluetooth || context.isExtensionInstalled);
  }, [context.isExtensionInstalled]);

  // Wrapper for requestDevice with simplified error handling
  const requestDevice = useCallback(async (options?: RequestDeviceOptions) => {
    try {
      const device = await context.requestDevice(options);
      return device;
    } catch (error) {
      // Don't set error for user cancellation
      if ((error as Error).name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  }, [context]);

  // Wrapper for getDevices
  const getDevices = useCallback(async () => {
    return await context.getDevices();
  }, [context]);

  return {
    isAvailable: context.isAvailable,
    isExtensionInstalled: context.isExtensionInstalled,
    isSupported,
    requestDevice,
    getDevices,
    error: context.error
  };
}