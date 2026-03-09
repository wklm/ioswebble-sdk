import React, { ReactNode } from 'react';

/**
 * Type definitions for @ios-web-bluetooth/react SDK
 */
interface WebBLEConfig$2 {
    autoConnect?: boolean;
    cacheTimeout?: number;
    retryAttempts?: number;
    enableLogging?: boolean;
    scanTimeout?: number;
    /** API key from ioswebble.com (wbl_xxxxx) — enables install prompt on iOS Safari */
    apiKey?: string;
    /** Operator/app name shown in the install prompt (e.g. "FitTracker") */
    operatorName?: string;
    /** App Store URL override (defaults to iOSWebBLE listing) */
    appStoreUrl?: string;
}
interface BluetoothDeviceInfo {
    id: string;
    name?: string;
    connected: boolean;
    rssi?: number;
    txPower?: number;
    manufacturerData?: Map<number, DataView>;
    serviceData?: Map<string, DataView>;
    uuids?: string[];
    gatt?: BluetoothRemoteGATTServer;
}
interface GATTServiceInfo {
    uuid: string;
    isPrimary: boolean;
    device: BluetoothDeviceInfo;
    characteristics?: GATTCharacteristicInfo[];
}
interface GATTCharacteristicInfo {
    uuid: string;
    properties: CharacteristicProperties;
    value?: DataView;
    service: GATTServiceInfo;
    descriptors?: GATTDescriptorInfo[];
}
interface GATTDescriptorInfo {
    uuid: string;
    value?: DataView;
    characteristic: GATTCharacteristicInfo;
}
interface CharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
}
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
type ScanState = 'idle' | 'scanning' | 'stopped';
interface ScanOptions {
    filters?: BluetoothLEScanFilter[];
    keepRepeatedDevices?: boolean;
    acceptAllAdvertisements?: boolean;
    timeout?: number;
}
interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
    manufacturerData?: ManufacturerDataFilter[];
    serviceData?: ServiceDataFilter[];
}
interface ManufacturerDataFilter {
    companyIdentifier: number;
    dataPrefix?: BufferSource;
    mask?: BufferSource;
}
interface ServiceDataFilter {
    service: BluetoothServiceUUID;
    dataPrefix?: BufferSource;
    mask?: BufferSource;
}
type BluetoothServiceUUID = number | string;
type NotificationHandler = (value: DataView) => void;
interface UseBluetoothReturn {
    isAvailable: boolean;
    isExtensionInstalled: boolean;
    isSupported: boolean;
    requestDevice: (options?: RequestDeviceOptions) => Promise<BluetoothDevice | null>;
    getDevices: () => Promise<BluetoothDevice[]>;
    error: Error | null;
}
interface UseNotificationsReturn {
    isSubscribed: boolean;
    value: DataView | null;
    history: NotificationEntry[];
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
    clear: () => void;
    error: Error | null;
}
interface NotificationEntry {
    timestamp: Date;
    value: DataView;
}
interface UseScanReturn {
    scanState: ScanState;
    devices: BluetoothDevice[];
    start: (options?: ScanOptions) => Promise<void>;
    stop: () => void;
    clear: () => void;
    error: Error | null;
    setError?: (error: Error | null) => void;
}
interface UseConnectionReturn {
    connectionState: ConnectionState;
    rssi: number | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    getConnectionParameters: () => Promise<ConnectionParameters | null>;
    requestConnectionPriority: (priority: ConnectionPriority) => Promise<void>;
    error: Error | null;
    setConnectionState?: (state: ConnectionState) => void;
    setAutoReconnect?: (value: boolean) => void;
    startRssiMonitoring?: () => Promise<void>;
    stopRssiMonitoring?: () => void;
    autoReconnect?: boolean;
}
interface ConnectionParameters {
    connectionInterval: number;
    slaveLatency: number;
    supervisionTimeout: number;
}
type ConnectionPriority = 'balanced' | 'high' | 'low-power';
interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    exclusionFilters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
    optionalManufacturerData?: number[];
    acceptAllDevices?: boolean;
}

