'use strict';

var React3 = require('react');
var core = require('@ios-web-bluetooth/core');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var React3__default = /*#__PURE__*/_interopDefault(React3);

// src/core/WebBLEProvider.tsx

// src/core/ExtensionDetector.ts
var ExtensionDetector = class {
  constructor() {
    this.isDetected = false;
    this.detectionPromise = null;
    this.DETECTION_TIMEOUT = 3e3;
  }
  /**
   * Determine whether the given user agent represents Safari (excluding
   * iOS in-app/alternate browsers such as Chrome iOS, Firefox iOS, Edge iOS,
   * and Opera iOS).
   *
   * This keeps Safari detection logic consistent between isBrowserSupported()
   * and getBrowserCompatibilityMessage().
   */
  isSafariUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    const isAlternateIosBrowser = ua.includes("crios") || // Chrome on iOS
    ua.includes("fxios") || // Firefox on iOS
    ua.includes("edgios") || // Edge on iOS
    ua.includes("opios");
    return ua.includes("safari") && !ua.includes("chrome") && !isAlternateIosBrowser;
  }
  /**
   * Check if the extension is installed.
   * Checks the global marker and navigator.webble runtime marker set by the extension.
   */
  isInstalled() {
    if (typeof window !== "undefined" && window.__webble?.status === "installed") {
      this.isDetected = true;
      return true;
    }
    if (typeof navigator !== "undefined") {
      if (navigator.webble?.__webble === true) {
        this.isDetected = true;
        return true;
      }
    }
    return this.isDetected;
  }
  /**
   * Detect extension with a timeout
   */
  detect() {
    if (this.isDetected) {
      return Promise.resolve(true);
    }
    if (this.detectionPromise) {
      return this.detectionPromise;
    }
    this.detectionPromise = this.performDetection().finally(() => {
      this.detectionPromise = null;
    });
    return this.detectionPromise;
  }
  /**
   * Perform the actual detection
   */
  async performDetection() {
    return new Promise((resolve) => {
      if (this.isInstalled()) {
        resolve(true);
        return;
      }
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      let resolved = false;
      const handleExtensionReady = () => {
        if (!resolved) {
          resolved = true;
          this.isDetected = true;
          window.removeEventListener("webble:extension:ready", handleExtensionReady);
          resolve(true);
        }
      };
      window.addEventListener("webble:extension:ready", handleExtensionReady);
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("webble:extension:ready", handleExtensionReady);
          resolve(this.isInstalled());
        }
      }, this.DETECTION_TIMEOUT);
    });
  }
  /**
   * Get installation instructions for iOS Safari
   */
  getInstallationInstructions() {
    return `To use Bluetooth on Safari for iOS:
1. Install the WebBLE extension from the App Store
2. In Safari, tap aA in the address bar
3. Tap "Manage Extensions" and enable WebBLE
4. Tap aA again, tap the WebBLE icon
5. Choose "Always Allow" then "Always Allow on Every Website"
6. Refresh this page`;
  }
  /**
   * Open the extension store for installation
   */
  openExtensionStore() {
    if (typeof navigator === "undefined") return;
    const userAgent = navigator.userAgent.toLowerCase();
    const appStoreUrl = "https://apps.apple.com/app/ioswebble/id0000000000";
    if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      window.open(appStoreUrl, "_blank");
    } else {
      window.open("https://ioswebble.com", "_blank");
    }
  }
  /**
   * Check if the browser supports Web Bluetooth
   */
  isBrowserSupported() {
    if (typeof window === "undefined") {
      return false;
    }
    if ("isSecureContext" in window && !window.isSecureContext) {
      return false;
    }
    const userAgent = navigator.userAgent;
    const isSafari = this.isSafariUserAgent(userAgent);
    if (isSafari) {
      return true;
    }
    return "bluetooth" in navigator;
  }
  /**
   * Get browser compatibility message
   */
  getBrowserCompatibilityMessage() {
    if (typeof window === "undefined") {
      return "Window object not available";
    }
    if ("isSecureContext" in window && !window.isSecureContext) {
      return "Web Bluetooth requires a secure context (HTTPS or localhost)";
    }
    const userAgent = navigator.userAgent;
    const isSafari = this.isSafariUserAgent(userAgent);
    if (isSafari && !this.isInstalled()) {
      return "Safari requires the WebBLE extension for Bluetooth support";
    }
    if (!("bluetooth" in navigator) && !isSafari) {
      return "Your browser does not support Web Bluetooth";
    }
    return null;
  }
};
var WebBLEContext = React3.createContext(null);

