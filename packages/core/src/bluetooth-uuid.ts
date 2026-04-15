/**
 * BluetoothUUID — Web Bluetooth spec §4
 * https://webbluetoothcg.github.io/web-bluetooth/#bluetoothuuid
 *
 * Static methods to resolve service, characteristic, and descriptor
 * names/aliases to canonical 128-bit UUID strings.
 */

import { resolveUUID } from './uuid';

// Bluetooth SIG base UUID suffix
const BASE_SUFFIX = '-0000-1000-8000-00805f9b34fb';

// Descriptor name → 16-bit hex map (not in uuid.ts)
const DESCRIPTORS: Record<string, number> = {
  gatt_characteristic_extended_properties: 0x2900,
  gatt_characteristic_user_description: 0x2901,
  gatt_client_characteristic_configuration: 0x2902,
  gatt_server_characteristic_configuration: 0x2903,
  gatt_characteristic_presentation_format: 0x2904,
  gatt_characteristic_aggregate_format: 0x2905,
  valid_range: 0x2906,
  external_report_reference: 0x2907,
  report_reference: 0x2908,
  number_of_digitals: 0x2909,
  value_trigger_setting: 0x290A,
  es_configuration: 0x290B,
  es_measurement: 0x290C,
  es_trigger_setting: 0x290D,
  time_trigger_setting: 0x290E,
  complete_br_edr_transport_block_data: 0x290F,
};

function hexToUUID(hex: number): string {
  return hex.toString(16).padStart(8, '0') + BASE_SUFFIX;
}

/**
 * Convert a 16-bit or 32-bit integer alias to a canonical 128-bit UUID string.
 * Implements `BluetoothUUID.canonicalUUID()` from the Web Bluetooth spec.
 *
 * @param alias - 16-bit or 32-bit unsigned integer (0 to 0xFFFFFFFF).
 * @returns Canonical lowercase 128-bit UUID string.
 * @throws {TypeError} If the alias is not a valid unsigned 32-bit integer.
 *
 * @example
 * ```typescript
 * canonicalUUID(0x180D) // '0000180d-0000-1000-8000-00805f9b34fb'
 * canonicalUUID(0x2A37) // '00002a37-0000-1000-8000-00805f9b34fb'
 * ```
 *
 * @see {@link resolveUUID} for resolving names and hex strings
 */
export function canonicalUUID(alias: number): string {
  if (!Number.isInteger(alias) || alias < 0 || alias > 0xFFFFFFFF) {
    throw new TypeError(
      `Failed to execute 'canonicalUUID' on 'BluetoothUUID': ` +
      `Value is not a valid unsigned long: ${alias}`
    );
  }
  return hexToUUID(alias);
}

/**
 * Resolve a service name or UUID alias to a canonical 128-bit UUID.
 * Implements `BluetoothUUID.getService()` from the Web Bluetooth spec.
 *
 * @param name - Service name (e.g. `'heart_rate'`), 16-bit integer, or UUID string.
 * @returns Canonical 128-bit UUID string.
 *
 * @example
 * ```typescript
 * getService('heart_rate') // '0000180d-0000-1000-8000-00805f9b34fb'
 * getService(0x180D)       // '0000180d-0000-1000-8000-00805f9b34fb'
 * ```
 *
 * @see {@link resolveUUID}
 */
export function getService(name: string | number): string {
  if (typeof name === 'number') return canonicalUUID(name);
  const resolved = resolveUUID(name);
  return resolved;
}

/**
 * Resolve a characteristic name or UUID alias to a canonical 128-bit UUID.
 * Implements `BluetoothUUID.getCharacteristic()` from the Web Bluetooth spec.
 *
 * @param name - Characteristic name (e.g. `'heart_rate_measurement'`), 16-bit integer, or UUID string.
 * @returns Canonical 128-bit UUID string.
 *
 * @example
 * ```typescript
 * getCharacteristic('battery_level') // '00002a19-0000-1000-8000-00805f9b34fb'
 * getCharacteristic(0x2A37)          // '00002a37-0000-1000-8000-00805f9b34fb'
 * ```
 *
 * @see {@link resolveUUID}
 */
export function getCharacteristic(name: string | number): string {
  if (typeof name === 'number') return canonicalUUID(name);
  const resolved = resolveUUID(name);
  return resolved;
}

/**
 * Resolve a descriptor name or UUID alias to a canonical 128-bit UUID.
 * Implements `BluetoothUUID.getDescriptor()` from the Web Bluetooth spec.
 * Supports GATT descriptor names (e.g. `'gatt_client_characteristic_configuration'`)
 * in addition to all formats supported by {@link resolveUUID}.
 *
 * @param name - Descriptor name, 16-bit integer, or UUID string.
 * @returns Canonical 128-bit UUID string.
 *
 * @example
 * ```typescript
 * getDescriptor('gatt_client_characteristic_configuration') // '00002902-...'
 * getDescriptor(0x2902)                                     // '00002902-...'
 * ```
 *
 * @see {@link resolveUUID}
 */
export function getDescriptor(name: string | number): string {
  if (typeof name === 'number') return canonicalUUID(name);

  const lower = name.toLowerCase();
  const descHex = DESCRIPTORS[lower];
  if (descHex !== undefined) return hexToUUID(descHex);

  // Fall through to resolveUUID for full UUIDs and hex shorthands
  return resolveUUID(name);
}

/**
 * BluetoothUUID namespace object conforming to the Web Bluetooth spec.
 * Can be assigned to `window.BluetoothUUID` for spec compliance.
 */
export const BluetoothUUID = {
  canonicalUUID,
  getService,
  getCharacteristic,
  getDescriptor,
} as const;
