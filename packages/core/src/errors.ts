/**
 * Machine-readable error codes for all WebBLE operations.
 * Use in catch blocks to handle specific failure modes.
 *
 * @example
 * ```typescript
 * try {
 *   await device.read('heart_rate', 'heart_rate_measurement')
 * } catch (e) {
 *   if (e instanceof WebBLEError) {
 *     switch (e.code) {
 *       case 'DEVICE_DISCONNECTED': await device.connect(); break;
 *       case 'CHARACTERISTIC_NOT_READABLE': device.subscribe(...); break;
 *       default: console.error(e.suggestion);
 *     }
 *   }
 * }
 * ```
 */
export type WebBLEErrorCode =
  /** Invalid argument passed to an SDK method (e.g. negative timeout, malformed UUID). Not retriable. */
  | 'INVALID_PARAMETER'
  /** Browser or platform does not support Web Bluetooth at all. Not retriable. */
  | 'BLUETOOTH_UNAVAILABLE'
  /** The WebBLE Safari extension is not installed. Show an install banner via `@ios-web-bluetooth/detect`. Not retriable. */
  | 'EXTENSION_NOT_INSTALLED'
  /** User denied Bluetooth permission, or the call was not triggered by a user gesture. Not retriable. */
  | 'PERMISSION_DENIED'
  /** No BLE device matched the given scan filters, or the device picker returned empty. Not retriable. */
  | 'DEVICE_NOT_FOUND'
  /** GATT operation attempted on a disconnected device. Retriable -- call `connect()` first. */
  | 'DEVICE_DISCONNECTED'
  /** Device did not respond within the connection timeout window. Retriable -- check range and advertising state. */
  | 'CONNECTION_TIMEOUT'
  /** The requested GATT service UUID was not found on the connected device. Not retriable. */
  | 'SERVICE_NOT_FOUND'
  /** The requested characteristic UUID was not found in the specified service. Not retriable. */
  | 'CHARACTERISTIC_NOT_FOUND'
  /** The characteristic does not support the read property. Use `subscribe()` for notify-only characteristics. Not retriable. */
  | 'CHARACTERISTIC_NOT_READABLE'
  /** The characteristic does not support write or writeWithoutResponse. Not retriable. */
  | 'CHARACTERISTIC_NOT_WRITABLE'
  /** The characteristic does not support notify or indicate. Use `read()` for polling. Not retriable. */
  | 'CHARACTERISTIC_NOT_NOTIFIABLE'
  /** Generic GATT failure (device busy, stack error, disconnected mid-operation). Retriable. */
  | 'GATT_OPERATION_FAILED'
  /** A BLE scan is already running. Stop the current scan before starting a new one. Retriable. */
  | 'SCAN_ALREADY_IN_PROGRESS'
  /** `WebBLE.maxConnections` limit reached. Disconnect another device before connecting. Not retriable. */
  | 'CONNECTION_LIMIT_REACHED'
  /** User dismissed the device picker without selecting a device. Not retriable. */
  | 'USER_CANCELLED'
  /** A read/write/connect operation did not complete within the specified timeout. Retriable. */
  | 'TIMEOUT'
  /** A chunked write was only partially completed. Retry with smaller chunks or reconnect. Retriable. */
  | 'WRITE_INCOMPLETE';

/**
 * Configuration for {@link withRetry}.
 *
 * **Backoff formula:** `delay = delayMs * backoffMultiplier^(attempt - 1)`
 *
 * @see {@link withRetry}
 */
export interface RetryOptions {
  /** Total attempts including the first call. Defaults to 3. Must be a positive integer. */
  maxAttempts?: number;
  /** Base delay between retries in milliseconds. Defaults to 250. Must be non-negative. */
  delayMs?: number;
  /** Multiplier applied after each failed attempt. Defaults to 1.5. Must be >= 1. */
  backoffMultiplier?: number;
}

const RETRIABLE_CODES: Set<WebBLEErrorCode> = new Set([
  'DEVICE_DISCONNECTED',
  'CONNECTION_TIMEOUT',
  'GATT_OPERATION_FAILED',
  'TIMEOUT',
  'SCAN_ALREADY_IN_PROGRESS',
  'WRITE_INCOMPLETE',
]);

