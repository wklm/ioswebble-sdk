/**
 * Lightweight WebBLEError for the React SDK.
 * Compatible with @ios-web-bluetooth/core's WebBLEError interface.
 * If @ios-web-bluetooth/core is installed, prefer importing WebBLEError from there.
 */
export declare class WebBLEError extends Error {
    device?: BluetoothDevice | undefined;
    /** Machine-readable error code for programmatic handling. */
    readonly code: string;
    constructor(message: string, code?: string, device?: BluetoothDevice | undefined);
}
