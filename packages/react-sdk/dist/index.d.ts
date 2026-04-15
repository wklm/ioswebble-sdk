import React, { ReactNode } from 'react';
import { RequestDeviceOptions as RequestDeviceOptions$1, WebBLE, WebBLEBackgroundSync, WebBLEPeripheral, WebBLEDevice, WebBLEError } from '@ios-web-bluetooth/core';
export { NotificationCallback, Platform, RequestDeviceOptions, WebBLEDevice, WebBLEError, WebBLEErrorCode, WriteLimits, WriteOptions } from '@ios-web-bluetooth/core';

/**
 * Type definitions for @ios-web-bluetooth/react SDK
 *
 * Device types use WebBLEDevice from @ios-web-bluetooth/core.
 * RequestDeviceOptions is re-exported from core (not duplicated here).
 */

type RequestDeviceOptions = RequestDeviceOptions$1;

interface WebBLEConfig {
    /** API key from ioswebble.com (wbl_xxxxx) -- enables install prompt on iOS Safari */
    apiKey?: string;
    /** Operator/app name shown in the install prompt (e.g. "FitTracker") */
    operatorName?: string;
    /** App Store URL override (defaults to WebBLE listing) */
    appStoreUrl?: string;
}
type CharacteristicProperties = BluetoothCharacteristicProperties;

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
interface ConnectionOptions {
    autoReconnect?: boolean;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    reconnectBackoffMultiplier?: number;
    onReconnectAttempt?: (attempt: number, delayMs: number) => void;
    onReconnectSuccess?: (attempt: number) => void;
    onReconnectFailure?: (error: Error, attempt: number, willRetry: boolean) => void;
}
type ScanState = 'idle' | 'scanning' | 'stopped';
interface ScanOptions {
    timeout?: number;
    filters?: BluetoothLEScanFilter[];
    keepRepeatedDevices?: boolean;
    acceptAllAdvertisements?: boolean;
}
type BluetoothLEScanFilter = NonNullable<RequestDeviceOptions['filters']>[number];
type NotificationHandler = (value: DataView) => void;
interface UseBluetoothReturn {
    isAvailable: boolean;
    isExtensionInstalled: boolean;
    isSupported: boolean;
    ble: WebBLE;
    backgroundSync: WebBLEBackgroundSync;
    peripheral: WebBLEPeripheral;
    requestDevice: (options?: RequestDeviceOptions) => Promise<WebBLEDevice | null>;
    getDevices: () => Promise<WebBLEDevice[]>;
    error: WebBLEError | null;
}
interface UseDeviceReturn {
    device: WebBLEDevice | null;
    connectionState: ConnectionState;
    isConnected: boolean;
    isConnecting: boolean;
    connect: (options?: ConnectionOptions) => Promise<void>;
    disconnect: () => void;
    services: BluetoothRemoteGATTService[];
    error: WebBLEError | null;
    watchAdvertisements: () => Promise<void>;
    unwatchAdvertisements: () => Promise<void>;
    isWatchingAdvertisements: boolean;
    forget: () => Promise<void>;
    connectionPriority: ConnectionPriority | null;
    setConnectionPriority: (priority: ConnectionPriority) => Promise<void>;
}
interface UseCharacteristicReturn {
    device: WebBLEDevice | null;
    serviceUUID: string | null;
    characteristicUUID: string | null;
    characteristic: BluetoothRemoteGATTCharacteristic | null;
    value: DataView | null;
    properties: CharacteristicProperties | null;
    read: () => Promise<DataView | null>;
    write: (value: BufferSource) => Promise<void>;
    writeWithoutResponse: (value: BufferSource) => Promise<void>;
    subscribe: (handler: NotificationHandler) => Promise<void>;
    unsubscribe: () => Promise<void>;
    isNotifying: boolean;
    getDescriptor: (uuid: string) => Promise<BluetoothRemoteGATTDescriptor | null>;
    getDescriptors: () => Promise<BluetoothRemoteGATTDescriptor[]>;
    error: WebBLEError | null;
}
interface UseNotificationsReturn {
    isSubscribed: boolean;
    value: DataView | null;
    history: NotificationEntry[];
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
    clear: () => void;
    error: WebBLEError | null;
}
interface NotificationEntry {
    timestamp: Date;
    value: DataView;
}
interface UseScanReturn {
    scanState: ScanState;
    devices: WebBLEDevice[];
    start: (options?: ScanOptions) => Promise<void>;
    stop: () => void;
    clear: () => void;
    error: WebBLEError | null;
}
interface UseConnectionReturn {
    connectionState: ConnectionState;
    rssi: number | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    requestConnectionPriority: (priority: ConnectionPriority) => Promise<void>;
    error: WebBLEError | null;
    setAutoReconnect: (value: boolean) => void;
    startRssiMonitoring: () => Promise<void>;
    stopRssiMonitoring: () => Promise<void>;
    autoReconnect: boolean;
    reconnectAttempt: number;
}
type ConnectionPriority = 'balanced' | 'high' | 'low-power';

