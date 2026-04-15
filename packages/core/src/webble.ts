import { WebBLEDevice } from './device';
import { WebBLEError } from './errors';
import { detectPlatform, getBluetoothAPI } from './platform';
import { resolveUUID } from './uuid';
import type {
  BackgroundConnectionOptions,
  BackgroundRegistration,
  BeaconScanningOptions,
  CharacteristicNotificationOptions,
  NotificationTemplate,
  Platform,
  RequestDeviceOptions,
  WebBLEPeripheralServiceDefinition,
  WebBLEPeripheralServiceRecord,
  WebBLEBackgroundSync,
  WebBLEOptions,
  WebBLEPeripheral,
  WebBLEPeripheralAdvertisingOptions,
  WebBLEPeripheralSendOptions,
  WebBLEPeripheralSendResult,
} from './types';

type RuntimeBluetooth = Bluetooth & {
  backgroundSync?: WebBLEBackgroundSync;
  peripheral?: WebBLEPeripheral;
};

class UnsupportedBackgroundSync implements WebBLEBackgroundSync {
  private readonly errorFactory: () => WebBLEError;

  constructor(errorFactory: () => WebBLEError) {
    this.errorFactory = errorFactory;
  }

  private unsupported(): never {
    throw this.errorFactory();
  }

  requestPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    this.unsupported();
  }

  requestBackgroundConnection(_options: BackgroundConnectionOptions): Promise<BackgroundRegistration> {
    this.unsupported();
  }

  registerCharacteristicNotifications(_options: CharacteristicNotificationOptions): Promise<BackgroundRegistration> {
    this.unsupported();
  }

  registerBeaconScanning(_options: BeaconScanningOptions): Promise<BackgroundRegistration> {
    this.unsupported();
  }

  getRegistrations(): Promise<BackgroundRegistration[]> {
    this.unsupported();
  }

  unregister(_registrationId: string): Promise<void> {
    this.unsupported();
  }

  update(_registrationId: string, _template: Partial<NotificationTemplate>): Promise<void> {
    this.unsupported();
  }

  connect(options: BackgroundConnectionOptions): Promise<BackgroundRegistration> {
    return this.requestBackgroundConnection(options);
  }

  subscribe(options: CharacteristicNotificationOptions): Promise<BackgroundRegistration> {
    return this.registerCharacteristicNotifications(options);
  }

  scan(options: BeaconScanningOptions): Promise<BackgroundRegistration> {
    return this.registerBeaconScanning(options);
  }

  list(): Promise<BackgroundRegistration[]> {
    return this.getRegistrations();
  }

  destroy(): void {}
}

class UnsupportedPeripheral extends EventTarget implements WebBLEPeripheral {
  private readonly errorFactory: () => WebBLEError;

  onwriterequest: ((this: WebBLEPeripheral, ev: Event) => unknown) | null = null;
  onsubscriptionchange: ((this: WebBLEPeripheral, ev: Event) => unknown) | null = null;
  onconnectionstatechange: ((this: WebBLEPeripheral, ev: Event) => unknown) | null = null;
  onadvertisingstatechange: ((this: WebBLEPeripheral, ev: Event) => unknown) | null = null;
  onnotificationready: ((this: WebBLEPeripheral, ev: Event) => unknown) | null = null;

  constructor(errorFactory: () => WebBLEError) {
    super();
    this.errorFactory = errorFactory;
  }

  get advertising(): boolean {
    return false;
  }

  private unsupported(): never {
    throw this.errorFactory();
  }

  advertise(_options?: WebBLEPeripheralAdvertisingOptions): Promise<void> {
    this.unsupported();
  }

  addService(_service: WebBLEPeripheralServiceDefinition): Promise<WebBLEPeripheralServiceRecord> {
    this.unsupported();
  }

  registerService(service: WebBLEPeripheralServiceDefinition): Promise<WebBLEPeripheralServiceRecord> {
    return this.addService(service);
  }

  startAdvertising(options?: WebBLEPeripheralAdvertisingOptions): Promise<void> {
    return this.advertise(options);
  }

  stopAdvertising(): Promise<void> {
    this.unsupported();
  }

  send(_options: WebBLEPeripheralSendOptions): Promise<WebBLEPeripheralSendResult> {
    this.unsupported();
  }

  sendNotification(options: WebBLEPeripheralSendOptions): Promise<WebBLEPeripheralSendResult> {
    return this.send(options);
  }

  destroy(): void {}
}

/**
 * Core WebBLE SDK entry point. Handles platform detection and device discovery.
 *
 * @example
 * ```typescript
 * import { WebBLE } from '@ios-web-bluetooth/core'
 *
 * const ble = new WebBLE()
 * const device = await ble.requestDevice({
 *   filters: [{ services: ['heart_rate'] }]
 * })
 * await device.connect()
 * ```
 */
export class WebBLE {
  readonly platform: Platform;
  readonly isSupported: boolean;
  readonly maxConnections: number | null;

