import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebBLE } from '../core/WebBLEProvider';
import type { UseScanReturn, ScanState, ScanOptions } from '../types';

/**
 * Hook for scanning for nearby Bluetooth Low Energy devices.
 *
 * Wraps the Web Bluetooth `requestLEScan` API with React-friendly state
 * management. Discovered devices are deduplicated by ID and accumulated
 * in the `devices` array. The scan is automatically stopped on unmount.
 *
 * Must be used inside a {@link WebBLEProvider}.
 *
 * @returns Scan state (`'idle' | 'scanning' | 'stopped'`), discovered devices, and control methods.
 *
 * @example
 * ```tsx
 * import { useScan } from '@wklm/react';
 *
 * function Scanner() {
 *   const { scanState, devices, start, stop, clear, error } = useScan();
 *
 *   const handleScan = () => {
 *     start({ filters: [{ services: ['heart_rate'] }] });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleScan} disabled={scanState === 'scanning'}>
 *         {scanState === 'scanning' ? 'Scanning...' : 'Start Scan'}
 *       </button>
 *       {scanState === 'scanning' && <button onClick={stop}>Stop</button>}
 *       <button onClick={clear}>Clear</button>
 *
 *       <ul>
 *         {devices.map((d) => (
 *           <li key={d.id}>{d.name ?? d.id}</li>
 *         ))}
 *       </ul>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useScan(): UseScanReturn {
  const { requestLEScan, stopScan: contextStopScan } = useWebBLE();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const scanRef = useRef<BluetoothLEScan | null>(null);
  const deviceIdSet = useRef<Set<string>>(new Set());

  // Advertisement handler
  const handleAdvertisement = useCallback((event: any) => {
    const { device } = event;
    if (device && !deviceIdSet.current.has(device.id)) {
      deviceIdSet.current.add(device.id);
      setDevices(prev => [...prev, device]);
    }
  }, []);

  const start = useCallback(async (options?: ScanOptions): Promise<void> => {
    // Don't start if already scanning
    if (scanState === 'scanning') {
      return;
    }

    try {
      setError(null);
      setScanState('scanning');
      
      // Clear previous devices if starting new scan
      deviceIdSet.current.clear();
      setDevices([]);

      // Start the scan
      const scan = await requestLEScan(options || {});
      if (scan) {
        scanRef.current = scan;
        
        // Listen for advertisements
        if ('addEventListener' in navigator.bluetooth) {
          navigator.bluetooth.addEventListener('advertisementreceived', handleAdvertisement);
        }
      } else {
        setScanState('idle');
      }
    } catch (err) {
      setError(err as Error);
      setScanState('idle');
    }
  }, [scanState, requestLEScan, handleAdvertisement]);

  const stop = useCallback((): void => {
    if (scanRef.current?.active) {
      scanRef.current.stop();
    }
    
    // Remove event listener
    if ('removeEventListener' in navigator.bluetooth) {
      navigator.bluetooth.removeEventListener('advertisementreceived', handleAdvertisement);
    }
    
    contextStopScan();
    setScanState('stopped');
    scanRef.current = null;
  }, [contextStopScan, handleAdvertisement]);

  const clear = useCallback((): void => {
    setDevices([]);
    deviceIdSet.current.clear();
    setError(null);
  }, []);

  // Add public setError for tests
  const setErrorPublic = useCallback((err: Error | null) => {
    setError(err);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanRef.current?.active) {
        scanRef.current.stop();
      }
      if ('removeEventListener' in navigator.bluetooth) {
        navigator.bluetooth.removeEventListener('advertisementreceived', handleAdvertisement);
      }
    };
  }, [handleAdvertisement]);

  return {
    scanState,
    devices,
    start,
    stop,
    clear,
    error,
    setError: setErrorPublic
  };
}