import type { RetryOptions } from './errors';
import { WebBLEError, withRetry } from './errors';
import { resolveUUID } from './uuid';
import type {
  ActiveSubscription,
  AutoReconnectOptions,
  ConnectOptions,
  DeviceErrorContext,
  DisconnectReason,
  NotificationCallback,
  NotificationOptions,
  QueueOverflowEvent,
  ReadOptions,
  SubscribeOptions,
  SubscriptionLostEvent,
  WriteAutoOptions,
  WriteAutoResult,
  WriteFragmentedOptions,
  WriteFragmentedResult,
  WriteLargeOptions,
  WriteLargeResult,
  WriteLimits,
  WriteOptions,
} from './types';

type DeviceHooks = {
  beforeConnect?: (device: WebBLEDevice) => void;
  onConnectionChange?: (device: WebBLEDevice) => void;
};

type DisconnectListener = (reason: DisconnectReason) => void;
type Listener = () => void;
type QueueOverflowListener = (event: QueueOverflowEvent) => void;
type SubscriptionLostListener = (event: SubscriptionLostEvent) => void;
type ErrorListener = (error: Error, context: DeviceErrorContext) => void;

type NotificationState = {
  callbacks: Set<NotificationCallback>;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  listenerAttached: boolean;
  nativeActive: boolean;
  reconcilePromise: Promise<void> | null;
};