// src/core/WebBLEProvider.tsx
function reportBLEEvent(apiKey, event) {
  if (!apiKey) return;
  import('@ios-web-bluetooth/detect').then((m) => m.reportEvent(apiKey, event)).catch(() => {
  });
}
function WebBLEProvider({ children, config, ble }) {
  const [isAvailable, setIsAvailable] = React3.useState(false);
  const [isExtensionInstalled, setIsExtensionInstalled] = React3.useState(false);
  const [isLoading, setIsLoading] = React3.useState(true);
  const [isScanning, setIsScanning] = React3.useState(false);
  const [devices, setDevices] = React3.useState([]);
  const [error, setError] = React3.useState(null);
  const [currentScan, setCurrentScan] = React3.useState(null);
  const deviceMapRef = React3.useRef(/* @__PURE__ */ new Map());
  const coreInstance = React3.useMemo(() => ble ?? new core.WebBLE(), [ble]);
  const detector = React3.useMemo(() => new ExtensionDetector(), []);
  const cacheDevice = React3.useCallback((device) => {
    const existing = deviceMapRef.current.get(device.id);
    if (existing) {
      return existing;
    }
    deviceMapRef.current.set(device.id, device);
    return device;
  }, []);
  const syncDevices = React3.useCallback((nextDevices) => {
    const cachedDevices = nextDevices.map(cacheDevice);
    setDevices(cachedDevices);
    return cachedDevices;
  }, [cacheDevice]);
  React3.useEffect(() => {
    const checkAvailability = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const available = await coreInstance.getAvailability();
        setIsAvailable(available);
      } catch (err) {
        setError(core.WebBLEError.from(err));
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAvailability();
  }, [coreInstance]);
  React3.useEffect(() => {
    const handleExtensionReady = () => {
      setIsExtensionInstalled(true);
    };
    if (detector.isInstalled()) {
      setIsExtensionInstalled(true);
    }
    window.addEventListener("webble:extension:ready", handleExtensionReady);
    return () => {
      window.removeEventListener("webble:extension:ready", handleExtensionReady);
    };
  }, [detector]);
  React3.useEffect(() => {
    if (!config?.apiKey) return;
    if (isExtensionInstalled) return;
    let cancelled = false;
    (async () => {
      try {
        const detect = await import('@ios-web-bluetooth/detect');
        if (cancelled) return;
        await detect.initIOSWebBLE({
          key: config.apiKey,
          operatorName: config.operatorName,
          banner: config.appStoreUrl ? { appStoreUrl: config.appStoreUrl } : void 0,
          onReady: () => setIsExtensionInstalled(true)
        });
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config?.apiKey, config?.operatorName, config?.appStoreUrl, isExtensionInstalled]);
  const requestDevice = React3.useCallback(async (options = { acceptAllDevices: true }) => {
    try {
      setError(null);
      reportBLEEvent(config?.apiKey, "ble_request");
      const device = cacheDevice(await coreInstance.requestDevice(options));
      setDevices((prev) => prev.some((current) => current.id === device.id) ? prev : [...prev, device]);
      return device;
    } catch (err) {
      const webbleError = core.WebBLEError.from(err);
      const isUserCancellation = webbleError.code === "USER_CANCELLED" || err instanceof Error && err.name === "NotFoundError";
      if (!isUserCancellation) {
        setError(webbleError);
      }
      return null;
    }
  }, [cacheDevice, config?.apiKey, coreInstance]);
  const getDevices = React3.useCallback(async () => {
    try {
      setError(null);
      return syncDevices(await coreInstance.getDevices());
    } catch (err) {
      setError(core.WebBLEError.from(err));
      return devices;
    }
  }, [cacheDevice, devices, syncDevices]);
  const requestLEScan = React3.useCallback(async (options = { acceptAllAdvertisements: true }) => {
    try {
      setError(null);
      if (currentScan?.active) {
        currentScan.stop();
      }
      const scan = await coreInstance.requestLEScan?.(options) ?? null;
      if (scan) {
        setCurrentScan(scan);
        setIsScanning(true);
      }
      return scan;
    } catch (err) {
      setError(core.WebBLEError.from(err));
      return null;
    }
  }, [coreInstance, currentScan]);
  const stopScan = React3.useCallback(() => {
    if (currentScan?.active) {
      currentScan.stop();
    }
    setCurrentScan(null);
    setIsScanning(false);
  }, [currentScan]);
  const contextValue = React3.useMemo(() => ({
    isAvailable,
    isExtensionInstalled,
    isLoading,
    isScanning,
    devices,
    error,
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
    coreInstance,
    requestDevice,
    getDevices,
    requestLEScan,
    stopScan
  ]);
  return /* @__PURE__ */ React3__default.default.createElement(WebBLEContext.Provider, { value: contextValue }, children);
}
function useWebBLE() {
  const context = React3.useContext(WebBLEContext);
  if (!context) {
    throw new Error("useWebBLE must be used within a WebBLEProvider");
  }
  return context;
}
function useBluetooth() {
  const context = useWebBLE();
  const ble = context.core;
  const isSupported = React3.useMemo(() => ble.isSupported, [ble]);
  const backgroundSync = React3.useMemo(() => ble.backgroundSync, [ble]);
  const peripheral = React3.useMemo(() => ble.peripheral, [ble]);
  const requestDevice = React3.useCallback(async (options = { acceptAllDevices: true }) => {
    try {
      return await context.requestDevice(options);
    } catch (error) {
      const candidate = core.WebBLEError.from(error);
      if (candidate.code === "USER_CANCELLED") {
        return null;
      }
      throw error;
    }
  }, [context]);
  const getDevices = React3.useCallback(async () => context.getDevices(), [context]);
  return {
    isAvailable: context.isAvailable,
    isExtensionInstalled: context.isExtensionInstalled,
    isSupported,
    ble,
    backgroundSync,
    peripheral,
    requestDevice,
    getDevices,
    error: context.error
  };
}
function useDevice(device) {
  const [connectionState, setConnectionState] = React3.useState(() => device?.connected ? "connected" : "disconnected");
  const [services, setServices] = React3.useState([]);
  const [error, setError] = React3.useState(null);
  const [isWatchingAdvertisements, setIsWatchingAdvertisements] = React3.useState(false);
  const [connectionPriority, setConnectionPriorityState] = React3.useState(null);
  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";
  const loadServices = React3.useCallback(async (target) => {
    const getPrimaryServices = target.getPrimaryServices;
    if (typeof getPrimaryServices !== "function") {
      setServices([]);
      return;
    }
    const discoveredServices = await getPrimaryServices.call(target);
    setServices(discoveredServices);
  }, []);
  const connect = React3.useCallback(async (_options) => {
    if (!device) {
      setError(new core.WebBLEError("INVALID_PARAMETER", "No device available"));
      return;
    }
    try {
      setError(null);
      setConnectionState("connecting");
      await device.connect();
      setConnectionState(device.connected ? "connected" : "connected");
      try {
        await loadServices(device);
      } catch (serviceError) {
        setError(core.WebBLEError.from(serviceError));
      }
    } catch (err) {
      setError(core.WebBLEError.from(err));
      setConnectionState("disconnected");
    }
  }, [device, loadServices]);
  const disconnect = React3.useCallback(() => {
    if (!device) {
      return;
    }
    try {
      setError(null);
      setConnectionState("disconnecting");
      device.disconnect();
    } catch (err) {
      setError(core.WebBLEError.from(err));
    } finally {
      setConnectionState("disconnected");
    }
    setServices([]);
  }, [device]);
  const watchAdvertisements = React3.useCallback(async () => {
    if (!device) {
      setError(new core.WebBLEError("INVALID_PARAMETER", "No device to watch"));
      return;
    }
    try {
      setError(null);
      await device.watchAdvertisements();
      setIsWatchingAdvertisements(true);
    } catch (err) {
      setError(core.WebBLEError.from(err));
    }
  }, [device]);
  const unwatchAdvertisements = React3.useCallback(async () => {
    if (!device) {
      setError(new core.WebBLEError("INVALID_PARAMETER", "No device to unwatch"));
      return;
    }
    try {
      setError(null);
      await device.unwatchAdvertisements();
      setIsWatchingAdvertisements(false);
    } catch (err) {
      setError(core.WebBLEError.from(err));
    }
  }, [device]);
  const forget = React3.useCallback(async () => {
    if (!device) {
      setError(new core.WebBLEError("INVALID_PARAMETER", "No device to forget"));
      return;
    }
    try {
      setError(null);
      await device.forget();
      setConnectionState("disconnected");
      setServices([]);
    } catch (err) {
      setError(core.WebBLEError.from(err));
    }
  }, [device]);
  const setConnectionPriority = React3.useCallback(async (priority) => {
    if (!device) {
      setError(new core.WebBLEError("INVALID_PARAMETER", "Device not available"));
      return;
    }
    const gatt = device.raw.gatt;
    if (!gatt) {
      setError(new core.WebBLEError("GATT_OPERATION_FAILED", "Device does not support GATT"));
      return;
    }
    try {
      setError(null);
      if ("requestConnectionPriority" in gatt) {
        await gatt.requestConnectionPriority(priority);
        setConnectionPriorityState(priority);
      } else {
        setError(new core.WebBLEError("GATT_OPERATION_FAILED", "Connection priority not supported"));
      }
    } catch (err) {
      setError(core.WebBLEError.from(err));
    }
  }, [device]);
  React3.useEffect(() => {
    if (!device) {
      setConnectionState("disconnected");
      setServices([]);
      setIsWatchingAdvertisements(false);
      return;
    }
    setConnectionState(device.connected ? "connected" : "disconnected");
    if (device.connected) {
      loadServices(device).catch(() => {
      });
    }
    const handleDisconnect = () => {
      setConnectionState("disconnected");
      setServices([]);
      setIsWatchingAdvertisements(false);
    };
    const handleReconnect = () => {
      setConnectionState("connected");
      loadServices(device).catch(() => {
      });
    };
    const offDisconnect = device.on("disconnected", handleDisconnect);
    const offReconnect = device.on("reconnected", handleReconnect);
    return () => {
      offDisconnect();
      offReconnect();
    };
  }, [device, loadServices]);
  return {
    device,
    connectionState,
    isConnected,
    isConnecting,
    services,
    error,
    connect,
    disconnect,
    watchAdvertisements,
    unwatchAdvertisements,
    isWatchingAdvertisements,
    forget,
    connectionPriority,
    setConnectionPriority
  };
}
async function resolveCharacteristic(device, serviceUUID, characteristicUUID) {
  const services = await device.getPrimaryServices();
  const service = services.find((candidate) => candidate.uuid === serviceUUID) ?? await device.raw.gatt?.getPrimaryService(serviceUUID);
  if (!service) {
    throw new Error(`Service ${serviceUUID} not found`);
  }
  return service.getCharacteristic(characteristicUUID);
}
function useCharacteristic(device, serviceUUID, characteristicUUID) {
  const [target, setTarget] = React3.useState({
    device: device ?? null,
    serviceUUID: serviceUUID ?? null,
    characteristicUUID: characteristicUUID ?? null,
    characteristic: null
  });
  const [value, setValue] = React3.useState(null);
  const [error, setError] = React3.useState(null);
  const [isNotifying, setIsNotifying] = React3.useState(false);
  const notificationHandlerRef = React3.useRef(null);
  const unsubscribeRef = React3.useRef(null);
  React3.useEffect(() => {
    let cancelled = false;
    if (!device || !serviceUUID || !characteristicUUID || !device.connected) {
      setTarget({
        device: device ?? null,
        serviceUUID: serviceUUID ?? null,
        characteristicUUID: characteristicUUID ?? null,
        characteristic: null
      });
      setIsNotifying(false);
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      return;
    }
    void resolveCharacteristic(device, serviceUUID, characteristicUUID).then((characteristic) => {
      if (cancelled) return;
      setTarget({ device, serviceUUID, characteristicUUID, characteristic });
    }).catch((resolveError) => {
      if (cancelled) return;
      setError(core.WebBLEError.from(resolveError));
      setTarget({ device, serviceUUID, characteristicUUID, characteristic: null });
    });
    return () => {
      cancelled = true;
    };
  }, [device, serviceUUID, characteristicUUID]);
  const properties = target.characteristic?.properties ?? null;
  const requireTarget = React3.useCallback(() => {
    if (!device || !serviceUUID || !characteristicUUID) {
      throw new Error("No characteristic target available");
    }
    return { device, serviceUUID, characteristicUUID };
  }, [device, serviceUUID, characteristicUUID]);
  const read = React3.useCallback(async () => {
    try {
      setError(null);
      const current = requireTarget();
      const nextValue = await current.device.read(current.serviceUUID, current.characteristicUUID);
      setValue(nextValue);
      return nextValue;
    } catch (err) {
      setError(core.WebBLEError.from(err));
      return null;
    }
  }, [requireTarget]);
  const write = React3.useCallback(async (nextValue) => {
    try {
      setError(null);
      const current = requireTarget();
      await current.device.write(current.serviceUUID, current.characteristicUUID, nextValue);
    } catch (err) {
      setError(core.WebBLEError.from(err));
    }
  }, [requireTarget]);
  const writeWithoutResponse = React3.useCallback(async (nextValue) => {
    try {
      setError(null);
      const current = requireTarget();
      await current.device.writeWithoutResponse(current.serviceUUID, current.characteristicUUID, nextValue);
    } catch (err) {
      setError(core.WebBLEError.from(err));
    }
  }, [requireTarget]);
  const subscribe = React3.useCallback(async (handler) => {
    try {
      setError(null);
      const current = requireTarget();
      unsubscribeRef.current?.();
      notificationHandlerRef.current = handler;
      const subscribeAsync = current.device.subscribeAsync;
      const startSubscription = typeof subscribeAsync === "function" ? subscribeAsync.bind(current.device) : current.device.subscribe.bind(current.device);
      unsubscribeRef.current = await startSubscription(current.serviceUUID, current.characteristicUUID, (nextValue) => {
        setValue(nextValue);
        notificationHandlerRef.current?.(nextValue);
      });
      setIsNotifying(true);
    } catch (err) {
      setError(core.WebBLEError.from(err));
      setIsNotifying(false);
    }
  }, [requireTarget]);
  const unsubscribe = React3.useCallback(async () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    notificationHandlerRef.current = null;
    setIsNotifying(false);
  }, []);
  const getDescriptor = React3.useCallback(async (uuid) => {
    try {
      setError(null);
      if (!target.characteristic) {
        throw new Error("No characteristic target available");
      }
      return await target.characteristic.getDescriptor(uuid);
    } catch (err) {
      setError(core.WebBLEError.from(err));
      return null;
    }
  }, [target.characteristic]);
  const getDescriptors = React3.useCallback(async () => {
    try {
      setError(null);
      if (!target.characteristic) {
        throw new Error("No characteristic target available");
      }
      return await target.characteristic.getDescriptors();
    } catch (err) {
      setError(core.WebBLEError.from(err));
      return [];
    }
  }, [target.characteristic]);
  React3.useEffect(() => () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);
  return {
    device: target.device,
    serviceUUID: target.serviceUUID,
    characteristicUUID: target.characteristicUUID,
    characteristic: target.characteristic,
    value,
    properties,
    read,
    write,
    writeWithoutResponse,
    subscribe,
    unsubscribe,
    isNotifying,
    getDescriptor,
    getDescriptors,
    error
  };
}
function useNotifications(device, service, characteristic, options) {
  const [isSubscribed, setIsSubscribed] = React3.useState(false);
  const [value, setValue] = React3.useState(null);
  const [history, setHistory] = React3.useState([]);
  const [error, setError] = React3.useState(null);
  const unsubscribeRef = React3.useRef(null);
  const maxHistory = options?.maxHistory ?? 100;
  const autoSubscribe = options?.autoSubscribe ?? false;
  const callback = React3.useCallback((newValue) => {
    setValue(newValue);
    setHistory((prev) => {
      const entry = { timestamp: /* @__PURE__ */ new Date(), value: newValue };
      const updated = [...prev, entry];
      return updated.length > maxHistory ? updated.slice(-maxHistory) : updated;
    });
  }, [maxHistory]);
  const subscribe = React3.useCallback(async () => {
    if (isSubscribed) return;
    if (!device) {
      setError(new core.WebBLEError("INVALID_PARAMETER", "No device available"));
      return;
    }
    if (!device.connected) {
      setError(new core.WebBLEError("INVALID_PARAMETER", "Device is not connected"));
      return;
    }
    try {
      setError(null);
      unsubscribeRef.current?.();
      const subscribeAsync = device.subscribeAsync;
      const startSubscription = typeof subscribeAsync === "function" ? subscribeAsync.bind(device) : device.subscribe.bind(device);
      const unsub = await startSubscription(service, characteristic, callback);
      unsubscribeRef.current = unsub;
      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof core.WebBLEError ? err : core.WebBLEError.from(err));
      setIsSubscribed(false);
    }
  }, [device, service, characteristic, callback, isSubscribed]);
  const unsubscribe = React3.useCallback(async () => {
    if (!isSubscribed) return;
    try {
      setError(null);
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof core.WebBLEError ? err : core.WebBLEError.from(err));
    }
  }, [isSubscribed]);
  const clear = React3.useCallback(() => {
    setHistory([]);
    setValue(null);
  }, []);
  React3.useEffect(() => {
    setIsSubscribed(false);
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [device, service, characteristic]);
  React3.useEffect(() => {
    if (autoSubscribe && device?.connected && !isSubscribed) {
      void subscribe();
    }
  }, [autoSubscribe, device, isSubscribed, subscribe]);
  return {
    isSubscribed,
    value,
    history,
    subscribe,
    unsubscribe,
    clear,
    error
  };
}
function useScan() {
  const { requestLEScan, stopScan: contextStopScan } = useWebBLE();
  const [scanState, setScanState] = React3.useState("idle");
  const [devices, setDevices] = React3.useState([]);
  const [error, setError] = React3.useState(null);
  const scanRef = React3.useRef(null);
  const deviceMapRef = React3.useRef(/* @__PURE__ */ new Map());
  const handleAdvertisement = React3.useCallback((event) => {
    const adEvent = event;
    const rawDevice = adEvent.device;
    if (!rawDevice) return;
    let wrappedDevice = deviceMapRef.current.get(rawDevice.id);
    if (!wrappedDevice) {
      wrappedDevice = new core.WebBLEDevice(rawDevice);
      deviceMapRef.current.set(rawDevice.id, wrappedDevice);
      setDevices(Array.from(deviceMapRef.current.values()));
    }
  }, []);
  const start = React3.useCallback(async (options) => {
    if (scanState === "scanning") {
      return;
    }
    try {
      setError(null);
      setScanState("scanning");
      deviceMapRef.current.clear();
      setDevices([]);
      const scan = await requestLEScan(options || {});
      if (scan) {
        scanRef.current = scan;
        const bluetooth = core.getBluetoothAPI();
        bluetooth?.addEventListener?.("advertisementreceived", handleAdvertisement);
      } else {
        setScanState("idle");
      }
    } catch (err) {
      setError(core.WebBLEError.from(err));
      setScanState("idle");
    }
  }, [scanState, requestLEScan, handleAdvertisement]);
  const stop = React3.useCallback(() => {
    if (scanRef.current?.active) {
      scanRef.current.stop();
    }
    const bluetooth = core.getBluetoothAPI();
    bluetooth?.removeEventListener?.("advertisementreceived", handleAdvertisement);
    contextStopScan();
    setScanState("stopped");
    scanRef.current = null;
  }, [contextStopScan, handleAdvertisement]);
  const clear = React3.useCallback(() => {
    setDevices([]);
    deviceMapRef.current.clear();
    setError(null);
  }, []);
  React3.useEffect(() => {
    return () => {
      if (scanRef.current?.active) {
        scanRef.current.stop();
      }
      const bluetooth = core.getBluetoothAPI();
      bluetooth?.removeEventListener?.("advertisementreceived", handleAdvertisement);
    };
  }, [handleAdvertisement]);
  return {
    scanState,
    devices,
    start,
    stop,
    clear,
    error
  };
}
var DEFAULT_RECONNECT_ATTEMPTS = 3;
var DEFAULT_RECONNECT_DELAY = 1e3;
var DEFAULT_RECONNECT_BACKOFF = 2;
function useConnection(deviceOrId, options) {
  const { devices } = useWebBLE();
  const [rssi, setRssi] = React3.useState(null);
  const [localError, setLocalError] = React3.useState(null);
  const [autoReconnect, setAutoReconnectState] = React3.useState(options?.autoReconnect ?? false);
  const [reconnectAttempt, setReconnectAttempt] = React3.useState(0);
  const reconnectTimeoutRef = React3.useRef(null);
  const stopRssiMonitoringRef = React3.useRef(null);
  const reconnectCancelledRef = React3.useRef(false);
  const reconnectOptionsRef = React3.useRef(options);
  const connectionStateRef = React3.useRef("disconnected");
  const resolvedDevice = typeof deviceOrId === "string" ? devices.find((candidate) => candidate.id === deviceOrId) ?? null : deviceOrId ?? null;
  const deviceState = useDevice(resolvedDevice);
  const {
    connectionState,
    error: deviceError,
    connect: connectDevice,
    disconnect: disconnectDevice,
    setConnectionPriority
  } = deviceState;
  const clearReconnectTimer = React3.useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  const stopRssiMonitoring = React3.useCallback(async () => {
    const stop = stopRssiMonitoringRef.current;
    stopRssiMonitoringRef.current = null;
    if (stop) {
      await stop();
    }
  }, []);
  const connect = React3.useCallback(async () => {
    if (!resolvedDevice) {
      setLocalError(new core.WebBLEError("DEVICE_NOT_FOUND", "Device not found"));
      return;
    }
    reconnectCancelledRef.current = false;
    clearReconnectTimer();
    setLocalError(null);
    await connectDevice(reconnectOptionsRef.current);
    if (resolvedDevice.connected || connectionStateRef.current === "connected") {
      setReconnectAttempt(0);
    }
  }, [clearReconnectTimer, connectDevice, resolvedDevice]);
  const disconnect = React3.useCallback(async () => {
    reconnectCancelledRef.current = true;
    clearReconnectTimer();
    await stopRssiMonitoring();
    setLocalError(null);
    setReconnectAttempt(0);
    disconnectDevice();
  }, [clearReconnectTimer, disconnectDevice, stopRssiMonitoring]);
  const scheduleReconnect = React3.useCallback((attempt) => {
    if (!resolvedDevice || !autoReconnect || reconnectCancelledRef.current) {
      return;
    }
    const reconnectOptions = reconnectOptionsRef.current;
    const maxAttempts = reconnectOptions?.reconnectAttempts ?? DEFAULT_RECONNECT_ATTEMPTS;
    if (attempt > maxAttempts) {
      return;
    }
    const baseDelay = reconnectOptions?.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;
    const multiplier = reconnectOptions?.reconnectBackoffMultiplier ?? DEFAULT_RECONNECT_BACKOFF;
    const delayMs = baseDelay * Math.max(1, Math.pow(multiplier, attempt - 1));
    reconnectOptions?.onReconnectAttempt?.(attempt, delayMs);
    setReconnectAttempt(attempt);
    clearReconnectTimer();
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        await resolvedDevice.connect();
        if (!resolvedDevice.connected && connectionStateRef.current !== "connected") {
          throw new core.WebBLEError("GATT_OPERATION_FAILED", "Failed to reconnect device");
        }
        setLocalError(null);
        setReconnectAttempt(0);
        reconnectOptionsRef.current?.onReconnectSuccess?.(attempt);
      } catch (reconnectError) {
        const reconnectFailure = core.WebBLEError.from(reconnectError);
        const willRetry = attempt < maxAttempts;
        setLocalError(reconnectFailure);
        reconnectOptionsRef.current?.onReconnectFailure?.(reconnectFailure, attempt, willRetry);
        if (willRetry) {
          scheduleReconnect(attempt + 1);
        }
      }
    }, delayMs);
  }, [autoReconnect, clearReconnectTimer, connectDevice, resolvedDevice]);
  const requestConnectionPriority = React3.useCallback(async (priority) => {
    if (!resolvedDevice) {
      setLocalError(new core.WebBLEError("DEVICE_NOT_FOUND", "Device not found"));
      return;
    }
    setLocalError(null);
    await setConnectionPriority(priority);
  }, [resolvedDevice, setConnectionPriority]);
  const startRssiMonitoring = React3.useCallback(async () => {
    if (!resolvedDevice) {
      setLocalError(new core.WebBLEError("DEVICE_NOT_FOUND", "Device not found"));
      return;
    }
    try {
      setLocalError(null);
      await stopRssiMonitoring();
      await resolvedDevice.watchAdvertisements();
      const handleAdvertisement = (event) => {
        const advertisement = event;
        if (advertisement.device?.id === resolvedDevice.id && typeof advertisement.rssi === "number") {
          setRssi(advertisement.rssi);
        }
      };
      resolvedDevice.raw.addEventListener?.("advertisementreceived", handleAdvertisement);
      stopRssiMonitoringRef.current = async () => {
        resolvedDevice.raw.removeEventListener?.("advertisementreceived", handleAdvertisement);
        try {
          await resolvedDevice.unwatchAdvertisements();
        } catch {
        }
      };
    } catch (err) {
      setLocalError(core.WebBLEError.from(err));
    }
  }, [resolvedDevice, stopRssiMonitoring]);
  React3.useEffect(() => {
    reconnectOptionsRef.current = options;
    setAutoReconnectState(options?.autoReconnect ?? false);
  }, [options]);
  React3.useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);
  React3.useEffect(() => {
    reconnectCancelledRef.current = false;
    clearReconnectTimer();
    void stopRssiMonitoring();
    setLocalError(null);
    setReconnectAttempt(0);
    setRssi(null);
    if (!resolvedDevice) {
      return;
    }
    const unsubscribe = resolvedDevice.on("disconnected", () => {
      setRssi(null);
      if (autoReconnect) {
        scheduleReconnect(1);
      }
    });
    return () => {
      reconnectCancelledRef.current = true;
      unsubscribe();
      clearReconnectTimer();
      void stopRssiMonitoring();
    };
  }, [autoReconnect, clearReconnectTimer, resolvedDevice, scheduleReconnect, stopRssiMonitoring]);
  React3.useEffect(() => () => {
    reconnectCancelledRef.current = true;
    clearReconnectTimer();
    void stopRssiMonitoring();
  }, [clearReconnectTimer, stopRssiMonitoring]);
  const setAutoReconnect = React3.useCallback((value) => {
    setAutoReconnectState(value);
  }, []);
  return {
    connectionState,
    rssi,
    connect,
    disconnect,
    requestConnectionPriority,
    error: localError ?? deviceError,
    setAutoReconnect,
    startRssiMonitoring,
    stopRssiMonitoring,
    autoReconnect,
    reconnectAttempt
  };
}
function useProfile(ProfileClass, device) {
  const [profile, setProfile] = React3.useState(null);
  const [error, setError] = React3.useState(null);
  const profileRef = React3.useRef(null);
  React3.useEffect(() => {
    if (!device) {
      setProfile(null);
      profileRef.current = null;
      return;
    }
    const instance = new ProfileClass(device);
    profileRef.current = instance;
    setProfile(instance);
    setError(null);
    return () => {
      instance.stop();
      profileRef.current = null;
      setProfile(null);
    };
  }, [ProfileClass, device]);
  const connect = React3.useCallback(async () => {
    if (!profileRef.current) return;
    try {
      setError(null);
      await profileRef.current.connect();
    } catch (e) {
      setError(core.WebBLEError.from(e));
    }
  }, []);
  return { profile, connect, error };
}
function DeviceItem({ device, onSelect, isConnecting, isConnected }) {
  return /* @__PURE__ */ React3__default.default.createElement("li", { className: "device-item" }, /* @__PURE__ */ React3__default.default.createElement(
    "button",
    {
      onClick: () => onSelect(device),
      disabled: isConnecting,
      className: `device-button ${isConnected ? "connected" : ""} ${isConnecting ? "connecting" : ""}`,
      "aria-label": `Select ${device.name ?? "Unknown Device"}`
    },
    /* @__PURE__ */ React3__default.default.createElement("div", { className: "device-info" }, /* @__PURE__ */ React3__default.default.createElement("span", { className: "device-name" }, device.name ?? "Unknown Device"), /* @__PURE__ */ React3__default.default.createElement("span", { className: "device-id" }, device.id)),
    isConnected && /* @__PURE__ */ React3__default.default.createElement("span", { className: "connection-status" }, "Connected"),
    isConnecting && /* @__PURE__ */ React3__default.default.createElement("span", { className: "connection-status" }, "Connecting...")
  ));
}
function DeviceScanner(props) {
  const {
    onDeviceSelected,
    filters,
    className,
    maxDevices = 10,
    scanDuration,
    autoConnect = false
  } = props;
  const { scanState, devices, start, stop, error, clear } = useScan();
  const [selectedDevice, setSelectedDevice] = React3.useState(null);
  const [pendingAutoConnect, setPendingAutoConnect] = React3.useState(false);
  const { connectionState, connect } = useConnection(selectedDevice);
  const handleStartScan = React3.useCallback(async () => {
    clear();
    await start({ filters });
    if (scanDuration) {
      setTimeout(() => {
        stop();
      }, scanDuration);
    }
  }, [start, stop, clear, filters, scanDuration]);
  const handleDeviceSelect = React3.useCallback((device) => {
    setSelectedDevice(device);
    onDeviceSelected?.(device);
    if (autoConnect) {
      setPendingAutoConnect(true);
    }
  }, [autoConnect, onDeviceSelected]);
  React3.useEffect(() => {
    if (pendingAutoConnect && connectionState === "disconnected") {
      setPendingAutoConnect(false);
      void connect();
    }
  }, [pendingAutoConnect, connectionState, connect]);
  const visibleDevices = devices.slice(0, maxDevices);
  return /* @__PURE__ */ React3__default.default.createElement("div", { className: `device-scanner ${className || ""}` }, /* @__PURE__ */ React3__default.default.createElement("div", { className: "scanner-header" }, /* @__PURE__ */ React3__default.default.createElement("h2", null, "Bluetooth Device Scanner"), /* @__PURE__ */ React3__default.default.createElement("div", { className: "scanner-status" }, scanState === "scanning" && /* @__PURE__ */ React3__default.default.createElement("span", { className: "status-indicator scanning" }, "\u25CF Scanning"), scanState === "idle" && devices.length > 0 && /* @__PURE__ */ React3__default.default.createElement("span", { className: "status-indicator idle" }, "Found ", devices.length, " device(s)"))), /* @__PURE__ */ React3__default.default.createElement("div", { className: "scanner-controls" }, scanState === "idle" && /* @__PURE__ */ React3__default.default.createElement(
    "button",
    {
      onClick: handleStartScan,
      className: "scan-button start",
      "aria-label": "Start scanning for Bluetooth devices"
    },
    "Start Scan"
  ), scanState === "scanning" && /* @__PURE__ */ React3__default.default.createElement(
    "button",
    {
      onClick: stop,
      className: "scan-button stop",
      "aria-label": "Stop scanning"
    },
    "Stop Scan"
  ), scanState === "idle" && devices.length > 0 && /* @__PURE__ */ React3__default.default.createElement(
    "button",
    {
      onClick: clear,
      className: "scan-button clear",
      "aria-label": "Clear discovered devices"
    },
    "Clear"
  )), error && /* @__PURE__ */ React3__default.default.createElement("div", { className: "scanner-error", role: "alert" }, /* @__PURE__ */ React3__default.default.createElement("span", { className: "error-icon" }, "\u26A0"), /* @__PURE__ */ React3__default.default.createElement("span", { className: "error-message" }, error.message)), visibleDevices.length > 0 && /* @__PURE__ */ React3__default.default.createElement("ul", { className: "device-list", role: "list" }, visibleDevices.map((device) => /* @__PURE__ */ React3__default.default.createElement(
    DeviceItem,
    {
      key: device.id,
      device,
      onSelect: handleDeviceSelect,
      isConnecting: selectedDevice?.id === device.id && connectionState === "connecting",
      isConnected: selectedDevice?.id === device.id && connectionState === "connected"
    }
  ))), scanState === "scanning" && devices.length === 0 && /* @__PURE__ */ React3__default.default.createElement("div", { className: "scanner-empty" }, /* @__PURE__ */ React3__default.default.createElement("div", { className: "scanning-animation" }, /* @__PURE__ */ React3__default.default.createElement("div", { className: "pulse" }), /* @__PURE__ */ React3__default.default.createElement("div", { className: "pulse" }), /* @__PURE__ */ React3__default.default.createElement("div", { className: "pulse" })), /* @__PURE__ */ React3__default.default.createElement("p", null, "Searching for devices...")), scanState === "idle" && devices.length === 0 && !error && /* @__PURE__ */ React3__default.default.createElement("div", { className: "scanner-empty" }, /* @__PURE__ */ React3__default.default.createElement("p", null, 'No devices found. Click "Start Scan" to search for Bluetooth devices.')));
}

