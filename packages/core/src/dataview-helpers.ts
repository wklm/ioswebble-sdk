/**
 * Ergonomic helpers for reading typed values from `DataView` objects returned
 * by `device.read()` and notification callbacks.
 *
 * BLE characteristics return raw bytes as `DataView`. These helpers eliminate
 * boilerplate for common numeric and string decodings. All functions default
 * to offset 0 for the common case of reading the first value.
 *
 * @example
 * ```typescript
 * import { readUint8, readUint16LE, readUtf8 } from '@ios-web-bluetooth/core'
 *
 * const battery = await device.read('battery_service', 'battery_level')
 * const level = readUint8(battery) // 0-100
 *
 * const name = await device.read('generic_access', 'device_name')
 * console.log(readUtf8(name)) // "My Device"
 * ```
 *
 * @see {@link WebBLEDevice.read} for reading characteristic values
 */

/**
 * Read an unsigned 8-bit integer from the DataView.
 *
 * @param dv - Source DataView from a characteristic read or notification.
 * @param offset - Byte offset to read from. Defaults to 0.
 * @returns Unsigned integer in range [0, 255].
 */
export function readUint8(dv: DataView, offset = 0): number {
  return dv.getUint8(offset);
}

/**
 * Read an unsigned 16-bit little-endian integer from the DataView.
 * Little-endian is the standard byte order for most BLE characteristics.
 *
 * @param dv - Source DataView.
 * @param offset - Byte offset to read from. Defaults to 0.
 * @returns Unsigned integer in range [0, 65535].
 */
export function readUint16LE(dv: DataView, offset = 0): number {
  return dv.getUint16(offset, true);
}

/**
 * Read an unsigned 16-bit big-endian integer from the DataView.
 *
 * @param dv - Source DataView.
 * @param offset - Byte offset to read from. Defaults to 0.
 * @returns Unsigned integer in range [0, 65535].
 */
export function readUint16BE(dv: DataView, offset = 0): number {
  return dv.getUint16(offset, false);
}

/**
 * Read a signed 16-bit little-endian integer from the DataView.
 * Common for temperature and other signed sensor values in BLE.
 *
 * @param dv - Source DataView.
 * @param offset - Byte offset to read from. Defaults to 0.
 * @returns Signed integer in range [-32768, 32767].
 */
export function readInt16LE(dv: DataView, offset = 0): number {
  return dv.getInt16(offset, true);
}

/**
 * Read an unsigned 32-bit little-endian integer from the DataView.
 *
 * @param dv - Source DataView.
 * @param offset - Byte offset to read from. Defaults to 0.
 * @returns Unsigned integer in range [0, 4294967295].
 */
export function readUint32LE(dv: DataView, offset = 0): number {
  return dv.getUint32(offset, true);
}

/**
 * Read a 32-bit little-endian IEEE 754 float from the DataView.
 *
 * @param dv - Source DataView.
 * @param offset - Byte offset to read from. Defaults to 0.
 * @returns 32-bit floating point number.
 */
export function readFloat32LE(dv: DataView, offset = 0): number {
  return dv.getFloat32(offset, true);
}

/**
 * Decode the entire DataView contents as a UTF-8 string.
 * Useful for device name, serial number, and other string characteristics.
 *
 * @param dv - Source DataView.
 * @returns Decoded UTF-8 string.
 *
 * @example
 * ```typescript
 * const name = await device.read('generic_access', 'device_name')
 * console.log(readUtf8(name)) // "Polar H10"
 * ```
 */
export function readUtf8(dv: DataView): string {
  return new TextDecoder().decode(dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength));
}

/**
 * Copy the DataView contents into a new `Uint8Array`.
 * Useful when you need to store, compare, or forward raw bytes.
 *
 * @param dv - Source DataView.
 * @returns New Uint8Array containing a copy of the DataView bytes.
 */
export function readBytes(dv: DataView): Uint8Array {
  return new Uint8Array(dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength));
}