  private bluetooth: Bluetooth | null;
  private readonly runtimeBluetooth: RuntimeBluetooth | null;
  private readonly unsupportedFeatureErrorFactory: () => WebBLEError;
  private readonly unsupportedBackgroundSync: WebBLEBackgroundSync;
  private readonly unsupportedPeripheral: WebBLEPeripheral;
  private readonly devices = new Map<string, WebBLEDevice>();

  constructor(options?: WebBLEOptions) {
    this.platform = options?.platform ?? detectPlatform();
    this.maxConnections = this.normalizeMaxConnections(options?.maxConnections);
    this.bluetooth = this.platform !== 'unsupported' ? getBluetoothAPI() : null;
    this.runtimeBluetooth = this.bluetooth as RuntimeBluetooth | null;
    this.isSupported = this.bluetooth !== null;
    this.unsupportedFeatureErrorFactory = () => {
      if (this.platform === 'unsupported') {
        return new WebBLEError('BLUETOOTH_UNAVAILABLE');
      }
      return new WebBLEError(
        'GATT_OPERATION_FAILED',
        'This WebBLE feature requires the iOS Safari WebBLE extension runtime.',
      );
    };
    this.unsupportedBackgroundSync = new UnsupportedBackgroundSync(this.unsupportedFeatureErrorFactory);
    this.unsupportedPeripheral = new UnsupportedPeripheral(this.unsupportedFeatureErrorFactory);
  }

  /**
   * Access the background sync API for maintaining BLE connections and delivering
   * iOS notifications when Safari is not in the foreground.
   *
   * Requires the companion app running in IPC relay mode. Returns a stub that
   * throws `BLUETOOTH_UNAVAILABLE` when Bluetooth is unavailable, or
   * `GATT_OPERATION_FAILED` when the extension runtime is missing.
   *
   * @see {@link WebBLEBackgroundSync}
   */
  get backgroundSync(): WebBLEBackgroundSync {
    return this.runtimeBluetooth?.backgroundSync ?? this.unsupportedBackgroundSync;
  }

  /**
   * Access the peripheral-mode API for acting as a BLE GATT server.
   *
   * Allows registering services, advertising, and sending notifications to
   * connected centrals. Returns a stub that throws `GATT_OPERATION_FAILED`
   * on unsupported platforms.
   *
   * @see {@link WebBLEPeripheral}
   */
  get peripheral(): WebBLEPeripheral {
    return this.runtimeBluetooth?.peripheral ?? this.unsupportedPeripheral;
  }

  /**
   * Prompt the user to select a BLE device. Open the browser's device picker
   * filtered by the given options.
   *
   * **Filter semantics:**
   * - `filters` array entries are OR-combined -- a device matches if ANY filter matches
   * - Within a single filter, all specified fields are AND-combined -- device must match ALL
   * - `exclusionFilters` are applied after `filters` to remove unwanted matches
   * - `acceptAllDevices: true` cannot be combined with `filters`
   *
   * **Service access:** Only services declared in `filters[].services` or `optionalServices`
   * can be accessed after connection. `optionalServices` does NOT affect the picker -- it
   * only declares post-connection GATT access intent.
   *
   * Service names (e.g. `'heart_rate'`) are resolved to full 128-bit UUIDs via {@link resolveUUID}.
   *
   * @param options - Device filter and service access options. Defaults to `{ acceptAllDevices: true }`.
   * @returns A {@link WebBLEDevice} wrapping the user-selected device.
   *
   * @throws {WebBLEError} `BLUETOOTH_UNAVAILABLE` -- browser or platform does not support Web Bluetooth
   * @throws {WebBLEError} `USER_CANCELLED` -- user dismissed the device picker without selecting
   * @throws {WebBLEError} `DEVICE_NOT_FOUND` -- no devices matched the given filters
   * @throws {WebBLEError} `PERMISSION_DENIED` -- request was not triggered by a user gesture
   *
   * @example
   * ```typescript
   * // OR filter: match devices with heart_rate OR battery_service
   * const device = await ble.requestDevice({
   *   filters: [
   *     { services: ['heart_rate'] },
   *     { services: ['battery_service'] },
   *   ],
   * })
   *
   * // AND within filter: must have heart_rate AND name starting with "Polar"
   * const device = await ble.requestDevice({
   *   filters: [{ services: ['heart_rate'], namePrefix: 'Polar' }],
   *   optionalServices: ['battery_service'],
   * })
   *
   * // Accept all devices (no filtering)
   * const device = await ble.requestDevice({ acceptAllDevices: true })
   * ```
   *
   * @see {@link RequestDeviceOptions}
   * @see {@link resolveUUID}
   */
  async requestDevice(options?: RequestDeviceOptions): Promise<WebBLEDevice> {
    if (!this.bluetooth) throw new WebBLEError('BLUETOOTH_UNAVAILABLE');

    try {
      const device = await this.bluetooth.requestDevice(
        (this.normalizeRequestDeviceOptions(options) as any) ?? { acceptAllDevices: true },
      );
      return this.wrapDevice(device);
    } catch (e) {
      throw WebBLEError.from(e, 'DEVICE_NOT_FOUND');
    }
  }

