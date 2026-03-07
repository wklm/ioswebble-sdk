/**
 * Lightweight WebBLEError for the React SDK.
 * Compatible with @wklm/core's WebBLEError interface.
 * If @wklm/core is installed, prefer importing WebBLEError from there.
 */
export class WebBLEError extends Error {
  /** Machine-readable error code for programmatic handling. */
  readonly code: string;

  constructor(message: string, code?: string, public device?: BluetoothDevice) {
    super(message);
    this.name = 'WebBLEError';
    this.code = code ?? 'GATT_OPERATION_FAILED';
  }
}