type DeviceTransportInfo = {
  getMtu?: () => Promise<number | null>;
  getWriteLimits?: () => Promise<Partial<WriteLimits> | null | undefined>;
};

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
  private primaryServicesCache: BluetoothRemoteGATTService[] | null = null;
  private serviceCache = new Map<string, BluetoothRemoteGATTService>();
  private charCache = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private notificationStates = new Map<string, NotificationState>();
  private recoveryRegistry = new Map<string, { service: string; characteristic: string; callbacks: Set<NotificationCallback> }>();
  private disconnectListeners = new Set<DisconnectListener>();
  private reconnectedListeners = new Set<Listener>();
  private queueOverflowListeners = new Set<QueueOverflowListener>();
  private subscriptionLostListeners = new Set<SubscriptionLostListener>();
  private errorListeners = new Set<ErrorListener>();
  private reconnectGate: { promise: Promise<void>; resolve: () => void } | null = null;
  private intentionalDisconnect = false;
  private lastDisconnectReason: DisconnectReason | null = null;
  private autoReconnectConfig: AutoReconnectOptions | null = null;
  private autoReconnectAbort: AbortController | null = null;
  private inFlightWrites = new Map<symbol, { service: string; characteristic: string; aborted: boolean }>();
  private readonly hooks: DeviceHooks;

  // AIDEV-NOTE: PERF — Keep this low enough to avoid hidden memory growth while
  // still absorbing short consumer stalls without spurious overflow failures.
  private static readonly DEFAULT_NOTIFICATION_QUEUE_SIZE = 256;

  // AIDEV-NOTE: subscribeAsync() shares the same underlying notification state
  // as subscribe(), but surfaces setup failures synchronously for stricter flows.

  constructor(device: BluetoothDevice, hooks: DeviceHooks = {}) {
    this.id = device.id;
    this.name = device.name ?? undefined;
    this.raw = device;
    this.hooks = hooks;

    // AIDEV-NOTE: Guard for environments where BluetoothDevice objects may lack
    // EventTarget methods (e.g. advertisement-discovered devices in scan results).
    if (typeof device.addEventListener === 'function') {
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });
    }
  }

  get connected(): boolean {
    return this.server?.connected ?? false;
  }

  /**
   * Connect to the device's GATT server. Must be called before any read/write/subscribe
   * operation. No-op if already connected.
   *
   * **Auto-reconnect lifecycle:**
   * Pass `autoReconnect: true` for default exponential backoff (1s initial, 30s max,
   * 2x multiplier, infinite attempts), or pass an {@link AutoReconnectOptions} object
   * to customize. On unexpected disconnect, the SDK automatically retries connection
   * and recovers all subscriptions registered with `autoRecover: true`.
   *
   * Auto-reconnect stops when:
   * - `disconnect()` is called (intentional disconnect)
   * - `maxAttempts` is exhausted (emits error via `addErrorListener`)
   * - `connect({ autoReconnect: ... })` is called again while disconnected and replaces the reconnect config
   *
   * @param options - Connection options including auto-reconnect configuration.
   *
   * @throws {WebBLEError} `GATT_OPERATION_FAILED` -- device has no GATT server
   * @throws {WebBLEError} `CONNECTION_LIMIT_REACHED` -- `WebBLE.maxConnections` exceeded
   *
   * @example
   * ```typescript
   * // Simple connection
   * await device.connect()
   *
   * // With auto-reconnect (default backoff)
   * await device.connect({ autoReconnect: true })
   *
   * // Custom backoff: 500ms initial, 10s max, 3x multiplier, 5 attempts
   * await device.connect({
   *   autoReconnect: {
   *     initialDelayMs: 500,
   *     maxDelayMs: 10000,
   *     backoffMultiplier: 3,
   *     maxAttempts: 5,
   *   },
   * })
   * ```
   *
   * @see {@link ConnectOptions}
   * @see {@link AutoReconnectOptions}
   * @see {@link connectWithRetry}
   */
  async connect(options?: ConnectOptions): Promise<void> {
    if (this.connected) return;

  // Store auto-reconnect config when explicitly provided for a new connection attempt.
    if (options?.autoReconnect) {
      this.autoReconnectConfig = options.autoReconnect === true
        ? {}
        : options.autoReconnect;
    }

    this.hooks.beforeConnect?.(this);
    const gatt = this.raw.gatt;
    if (!gatt) throw new WebBLEError('GATT_OPERATION_FAILED', 'Device has no GATT server');
    const reconnectGate = this.reconnectGate;

    try {
      this.server = await gatt.connect();
      this.lastDisconnectReason = null;

      await this.recoverSubscriptions();

      for (const fn of this.reconnectedListeners) {
        try {
          fn();
        } catch (error) {
          this.emitError(WebBLEError.from(error), { operation: 'device.reconnected-listener' });
        }
      }
      this.intentionalDisconnect = false;
      this.hooks.onConnectionChange?.(this);
    } catch (error) {
      if (!this.server?.connected) {
        this.server = null;
        this.hooks.onConnectionChange?.(this);
      }
      throw WebBLEError.from(error);
    } finally {
      if (this.reconnectGate === reconnectGate) {
        this.reconnectGate = null;
      }
      reconnectGate?.resolve();
    }
  }

  /**
   * Disconnect from the device, stop auto-reconnect, and clean up all subscriptions.
   * Clears all notification recovery registrations, aborts in-flight writes, and
   * releases the GATT server. Fires `'disconnected'` event with reason `'intentional'`.
   *
   * Safe to call multiple times or when already disconnected.
   */
  disconnect(): void {
    this.intentionalDisconnect = true;
    this.lastDisconnectReason = 'intentional';
    this.autoReconnectConfig = null;
    this.autoReconnectAbort?.abort();
    this.autoReconnectAbort = null;
    this.abortInFlightWrites();
    this.cleanupSubscriptions();
    this.recoveryRegistry.clear();
    if (this.reconnectGate) {
      this.reconnectGate.resolve();
      this.reconnectGate = null;
    }
    this.server?.disconnect();
    this.server = null;
    this.primaryServicesCache = null;
    this.hooks.onConnectionChange?.(this);
  }

  /**
   * Connect with automatic retry using {@link withRetry}.
   * Convenience wrapper that combines `connect()` with the SDK's retry utility.
   *
   * Use this for one-shot retry on initial connection. For persistent auto-reconnect
   * after unexpected disconnects, use `connect({ autoReconnect: true })` instead.
   *
   * @param options - Retry options (defaults: 3 attempts, 250ms delay, 1.5x backoff).
   *
   * @throws {WebBLEError} Last error from the final failed attempt
   *
   * @see {@link connect}
   * @see {@link withRetry}
   */
  async connectWithRetry(options: RetryOptions = {}): Promise<void> {
    await withRetry(async () => {
      await this.connect();
    }, options);
  }

  /**
   * Read a characteristic value. Return raw `DataView` bytes, or apply a parse
   * function to get a typed result.
   *
   * Service and characteristic names (e.g. `'battery_service'`, `'battery_level'`)
   * are resolved to full 128-bit UUIDs via {@link resolveUUID}.
   *
   * For typed reads, use the overload with a parse function (e.g. from `@ios-web-bluetooth/profiles`):
   * ```typescript
   * const hr = await device.read('heart_rate', 'heart_rate_measurement', parseHeartRate)
   * console.log(hr.bpm) // typed HeartRateData
   * ```
   *
   * @param service - Service UUID or name (e.g. `'heart_rate'`, `'180d'`).
   * @param characteristic - Characteristic UUID or name (e.g. `'battery_level'`).
   * @param options - Read options including timeout.
   * @returns Raw characteristic value as a `DataView`.
   *
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- not connected
   * @throws {WebBLEError} `SERVICE_NOT_FOUND` -- service UUID not found on device
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_FOUND` -- characteristic UUID not found
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_READABLE` -- characteristic does not support read
   * @throws {WebBLEError} `TIMEOUT` -- read did not complete within `timeoutMs`
   *
   * @example
   * ```typescript
   * // Raw DataView read
   * const data = await device.read('battery_service', 'battery_level')
   * const level = data.getUint8(0) // 0-100
   *
   * // Typed read with parse function
   * const hr = await device.read('heart_rate', 'heart_rate_measurement', parseHeartRate)
   * console.log(hr.bpm)
   *
   * // With timeout
   * const data = await device.read('my_service', 'my_char', { timeoutMs: 5000 })
   * ```
   *
   * @see {@link ReadOptions}
   * @see {@link subscribe} for continuous notifications
   */
  async read(service: string, characteristic: string, options?: ReadOptions): Promise<DataView>;
  /**
   * Read a characteristic value and apply a parse function to get a typed result.
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param parse - Function to transform the raw `DataView` into a typed value.
   * @param options - Read options including timeout.
   * @returns Parsed value of type `T`.
   */
  async read<T>(
    service: string,
    characteristic: string,
    parse: (dv: DataView) => T | Promise<T>,
    options?: ReadOptions,
  ): Promise<T>;
  async read<T = DataView>(
    service: string,
    characteristic: string,
    parseOrOptions?: ((dv: DataView) => T | Promise<T>) | ReadOptions,
    maybeOptions?: ReadOptions,
  ): Promise<DataView | T> {
    const parse = typeof parseOrOptions === 'function' ? parseOrOptions : undefined;
    const options = typeof parseOrOptions === 'function' ? maybeOptions : parseOrOptions;
    const timeoutMs = this.validateTimeoutMs(options?.timeoutMs);
    const char = await this.getCharacteristic(service, characteristic);
    try {
      const value = await this.withOptionalTimeout(
        char.readValue(),
        timeoutMs,
        'Read timed out',
      );
      return parse ? await parse(value) : value;
    } catch (e) {
      throw WebBLEError.from(e);
    }
  }

  /**
   * Write a single packet to a characteristic. Default mode is write-with-response
   * (acknowledged). For payloads larger than one ATT packet, use {@link writeLarge},
   * {@link writeFragmented}, or {@link writeAuto}.
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param value - Data to write (ArrayBuffer, TypedArray, or DataView).
   * @param options - Write mode and timeout options.
   *
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- not connected
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_WRITABLE` -- characteristic does not support write
   * @throws {WebBLEError} `WRITE_INCOMPLETE` -- disconnected before write completed
   * @throws {WebBLEError} `TIMEOUT` -- write did not complete within `timeoutMs`
   *
   * @example
   * ```typescript
   * await device.write('my_service', 'my_char', new Uint8Array([0x01]))
   * await device.write('my_service', 'my_char', data, { mode: 'without-response' })
   * ```
   *
   * @see {@link writeLarge} for chunked writes without retry
   * @see {@link writeFragmented} for chunked writes with per-chunk retry
   * @see {@link writeAuto} for automatic fragmentation decisions
   * @see {@link writeWithoutResponse} for convenience fire-and-forget writes
   */
  async write(service: string, characteristic: string, value: BufferSource, options?: WriteOptions): Promise<void> {
    const timeoutMs = this.validateTimeoutMs(options?.timeoutMs);
    const char = await this.getCharacteristic(service, characteristic);
    const writeToken = Symbol(`write:${service}:${characteristic}`);
    this.inFlightWrites.set(writeToken, { service, characteristic, aborted: false });

    try {
      if (options?.mode === 'without-response') {
        await this.withOptionalTimeout(
          char.writeValueWithoutResponse(value),
          timeoutMs,
          'Write without response timed out',
        );
        return;
      }

      await this.withOptionalTimeout(
        char.writeValueWithResponse(value),
        timeoutMs,
        'Write with response timed out',
      );
    } catch (e) {
      const tracked = this.inFlightWrites.get(writeToken);
      if (tracked?.aborted) {
        throw new WebBLEError(
          'WRITE_INCOMPLETE',
          `Write incomplete for ${service}/${characteristic}: disconnected before completion`,
          { retryAfterMs: 1000 },
        );
      }
      throw WebBLEError.from(e);
    } finally {
      this.inFlightWrites.delete(writeToken);
    }
  }

  /**
   * Write a large payload by chunking it across multiple write operations,
   * with optional per-chunk retry on failure.
   *
   * **Chunk size determination order:**
   * 1. Explicit `chunkSize` if provided
   * 2. `mtu - 3` if `mtu` option is provided (BLE ATT header = 3 bytes)
   * 3. Platform-reported write limits via `getWriteLimits()`
   * 4. 20-byte conservative fallback
   *
   * Unlike {@link writeLarge}, failed chunks are retried up to `maxRetries` times
   * before the entire operation fails with `WRITE_INCOMPLETE`.
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param value - Full payload to write (will be chunked automatically).
   * @param options - Fragmentation, retry, and write mode options.
   * @returns Result with byte counts, chunk info, and total retry count.
   *
   * @throws {WebBLEError} `WRITE_INCOMPLETE` -- partial write after chunk retries exhausted
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- disconnected during write
   *
   * @see {@link writeLarge} for chunked writes without retry
   * @see {@link writeAuto} for automatic fragmentation decisions
   * @see {@link WriteFragmentedOptions}
   */
  async writeFragmented(
    service: string,
    characteristic: string,
    value: BufferSource,
    options?: WriteFragmentedOptions,
  ): Promise<WriteFragmentedResult> {
    const bytes = this.toUint8Array(value);
    const totalBytes = bytes.byteLength;
    if (totalBytes === 0) {
      return { bytesWritten: 0, totalBytes: 0, chunkSize: 0, chunkCount: 0, retryCount: 0 };
    }

    const chunkSize = options?.chunkSize
      ?? this.deriveChunkSizeFromMtu(options?.mtu)
      ?? await this.deriveChunkSize(undefined, options?.mode);
    const maxRetries = options?.maxRetries ?? 0;
    const retryDelayMs = options?.retryDelayMs ?? 0;

    let bytesWritten = 0;
    let chunkCount = 0;
    let retryCount = 0;

    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const nextOffset = Math.min(offset + chunkSize, totalBytes);
      const chunk = new Uint8Array(bytes.subarray(offset, nextOffset));
      let attempt = 0;

      while (true) {
        try {
          await this.write(service, characteristic, chunk, options);
          bytesWritten += chunk.byteLength;
          chunkCount += 1;
          break;
        } catch (error) {
          if (attempt >= maxRetries) {
            if (bytesWritten > 0 && bytesWritten < totalBytes) {
              throw new WebBLEError(
                'WRITE_INCOMPLETE',
                `Write fragmented incomplete (${bytesWritten}/${totalBytes} bytes written): ${this.errorMessage(error)}`,
                { retryAfterMs: 1000 },
              );
            }
            throw WebBLEError.from(error);
          }
          attempt += 1;
          retryCount += 1;
          if (retryDelayMs > 0) {
            await this.delay(retryDelayMs);
          }
        }
      }
    }

    return { bytesWritten, totalBytes, chunkSize, chunkCount, retryCount };
  }

  /**
   * Write a large payload by chunking it across multiple write operations.
   * No per-chunk retry -- any chunk failure aborts the entire write.
   *
   * **Chunk size determination order:**
   * 1. Explicit `chunkSize` if provided
   * 2. Platform-reported write limits via `getWriteLimits()`
   * 3. `MTU - 3` (ATT header overhead)
   * 4. 20-byte conservative fallback
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param value - Full payload to write (will be chunked automatically).
   * @param options - Chunk size and write mode options.
   * @returns Result with byte counts and chunk info.
   *
   * @throws {WebBLEError} `WRITE_INCOMPLETE` -- not all bytes were transferred
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- disconnected during write
   *
   * @see {@link writeFragmented} for chunked writes with per-chunk retry
   * @see {@link writeAuto} for automatic fragmentation decisions
   * @see {@link WriteLargeOptions}
   */
  async writeLarge(
    service: string,
    characteristic: string,
    value: BufferSource,
    options?: WriteLargeOptions,
  ): Promise<WriteLargeResult> {
    const bytes = this.toUint8Array(value);
    const totalBytes = bytes.byteLength;

    if (totalBytes === 0) {
      return { bytesWritten: 0, totalBytes: 0, chunkSize: 0, chunkCount: 0 };
    }

    const derivedChunkSize = await this.deriveChunkSize(options?.chunkSize, options?.mode);
    let bytesWritten = 0;
    let chunkCount = 0;

    for (let offset = 0; offset < totalBytes; offset += derivedChunkSize) {
      const nextOffset = Math.min(offset + derivedChunkSize, totalBytes);
      const chunk = bytes.subarray(offset, nextOffset);
      const safeChunk = new Uint8Array(chunk);

      try {
        await this.write(service, characteristic, safeChunk, options);
        bytesWritten += chunk.byteLength;
        chunkCount += 1;
      } catch (error) {
        if (bytesWritten > 0 && bytesWritten < totalBytes) {
          throw new WebBLEError(
            'WRITE_INCOMPLETE',
            `Write incomplete (${bytesWritten}/${totalBytes} bytes written): ${this.errorMessage(error)}`,
          );
        }
        throw WebBLEError.from(error);
      }
    }

    if (bytesWritten !== totalBytes) {
      throw new WebBLEError('WRITE_INCOMPLETE', `Write incomplete (${bytesWritten}/${totalBytes} bytes written)`);
    }

    return {
      bytesWritten,
      totalBytes,
      chunkSize: derivedChunkSize,
      chunkCount,
    };
  }

  /**
   * Write a value to a characteristic without waiting for acknowledgment (fire-and-forget).
   * Convenience wrapper for `write(service, char, value, { mode: 'without-response' })`.
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param value - Data to write.
   * @param options - Write options (mode is forced to `'without-response'`).
   *
   * @see {@link write}
   */
  async writeWithoutResponse(service: string, characteristic: string, value: BufferSource, options?: Omit<WriteOptions, 'mode'>): Promise<void> {
    return this.write(service, characteristic, value, { ...options, mode: 'without-response' });
  }

  /**
   * Return the platform-reported writable payload limits and negotiated ATT MTU.
   *
   * On standard browser Web Bluetooth stacks (Chrome, Edge), these values are typically
   * unavailable and return `null`. The Safari WebBLE extension reports actual negotiated values.
   *
   * @returns Object with `withResponse`, `withoutResponse`, and `mtu` fields (each `null` when unavailable).
   *
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- not connected
   *
   * @see {@link WriteLimits}
   * @see {@link getMtu} for just the MTU value
   * @see {@link getEffectiveMtu} for a guaranteed non-null MTU (falls back to 23)
   */
  async getWriteLimits(): Promise<WriteLimits> {
    if (!this.connected) throw new WebBLEError('DEVICE_DISCONNECTED');

    const transportInfo = this.raw.gatt as BluetoothRemoteGATTServer & DeviceTransportInfo | null;
    const limits = await transportInfo?.getWriteLimits?.();
    const mtu = limits?.mtu ?? await transportInfo?.getMtu?.() ?? null;

    return {
      withResponse: limits?.withResponse ?? null,
      withoutResponse: limits?.withoutResponse ?? null,
      mtu,
    };
  }

  // AIDEV-NOTE: getEffectiveMtu defined below (line ~632) with explicit type guards.
  // First copy removed to fix TS2393 duplicate function implementation error.

  /**
   * Return the negotiated ATT MTU when the underlying platform exposes it.
   * Returns `null` when unavailable. Max write payload = MTU - 3 (ATT header).
   *
   * @see {@link getEffectiveMtu} for a guaranteed non-null value (falls back to 23)
   * @see {@link getWriteLimits} for full write limit details
   */
  async getMtu(): Promise<number | null> {
    return (await this.getWriteLimits()).mtu;
  }

  /**
   * Smart write that automatically decides between single-packet and fragmented writes.
   *
   * If the payload fits within the platform write limit, send it as a single `write()`.
   * Otherwise, delegate to `writeFragmented()` with per-chunk retry support.
   *
   * **Decision logic:**
   * 1. Determine max single-write size (same as chunk size derivation)
   * 2. If `payload.byteLength <= limit`, use single `write()`
   * 3. Otherwise, use `writeFragmented()` and set `result.fragmented = true`
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param value - Data to write (any size).
   * @param options - All fragmentation, retry, and write mode options.
   * @returns Result indicating whether fragmentation was used.
   *
   * @throws {WebBLEError} `WRITE_INCOMPLETE` -- partial write after chunk retries exhausted
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- disconnected during write
   *
   * @see {@link write} for single-packet writes
   * @see {@link writeFragmented} for explicit fragmentation
   * @see {@link WriteAutoResult}
   */
  async writeAuto(
    service: string,
    characteristic: string,
    value: BufferSource,
    options?: WriteAutoOptions,
  ): Promise<WriteAutoResult> {
    const bytes = this.toUint8Array(value);
    const totalBytes = bytes.byteLength;
    const payload = new Uint8Array(bytes);

    if (totalBytes === 0) {
      await this.write(service, characteristic, payload, options);
      return {
        bytesWritten: 0,
        totalBytes: 0,
        chunkSize: 0,
        chunkCount: 0,
        retryCount: 0,
        fragmented: false,
      };
    }

    const limit = await this.deriveChunkSize(options?.chunkSize, options?.mode);
    if (totalBytes <= limit) {
      await this.write(service, characteristic, payload, options);
      return {
        bytesWritten: totalBytes,
        totalBytes,
        chunkSize: totalBytes,
        chunkCount: 1,
        retryCount: 0,
        fragmented: false,
      };
    }

    const result = await this.writeFragmented(service, characteristic, payload, options);
    return {
      ...result,
      fragmented: true,
    };
  }

  /**
   * Subscribe to characteristic notifications. Return an unsubscribe function.
   *
   * **Notification deduplication:** Multiple callbacks on the same characteristic share
   * a single native BLE listener. The first `subscribe()` call starts notifications;
   * subsequent calls just add callbacks. The native listener stops only when all
   * callbacks are unsubscribed.
   *
   * **Auto-recovery:** By default (`autoRecover: true`), subscriptions are automatically
   * re-established after reconnection. The callback continues receiving values
   * transparently after the device reconnects.
   *
   * **Error handling:** Setup errors are delivered via `options.onError` (not thrown),
   * since `subscribe()` returns synchronously. Use {@link subscribeAsync} if you need
   * to `await` setup completion and catch errors directly.
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param callback - Function called with each notification `DataView` value.
   * @param options - Auto-recovery and error handling options.
   * @returns Unsubscribe function -- call it to stop receiving notifications.
   *
   * @example
   * ```typescript
   * const unsub = device.subscribe('heart_rate', 'heart_rate_measurement', (data) => {
   *   console.log(`Heart rate: ${data.getUint8(1)} BPM`)
   * })
   *
   * // Later: stop notifications
   * unsub()
   * ```
   *
   * @see {@link subscribeAsync} for awaitable setup with error throwing
   * @see {@link notifications} for async iterator interface
   * @see {@link SubscribeOptions}
   */
  subscribe(service: string, characteristic: string, callback: NotificationCallback, options?: SubscribeOptions): () => void {
    const { unsubscribe, ready } = this.registerNotificationConsumer(service, characteristic, callback);
    void ready.catch((error) => {
      const normalizedError = WebBLEError.from(error);
      try {
        options?.onError?.(normalizedError);
      } catch (listenerError) {
        this.emitError(WebBLEError.from(listenerError), {
          operation: 'device.subscribe.onError',
          service,
          characteristic,
        });
      }
    });

    const autoRecover = options?.autoRecover ?? true;

    if (autoRecover) {
      const key = this.charKey(service, characteristic);
      let entry = this.recoveryRegistry.get(key);
      if (!entry) {
        entry = { service, characteristic, callbacks: new Set() };
        this.recoveryRegistry.set(key, entry);
      }
      entry.callbacks.add(callback);
    }

    const originalUnsubscribe = unsubscribe;
    return () => {
      originalUnsubscribe();
      if (autoRecover) {
        const key = this.charKey(service, characteristic);
        const entry = this.recoveryRegistry.get(key);
        if (entry) {
          entry.callbacks.delete(callback);
          if (entry.callbacks.size === 0) this.recoveryRegistry.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to characteristic notifications with awaitable setup.
   *
   * Unlike {@link subscribe}, this method awaits the native notification setup and
   * throws on failure instead of routing errors to `onError`. The returned promise
   * resolves with an unsubscribe function once notifications are active.
   *
   * Shares the same underlying notification state as `subscribe()` -- multiple
   * callbacks on the same characteristic share one native listener.
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param callback - Function called with each notification value.
   * @param options - Auto-recovery options. `onError` is NOT called (errors are thrown).
   * @returns Unsubscribe function (resolves only after setup completes).
   *
   * @throws {WebBLEError} `CHARACTERISTIC_NOT_NOTIFIABLE` -- characteristic does not support notify
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- not connected
   *
   * @see {@link subscribe} for fire-and-forget subscription
   * @see {@link notifications} for async iterator interface
   */
  async subscribeAsync(
    service: string,
    characteristic: string,
    callback: NotificationCallback,
    options?: SubscribeOptions,
  ): Promise<() => void> {
    const { unsubscribe, release, ready } = this.registerNotificationConsumer(service, characteristic, callback);
    const autoRecover = options?.autoRecover ?? true;

    if (autoRecover) {
      const key = this.charKey(service, characteristic);
      let entry = this.recoveryRegistry.get(key);
      if (!entry) {
        entry = { service, characteristic, callbacks: new Set() };
        this.recoveryRegistry.set(key, entry);
      }
      entry.callbacks.add(callback);
    }

    try {
      await ready;
    } catch (error) {
      const normalizedError = WebBLEError.from(error);
      // AIDEV-NOTE: Unlike sync subscribe(), subscribeAsync surfaces errors via throw only.
      // Calling onError here would double-report since the caller already gets the rejection.

      await release();
      if (autoRecover) {
        const key = this.charKey(service, characteristic);
        const entry = this.recoveryRegistry.get(key);
        if (entry) {
          entry.callbacks.delete(callback);
          if (entry.callbacks.size === 0) this.recoveryRegistry.delete(key);
        }
      }
      throw normalizedError;
    }

    return () => {
      unsubscribe();
      if (autoRecover) {
        const key = this.charKey(service, characteristic);
        const entry = this.recoveryRegistry.get(key);
        if (entry) {
          entry.callbacks.delete(callback);
          if (entry.callbacks.size === 0) this.recoveryRegistry.delete(key);
        }
      }
    };
  }

  /**
   * Async iterator for characteristic notifications. Use with `for await...of`.
   *
   * **Overflow strategies:** When the consumer cannot keep up with incoming notifications,
   * the internal queue fills up. Choose a strategy via `options.overflowStrategy`:
   * - `'error'` (default) -- Throw `GATT_OPERATION_FAILED` and terminate the iterator
   * - `'drop-oldest'` -- Discard the oldest buffered value (lossy FIFO)
   * - `'drop-newest'` -- Discard the incoming value (backpressure)
   *
   * **Reconnect behavior:** On unexpected disconnect, the iterator pauses (does not
   * terminate) and waits for auto-reconnect to complete. Subscriptions are auto-recovered
   * and the iterator resumes yielding values transparently. On intentional disconnect,
   * the iterator terminates.
   *
   * @param service - Service UUID or name.
   * @param characteristic - Characteristic UUID or name.
   * @param options - Queue size, overflow strategy, and overflow callback.
   * @returns Async iterable of `DataView` notification values.
   *
   * @example
   * ```typescript
   * for await (const data of device.notifications('heart_rate', 'heart_rate_measurement')) {
   *   console.log('BPM:', data.getUint8(1))
   * }
   *
   * // With overflow handling
   * const stream = device.notifications('sensor', 'data', {
   *   maxQueueSize: 64,
   *   overflowStrategy: 'drop-oldest',
   *   onOverflow: (e) => console.warn(`Dropped ${e.droppedCount} values`),
   * })
   * ```
   *
   * @see {@link subscribe} for callback-based notifications
   * @see {@link NotificationOptions}
   * @see {@link NotificationOverflowStrategy}
   */
  async *notifications(service: string, characteristic: string, options: NotificationOptions = { maxQueueSize: WebBLEDevice.DEFAULT_NOTIFICATION_QUEUE_SIZE }): AsyncIterable<DataView> {
    const maxQueueSize = this.validateMaxQueueSize(
      options.maxQueueSize ?? WebBLEDevice.DEFAULT_NOTIFICATION_QUEUE_SIZE,
    );
    const overflowStrategy = options?.overflowStrategy ?? 'error';
    const queue: DataView[] = [];
    let droppedCount = 0;
    type Resolver = (v: IteratorResult<DataView>) => void;
    type Rejecter = (reason?: unknown) => void;
    const state: { resolve: Resolver | null; reject: Rejecter | null; done: boolean; failure: Error | null } = {
      resolve: null,
      reject: null,
      done: false,
      failure: null,
    };

    const callback: NotificationCallback = (value) => {
      if (state.failure) return;

      if (state.resolve) {
        const r = state.resolve;
        state.resolve = null;
        state.reject = null;
        r({ value, done: false });
      } else {
        if (queue.length >= maxQueueSize) {
          droppedCount += 1;
          const overflowEvent: QueueOverflowEvent = {
            service,
            characteristic,
            strategy: overflowStrategy,
            queueSize: maxQueueSize,
            droppedCount,
          };
          this.emitQueueOverflow(overflowEvent);

          try {
            options?.onOverflow?.(overflowEvent);
          } catch (error) {
            this.emitError(WebBLEError.from(error), {
              operation: 'device.notifications.onOverflow',
              service,
              characteristic,
            });
          }

          if (overflowStrategy === 'error') {
            const overflowError = new WebBLEError(
              'GATT_OPERATION_FAILED',
              `Notification queue overflowed (maxQueueSize=${maxQueueSize}). Increase queue size or consume faster.`,
            );
            state.failure = overflowError;
            const reject = state.reject;
            state.resolve = null;
            state.reject = null;
            reject?.(overflowError);
            return;
          }

          if (overflowStrategy === 'drop-oldest') {
            queue.shift();
          }

          if (overflowStrategy === 'drop-newest') {
            return;
          }
        }
        queue.push(value);
      }
    };

    // AIDEV-NOTE: notifications() always sets autoRecover internally so the
    // iterator can pause on unexpected disconnect and resume on reconnect.
    const key = this.charKey(service, characteristic);
    let entry = this.recoveryRegistry.get(key);
    if (!entry) {
      entry = { service, characteristic, callbacks: new Set() };
      this.recoveryRegistry.set(key, entry);
    }
    entry.callbacks.add(callback);

    const { unsubscribe: _unsubscribe, release, ready } = this.registerNotificationConsumer(service, characteristic, callback);
    try {
      await ready;
    } catch (error) {
      await release();
      const regEntry = this.recoveryRegistry.get(key);
      if (regEntry) {
        regEntry.callbacks.delete(callback);
        if (regEntry.callbacks.size === 0) this.recoveryRegistry.delete(key);
      }
      throw error;
    }

    try {
      while (!state.done) {
        if (state.failure) throw state.failure;

        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          const result = await new Promise<IteratorResult<DataView>>((resolve, reject) => {
            state.resolve = resolve;
            state.reject = reject;
          });
          if (result.done) {
            // AIDEV-NOTE: On unexpected disconnect, the reconciliation loop will
            // clear notificationStates but recoveryRegistry survives. If a
            // reconnectGate exists and disconnect was not intentional, we pause
            // the iterator and wait for reconnect rather than terminating.
            if (this.reconnectGate && !this.intentionalDisconnect) {
              await this.reconnectGate.promise;
              if (this.intentionalDisconnect) return;
              // After reconnect, recoverSubscriptions() already re-registered
              // our callback. Continue the loop to yield new values.
              continue;
            }
            return;
          }
          yield result.value;
        }
      }
    } finally {
      const pending = state.resolve;
      state.resolve = null;
      state.reject = null;
      state.done = true;
      await release();
      const regEntry = this.recoveryRegistry.get(key);
      if (regEntry) {
        regEntry.callbacks.delete(callback);
        if (regEntry.callbacks.size === 0) this.recoveryRegistry.delete(key);
      }
      if (pending) pending({ value: undefined as any, done: true });
    }
  }

  /**
   * Start watching for BLE advertisements from this device.
   * Not supported on all platforms.
   *
   * @throws {WebBLEError} `GATT_OPERATION_FAILED` -- platform does not support watchAdvertisements
   */
  async watchAdvertisements(): Promise<void> {
    if (typeof this.raw.watchAdvertisements !== 'function') {
      throw new WebBLEError('GATT_OPERATION_FAILED', 'watchAdvertisements is not supported on this device');
    }
    await this.raw.watchAdvertisements();
  }

  /**
   * Stop watching for BLE advertisements from this device.
   *
   * @throws {WebBLEError} `GATT_OPERATION_FAILED` -- platform does not support unwatchAdvertisements
   */
  async unwatchAdvertisements(): Promise<void> {
    const rawDevice = this.raw as BluetoothDevice & { unwatchAdvertisements?: () => Promise<void> };
    if (typeof rawDevice.unwatchAdvertisements !== 'function') {
      throw new WebBLEError('GATT_OPERATION_FAILED', 'unwatchAdvertisements is not supported on this device');
    }
    await rawDevice.unwatchAdvertisements();
  }

  /**
   * Request the browser to forget this device and revoke its permissions.
   * After calling, the device must be re-selected via `requestDevice()`.
   *
   * @throws {WebBLEError} `GATT_OPERATION_FAILED` -- platform does not support forget
   */
  async forget(): Promise<void> {
    if (typeof this.raw.forget !== 'function') {
      throw new WebBLEError('GATT_OPERATION_FAILED', 'forget is not supported on this device');
    }
    await this.raw.forget();
  }

  /**
   * Discover all primary GATT services on the connected device.
   * Results are cached until disconnect.
   *
   * @returns Array of `BluetoothRemoteGATTService` objects.
   * @throws {WebBLEError} `DEVICE_DISCONNECTED` -- not connected
   */
  async getPrimaryServices(): Promise<BluetoothRemoteGATTService[]> {
    if (!this.connected) throw new WebBLEError('DEVICE_DISCONNECTED');
    if (this.primaryServicesCache) return this.primaryServicesCache;

    try {
      const services = await this.server!.getPrimaryServices();
      const normalizedServices = services.map((service) => {
        const cached = this.serviceCache.get(service.uuid) ?? service;
        this.serviceCache.set(service.uuid, cached);
        return cached;
      });
      this.primaryServicesCache = normalizedServices;
      return normalizedServices;
    } catch (e) {
      throw WebBLEError.from(e);
    }
  }

  /**
   * Return the effective ATT MTU, guaranteed non-null.
   * Falls back through: reported MTU > withResponse + 3 > withoutResponse + 3 > 23 (BLE default).
   *
   * @returns MTU value in bytes (minimum 23).
   *
   * @see {@link getMtu} for nullable version
   * @see {@link getWriteLimits} for full limit details
   */
  async getEffectiveMtu(): Promise<number> {
    const limits = await this.getWriteLimits();
    if (typeof limits.mtu === 'number' && limits.mtu > 0) return limits.mtu;
    if (typeof limits.withResponse === 'number' && limits.withResponse > 0) return limits.withResponse + 3;
    if (typeof limits.withoutResponse === 'number' && limits.withoutResponse > 0) return limits.withoutResponse + 3;
    return 23;
  }

  /**
   * Return the reason for the most recent disconnection, or `null` if the device
   * has never disconnected during this session.
   *
   * @see {@link DisconnectReason}
   */
  getLastDisconnectReason(): DisconnectReason | null {
    return this.lastDisconnectReason;
  }

  /**
   * Return a snapshot of all active notification subscriptions on this device.
   * Includes both currently active native subscriptions and those registered
   * for auto-recovery after reconnection.
   *
   * @returns Array of {@link ActiveSubscription} snapshots.
   */
  getActiveSubscriptions(): ActiveSubscription[] {
    const keys = new Set<string>([
      ...this.notificationStates.keys(),
      ...this.recoveryRegistry.keys(),
    ]);

    return [...keys].map((key) => {
      const state = this.notificationStates.get(key);
      const recoveryEntry = this.recoveryRegistry.get(key);
      const [service, characteristic] = key.split(':');
      return {
        service,
        characteristic,
        callbackCount: state?.callbacks.size ?? recoveryEntry?.callbacks.size ?? 0,
        autoRecovering: recoveryEntry !== undefined,
        nativeActive: state?.nativeActive ?? false,
      };
    });
  }

  /**
   * Register a listener for device lifecycle events. Return an unsubscribe function.
   *
   * **Events:**
   * - `'disconnected'` -- Fired on any disconnect (intentional or unexpected), with reason.
   * - `'reconnected'` -- Fired after a successful connection while reconnect recovery listeners are registered.
   * - `'queue-overflow'` -- Fired when a notification queue exceeds its max size.
   * - `'subscription-lost'` -- Fired when a subscription cannot be recovered after reconnect.
   *
   * @param event - Event name.
   * @param fn - Listener function.
   * @returns Unsubscribe function.
   */
  on(event: 'reconnected', fn: Listener): () => void;
  on(event: 'disconnected', fn: DisconnectListener): () => void;
  on(event: 'queue-overflow', fn: QueueOverflowListener): () => void;
  on(event: 'subscription-lost', fn: SubscriptionLostListener): () => void;
  on(
    event: 'disconnected' | 'reconnected' | 'queue-overflow' | 'subscription-lost',
    fn: DisconnectListener | Listener | QueueOverflowListener | SubscriptionLostListener,
  ): () => void {
    if (event === 'disconnected') this.disconnectListeners.add(fn as DisconnectListener);
    if (event === 'reconnected') this.reconnectedListeners.add(fn as Listener);
    if (event === 'queue-overflow') this.queueOverflowListeners.add(fn as QueueOverflowListener);
    if (event === 'subscription-lost') this.subscriptionLostListeners.add(fn as SubscriptionLostListener);
    return () => { this.off(event as never, fn as never); };
  }

  /** Remove a previously registered event listener. No-op if the listener is not found. */
  off(event: 'reconnected', fn: Listener): void;
  off(event: 'disconnected', fn: DisconnectListener): void;
  off(event: 'queue-overflow', fn: QueueOverflowListener): void;
  off(event: 'subscription-lost', fn: SubscriptionLostListener): void;
  off(
    event: 'disconnected' | 'reconnected' | 'queue-overflow' | 'subscription-lost',
    fn: DisconnectListener | Listener | QueueOverflowListener | SubscriptionLostListener,
  ): void {
    if (event === 'disconnected') this.disconnectListeners.delete(fn as DisconnectListener);
    if (event === 'reconnected') this.reconnectedListeners.delete(fn as Listener);
    if (event === 'queue-overflow') this.queueOverflowListeners.delete(fn as QueueOverflowListener);
    if (event === 'subscription-lost') this.subscriptionLostListeners.delete(fn as SubscriptionLostListener);
  }

  /**
   * Register a global error listener for this device. Receives errors from internal
   * operations (notification recovery, listener failures, auto-reconnect exhaustion).
   *
   * @param listener - Error callback with error and context.
   * @returns Unsubscribe function.
   */
  addErrorListener(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => { this.removeErrorListener(listener); };
  }

  /** Remove a previously registered error listener. */
  removeErrorListener(listener: ErrorListener): void {
    this.errorListeners.delete(listener);
  }

  // --- Private ---

  private handleNotification = (event: Event): void => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    const value = char.value;
    if (!value) return;

    // Dispatch to all subscribers for this characteristic
    for (const [key, notificationState] of this.notificationStates) {
      const cached = notificationState.characteristic ?? this.charCache.get(key);
      if (cached === char) {
        const [service, characteristic] = key.split(':');
        for (const cb of notificationState.callbacks) {
          try {
            cb(value);
          } catch (error) {
            this.emitError(WebBLEError.from(error), {
              operation: 'device.notification-callback',
              service,
              characteristic,
            });
          }
        }
        break;
      }
    }
  };

  private handleDisconnect(): void {
    const reason: DisconnectReason = this.intentionalDisconnect ? 'intentional' : 'unexpected';
    this.lastDisconnectReason = reason;
    this.abortInFlightWrites();
    this.suspendSubscriptions();
    this.serviceCache.clear();
    this.primaryServicesCache = null;
    this.charCache.clear();
    this.server = null;
    this.hooks.onConnectionChange?.(this);

    // AIDEV-NOTE: Create the reconnect gate BEFORE firing disconnect listeners
    // so that notifications() iterators can await it immediately.
    if (this.recoveryRegistry.size > 0) {
      let gateResolve: () => void;
      const gatePromise = new Promise<void>((r) => { gateResolve = r; });
      this.reconnectGate = { promise: gatePromise, resolve: gateResolve! };
    }

    for (const fn of this.disconnectListeners) {
      try {
        fn(reason);
      } catch (error) {
        this.emitError(WebBLEError.from(error), { operation: 'device.disconnected-listener' });
      }
    }

    // Auto-reconnect on unexpected disconnect
    if (reason === 'unexpected' && this.autoReconnectConfig) {
      this.startAutoReconnect(this.autoReconnectConfig);
    }
  }

  private startAutoReconnect(config: AutoReconnectOptions): void {
    this.autoReconnectAbort?.abort();
    const controller = new AbortController();
    this.autoReconnectAbort = controller;

    const maxAttempts = config.maxAttempts ?? Infinity;
    const initialDelay = config.initialDelayMs ?? 1000;
    const maxDelay = config.maxDelayMs ?? 30000;
    const multiplier = config.backoffMultiplier ?? 2;

    const loop = async () => {
      let delay = initialDelay;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (controller.signal.aborted) return;

        await new Promise<void>((r) => {
          const timer = setTimeout(r, delay);
          controller.signal.addEventListener('abort', () => { clearTimeout(timer); r(); }, { once: true });
        });
        if (controller.signal.aborted) return;

        try {
          await this.connect();
          return; // success — connect() fires reconnected listeners and resolves the gate
        } catch {
          delay = Math.min(delay * multiplier, maxDelay);
        }
      }
      // Exhausted attempts — emit error so consumers know
      this.emitError(
        new WebBLEError('CONNECTION_TIMEOUT', `Auto-reconnect failed after ${maxAttempts} attempts`),
        { operation: 'device.auto-reconnect' },
      );
    };

    void loop();
  }

  private cleanupSubscriptions(): void {
    for (const notificationState of this.notificationStates.values()) {
      this.detachNotificationListener(notificationState);
      if (notificationState.nativeActive) {
        void this.stopNotificationsSafely(notificationState.characteristic, {
          operation: 'notification.cleanup',
        });
      }
    }
    this.notificationStates.clear();
  }

  // AIDEV-NOTE: suspendSubscriptions detaches listeners and clears runtime
  // notificationStates but preserves recoveryRegistry so subscriptions can be
  // rebuilt on reconnect.
  private suspendSubscriptions(): void {
    for (const notificationState of this.notificationStates.values()) {
      this.detachNotificationListener(notificationState);
      if (notificationState.nativeActive) {
        void this.stopNotificationsSafely(notificationState.characteristic, {
          operation: 'notification.suspend',
        });
      }
    }
    this.notificationStates.clear();
  }

  private async recoverSubscriptions(): Promise<void> {
    const entries = [...this.recoveryRegistry.entries()];
    for (const [key, entry] of entries) {
      try {
        for (const callback of entry.callbacks) {
          const { ready } = this.registerNotificationConsumer(entry.service, entry.characteristic, callback);
          await ready;
        }
      } catch (error) {
        // Characteristic may no longer exist after firmware update or
        // service change — remove the stale entry from the registry.
        this.recoveryRegistry.delete(key);
        const recoveredError = WebBLEError.from(error);
        this.emitSubscriptionLost({
          service: entry.service,
          characteristic: entry.characteristic,
          error: recoveredError,
        });
        this.emitError(recoveredError, {
          operation: 'notification.recover',
          service: entry.service,
          characteristic: entry.characteristic,
        });
      }
    }
  }

  // AIDEV-NOTE: Keep one serialized notification lifecycle per characteristic so
  // subscribe() and notifications() cannot diverge during async start/stop races.
  private registerNotificationConsumer(
    service: string,
    characteristic: string,
    callback: NotificationCallback,
  ): { unsubscribe: () => void; release: () => Promise<void>; ready: Promise<void> } {
    const charKey = this.charKey(service, characteristic);
    let notificationState = this.notificationStates.get(charKey);
    if (!notificationState) {
      notificationState = {
        callbacks: new Set(),
        characteristic: null,
        listenerAttached: false,
        nativeActive: false,
        reconcilePromise: null,
      };
      this.notificationStates.set(charKey, notificationState);
    }

    notificationState.callbacks.add(callback);

    const release = (): Promise<void> => {
      const currentState = this.notificationStates.get(charKey);
      if (!currentState?.callbacks.has(callback)) return Promise.resolve();

      currentState.callbacks.delete(callback);
      return this.syncNotificationState(charKey, service, characteristic);
    };

    return {
      unsubscribe: () => { void release(); },
      release,
      ready: this.syncNotificationState(charKey, service, characteristic),
    };
  }

  private syncNotificationState(serviceKey: string, service: string, characteristic: string): Promise<void> {
    const notificationState = this.notificationStates.get(serviceKey);
    if (!notificationState) return Promise.resolve();

    const previous = notificationState.reconcilePromise ?? Promise.resolve();
    const next = previous.catch((error) => {
      this.emitError(WebBLEError.from(error), {
        operation: 'notification.reconcile',
        service,
        characteristic,
      });
    }).then(async () => {
      while (true) {
        const currentState = this.notificationStates.get(serviceKey);
        if (currentState !== notificationState) {
          await this.deactivateNotificationState(notificationState);
          return;
        }

        if (notificationState.callbacks.size === 0) {
          this.detachNotificationListener(notificationState);

          if (notificationState.nativeActive) {
            notificationState.nativeActive = false;
            await this.stopNotificationsSafely(notificationState.characteristic, {
              operation: 'notification.stop',
              service,
              characteristic,
            });
            continue;
          }

          this.deleteNotificationStateIfIdle(serviceKey, notificationState);
          return;
        }

        const char = notificationState.characteristic ?? await this.getCharacteristic(service, characteristic);
        notificationState.characteristic = char;

        // AIDEV-NOTE: Attach event listener BEFORE startNotifications() to avoid
        // losing notifications that arrive between the native subscribe completing
        // and the JS listener being attached. Safe because listener is a no-op if
        // notifications haven't started yet.
        if (!notificationState.listenerAttached) {
          char.addEventListener('characteristicvaluechanged', this.handleNotification);
          notificationState.listenerAttached = true;
        }

        if (!notificationState.nativeActive) {
          await char.startNotifications();
          notificationState.nativeActive = true;

          if (this.notificationStates.get(serviceKey) !== notificationState) {
            await this.deactivateNotificationState(notificationState);
            return;
          }

          if (notificationState.callbacks.size === 0) continue;
        }

        if (notificationState.callbacks.size === 0) continue;
        return;
      }
    });

    const settled = next.finally(() => {
      if (notificationState.reconcilePromise === settled) {
        notificationState.reconcilePromise = null;
        if (this.notificationStates.get(serviceKey) === notificationState) {
          this.deleteNotificationStateIfIdle(serviceKey, notificationState);
        }
      }
    });

    notificationState.reconcilePromise = settled;
    return settled;
  }

  private async deactivateNotificationState(notificationState: NotificationState): Promise<void> {
    this.detachNotificationListener(notificationState);
    if (!notificationState.nativeActive) return;

    notificationState.nativeActive = false;
    await this.stopNotificationsSafely(notificationState.characteristic, {
      operation: 'notification.deactivate',
    });
  }

  private detachNotificationListener(notificationState: NotificationState): void {
    if (!notificationState.listenerAttached || !notificationState.characteristic) return;

    notificationState.characteristic.removeEventListener('characteristicvaluechanged', this.handleNotification);
    notificationState.listenerAttached = false;
  }

  private deleteNotificationStateIfIdle(serviceKey: string, notificationState: NotificationState): void {
    if (this.notificationStates.get(serviceKey) !== notificationState) return;
    if (notificationState.callbacks.size > 0 || notificationState.nativeActive || notificationState.reconcilePromise) return;
    this.notificationStates.delete(serviceKey);
  }

  private async withOptionalTimeout<T>(operation: Promise<T>, timeoutMs: number | undefined, message: string): Promise<T> {
    if (timeoutMs === undefined) return operation;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new WebBLEError('TIMEOUT', message));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
  }

  private validateTimeoutMs(timeoutMs: number | undefined): number | undefined {
    if (timeoutMs === undefined) return undefined;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new WebBLEError('INVALID_PARAMETER', `Invalid timeoutMs: ${timeoutMs}. Must be a positive number.`);
    }
    return timeoutMs;
  }

  private validateMaxQueueSize(maxQueueSize: number): number {
    if (!Number.isInteger(maxQueueSize) || maxQueueSize <= 0) {
      throw new WebBLEError('INVALID_PARAMETER', `Invalid maxQueueSize: ${maxQueueSize}. Must be a positive integer.`);
    }
    return maxQueueSize;
  }

  private async deriveChunkSize(explicitChunkSize: number | undefined, mode: WriteOptions['mode']): Promise<number> {
    if (explicitChunkSize !== undefined) {
      if (!Number.isInteger(explicitChunkSize) || explicitChunkSize <= 0) {
        throw new WebBLEError('INVALID_PARAMETER', `Invalid chunkSize: ${explicitChunkSize}. Must be a positive integer.`);
      }
      return explicitChunkSize;
    }

    const limits = await this.getWriteLimits().catch(() => ({ withResponse: null, withoutResponse: null, mtu: null }));
    const preferred = mode === 'without-response' ? limits.withoutResponse : limits.withResponse;
    if (typeof preferred === 'number' && preferred > 0) return preferred;
    if (typeof limits.mtu === 'number' && limits.mtu > 3) return limits.mtu - 3;

    // Conservative fallback for platforms that do not expose limits.
    return 20;
  }

  private deriveChunkSizeFromMtu(mtu: number | undefined): number | null {
    if (mtu === undefined) return null;
    if (!Number.isInteger(mtu) || mtu <= 3) {
      throw new WebBLEError('INVALID_PARAMETER', `Invalid mtu: ${mtu}. Must be an integer greater than 3.`);
    }
    return mtu - 3;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
  }

  private toUint8Array(value: BufferSource): Uint8Array {
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private emitQueueOverflow(event: QueueOverflowEvent): void {
    for (const listener of this.queueOverflowListeners) {
      try {
        listener(event);
      } catch (error) {
        this.emitError(WebBLEError.from(error), { operation: 'device.queue-overflow-listener' });
      }
    }
  }

  private emitSubscriptionLost(event: SubscriptionLostEvent): void {
    for (const listener of this.subscriptionLostListeners) {
      try {
        listener(event);
      } catch (error) {
        this.emitError(WebBLEError.from(error), { operation: 'device.subscription-lost-listener' });
      }
    }
  }

  private emitError(error: Error, context: DeviceErrorContext): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error, context);
      } catch {
        // Avoid recursive error propagation from error listeners.
      }
    }
  }

  private abortInFlightWrites(): void {
    for (const entry of this.inFlightWrites.values()) {
      entry.aborted = true;
    }
  }

  private async stopNotificationsSafely(
    characteristic: BluetoothRemoteGATTCharacteristic | null,
    context: DeviceErrorContext,
  ): Promise<void> {
    if (!characteristic) return;
    try {
      await characteristic.stopNotifications();
    } catch (error) {
      this.emitError(WebBLEError.from(error), context);
    }
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
    if (this.primaryServicesCache) {
      const discoveredService = this.primaryServicesCache.find((entry) => entry.uuid === uuid);
      if (discoveredService) return discoveredService;
    }

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