interface WebBLEConfig$1 {
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
    config?: WebBLEConfig$1;
    /** @ios-web-bluetooth/core instance (available when @ios-web-bluetooth/core is installed) */
    core: any | null;
    requestDevice: (options?: RequestDeviceOptions) => Promise<BluetoothDevice | null>;
    getDevices: () => Promise<BluetoothDevice[]>;
    requestLEScan: (options?: BluetoothLEScanOptions) => Promise<BluetoothLEScan | null>;
    stopScan: () => void;
}
interface WebBLEProviderProps {
    children: ReactNode;
    config?: WebBLEConfig$1;
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
declare function WebBLEProvider({ children, config }: WebBLEProviderProps): React.JSX.Element;
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
declare function useWebBLE(): WebBLEContextValue;

/**
 * WebBLEClient - Core client wrapper for Web Bluetooth API
 * Provides a unified interface for all Bluetooth operations
 */

interface WebBLEConfig {
    autoConnect?: boolean;
    cacheTimeout?: number;
    retryAttempts?: number;
    apiKey?: string;
}
declare class WebBLEClient {
    private config;
    private deviceCache;
    private reconnectTimers;
    constructor(config?: WebBLEConfig);
    /**
     * Request a Bluetooth device from the user
     */
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice | null>;
    /**
     * Get list of previously paired devices
     */
    getDevices(): Promise<BluetoothDevice[]>;
    /**
     * Start scanning for BLE advertisements
     */
    requestLEScan(options?: BluetoothLEScanOptions): Promise<BluetoothLEScan | null>;
    /**
     * Connect to a device with retry logic
     */
    private connectWithRetry;
    /**
     * Schedule a reconnection attempt
     */
    private scheduleReconnect;
    /**
     * Delay helper for retry logic
     */
    private delay;
    /**
     * Handle advertisement received event
     */
    private handleAdvertisement;
    /**
     * Clean up resources
     */
    dispose(): void;
}

/**
 * ExtensionDetector - Automatically detects if the WebBLE Safari extension is installed
 */
declare class ExtensionDetector {
    private isDetected;
    private detectionPromise;
    private readonly DETECTION_TIMEOUT;
    /**
     * Check if the extension is installed.
     * Checks the global marker and navigator.webble/__webble (set by the extension).
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

interface UseDeviceReturn {
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
declare function useDevice(device: BluetoothDevice | null): UseDeviceReturn;

interface UseCharacteristicReturn {
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
    error: Error | null;
}
/**
 * useCharacteristic - Hook for managing a GATT characteristic
 *
 * @param characteristic - The BluetoothRemoteGATTCharacteristic instance
 * @param service - The parent BluetoothRemoteGATTService
 * @param device - The parent BluetoothDevice
 * @returns Characteristic state and control methods
 */
declare function useCharacteristic(characteristic?: BluetoothRemoteGATTCharacteristic | null, _service?: BluetoothRemoteGATTService | null, _device?: BluetoothDevice | null): UseCharacteristicReturn;

interface NotificationOptions {
    autoSubscribe?: boolean;
    maxHistory?: number;
}
/**
 * useNotifications - Hook for managing characteristic notifications
 *
 * @param characteristic - The BluetoothRemoteGATTCharacteristic to monitor
 * @param options - Optional configuration for notifications
 * @returns Notification state and control methods
 */
declare function useNotifications(characteristic?: BluetoothRemoteGATTCharacteristic | null, options?: NotificationOptions): UseNotificationsReturn;

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
declare function useScan(): UseScanReturn;

/**
 * useConnection - Hook for managing device connection parameters
 *
 * @param deviceId - The ID of the device
 * @returns Connection state and control methods
 */
declare function useConnection(deviceId?: string): UseConnectionReturn;

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
 * @param device - The BLE device to bind to, or `null` if not yet available.
 * @returns An object with the profile instance, a `connect` function, and error state.
 *
 * @example
 * ```tsx
 * import { useProfile } from '@ios-web-bluetooth/react';
 * import { HeartRateProfile } from '@ios-web-bluetooth/profiles';
 *
 * function HeartRateMonitor({ device }: { device: BluetoothDevice }) {
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
}>(ProfileClass: new (device: any) => T, device: any | null): {
    profile: T | null;
    connect: () => Promise<void>;
    error: Error | null;
};

interface DeviceScannerProps {
    onDeviceSelected?: (device: BluetoothDevice) => void;
    filters?: BluetoothLEScanFilter[];
    className?: string;
    autoConnect?: boolean;
    showRssi?: boolean;
    sortByRssi?: boolean;
    maxDevices?: number;
    scanDuration?: number;
}
/**
 * DeviceScanner - Full-featured device scanner UI component
 */
declare function DeviceScanner({ onDeviceSelected, filters, className, autoConnect, showRssi, sortByRssi, maxDevices, scanDuration }: DeviceScannerProps): React.JSX.Element;

interface ServiceExplorerProps {
    device?: BluetoothDevice | null;
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
    deviceId?: string;
    className?: string;
}
/**
 * ConnectionStatus - Connection status indicator component
 */
declare function ConnectionStatus({ deviceId, className }: ConnectionStatusProps): React.JSX.Element;

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

/**
 * @ios-web-bluetooth/react - Production-grade Web Bluetooth SDK for React
 *
 * One-line integration for Web Bluetooth in React applications
 * with full Safari support through the WebBLE extension.
 */

declare const WebBLE: {
    Provider: typeof WebBLEProvider;
    useWebBLE: typeof useWebBLE;
    useBluetooth: typeof useBluetooth;
    DeviceScanner: typeof DeviceScanner;
};

export { ConnectionStatus, DeviceScanner, ExtensionDetector, InstallationWizard, ServiceExplorer, WebBLE, WebBLEClient, WebBLEProvider, WebBLE as default, formatValue, getCharacteristicName, getServiceName, parseValue, useBluetooth, useCharacteristic, useConnection, useDevice, useNotifications, useProfile, useScan, useWebBLE };
export type { BluetoothDeviceInfo, ConnectionState, GATTCharacteristicInfo, GATTServiceInfo, NotificationHandler, ScanState, WebBLEConfig$2 as WebBLEConfig };
