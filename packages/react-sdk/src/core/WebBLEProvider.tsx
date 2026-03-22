import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { WebBLEClient } from './WebBLEClient';
import { ExtensionDetector } from './ExtensionDetector';
import type { RequestDeviceOptions } from '../types';

function reportBLEEvent(apiKey: string | undefined, event: string) {
  if (!apiKey) return;
  import('@ios-web-bluetooth/detect').then(m => m.reportEvent(apiKey, event)).catch(() => {});
}

interface WebBLEConfig {
  autoConnect?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
  /** API key from ioswebble.com (wbl_xxxxx) — enables install prompt on iOS Safari */
  apiKey?: string;
  /** Operator/app name shown in the install prompt (e.g. "FitTracker") */
  operatorName?: string;
  /** App Store URL override (defaults to WebBLE listing) */
  appStoreUrl?: string;
}

interface WebBLEContextValue {
  // State
  isAvailable: boolean;
  isExtensionInstalled: boolean;
  isLoading: boolean;
  isScanning: boolean;
  devices: BluetoothDevice[];
  error: Error | null;
  config?: WebBLEConfig;
  /** @ios-web-bluetooth/core instance (available when @ios-web-bluetooth/core is installed) */
  core: any | null;

  // Methods
  requestDevice: (options?: RequestDeviceOptions) => Promise<BluetoothDevice | null>;
  getDevices: () => Promise<BluetoothDevice[]>;
  requestLEScan: (options?: BluetoothLEScanOptions) => Promise<BluetoothLEScan | null>;
  stopScan: () => void;
}

const WebBLEContext = createContext<WebBLEContextValue | null>(null);

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
export function WebBLEProvider({ children, config }: WebBLEProviderProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [currentScan, setCurrentScan] = useState<BluetoothLEScan | null>(null);
  const [coreInstance, setCoreInstance] = useState<any | null>(null);

  // Lazy-load @ios-web-bluetooth/core if available
  useEffect(() => {
    import('@ios-web-bluetooth/core').then(({ WebBLE }) => {
      setCoreInstance(new WebBLE());
    }).catch(() => {});
  }, []);

  // Initialize WebBLE client
  const client = useMemo(() => new WebBLEClient(config), [config]);
  const detector = useMemo(() => new ExtensionDetector(), []);

  // Check Bluetooth availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (navigator.bluetooth?.getAvailability) {
          const available = await navigator.bluetooth.getAvailability();
          setIsAvailable(available);
        }
      } catch (err) {
        setError(err as Error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, []);

  // Detect extension installation
  useEffect(() => {
    const handleExtensionReady = () => {
      setIsExtensionInstalled(true);
    };

    // Check if extension is already installed
    if (detector.isInstalled()) {
      setIsExtensionInstalled(true);
    }

    // Listen for extension ready event
    window.addEventListener('webble:extension:ready', handleExtensionReady);

    return () => {
      window.removeEventListener('webble:extension:ready', handleExtensionReady);
    };
  }, [detector]);

  // iOS Safari install prompt via @ios-web-bluetooth/detect (optional peer dependency)
  useEffect(() => {
    if (!config?.apiKey) return;
    if (isExtensionInstalled) return;

    let cancelled = false;
    (async () => {
      try {
        const detect = await import('@ios-web-bluetooth/detect');
        if (cancelled) return;
        await detect.initIOSWebBLE({
          key: config.apiKey!,
          operatorName: config.operatorName,
          banner: config.appStoreUrl ? { appStoreUrl: config.appStoreUrl } : undefined,
          onReady: () => setIsExtensionInstalled(true),
        });
      } catch {
        // @ios-web-bluetooth/detect not installed — silent fallback
      }
    })();

    return () => { cancelled = true; };
  }, [config?.apiKey, config?.operatorName, config?.appStoreUrl, isExtensionInstalled]);

  // Request device method
  const requestDevice = useCallback(async (options?: RequestDeviceOptions) => {
    try {
      setError(null);
      reportBLEEvent(config?.apiKey, 'ble_request');
      const device = await client.requestDevice(options);
      if (device) {
        setDevices(prev => {
          const exists = prev.some(d => d.id === device.id);
          return exists ? prev : [...prev, device];
        });
      }
      return device;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [client]);

  // Get devices method
  const getDevices = useCallback(async () => {
    try {
      setError(null);
      const deviceList = await client.getDevices();
      setDevices(deviceList);
      return deviceList; // Return the devices directly
    } catch (err) {
      setError(err as Error);
      return []; // Return empty array on error
    }
  }, [client]);

  // Request LE Scan method
  const requestLEScan = useCallback(async (options?: BluetoothLEScanOptions) => {
    try {
      setError(null);
      
      // Stop any existing scan
      if (currentScan?.active) {
        currentScan.stop();
      }
      
      const scan = await client.requestLEScan(options);
      if (scan) {
        setCurrentScan(scan);
        setIsScanning(true);
      }
      return scan;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [client, currentScan]);

  // Stop scan method
  const stopScan = useCallback(() => {
    if (currentScan?.active) {
      currentScan.stop();
    }
    setCurrentScan(null);
    setIsScanning(false);
  }, [currentScan]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<WebBLEContextValue>(() => ({
    isAvailable,
    isExtensionInstalled,
    isLoading,
    isScanning,
    devices,
    error,
    config,
    core: coreInstance,
    requestDevice,
    getDevices,
    requestLEScan,
    stopScan
  }), [
    isAvailable,
    isExtensionInstalled,
    isLoading,
    isScanning,
    devices,
    error,
    config,
    coreInstance,
    requestDevice,
    getDevices,
    requestLEScan,
    stopScan
  ]);

  return (
    <WebBLEContext.Provider value={contextValue}>
      {children}
    </WebBLEContext.Provider>
  );
}

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
export function useWebBLE() {
  const context = useContext(WebBLEContext);
  
  if (!context) {
    throw new Error('useWebBLE must be used within a WebBLEProvider');
  }
  
  return context;
}