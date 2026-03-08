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
  | 'BLUETOOTH_UNAVAILABLE'
  | 'EXTENSION_NOT_INSTALLED'
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_DISCONNECTED'
  | 'CONNECTION_TIMEOUT'
  | 'SERVICE_NOT_FOUND'
  | 'CHARACTERISTIC_NOT_FOUND'
  | 'CHARACTERISTIC_NOT_READABLE'
  | 'CHARACTERISTIC_NOT_WRITABLE'
  | 'CHARACTERISTIC_NOT_NOTIFIABLE'
  | 'GATT_OPERATION_FAILED'
  | 'SCAN_ALREADY_IN_PROGRESS'
  | 'USER_CANCELLED'
  | 'TIMEOUT';

const SUGGESTIONS: Record<WebBLEErrorCode, string> = {
  BLUETOOTH_UNAVAILABLE: 'Check that the browser supports Web Bluetooth and the device has Bluetooth enabled.',
  EXTENSION_NOT_INSTALLED: 'Install the WebBLE iOS app and enable the Safari extension. Use @ios-web-bluetooth/detect to show an install banner.',
  PERMISSION_DENIED: 'The user denied Bluetooth permission. Request permission again with a user gesture (button click).',
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
  USER_CANCELLED: 'The user cancelled the device picker. No action needed.',
  TIMEOUT: 'The operation timed out. Retry or check device connectivity.',
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

  constructor(code: WebBLEErrorCode, message?: string) {
    const defaultMessage = SUGGESTIONS[code];
    super(message ?? defaultMessage);
    this.name = 'WebBLEError';
    this.code = code;
    this.suggestion = SUGGESTIONS[code];
  }

  /** Convert a native error to a WebBLEError with automatic code detection. */
  static from(error: unknown, code: WebBLEErrorCode = 'GATT_OPERATION_FAILED'): WebBLEError {
    if (error instanceof WebBLEError) return error;
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes('User cancelled') || msg.includes('User canceled')) {
      return new WebBLEError('USER_CANCELLED');
    }
    if (msg.includes('no devices found') || msg.includes('No Devices')) {
      return new WebBLEError('DEVICE_NOT_FOUND');
    }
    if (msg.includes('No Services matching') || msg.includes('service not found')) {
      return new WebBLEError('SERVICE_NOT_FOUND', msg);
    }
    if (msg.includes('No Characteristics matching') || msg.includes('characteristic not found')) {
      return new WebBLEError('CHARACTERISTIC_NOT_FOUND', msg);
    }
    if (msg.includes('GATT Server is disconnected') || msg.includes('disconnected')) {
      return new WebBLEError('DEVICE_DISCONNECTED', msg);
    }
    if (msg.includes('not supported') && msg.includes('read')) {
      return new WebBLEError('CHARACTERISTIC_NOT_READABLE', msg);
    }
    if (msg.includes('not supported') && msg.includes('write')) {
      return new WebBLEError('CHARACTERISTIC_NOT_WRITABLE', msg);
    }
    if (msg.includes('not supported') && msg.includes('notif')) {
      return new WebBLEError('CHARACTERISTIC_NOT_NOTIFIABLE', msg);
    }
    if (msg.includes('permission') || msg.includes('Permission')) {
      return new WebBLEError('PERMISSION_DENIED', msg);
    }

    return new WebBLEError(code, msg);
  }
}