// src/utils/bluetooth-utils.ts
var STANDARD_SERVICES = {
  "00001800-0000-1000-8000-00805f9b34fb": "Generic Access",
  "00001801-0000-1000-8000-00805f9b34fb": "Generic Attribute",
  "0000180a-0000-1000-8000-00805f9b34fb": "Device Information",
  "0000180f-0000-1000-8000-00805f9b34fb": "Battery Service",
  "0000180d-0000-1000-8000-00805f9b34fb": "Heart Rate",
  "00001805-0000-1000-8000-00805f9b34fb": "Current Time",
  "00001812-0000-1000-8000-00805f9b34fb": "Human Interface Device",
  "00001802-0000-1000-8000-00805f9b34fb": "Immediate Alert",
  "00001803-0000-1000-8000-00805f9b34fb": "Link Loss",
  "00001804-0000-1000-8000-00805f9b34fb": "Tx Power",
  "00001809-0000-1000-8000-00805f9b34fb": "Health Thermometer",
  "0000181c-0000-1000-8000-00805f9b34fb": "User Data",
  "0000181d-0000-1000-8000-00805f9b34fb": "Weight Scale"
};
var STANDARD_CHARACTERISTICS = {
  "00002a00-0000-1000-8000-00805f9b34fb": "Device Name",
  "00002a01-0000-1000-8000-00805f9b34fb": "Appearance",
  "00002a04-0000-1000-8000-00805f9b34fb": "Peripheral Preferred Connection Parameters",
  "00002a05-0000-1000-8000-00805f9b34fb": "Service Changed",
  "00002a19-0000-1000-8000-00805f9b34fb": "Battery Level",
  "00002a37-0000-1000-8000-00805f9b34fb": "Heart Rate Measurement",
  "00002a38-0000-1000-8000-00805f9b34fb": "Body Sensor Location",
  "00002a39-0000-1000-8000-00805f9b34fb": "Heart Rate Control Point",
  "00002a29-0000-1000-8000-00805f9b34fb": "Manufacturer Name String",
  "00002a24-0000-1000-8000-00805f9b34fb": "Model Number String",
  "00002a25-0000-1000-8000-00805f9b34fb": "Serial Number String",
  "00002a26-0000-1000-8000-00805f9b34fb": "Firmware Revision String",
  "00002a27-0000-1000-8000-00805f9b34fb": "Hardware Revision String",
  "00002a28-0000-1000-8000-00805f9b34fb": "Software Revision String",
  "00002a50-0000-1000-8000-00805f9b34fb": "PnP ID"
};
function getServiceName(uuid) {
  return STANDARD_SERVICES[canonicalUUID(uuid)] || uuid;
}
function getCharacteristicName(uuid) {
  return STANDARD_CHARACTERISTICS[canonicalUUID(uuid)] || uuid;
}
function parseValue(value, uuid) {
  const normalized = uuid.toUpperCase();
  switch (normalized) {
    case "0X2A19":
      return value.getUint8(0);
    case "0X2A37":
      const flags = value.getUint8(0);
      const is16Bit = flags & 1;
      const heartRate = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
      return heartRate;
    case "0X2A00":
    // Device Name (handle both 0x and 0X)
    case "0X2A29":
    // Manufacturer Name
    case "0X2A24":
    // Model Number
    case "0X2A25":
    // Serial Number
    case "0X2A26":
    // Firmware Revision
    case "0X2A27":
    // Hardware Revision
    case "0X2A28":
      return new TextDecoder().decode(value.buffer);
    default:
      return Array.from(new Uint8Array(value.buffer)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
  }
}
function formatValue(value, uuid) {
  const normalized = uuid.toUpperCase();
  switch (normalized) {
    case "0X2A19":
      const batteryBuffer = new ArrayBuffer(1);
      const batteryView = new DataView(batteryBuffer);
      batteryView.setUint8(0, value);
      return batteryBuffer;
    case "0X2A00":
    // Device Name (and other string characteristics) - handle both 0x and 0X
    case "0X2A29":
    case "0X2A24":
    case "0X2A25":
    case "0X2A26":
    case "0X2A27":
    case "0X2A28":
      return new TextEncoder().encode(value).buffer;
    default:
      if (value instanceof ArrayBuffer) {
        return value;
      }
      if (value instanceof Uint8Array) {
        return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      }
      if (typeof value === "string") {
        const bytes = value.split(/\s+/).map((b) => parseInt(b, 16));
        return new Uint8Array(bytes).buffer;
      }
      if (typeof value === "number") {
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, value);
        return buffer;
      }
      throw new Error(`Cannot format value for characteristic ${uuid}`);
  }
}
function canonicalUUID(uuid) {
  if (typeof uuid === "number") {
    uuid = uuid.toString(16);
  }
  uuid = uuid.toLowerCase();
  if (uuid.startsWith("0x")) {
    uuid = uuid.slice(2);
  }
  if (uuid.length === 4) {
    uuid = `0000${uuid}-0000-1000-8000-00805f9b34fb`;
  }
  if (uuid.length === 8) {
    uuid = `${uuid}-0000-1000-8000-00805f9b34fb`;
  }
  return uuid;
}

