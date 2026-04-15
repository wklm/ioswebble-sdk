import React, { useContext, useEffect, useState, useCallback, useMemo, ReactNode, useRef } from 'react';
import { WebBLE, WebBLEDevice, WebBLEError } from '@ios-web-bluetooth/core';
import type { RequestDeviceOptions } from '@ios-web-bluetooth/core';
import { ExtensionDetector } from './ExtensionDetector';
import type { WebBLEConfig } from '../types';
import { WebBLEContext, type WebBLEContextValue } from './WebBLEContext';

function reportBLEEvent(apiKey: string | undefined, event: string) {
  if (!apiKey) return;
  import('@ios-web-bluetooth/detect').then(m => m.reportEvent(apiKey, event)).catch(() => {});
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
export function WebBLEProvider({ children, config, ble }: WebBLEProviderProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [extensionInstallState, setExtensionInstallState] = useState<'not-installed' | 'installed-inactive' | 'active'>('not-installed');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<WebBLEDevice[]>([]);
  const [error, setError] = useState<WebBLEError | null>(null);
  const [currentScan, setCurrentScan] = useState<BluetoothLEScan | null>(null);
  const deviceMapRef = useRef<Map<string, WebBLEDevice>>(new Map());

  const coreInstance = useMemo(() => ble ?? new WebBLE(), [ble]);
  const detector = useMemo(() => new ExtensionDetector(), []);

  const cacheDevice = useCallback((device: WebBLEDevice): WebBLEDevice => {
    const existing = deviceMapRef.current.get(device.id);
    if (existing) {
      return existing;
    }

    deviceMapRef.current.set(device.id, device);
    return device;
  }, []);

  const syncDevices = useCallback((nextDevices: WebBLEDevice[]) => {
    const cachedDevices = nextDevices.map(cacheDevice);
    setDevices(cachedDevices);
    return cachedDevices;
  }, [cacheDevice]);

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const available = await coreInstance.getAvailability();
        setIsAvailable(available);
      } catch (err) {
        setError(WebBLEError.from(err));
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, [coreInstance]);

  useEffect(() => {
    const handleExtensionReady = () => {
      setExtensionInstallState('active');
      setIsExtensionInstalled(true);
    };

    // Check if extension is already installed
    const currentInstallState = detector.getInstallState();
    setExtensionInstallState(currentInstallState);
    setIsExtensionInstalled(currentInstallState !== 'not-installed');

    // Listen for extension ready event
    window.addEventListener('webble:extension:ready', handleExtensionReady);

    return () => {
      window.removeEventListener('webble:extension:ready', handleExtensionReady);
    };
  }, [detector]);

  useEffect(() => {
    if (!config?.apiKey) return;
    if (isExtensionInstalled) return;

    let cancelled = false;
    (async () => {
      try {
        const detect = await import('@ios-web-bluetooth/detect');
        if (cancelled) return;
        await detect.initIOSWebBLE({
          key: config?.apiKey ?? '',
          operatorName: config.operatorName,
          banner: config.startOnboardingUrl || config.appStoreUrl
            ? { startOnboardingUrl: config.startOnboardingUrl, appStoreUrl: config.appStoreUrl }
            : undefined,
          onReady: () => {
            setExtensionInstallState('active');
            setIsExtensionInstalled(true);
          },
          onInstalledInactive: () => {
            setExtensionInstallState('installed-inactive');
            setIsExtensionInstalled(true);
          },
          onNotInstalled: () => {
            setExtensionInstallState('not-installed');
            setIsExtensionInstalled(false);
          },
        });
      } catch {
        // @ios-web-bluetooth/detect not installed -- silent fallback
      }
    })();

    return () => { cancelled = true; };
  }, [config?.apiKey, config?.operatorName, config?.startOnboardingUrl, config?.appStoreUrl]);

  const requestDevice = useCallback(async (options: RequestDeviceOptions = { acceptAllDevices: true }) => {
    try {
      setError(null);
      reportBLEEvent(config?.apiKey, 'ble_request');
      const device = cacheDevice(await coreInstance.requestDevice(options));
      setDevices((prev) => prev.some((current) => current.id === device.id) ? prev : [...prev, device]);
      return device;
    } catch (err) {
      const webbleError = WebBLEError.from(err);
      const isUserCancellation = webbleError.code === 'USER_CANCELLED'
        || (err instanceof Error && err.name === 'NotFoundError');
      if (!isUserCancellation) {
        setError(webbleError);
      }
      return null;
    }
  }, [cacheDevice, config?.apiKey, coreInstance]);

  const getDevices = useCallback(async () => {
    try {
      setError(null);
      return syncDevices(await coreInstance.getDevices());
    } catch (err) {
      setError(WebBLEError.from(err));
      return devices;
    }
  }, [cacheDevice, devices, syncDevices]);

  const requestLEScan = useCallback(async (options: BluetoothLEScanOptions = { acceptAllAdvertisements: true }) => {
    try {
      setError(null);

      if (currentScan?.active) {
        currentScan.stop();
      }

      const scan = await (coreInstance as WebBLE & {
        requestLEScan?: (options?: BluetoothLEScanOptions) => Promise<BluetoothLEScan | null>;
      }).requestLEScan?.(options) ?? null;
      if (scan) {
        setCurrentScan(scan);
        setIsScanning(true);
      }
      return scan;
    } catch (err) {
      setError(WebBLEError.from(err));
      return null;
    }
  }, [coreInstance, currentScan]);

  const stopScan = useCallback(() => {
    if (currentScan?.active) {
      currentScan.stop();
    }
    setCurrentScan(null);
    setIsScanning(false);
  }, [currentScan]);

  const contextValue = useMemo<WebBLEContextValue>(() => ({
    isAvailable,
    isExtensionInstalled,
    extensionInstallState,
    isLoading,
    isScanning,
    devices,
    error,
    core: coreInstance,
    requestDevice,
    getDevices,
    requestLEScan,
    stopScan,
  }), [
    isAvailable,
    isExtensionInstalled,
    extensionInstallState,
    isLoading,
    isScanning,
    devices,
    error,
    coreInstance,
    requestDevice,
    getDevices,
    requestLEScan,
    stopScan,
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
 * @returns The full WebBLE context value.
 * @throws Error if called outside a {@link WebBLEProvider}.
 */
export function useWebBLE() {
  const context = useContext(WebBLEContext);

  if (!context) {
    throw new Error('useWebBLE must be used within a WebBLEProvider');
  }

  return context;
}