const SUGGESTIONS: Record<WebBLEErrorCode, string> = {
  INVALID_PARAMETER: 'One or more input parameters were invalid. Check UUIDs, payload sizes, and option values.',
  BLUETOOTH_UNAVAILABLE: 'Check that the browser supports Web Bluetooth and the device has Bluetooth enabled.',
  EXTENSION_NOT_INSTALLED: 'Install the WebBLE iOS app and enable the Safari extension. Use @ios-web-bluetooth/detect to show an install banner.',
  PERMISSION_DENIED: 'The user denied Bluetooth permission or the request was not triggered by a user gesture. Call requestDevice() from a click/tap handler and try again.',
  DEVICE_NOT_FOUND: 'No matching device found. Check your scan filters or ensure the device is advertising.',
  DEVICE_DISCONNECTED: 'Call device.connect() before performing GATT operations.',
  CONNECTION_TIMEOUT: 'The device did not respond in time. Ensure it is in range and advertising.',
  SERVICE_NOT_FOUND: 'The requested service was not found on this device. Check the service UUID and ensure it is included in requestDevice filters.',
  CHARACTERISTIC_NOT_FOUND: 'The requested characteristic was not found in this service. Check the characteristic UUID.',
  CHARACTERISTIC_NOT_READABLE: 'This characteristic does not support read. Use device.subscribe() instead if it supports notify.',
  CHARACTERISTIC_NOT_WRITABLE: 'This characteristic does not support write. Check the characteristic properties.',
  CHARACTERISTIC_NOT_NOTIFIABLE: 'This characteristic does not support notifications. Use device.read() for polling instead.',
  GATT_OPERATION_FAILED: 'The GATT operation failed. The device may have disconnected or the characteristic may be busy.',
  SCAN_ALREADY_IN_PROGRESS: 'Stop the current scan before starting a new one.',
  CONNECTION_LIMIT_REACHED: 'Disconnect another device or raise maxConnections for this WebBLE instance before connecting more devices.',
  USER_CANCELLED: 'The user cancelled the device picker. No action needed.',
  TIMEOUT: 'The operation timed out. Retry or check device connectivity.',
  WRITE_INCOMPLETE: 'Only part of the payload was written. Retry with smaller chunks or reconnect the device.',
};

/**
 * Error class for all WebBLE operations. Contains a machine-readable `code`
 * and a human/agent-readable `suggestion` for how to fix the issue.
 */
export class WebBLEError extends Error {
  /** Machine-readable error code for programmatic handling. */
  readonly code: WebBLEErrorCode;
  /** Actionable fix instruction — useful for agents and error UIs. */
  readonly suggestion: string;
  /** Whether the operation is safe to retry automatically. */
  readonly isRetriable: boolean;
  /** Suggested backoff before retrying, when known. */
  readonly retryAfterMs?: number;

  constructor(code: WebBLEErrorCode, message?: string, options?: { retryAfterMs?: number }) {
    const defaultMessage = SUGGESTIONS[code];
    super(message ?? defaultMessage);
    this.name = 'WebBLEError';
    this.code = code;
    this.suggestion = SUGGESTIONS[code];
    this.isRetriable = RETRIABLE_CODES.has(code);
    this.retryAfterMs = options?.retryAfterMs;
  }

