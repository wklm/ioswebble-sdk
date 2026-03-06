import { WebBLEError } from './errors';
import { resolveUUID } from './uuid';
import type { NotificationCallback } from './types';

type Listener = () => void;

/**
 * Represents a connected BLE device. Provides methods to read, write,
 * and subscribe to GATT characteristics using human-readable UUID names.
 *
 * @example
 * ```typescript
 * const device = await ble.requestDevice({ filters: [{ services: ['heart_rate'] }] })
 * await device.connect()
 *
 * // Read a value
 * const battery = await device.read('battery_service', 'battery_level')
 *
 * // Subscribe to notifications
 * const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', (data) => {
 *   console.log('Heart rate:', data.getUint8(1))
 * })
 *
 * // Cleanup
 * unsub()
 * device.disconnect()
 * ```
 */
export class WebBLEDevice {
  readonly id: string;
  readonly name: string | undefined;
  readonly raw: BluetoothDevice;

  private server: BluetoothRemoteGATTServer | null = null;
  private serviceCache = new Map<string, BluetoothRemoteGATTService>();
  private charCache = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private subscriptions = new Map<string, Set<NotificationCallback>>();
  private disconnectListeners = new Set<Listener>();

  constructor(device: BluetoothDevice) {
    this.id = device.id;
    this.name = device.name ?? undefined;
    this.raw = device;

    device.addEventListener('gattserverdisconnected', () => {
      this.handleDisconnect();
    });
  }

  get connected(): boolean {
    return this.server?.connected ?? false;
  }

  /**
   * Connect to the device's GATT server. Must be called before read/write/subscribe.
   * No-op if already connected.
   *
   * @throws {WebBLEError} `GATT_OPERATION_FAILED` — device has no GATT server
   */
  async connect(): Promise<void> {
    if (this.connected) return;
    const gatt = this.raw.gatt;
    if (!gatt) throw new WebBLEError('GATT_OPERATION_FAILED', 'Device has no GATT server');
    this.server = await gatt.connect();
  }

  /** Disconnect from the device and clean up all subscriptions. */
  disconnect(): void {
    this.cleanupSubscriptions();
    this.server?.disconnect();
    this.server = null;
  }

  /**
   * Read a characteristic value. Uses human-readable names (e.g., 'battery_level').
   *
   * @example
   * ```typescript
   * const data = await device.read('battery_service', 'battery_level')
   * const level = data.getUint8(0) // 0-100
   * ```
   *
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` — not connected
   * @throws {WebBLEError} `SERVICE_NOT_FOUND` — service UUID not found on device
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_FOUND` — characteristic UUID not found
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_READABLE` — characteristic doesn't support read
   */
  async read(service: string, characteristic: string): Promise<DataView> {
    const char = await this.getCharacteristic(service, characteristic);
    try {
      return await char.readValue();
    } catch (e) {
      throw WebBLEError.from(e);
    }
  }

  /**
   * Write a value to a characteristic (with response).
   *
   * @example
   * ```typescript
   * const data = new Uint8Array([0x01])
   * await device.write('my_service', 'my_characteristic', data)
   * ```
   *
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` — not connected
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_WRITABLE` — characteristic doesn't support write
   */
  async write(service: string, characteristic: string, value: BufferSource): Promise<void> {
    const char = await this.getCharacteristic(service, characteristic);
    try {
      await char.writeValueWithResponse(value);
    } catch (e) {
      throw WebBLEError.from(e);
    }
  }

  /** Write a value to a characteristic without waiting for a response. */
  async writeWithoutResponse(service: string, characteristic: string, value: BufferSource): Promise<void> {
    const char = await this.getCharacteristic(service, characteristic);
    try {
      await char.writeValueWithoutResponse(value);
    } catch (e) {
      throw WebBLEError.from(e);
    }
  }

  /**
   * Subscribe to characteristic notifications. Returns an unsubscribe function.
   *
   * @example
   * ```typescript
   * const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', (data) => {
   *   const bpm = data.getUint8(1)
   *   console.log(`Heart rate: ${bpm} BPM`)
   * })
   *
   * // Later: stop notifications
   * unsub()
   * ```
   *
   * @returns Unsubscribe function — call it to stop notifications
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_NOTIFIABLE` — characteristic doesn't support notify
   */
  subscribe(service: string, characteristic: string, callback: NotificationCallback): () => void {
    const charKey = this.charKey(service, characteristic);
    let started = false;

    // Start notifications and register listener
    this.getCharacteristic(service, characteristic).then((char) => {
      if (!this.subscriptions.has(charKey)) {
        this.subscriptions.set(charKey, new Set());
      }
      this.subscriptions.get(charKey)!.add(callback);

      // Only start notifications once per characteristic
      if (this.subscriptions.get(charKey)!.size === 1) {
        char.startNotifications().then(() => {
          char.addEventListener('characteristicvaluechanged', this.handleNotification);
          started = true;
        });
      } else {
        started = true;
      }
    });

    return () => {
      const subs = this.subscriptions.get(charKey);
      if (!subs) return;
      subs.delete(callback);

      if (subs.size === 0) {
        this.subscriptions.delete(charKey);
        if (started) {
          this.getCharacteristic(service, characteristic).then((char) => {
            char.removeEventListener('characteristicvaluechanged', this.handleNotification);
            char.stopNotifications().catch(() => {});
          }).catch(() => {});
        }
      }
    };
  }

