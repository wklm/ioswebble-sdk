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
 * import { useBluetooth, useDevice } from '@ios-web-bluetooth/react';
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
export declare function useDevice(device: BluetoothDevice | null): UseDeviceReturn;