  /** Convert a native error to a WebBLEError with automatic code detection. */
  static from(error: unknown, code: WebBLEErrorCode = 'GATT_OPERATION_FAILED'): WebBLEError {
    if (error instanceof WebBLEError) return error;
    const domName =
      typeof error === 'object' && error !== null && 'name' in error && typeof (error as { name: unknown }).name === 'string'
        ? (error as { name: string }).name
        : undefined;
    const msg = error instanceof Error ? error.message : String(error);
    const lowerMsg = msg.toLowerCase();

    switch (domName) {
      case 'NotFoundError':
        return new WebBLEError('DEVICE_NOT_FOUND', msg);
      case 'NotAllowedError':
      case 'SecurityError':
        return new WebBLEError('PERMISSION_DENIED', msg);
      case 'NetworkError':
        return new WebBLEError('DEVICE_DISCONNECTED', msg, { retryAfterMs: 1000 });
      case 'TimeoutError':
        return new WebBLEError('TIMEOUT', msg, { retryAfterMs: 1000 });
      case 'InvalidStateError':
        if (lowerMsg.includes('disconnect')) {
          return new WebBLEError('DEVICE_DISCONNECTED', msg, { retryAfterMs: 1000 });
        }
        break;
      default:
        break;
    }

    if (msg.includes('User cancelled') || msg.includes('User canceled')) {
      return new WebBLEError('USER_CANCELLED');
    }
    if (lowerMsg.includes('no devices found') || msg.includes('No Devices')) {
      return new WebBLEError('DEVICE_NOT_FOUND');
    }
    if (msg.includes('No Services matching') || lowerMsg.includes('service not found')) {
      return new WebBLEError('SERVICE_NOT_FOUND', msg);
    }
    if (msg.includes('No Characteristics matching') || lowerMsg.includes('characteristic not found')) {
      return new WebBLEError('CHARACTERISTIC_NOT_FOUND', msg);
    }
    if (msg.includes('GATT Server is disconnected') || lowerMsg.includes('disconnected')) {
      return new WebBLEError('DEVICE_DISCONNECTED', msg, { retryAfterMs: 1000 });
    }
    if (lowerMsg.includes('not supported') && lowerMsg.includes('read')) {
      return new WebBLEError('CHARACTERISTIC_NOT_READABLE', msg);
    }
    if (lowerMsg.includes('not supported') && lowerMsg.includes('write')) {
      return new WebBLEError('CHARACTERISTIC_NOT_WRITABLE', msg);
    }
    if (lowerMsg.includes('not supported') && lowerMsg.includes('notif')) {
      return new WebBLEError('CHARACTERISTIC_NOT_NOTIFIABLE', msg);
    }
    if (lowerMsg.includes('permission')) {
      return new WebBLEError('PERMISSION_DENIED', msg);
    }

    return new WebBLEError(code, msg);
  }
}

/**
 * Retry an async operation with exponential backoff. Only retries errors
 * whose `isRetriable` flag is `true` (see {@link WebBLEError}).
 *
 * **Retriable error codes:** `DEVICE_DISCONNECTED`, `CONNECTION_TIMEOUT`,
 * `GATT_OPERATION_FAILED`, `TIMEOUT`, `SCAN_ALREADY_IN_PROGRESS`, `WRITE_INCOMPLETE`.
 *
 * **Backoff formula:** `delay = delayMs * backoffMultiplier^(attempt - 1)`.
 * If the error includes `retryAfterMs`, that value overrides the calculated delay.
 *
 * @param fn - Async function to retry. Receives the current attempt number (1-based).
 * @param options - Retry configuration (defaults: 3 attempts, 250ms delay, 1.5x backoff).
 * @returns The result of the first successful call.
 *
 * @throws {WebBLEError} The last error if all attempts fail or the error is not retriable.
 * @throws {WebBLEError} `INVALID_PARAMETER` if options contain invalid values.
 *
 * @example
 * ```typescript
 * import { withRetry } from '@ios-web-bluetooth/core'
 *
 * const value = await withRetry(async (attempt) => {
 *   console.log(`Attempt ${attempt}`)
 *   return await device.read('battery_service', 'battery_level')
 * }, { maxAttempts: 5, delayMs: 500, backoffMultiplier: 2 })
 * ```
 *
 * @see {@link RetryOptions}
 * @see {@link WebBLEError.isRetriable}
 */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 250;
  const backoffMultiplier = options.backoffMultiplier ?? 1.5;

  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new WebBLEError('INVALID_PARAMETER', `Invalid maxAttempts: ${maxAttempts}. Must be a positive integer.`);
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new WebBLEError('INVALID_PARAMETER', `Invalid delayMs: ${delayMs}. Must be a non-negative number.`);
  }
  if (!Number.isFinite(backoffMultiplier) || backoffMultiplier < 1) {
    throw new WebBLEError('INVALID_PARAMETER', `Invalid backoffMultiplier: ${backoffMultiplier}. Must be a number >= 1.`);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      const normalizedError = WebBLEError.from(error);
      if (attempt >= maxAttempts || !normalizedError.isRetriable) {
        throw normalizedError;
      }

      const nextDelay = normalizedError.retryAfterMs
        ?? delayMs * Math.pow(backoffMultiplier, attempt - 1);
      if (nextDelay > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, nextDelay);
        });
      }
    }
  }

  throw new WebBLEError('GATT_OPERATION_FAILED', 'Retry loop exited unexpectedly.');
}