  /**
   * Async iterator for characteristic notifications. Use with `for await`.
   *
   * @example
   * ```typescript
   * for await (const data of device.notifications('heart_rate', 'heart_rate_measurement')) {
   *   console.log('BPM:', data.getUint8(1))
   * }
   * ```
   */
  async *notifications(service: string, characteristic: string): AsyncIterable<DataView> {
    const char = await this.getCharacteristic(service, characteristic);
    const charKey = this.charKey(service, characteristic);

    const queue: DataView[] = [];
    type Resolver = (v: IteratorResult<DataView>) => void;
    const state: { resolve: Resolver | null; done: boolean } = { resolve: null, done: false };

    const callback: NotificationCallback = (value) => {
      if (state.resolve) {
        const r = state.resolve;
        state.resolve = null;
        r({ value, done: false });
      } else {
        queue.push(value);
      }
    };

    // Register subscription
    if (!this.subscriptions.has(charKey)) {
      this.subscriptions.set(charKey, new Set());
    }
    const subs = this.subscriptions.get(charKey)!;
    const needStart = subs.size === 0;
    subs.add(callback);

    if (needStart) {
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', this.handleNotification);
    }

    try {
      while (!state.done) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          const result = await new Promise<IteratorResult<DataView>>((r) => { state.resolve = r; });
          if (result.done) return;
          yield result.value;
        }
      }
    } finally {
      const pending = state.resolve;
      state.resolve = null;
      state.done = true;
      subs.delete(callback);
      if (subs.size === 0) {
        this.subscriptions.delete(charKey);
        char.removeEventListener('characteristicvaluechanged', this.handleNotification);
        await char.stopNotifications().catch(() => {});
      }
      if (pending) pending({ value: undefined as any, done: true });
    }
  }

  /** Register a listener for device events. Currently supports 'disconnected'. */
  on(event: 'disconnected', fn: Listener): void {
    if (event === 'disconnected') this.disconnectListeners.add(fn);
  }

  /** Remove a previously registered event listener. */
  off(event: 'disconnected', fn: Listener): void {
    if (event === 'disconnected') this.disconnectListeners.delete(fn);
  }

  // --- Private ---

  private handleNotification = (event: Event): void => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    const value = char.value;
    if (!value) return;

    // Dispatch to all subscribers for this characteristic
    for (const [key, subs] of this.subscriptions) {
      const cached = this.charCache.get(key);
      if (cached === char) {
        for (const cb of subs) cb(value);
        break;
      }
    }
  };

  private handleDisconnect(): void {
    this.cleanupSubscriptions();
    this.serviceCache.clear();
    this.charCache.clear();
    this.server = null;
    for (const fn of this.disconnectListeners) fn();
  }

  private cleanupSubscriptions(): void {
    for (const [key] of this.subscriptions) {
      const char = this.charCache.get(key);
      if (char) {
        char.removeEventListener('characteristicvaluechanged', this.handleNotification);
        char.stopNotifications().catch(() => {});
      }
    }
    this.subscriptions.clear();
  }

  private async getCharacteristic(service: string, characteristic: string): Promise<BluetoothRemoteGATTCharacteristic> {
    if (!this.connected) throw new WebBLEError('DEVICE_DISCONNECTED');

    const key = this.charKey(service, characteristic);
    const cached = this.charCache.get(key);
    if (cached) return cached;

    const svc = await this.getService(service);
    const charUUID = resolveUUID(characteristic);
    try {
      const char = await svc.getCharacteristic(charUUID);
      this.charCache.set(key, char);
      return char;
    } catch (e) {
      throw WebBLEError.from(e);
    }
  }

  private async getService(service: string): Promise<BluetoothRemoteGATTService> {
    const uuid = resolveUUID(service);
    const cached = this.serviceCache.get(uuid);
    if (cached) return cached;

    try {
      const svc = await this.server!.getPrimaryService(uuid);
      this.serviceCache.set(uuid, svc);
      return svc;
    } catch (e) {
      throw WebBLEError.from(e);
    }
  }

  private charKey(service: string, characteristic: string): string {
    return `${resolveUUID(service)}:${resolveUUID(characteristic)}`;
  }
}
