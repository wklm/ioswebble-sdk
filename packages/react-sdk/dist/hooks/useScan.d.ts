import type { UseScanReturn } from '../types';
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
 * import { useScan } from '@ios-web-bluetooth/react';
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
export declare function useScan(): UseScanReturn;
//# sourceMappingURL=useScan.d.ts.map