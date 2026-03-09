import React, { ReactNode } from 'react';
import type { RequestDeviceOptions } from '../types';
interface WebBLEConfig {
    autoConnect?: boolean;
    cacheTimeout?: number;
    retryAttempts?: number;
    /** API key from ioswebble.com (wbl_xxxxx) — enables install prompt on iOS Safari */
    apiKey?: string;
    /** Operator/app name shown in the install prompt (e.g. "FitTracker") */
    operatorName?: string;
    /** App Store URL override (defaults to iOSWebBLE listing) */
    appStoreUrl?: string;
}
interface WebBLEContextValue {
    isAvailable: boolean;
    isExtensionInstalled: boolean;
    isLoading: boolean;
    isScanning: boolean;
    devices: BluetoothDevice[];
    error: Error | null;
    config?: WebBLEConfig;
    /** @ios-web-bluetooth/core instance (available when @ios-web-bluetooth/core is installed) */
    core: any | null;
    requestDevice: (options?: RequestDeviceOptions) => Promise<BluetoothDevice | null>;
    getDevices: () => Promise<BluetoothDevice[]>;
    requestLEScan: (options?: BluetoothLEScanOptions) => Promise<BluetoothLEScan | null>;
    stopScan: () => void;
}
interface WebBLEProviderProps {
    children: ReactNode;
    config?: WebBLEConfig;
}
/**
 * Context provider that initialises the WebBLE client and makes Bluetooth
 * state and methods available to all descendant components via
 * {@link useWebBLE} and the convenience hooks (`useBluetooth`, `useDevice`,
 * `useScan`, `useProfile`).
 *
 * Place this near the root of your application. It handles:
 * - Bluetooth availability detection
 * - Safari Web Extension detection (via `webble:extension:ready` event)
 * - Optional iOS install prompt (when `apiKey` is provided and `@ios-web-bluetooth/detect` is installed)
 * - Lazy-loading of `@ios-web-bluetooth/core` if available as a peer dependency
 *
 * @param props.children - React children to render inside the provider.
 * @param props.config - Optional configuration (auto-connect, retry, API key, etc.).
 *
 * @example
 * ```tsx
 * import { WebBLEProvider } from '@ios-web-bluetooth/react';
 *
 * function App() {
 *   return (
 *     <WebBLEProvider config={{ retryAttempts: 3 }}>
 *       <MyBluetoothApp />
 *     </WebBLEProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With iOS install prompt (requires @ios-web-bluetooth/detect peer dep)
 * <WebBLEProvider
 *   config={{
 *     apiKey: 'wbl_your_key',
 *     operatorName: 'FitTracker',
 *   }}
 * >
 *   <App />
 * </WebBLEProvider>
 * ```
 */
export declare function WebBLEProvider({ children, config }: WebBLEProviderProps): React.JSX.Element;
/**
 * Hook to access the {@link WebBLEProvider} context directly.
 *
 * Returns the full context value including availability state, device list,
 * scanning state, and all Bluetooth methods. Throws if used outside a
 * {@link WebBLEProvider}.
 *
 * For most use cases, prefer the higher-level hooks:
 * - {@link useBluetooth} -- availability and device requesting
 * - {@link useDevice} -- single-device lifecycle
 * - {@link useScan} -- LE scanning
 * - {@link useProfile} -- profile binding
 *
 * @returns The full WebBLE context value.
 * @throws Error if called outside a {@link WebBLEProvider}.
 *
 * @example
 * ```tsx
 * import { useWebBLE } from '@ios-web-bluetooth/react';
 *
 * function StatusBar() {
 *   const { isAvailable, isExtensionInstalled, devices } = useWebBLE();
 *   return (
 *     <p>
 *       BLE: {isAvailable ? 'on' : 'off'} |
 *       Extension: {isExtensionInstalled ? 'yes' : 'no'} |
 *       Devices: {devices.length}
 *     </p>
 *   );
 * }
 * ```
 */
export declare function useWebBLE(): WebBLEContextValue;
export {};
//# sourceMappingURL=WebBLEProvider.d.ts.map