// src/components/ServiceExplorer.tsx
function CharacteristicItem({ characteristic, device, onSelect }) {
  const serviceUUID = characteristic.service?.uuid ?? null;
  const { value, read, write, subscribe, unsubscribe, isNotifying, error } = useCharacteristic(
    device,
    serviceUUID,
    characteristic.uuid
  );
  const [inputValue, setInputValue] = React3.useState("");
  const [showValue, setShowValue] = React3.useState(false);
  const handleRead = React3.useCallback(async () => {
    await read();
    setShowValue(true);
  }, [read]);
  const handleWrite = React3.useCallback(async () => {
    if (inputValue) {
      const encoder = new TextEncoder();
      const data = encoder.encode(inputValue);
      await write(data);
      setInputValue("");
    }
  }, [write, inputValue]);
  const handleNotifications = React3.useCallback(async () => {
    if (isNotifying) {
      await unsubscribe();
    } else {
      await subscribe(() => {
      });
    }
  }, [isNotifying, subscribe, unsubscribe]);
  const formatValue2 = React3.useCallback((value2) => {
    if (!value2) return "No data";
    const bytes = Array.from(new Uint8Array(value2.buffer));
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const text = new TextDecoder().decode(value2);
    return {
      hex,
      text: text.replace(/[\x00-\x1F\x7F-\x9F]/g, "."),
      bytes: bytes.length
    };
  }, []);
  const characteristicName = getCharacteristicName(characteristic.uuid);
  const properties = characteristic.properties;
  return /* @__PURE__ */ React3__default.default.createElement("li", { className: "characteristic-item" }, /* @__PURE__ */ React3__default.default.createElement("div", { className: "characteristic-header" }, /* @__PURE__ */ React3__default.default.createElement(
    "button",
    {
      className: "characteristic-name",
      onClick: () => onSelect?.(characteristic.uuid),
      "aria-label": `Select characteristic ${characteristicName}`
    },
    characteristicName
  ), /* @__PURE__ */ React3__default.default.createElement("div", { className: "characteristic-properties" }, properties?.read && /* @__PURE__ */ React3__default.default.createElement("span", { className: "property read" }, "R"), properties?.write && /* @__PURE__ */ React3__default.default.createElement("span", { className: "property write" }, "W"), properties?.writeWithoutResponse && /* @__PURE__ */ React3__default.default.createElement("span", { className: "property write-no-response" }, "WNR"), properties?.notify && /* @__PURE__ */ React3__default.default.createElement("span", { className: "property notify" }, "N"), properties?.indicate && /* @__PURE__ */ React3__default.default.createElement("span", { className: "property indicate" }, "I"))), /* @__PURE__ */ React3__default.default.createElement("div", { className: "characteristic-controls" }, properties?.read && /* @__PURE__ */ React3__default.default.createElement("button", { onClick: handleRead, className: "control-button read" }, "Read"), properties?.write && /* @__PURE__ */ React3__default.default.createElement("div", { className: "write-control" }, /* @__PURE__ */ React3__default.default.createElement(
    "input",
    {
      type: "text",
      value: inputValue,
      onChange: (e) => setInputValue(e.target.value),
      placeholder: "Enter value to write",
      className: "write-input"
    }
  ), /* @__PURE__ */ React3__default.default.createElement("button", { onClick: handleWrite, className: "control-button write" }, "Write")), properties?.notify && /* @__PURE__ */ React3__default.default.createElement("button", { onClick: handleNotifications, className: "control-button notify" }, isNotifying ? "Stop Notify" : "Start Notify")), showValue && value && (() => {
    const formatted = formatValue2(value);
    if (typeof formatted === "string") {
      return /* @__PURE__ */ React3__default.default.createElement("div", { className: "characteristic-value" }, /* @__PURE__ */ React3__default.default.createElement("div", null, formatted));
    }
    return /* @__PURE__ */ React3__default.default.createElement("div", { className: "characteristic-value" }, /* @__PURE__ */ React3__default.default.createElement("div", null, "Value (", formatted.bytes, " bytes):"), /* @__PURE__ */ React3__default.default.createElement("div", { className: "value-hex" }, "Hex: ", formatted.hex), /* @__PURE__ */ React3__default.default.createElement("div", { className: "value-text" }, "Text: ", formatted.text));
  })(), error && /* @__PURE__ */ React3__default.default.createElement("div", { className: "characteristic-error", role: "alert" }, "Error: ", error.message));
}
function ServiceItem({ service, isExpanded, onToggle, onCharacteristicSelect }) {
  const serviceName = getServiceName(service.uuid);
  const [characteristics, setCharacteristics] = React3.useState([]);
  const [loadingChars, setLoadingChars] = React3.useState(false);
  React3.useEffect(() => {
    if (isExpanded && characteristics.length === 0 && !loadingChars) {
      setLoadingChars(true);
      service.getCharacteristics().then((chars) => {
        setCharacteristics(chars);
        setLoadingChars(false);
      }).catch((err) => {
        console.error("Failed to get characteristics:", err);
        setLoadingChars(false);
      });
    }
  }, [isExpanded, service, characteristics.length, loadingChars]);
  return /* @__PURE__ */ React3__default.default.createElement("li", { className: "service-item" }, /* @__PURE__ */ React3__default.default.createElement(
    "button",
    {
      className: "service-header",
      onClick: onToggle,
      "aria-expanded": isExpanded,
      "aria-label": `${isExpanded ? "Collapse" : "Expand"} ${serviceName}`
    },
    /* @__PURE__ */ React3__default.default.createElement("span", { className: "expand-icon" }, isExpanded ? "\u25BC" : "\u25B6"),
    /* @__PURE__ */ React3__default.default.createElement("span", { className: "service-name" }, serviceName),
    /* @__PURE__ */ React3__default.default.createElement("span", { className: "service-type" }, service.isPrimary ? "Primary" : "Secondary")
  ), isExpanded && loadingChars && /* @__PURE__ */ React3__default.default.createElement("div", { className: "loading-chars" }, "Loading characteristics..."), isExpanded && !loadingChars && characteristics.length > 0 && /* @__PURE__ */ React3__default.default.createElement("ul", { className: "characteristics-list" }, characteristics.map((char) => /* @__PURE__ */ React3__default.default.createElement(
    CharacteristicItem,
    {
      key: char.uuid,
      characteristic: char,
      device: service.device,
      onSelect: onCharacteristicSelect
    }
  ))));
}
function ServiceExplorer({
  device: inputDevice,
  className,
  autoConnect = false,
  onCharacteristicSelect,
  expandedByDefault = false
}) {
  const { device, services, connect, disconnect, isConnected, isConnecting, error } = useDevice(inputDevice ?? null);
  const [expandedServices, setExpandedServices] = React3.useState(/* @__PURE__ */ new Set());
  React3.useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting && device) {
      connect();
    }
  }, [autoConnect, isConnected, isConnecting, connect, device]);
  React3.useEffect(() => {
    if (expandedByDefault && services.length > 0) {
      setExpandedServices(new Set(services.map((s) => s.uuid)));
    }
  }, [expandedByDefault, services]);
  const toggleService = React3.useCallback((serviceId) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }, []);
  const connectionState = isConnected ? "connected" : isConnecting ? "connecting" : "disconnected";
  if (!device) {
    return /* @__PURE__ */ React3__default.default.createElement("div", { className: `service-explorer ${className || ""}` }, /* @__PURE__ */ React3__default.default.createElement("div", { className: "explorer-empty" }, "No device selected"));
  }
  return /* @__PURE__ */ React3__default.default.createElement("div", { className: `service-explorer ${className || ""}` }, /* @__PURE__ */ React3__default.default.createElement("div", { className: "explorer-header" }, /* @__PURE__ */ React3__default.default.createElement("h2", null, "Service Explorer"), device && /* @__PURE__ */ React3__default.default.createElement("div", { className: "device-info" }, /* @__PURE__ */ React3__default.default.createElement("span", { className: "device-name" }, device.name || "Unknown Device"), /* @__PURE__ */ React3__default.default.createElement("span", { className: `connection-status ${connectionState}` }, connectionState))), /* @__PURE__ */ React3__default.default.createElement("div", { className: "explorer-controls" }, !isConnected && !isConnecting && /* @__PURE__ */ React3__default.default.createElement("button", { onClick: () => {
    void connect();
  }, className: "connection-button connect" }, "Connect to Device"), isConnected && /* @__PURE__ */ React3__default.default.createElement("button", { onClick: disconnect, className: "connection-button disconnect" }, "Disconnect"), isConnecting && /* @__PURE__ */ React3__default.default.createElement("button", { disabled: true, className: "connection-button connecting" }, "Connecting...")), error && /* @__PURE__ */ React3__default.default.createElement("div", { className: "explorer-error", role: "alert" }, /* @__PURE__ */ React3__default.default.createElement("span", { className: "error-icon" }, "\u26A0"), /* @__PURE__ */ React3__default.default.createElement("span", { className: "error-message" }, error.message)), isConnected && services.length === 0 && /* @__PURE__ */ React3__default.default.createElement("div", { className: "explorer-empty" }, /* @__PURE__ */ React3__default.default.createElement("p", null, "Discovering services...")), isConnected && services.length > 0 && /* @__PURE__ */ React3__default.default.createElement("div", { className: "services-container" }, /* @__PURE__ */ React3__default.default.createElement("div", { className: "services-summary" }, "Found ", services.length, " service(s)"), /* @__PURE__ */ React3__default.default.createElement("ul", { className: "services-list", role: "tree" }, services.map((service) => /* @__PURE__ */ React3__default.default.createElement(
    ServiceItem,
    {
      key: service.uuid,
      service,
      isExpanded: expandedServices.has(service.uuid),
      onToggle: () => toggleService(service.uuid),
      onCharacteristicSelect
    }
  )))), !isConnected && !isConnecting && !autoConnect && /* @__PURE__ */ React3__default.default.createElement("div", { className: "explorer-empty" }, /* @__PURE__ */ React3__default.default.createElement("p", null, "Connect to the device to explore its services and characteristics.")));
}
function ConnectionStatus({ device = null, deviceId, className }) {
  const target = device ?? deviceId;
  const { connectionState, rssi } = useConnection(target);
  const getStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "green";
      case "connecting":
        return "orange";
      case "disconnecting":
        return "orange";
      case "disconnected":
        return "red";
      default:
        return "gray";
    }
  };
  return /* @__PURE__ */ React3__default.default.createElement("div", { className, style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React3__default.default.createElement(
    "span",
    {
      style: {
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: getStatusColor()
      }
    }
  ), /* @__PURE__ */ React3__default.default.createElement("span", null, connectionState), rssi !== null && rssi !== void 0 && /* @__PURE__ */ React3__default.default.createElement("span", null, "(", rssi, " dBm)"));
}
var DEFAULT_APP_STORE_URL = "https://apps.apple.com/app/ioswebble/id0000000000";
var navigationController = {
  navigateToUrl(url) {
    window.location.href = url;
  }
};
function InstallationWizard({
  onComplete,
  appStoreUrl = DEFAULT_APP_STORE_URL,
  operatorName,
  className
}) {
  const [isInstalled, setIsInstalled] = React3.useState(false);
  const [isChecking, setIsChecking] = React3.useState(true);
  const [dismissed, setDismissed] = React3.useState(false);
  const detector = new ExtensionDetector();
  const displayName = operatorName || (typeof document !== "undefined" ? document.title : "") || "this website";
  React3.useEffect(() => {
    const checkInstallation = async () => {
      setIsChecking(true);
      try {
        const installed = await detector.detect();
        setIsInstalled(installed);
        if (installed) onComplete?.();
      } catch {
        setIsInstalled(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkInstallation();
    const handleReady = () => {
      setIsInstalled(true);
      onComplete?.();
    };
    window.addEventListener("webble:extension:ready", handleReady);
    return () => window.removeEventListener("webble:extension:ready", handleReady);
  }, []);
  const handleInstall = React3.useCallback(() => {
    try {
      localStorage.setItem(
        "ioswebble_return",
        JSON.stringify({ url: window.location.href, timestamp: Date.now() })
      );
      navigator.clipboard?.writeText(
        `webble://return?url=${encodeURIComponent(window.location.href)}`
      );
    } catch {
    }
    navigationController.navigateToUrl(appStoreUrl);
  }, [appStoreUrl]);
  const handleDismiss = React3.useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(
        "ioswebble_dismiss_until",
        String(Date.now() + 14 * 864e5)
      );
    } catch {
    }
  }, []);
  if (isChecking) return null;
  if (isInstalled || dismissed) return null;
  return /* @__PURE__ */ React3__default.default.createElement("div", { className, style: overlayStyle }, /* @__PURE__ */ React3__default.default.createElement("div", { style: sheetStyle, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React3__default.default.createElement("div", { style: handleBarStyle }), /* @__PURE__ */ React3__default.default.createElement("div", { style: headerStyle }, /* @__PURE__ */ React3__default.default.createElement("div", { style: iconStyle }, /* @__PURE__ */ React3__default.default.createElement("svg", { viewBox: "0 0 24 24", width: "22", height: "22", fill: "white" }, /* @__PURE__ */ React3__default.default.createElement("path", { d: "M14.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-5 0c.83 0 1.5-.67 1.5-1.5S10.33 8.5 9.5 8.5 8 9.17 8 10s.67 1.5 1.5 1.5zm2.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" }))), /* @__PURE__ */ React3__default.default.createElement("div", { style: titleStyle }, "Bluetooth Required")), /* @__PURE__ */ React3__default.default.createElement("div", { style: bodyStyle }, "To connect to your device, ", esc(displayName), " needs the WebBLE Safari extension."), /* @__PURE__ */ React3__default.default.createElement("div", { style: metaStyle }, /* @__PURE__ */ React3__default.default.createElement("span", { style: starsStyle }, "\u2605\u2605\u2605\u2605\u2605"), /* @__PURE__ */ React3__default.default.createElement("span", null, "4.8"), /* @__PURE__ */ React3__default.default.createElement("span", null, "\xB7"), /* @__PURE__ */ React3__default.default.createElement("span", null, "Free"), /* @__PURE__ */ React3__default.default.createElement("span", null, "\xB7"), /* @__PURE__ */ React3__default.default.createElement("span", null, "Takes 1 minute")), /* @__PURE__ */ React3__default.default.createElement("button", { style: buttonStyle, onClick: handleInstall }, "Get WebBLE (Free)"), /* @__PURE__ */ React3__default.default.createElement("details", { style: detailsStyle }, /* @__PURE__ */ React3__default.default.createElement("summary", { style: summaryStyle }, "How does this work?"), /* @__PURE__ */ React3__default.default.createElement("p", { style: detailsTextStyle }, "WebBLE is a free Safari extension that enables Bluetooth communication between this website and your device. After a quick one-time setup, Bluetooth will work seamlessly in Safari.")), /* @__PURE__ */ React3__default.default.createElement("details", { style: detailsStyle }, /* @__PURE__ */ React3__default.default.createElement("summary", { style: summaryStyle }, "Privacy: No data collected"), /* @__PURE__ */ React3__default.default.createElement("p", { style: detailsTextStyle }, "WebBLE processes all Bluetooth data locally on your device. No browsing data, device data, or personal information is ever collected or transmitted.")), /* @__PURE__ */ React3__default.default.createElement("button", { style: dismissStyle, onClick: handleDismiss }, "Not now")));
}
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
var overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  background: "rgba(0,0,0,0.4)",
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  backdropFilter: "blur(4px)"
};
var sheetStyle = {
  background: "#fff",
  borderRadius: "16px 16px 0 0",
  padding: "12px 24px 34px",
  maxWidth: 420,
  width: "100%"
};
var handleBarStyle = {
  width: 36,
  height: 5,
  borderRadius: 3,
  background: "#d1d1d6",
  margin: "0 auto 16px"
};
var headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 12
};
var iconStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: "#007aff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};
var titleStyle = {
  fontSize: 17,
  fontWeight: 600,
  color: "#000"
};
var bodyStyle = {
  fontSize: 15,
  lineHeight: 1.4,
  color: "#8e8e93",
  marginBottom: 16
};
var metaStyle = {
  fontSize: 13,
  color: "#8e8e93",
  marginBottom: 20,
  display: "flex",
  alignItems: "center",
  gap: 8
};
var starsStyle = {
  color: "#ff9500",
  letterSpacing: 1
};
var buttonStyle = {
  display: "block",
  width: "100%",
  padding: 14,
  background: "#007aff",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontSize: 17,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center"
};
var detailsStyle = {
  marginTop: 16
};
var summaryStyle = {
  fontSize: 15,
  color: "#007aff",
  cursor: "pointer",
  padding: "4px 0"
};
var detailsTextStyle = {
  fontSize: 13,
  color: "#8e8e93",
  lineHeight: 1.5,
  padding: "8px 0 4px"
};
var dismissStyle = {
  display: "block",
  width: "100%",
  padding: 12,
  background: "none",
  border: "none",
  fontSize: 15,
  color: "#8e8e93",
  cursor: "pointer",
  textAlign: "center",
  marginTop: 8
};

exports.ConnectionStatus = ConnectionStatus;
exports.DeviceScanner = DeviceScanner;
exports.ExtensionDetector = ExtensionDetector;
exports.InstallationWizard = InstallationWizard;
exports.ServiceExplorer = ServiceExplorer;
exports.WebBLEProvider = WebBLEProvider;
exports.formatValue = formatValue;
exports.getCharacteristicName = getCharacteristicName;
exports.getServiceName = getServiceName;
exports.parseValue = parseValue;
exports.useBluetooth = useBluetooth;
exports.useCharacteristic = useCharacteristic;
exports.useConnection = useConnection;
exports.useDevice = useDevice;
exports.useNotifications = useNotifications;
exports.useProfile = useProfile;
exports.useScan = useScan;
exports.useWebBLE = useWebBLE;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map