  /**
   * Return previously granted devices without prompting the user.
   * Only available on platforms that implement `Bluetooth.getDevices()` (e.g. Chrome).
   * Returns an empty array when unsupported.
   *
   * @returns Array of previously paired {@link WebBLEDevice} instances, or empty if unsupported.
   * @throws {WebBLEError} `BLUETOOTH_UNAVAILABLE` -- no Bluetooth API available
   */
  async getDevices(): Promise<WebBLEDevice[]> {
    if (!this.bluetooth) throw new WebBLEError('BLUETOOTH_UNAVAILABLE');

    const bluetoothWithGetDevices = this.bluetooth as Bluetooth & {
      getDevices?: () => Promise<BluetoothDevice[]>;
    };

    if (typeof bluetoothWithGetDevices.getDevices !== 'function') {
      return [];
    }

    try {
      const devices = await bluetoothWithGetDevices.getDevices();
      return devices.map((device) => this.wrapDevice(device));
    } catch (error) {
      throw WebBLEError.from(error);
    }
  }

  /**
   * Check if Bluetooth is available on this device/browser.
   * Returns `false` gracefully when the API is missing or throws.
   *
   * @returns `true` if Bluetooth is available and can be used for device discovery.
   */
  async getAvailability(): Promise<boolean> {
    if (!this.bluetooth) return false;
    try {
      return await this.bluetooth.getAvailability();
    } catch {
      return false;
    }
  }

  /**
   * Start a BLE advertisement scan. Returns `null` when the platform does not support
   * `Bluetooth.requestLEScan()`.
   *
   * @param options - Scan filter options. Defaults to accepting all advertisements.
   * @returns A `BluetoothLEScan` handle to stop the scan, or `null` if unsupported.
   * @throws {WebBLEError} `BLUETOOTH_UNAVAILABLE` -- no Bluetooth API available
   */
  async requestLEScan(options: BluetoothLEScanOptions = { acceptAllAdvertisements: true }): Promise<BluetoothLEScan | null> {
    if (!this.bluetooth) {
      throw new WebBLEError('BLUETOOTH_UNAVAILABLE');
    }

    const bluetoothWithScan = this.bluetooth as Bluetooth & {
      requestLEScan?: (options?: BluetoothLEScanOptions) => Promise<BluetoothLEScan>;
    };

    if (typeof bluetoothWithScan.requestLEScan !== 'function') {
      return null;
    }

    try {
      return await bluetoothWithScan.requestLEScan(options);
    } catch (error) {
      throw WebBLEError.from(error);
    }
  }

  private normalizeRequestDeviceOptions(options?: RequestDeviceOptions): RequestDeviceOptions | undefined {
    if (!options) return undefined;

    const normalizeServices = (services?: string[]): string[] | undefined => {
      if (!services) return undefined;
      return services.map((service) => resolveUUID(service));
    };

    const normalized: RequestDeviceOptions = {};

    if (options.acceptAllDevices !== undefined) {
      normalized.acceptAllDevices = options.acceptAllDevices;
    }

    if (options.optionalManufacturerData !== undefined) {
      normalized.optionalManufacturerData = options.optionalManufacturerData;
    }

    if (options.filters) {
      normalized.filters = options.filters.map((filter) => ({
        ...filter,
        services: normalizeServices(filter.services),
      }));
    }

    if (options.exclusionFilters) {
      normalized.exclusionFilters = options.exclusionFilters.map((filter) => ({
        ...filter,
        services: normalizeServices(filter.services),
      }));
    }

    if (options.optionalServices) {
      normalized.optionalServices = normalizeServices(options.optionalServices);
    }

    return normalized;
  }

  private normalizeMaxConnections(maxConnections: number | undefined): number | null {
    if (maxConnections === undefined) return null;
    if (!Number.isInteger(maxConnections) || maxConnections <= 0) {
      throw new WebBLEError(
        'INVALID_PARAMETER',
        `Invalid maxConnections: ${maxConnections}. Must be a positive integer.`,
      );
    }
    return maxConnections;
  }

  private wrapDevice(device: BluetoothDevice): WebBLEDevice {
    const existing = this.devices.get(device.id);
    if (existing) {
      return existing;
    }

    const wrapped = new WebBLEDevice(device, {
      beforeConnect: (nextDevice: WebBLEDevice) => { this.assertConnectionCapacity(nextDevice); },
      onConnectionChange: (nextDevice: WebBLEDevice) => { this.devices.set(nextDevice.id, nextDevice); },
    });
    this.devices.set(device.id, wrapped);
    return wrapped;
  }

  private assertConnectionCapacity(nextDevice: WebBLEDevice): void {
    if (this.maxConnections === null) return;

    this.devices.set(nextDevice.id, nextDevice);
    if (nextDevice.connected) return;

    const connectedCount = [...this.devices.values()].filter((device) => device.connected).length;
    if (connectedCount >= this.maxConnections) {
      throw new WebBLEError(
        'CONNECTION_LIMIT_REACHED',
        `Connection limit reached (${connectedCount}/${this.maxConnections}). Disconnect another device or increase maxConnections before connecting ${nextDevice.name ?? nextDevice.id}.`,
        { retryAfterMs: 1000 },
      );
    }
  }
}