interface WebBLEContextValue {
    isAvailable: boolean;
    isExtensionInstalled: boolean;
    isLoading: boolean;
    isScanning: boolean;
    devices: WebBLEDevice[];
    error: WebBLEError | null;
    core: WebBLE;
    requestDevice: (options?: RequestDeviceOptions$1) => Promise<WebBLEDevice | null>;
    getDevices: () => Promise<WebBLEDevice[]>;
    requestLEScan: (options?: BluetoothLEScanOptions) => Promise<BluetoothLEScan | null>;
    stopScan: () => void;
}

interface WebBLEProviderProps {
    children: ReactNode;
    config?: WebBLEConfig;
    ble?: WebBLE;
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
 * - Core WebBLE instance creation and delegation
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
 */
declare function WebBLEProvider({ children, config, ble }: WebBLEProviderProps): React.JSX.Element;
/**
 * Hook to access the {@link WebBLEProvider} context directly.
 *
 * Returns the full context value including availability state, device list,
 * scanning state, and all Bluetooth methods. Throws if used outside a
 * {@link WebBLEProvider}.
 *
 * @returns The full WebBLE context value.
 * @throws Error if called outside a {@link WebBLEProvider}.
 */
declare function useWebBLE(): WebBLEContextValue;

/**
 * ExtensionDetector - Automatically detects if the WebBLE Safari extension is installed
 */
declare class ExtensionDetector {
    private isDetected;
    private detectionPromise;
    private readonly DETECTION_TIMEOUT;
    /**
     * Determine whether the given user agent represents Safari (excluding
     * iOS in-app/alternate browsers such as Chrome iOS, Firefox iOS, Edge iOS,
     * and Opera iOS).
     *
     * This keeps Safari detection logic consistent between isBrowserSupported()
     * and getBrowserCompatibilityMessage().
     */
    private isSafariUserAgent;
    /**
     * Check if the extension is installed.
     * Checks the global marker and navigator.webble runtime marker set by the extension.
     */
    isInstalled(): boolean;
    /**
     * Detect extension with a timeout
     */
    detect(): Promise<boolean>;
    /**
     * Perform the actual detection
     */
    private performDetection;
    /**
     * Get installation instructions for iOS Safari
     */
    getInstallationInstructions(): string;
    /**
     * Open the extension store for installation
     */
    openExtensionStore(): void;
    /**
     * Check if the browser supports Web Bluetooth
     */
    isBrowserSupported(): boolean;
    /**
     * Get browser compatibility message
     */
    getBrowserCompatibilityMessage(): string | null;
}

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
declare function useBluetooth(): UseBluetoothReturn;

/**
 * Hook for managing the lifecycle of a specific Bluetooth device.
 *
 * Handles GATT connection, service discovery, disconnect events,
 * advertisement watching, and connection priority. Pass `null` when
 * no device has been selected yet.
 *
 * @param device - The {@link WebBLEDevice} to manage, or `null`.
 * @returns Device state (connection, services, errors) and control methods.
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
declare function useDevice(device: WebBLEDevice | null): UseDeviceReturn;

declare function useCharacteristic(device?: WebBLEDevice | null, serviceUUID?: string | null, characteristicUUID?: string | null): UseCharacteristicReturn;

interface NotificationOptions {
    autoSubscribe?: boolean;
    maxHistory?: number;
    maxQueueSize?: number;
}
/**
 * Hook for subscribing to GATT characteristic notifications.
 *
 * Delegates to {@link WebBLEDevice.subscribe} for notification lifecycle
 * management — including native start/stop and event dispatch. Maintains
 * a rolling history of received values.
 *
 * @param device - The connected {@link WebBLEDevice}, or `null`.
 * @param service - Human-readable service name or UUID (e.g. `'heart_rate'`).
 * @param characteristic - Human-readable characteristic name or UUID.
 * @param options - Optional configuration.
 *
 * @example
 * ```tsx
 * const { value, history, subscribe, unsubscribe } = useNotifications(
 *   device,
 *   'heart_rate',
 *   'heart_rate_measurement',
 *   { autoSubscribe: true },
 * );
 * ```
 */
declare function useNotifications(device: WebBLEDevice | null, service: string, characteristic: string, options?: NotificationOptions): UseNotificationsReturn;

/**
 * Hook for scanning for nearby Bluetooth Low Energy devices.
 *
 * Wraps the Web Bluetooth `requestLEScan` API with React-friendly state
 * management. Discovered devices are deduplicated by ID and accumulated
 * in the `devices` array as `WebBLEDevice` instances. The scan is
 * automatically stopped on unmount.
 *
 * Must be used inside a {@link WebBLEProvider}.
 *
 * @returns Scan state, discovered devices (as WebBLEDevice[]), and control methods.
 */
declare function useScan(): UseScanReturn;

declare function useConnection(deviceOrId?: WebBLEDevice | string | null, options?: ConnectionOptions): UseConnectionReturn;

/**
 * Hook that wraps a {@link BaseProfile} subclass from `@ios-web-bluetooth/profiles`.
 *
 * Manages profile instantiation, connection, and teardown tied to the
 * React component lifecycle. A new profile instance is created whenever
 * the `device` reference changes, and {@link BaseProfile.stop} is called
 * automatically on unmount or device change.
 *
 * @typeParam T - The profile class type (must have `connect()` and `stop()`).
 * @param ProfileClass - The profile constructor (e.g. `HeartRateProfile`).
 * @param device - The WebBLEDevice to bind to, or `null` if not yet available.
 * @returns An object with the profile instance, a `connect` function, and error state.
 *
 * @example
 * ```tsx
 * import { useProfile } from '@ios-web-bluetooth/react';
 * import { HeartRateProfile } from '@ios-web-bluetooth/profiles';
 * import type { WebBLEDevice } from '@ios-web-bluetooth/core';
 *
 * function HeartRateMonitor({ device }: { device: WebBLEDevice }) {
 *   const { profile, connect, error } = useProfile(HeartRateProfile, device);
 *   const [bpm, setBpm] = useState<number | null>(null);
 *
 *   useEffect(() => {
 *     connect().then(() => {
 *       profile?.onHeartRate((data) => setBpm(data.bpm));
 *     });
 *   }, [profile]);
 *
 *   return (
 *     <div>
 *       {bpm !== null ? <p>{bpm} BPM</p> : <p>Connecting...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
declare function useProfile<T extends {
    connect(): Promise<void>;
    stop(): void;
}>(ProfileClass: new (device: WebBLEDevice) => T, device: WebBLEDevice | null): {
    profile: T | null;
    connect: () => Promise<void>;
    error: WebBLEError | null;
};

interface DeviceScannerProps {
    onDeviceSelected?: (device: WebBLEDevice) => void;
    filters?: BluetoothLEScanFilter[];
    className?: string;
    showRssi?: boolean;
    sortByRssi?: boolean;
    maxDevices?: number;
    scanDuration?: number;
    autoConnect?: boolean;
}
/**
 * DeviceScanner - Full-featured device scanner UI component
 */
declare function DeviceScanner(props: DeviceScannerProps): React.JSX.Element;

interface ServiceExplorerProps {
    device?: WebBLEDevice | null;
    className?: string;
    autoConnect?: boolean;
    onCharacteristicSelect?: (characteristicId: string) => void;
    expandedByDefault?: boolean;
}
/**
 * ServiceExplorer - GATT hierarchy viewer component
 */
declare function ServiceExplorer({ device: inputDevice, className, autoConnect, onCharacteristicSelect, expandedByDefault }: ServiceExplorerProps): React.JSX.Element;

interface ConnectionStatusProps {
    device?: WebBLEDevice | null;
    deviceId?: string;
    className?: string;
}
/**
 * ConnectionStatus - Connection status indicator component
 */
declare function ConnectionStatus({ device, deviceId, className }: ConnectionStatusProps): React.JSX.Element;

interface InstallationWizardProps {
    onComplete?: () => void;
    /** App Store URL override */
    appStoreUrl?: string;
    /** Operator/app name shown in the prompt */
    operatorName?: string;
    className?: string;
}
/**
 * InstallationWizard - iOS-native style extension installation prompt.
 *
 * Renders as a bottom sheet overlay on iOS Safari, or a simple
 * inline message on other platforms.
 */
declare function InstallationWizard({ onComplete, appStoreUrl, operatorName, className, }: InstallationWizardProps): React.JSX.Element | null;

/**
 * Bluetooth utility functions for the React SDK
 */
/**
 * Get the human-readable name for a service UUID.
 * Accepts short-form (0X1800), hex (1800), or canonical UUIDs.
 */
declare function getServiceName(uuid: string): string;
/**
 * Get the human-readable name for a characteristic UUID.
 * Accepts short-form (0X2A37), hex (2a37), or canonical UUIDs.
 */
declare function getCharacteristicName(uuid: string): string;
/**
 * Parse a DataView value based on the characteristic UUID
 */
declare function parseValue(value: DataView, uuid: string): any;
/**
 * Format a value for writing to a characteristic
 */
declare function formatValue(value: any, uuid: string): ArrayBuffer;

export { type ConnectionState, ConnectionStatus, DeviceScanner, ExtensionDetector, InstallationWizard, type NotificationHandler, type ScanState, ServiceExplorer, type UseBluetoothReturn, type UseCharacteristicReturn, type UseConnectionReturn, type UseDeviceReturn, type UseNotificationsReturn, type UseScanReturn, type WebBLEConfig, WebBLEProvider, formatValue, getCharacteristicName, getServiceName, parseValue, useBluetooth, useCharacteristic, useConnection, useDevice, useNotifications, useProfile, useScan, useWebBLE };
