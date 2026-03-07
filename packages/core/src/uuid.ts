const BASE_SUFFIX = '-0000-1000-8000-00805f9b34fb';

// Bluetooth SIG assigned service UUIDs (16-bit)
const SERVICES: Record<string, number> = {
  generic_access: 0x1800,
  gap: 0x1800,
  generic_attribute: 0x1801,
  gatt: 0x1801,
  device_information: 0x180A,
  battery_service: 0x180F,
  heart_rate: 0x180D,
  health_thermometer: 0x1809,
  glucose: 0x1808,
  blood_pressure: 0x1810,
  running_speed_and_cadence: 0x1814,
  cycling_speed_and_cadence: 0x1816,
  cycling_power: 0x1818,
  location_and_navigation: 0x1819,
  environmental_sensing: 0x181A,
  body_composition: 0x181B,
  user_data: 0x181C,
  weight_scale: 0x181D,
  bond_management: 0x181E,
  continuous_glucose_monitoring: 0x181F,
  internet_protocol_support: 0x1820,
  indoor_positioning: 0x1821,
  pulse_oximeter: 0x1822,
  http_proxy: 0x1823,
  transport_discovery: 0x1824,
  object_transfer: 0x1825,
  fitness_machine: 0x1826,
  mesh_provisioning: 0x1827,
  mesh_proxy: 0x1828,
  reconnection_configuration: 0x1829,
  insulin_delivery: 0x183A,
  binary_sensor: 0x183B,
  emergency_configuration: 0x183C,
  physical_activity_monitor: 0x183E,
  audio_input_control: 0x1843,
  volume_control: 0x1844,
  volume_offset_control: 0x1845,
  coordinated_set_identification: 0x1846,
  device_time: 0x1847,
  media_control: 0x1848,
  generic_media_control: 0x1849,
  constant_tone_extension: 0x184A,
  telephone_bearer: 0x184B,
  generic_telephone_bearer: 0x184C,
  microphone_control: 0x184D,
};

// Bluetooth SIG assigned characteristic UUIDs (16-bit)
const CHARACTERISTICS: Record<string, number> = {
  device_name: 0x2A00,
  appearance: 0x2A01,
  peripheral_privacy_flag: 0x2A02,
  reconnection_address: 0x2A03,
  peripheral_preferred_connection_parameters: 0x2A04,
  service_changed: 0x2A05,
  system_id: 0x2A23,
  model_number_string: 0x2A24,
  serial_number_string: 0x2A25,
  firmware_revision_string: 0x2A26,
  hardware_revision_string: 0x2A27,
  software_revision_string: 0x2A28,
  manufacturer_name_string: 0x2A29,
  battery_level: 0x2A19,
  heart_rate_measurement: 0x2A37,
  body_sensor_location: 0x2A38,
  heart_rate_control_point: 0x2A39,
};

function hexToUUID(hex: number): string {
  return hex.toString(16).padStart(8, '0') + BASE_SUFFIX;
}

// Reverse maps for name lookups (built lazily)
let serviceNameMap: Map<string, string> | undefined;
let charNameMap: Map<string, string> | undefined;

function getServiceNameMap(): Map<string, string> {
  if (!serviceNameMap) {
    serviceNameMap = new Map();
    for (const [name, hex] of Object.entries(SERVICES)) {
      serviceNameMap.set(hexToUUID(hex), name);
    }
  }
  return serviceNameMap;
}

function getCharNameMap(): Map<string, string> {
  if (!charNameMap) {
    charNameMap = new Map();
    for (const [name, hex] of Object.entries(CHARACTERISTICS)) {
      charNameMap.set(hexToUUID(hex), name);
    }
  }
  return charNameMap;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX4_RE = /^[0-9a-f]{4}$/;
const HEX8_RE = /^[0-9a-f]{8}$/;

/**
 * Resolve a service/characteristic name, number, or short UUID to a full 128-bit UUID string.
 * Accepts: named alias ("heart_rate"), 16/32-bit integer (0x180D), 4-hex ("180d"),
 * 8-hex ("0000180d"), or full UUID.
 *
 * @example
 * ```typescript
 * resolveUUID('heart_rate')      // '0000180d-0000-1000-8000-00805f9b34fb'
 * resolveUUID('180d')            // '0000180d-0000-1000-8000-00805f9b34fb'
 * resolveUUID(0x180D)            // '0000180d-0000-1000-8000-00805f9b34fb'
 * resolveUUID('battery_level')   // '00002a19-0000-1000-8000-00805f9b34fb'
 * ```
 */
export function resolveUUID(nameOrUUID: string | number): string {
  // Numeric input: 16-bit or 32-bit Bluetooth UUID integer
  if (typeof nameOrUUID === 'number') {
    if (!Number.isInteger(nameOrUUID) || nameOrUUID < 0 || nameOrUUID > 0xFFFFFFFF) {
      throw new TypeError(`Invalid UUID integer: ${nameOrUUID}. Must be a 16-bit or 32-bit unsigned integer.`);
    }
    return hexToUUID(nameOrUUID);
  }

  const lower = nameOrUUID.toLowerCase();

  // Full 128-bit UUID
  if (UUID_RE.test(lower)) return lower;

  // 4-digit hex shorthand
  if (HEX4_RE.test(lower)) return '0000' + lower + BASE_SUFFIX;

  // 8-digit hex shorthand
  if (HEX8_RE.test(lower)) return lower + BASE_SUFFIX;

  // Named service
  const serviceHex = SERVICES[lower];
  if (serviceHex !== undefined) return hexToUUID(serviceHex);

  // Named characteristic
  const charHex = CHARACTERISTICS[lower];
  if (charHex !== undefined) return hexToUUID(charHex);

  // Pass through as-is (custom UUID)
  return lower;
}

/** Get the human-readable service name for a UUID, if known. */
export function getServiceName(uuid: string): string | undefined {
  return getServiceNameMap().get(uuid.toLowerCase());
}

/** Get the human-readable characteristic name for a UUID, if known. */
export function getCharacteristicName(uuid: string): string | undefined {
  return getCharNameMap().get(uuid.toLowerCase());
}
