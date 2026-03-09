/**
 * Bluetooth utility functions for the React SDK
 */

// Standard GATT service names (canonical lowercase UUIDs)
const STANDARD_SERVICES: Record<string, string> = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
  '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
  '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate',
  '00001805-0000-1000-8000-00805f9b34fb': 'Current Time',
  '00001812-0000-1000-8000-00805f9b34fb': 'Human Interface Device',
  '00001802-0000-1000-8000-00805f9b34fb': 'Immediate Alert',
  '00001803-0000-1000-8000-00805f9b34fb': 'Link Loss',
  '00001804-0000-1000-8000-00805f9b34fb': 'Tx Power',
  '00001809-0000-1000-8000-00805f9b34fb': 'Health Thermometer',
  '0000181c-0000-1000-8000-00805f9b34fb': 'User Data',
  '0000181d-0000-1000-8000-00805f9b34fb': 'Weight Scale'
};

// Standard GATT characteristic names (canonical lowercase UUIDs)
const STANDARD_CHARACTERISTICS: Record<string, string> = {
  '00002a00-0000-1000-8000-00805f9b34fb': 'Device Name',
  '00002a01-0000-1000-8000-00805f9b34fb': 'Appearance',
  '00002a04-0000-1000-8000-00805f9b34fb': 'Peripheral Preferred Connection Parameters',
  '00002a05-0000-1000-8000-00805f9b34fb': 'Service Changed',
  '00002a19-0000-1000-8000-00805f9b34fb': 'Battery Level',
  '00002a37-0000-1000-8000-00805f9b34fb': 'Heart Rate Measurement',
  '00002a38-0000-1000-8000-00805f9b34fb': 'Body Sensor Location',
  '00002a39-0000-1000-8000-00805f9b34fb': 'Heart Rate Control Point',
  '00002a29-0000-1000-8000-00805f9b34fb': 'Manufacturer Name String',
  '00002a24-0000-1000-8000-00805f9b34fb': 'Model Number String',
  '00002a25-0000-1000-8000-00805f9b34fb': 'Serial Number String',
  '00002a26-0000-1000-8000-00805f9b34fb': 'Firmware Revision String',
  '00002a27-0000-1000-8000-00805f9b34fb': 'Hardware Revision String',
  '00002a28-0000-1000-8000-00805f9b34fb': 'Software Revision String',
  '00002a50-0000-1000-8000-00805f9b34fb': 'PnP ID'
};

/**
 * Get the human-readable name for a service UUID.
 * Accepts short-form (0X1800), hex (1800), or canonical UUIDs.
 */
export function getServiceName(uuid: string): string {
  return STANDARD_SERVICES[canonicalUUID(uuid)] || uuid;
}

/**
 * Get the human-readable name for a characteristic UUID.
 * Accepts short-form (0X2A37), hex (2a37), or canonical UUIDs.
 */
export function getCharacteristicName(uuid: string): string {
  return STANDARD_CHARACTERISTICS[canonicalUUID(uuid)] || uuid;
}

/**
 * Parse a DataView value based on the characteristic UUID
 */
export function parseValue(value: DataView, uuid: string): any {
  const normalized = uuid.toUpperCase();
  
  switch (normalized) {
    case '0X2A19': // Battery Level (handle both 0x and 0X)
      return value.getUint8(0);
      
    case '0X2A37': // Heart Rate Measurement
      const flags = value.getUint8(0);
      const is16Bit = flags & 0x01;
      const heartRate = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
      return heartRate;
      
    case '0X2A00': // Device Name (handle both 0x and 0X)
    case '0X2A29': // Manufacturer Name
    case '0X2A24': // Model Number
    case '0X2A25': // Serial Number
    case '0X2A26': // Firmware Revision
    case '0X2A27': // Hardware Revision
    case '0X2A28': // Software Revision
      return new TextDecoder().decode(value.buffer);
      
    default:
      // Return hex string for unknown characteristics
      return Array.from(new Uint8Array(value.buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
  }
}

/**
 * Format a value for writing to a characteristic
 */
export function formatValue(value: any, uuid: string): ArrayBuffer {
  const normalized = uuid.toUpperCase();
  
  switch (normalized) {
    case '0X2A19': // Battery Level (handle both 0x and 0X)
      const batteryBuffer = new ArrayBuffer(1);
      const batteryView = new DataView(batteryBuffer);
      batteryView.setUint8(0, value);
      return batteryBuffer;
      
    case '0X2A00': // Device Name (and other string characteristics) - handle both 0x and 0X
    case '0X2A29':
    case '0X2A24':
    case '0X2A25':
    case '0X2A26':
    case '0X2A27':
    case '0X2A28':
      return new TextEncoder().encode(value).buffer;
      
    default:
      // Assume value is already an ArrayBuffer or can be converted
      if (value instanceof ArrayBuffer) {
        return value;
      }
      if (value instanceof Uint8Array) {
        return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
      }
      if (typeof value === 'string') {
        // Parse hex string
        const bytes = value.split(/\s+/).map(b => parseInt(b, 16));
        return new Uint8Array(bytes).buffer;
      }
      if (typeof value === 'number') {
        // For generic numeric values, store as uint8
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, value);
        return buffer;
      }
      throw new Error(`Cannot format value for characteristic ${uuid}`);
  }
}

/**
 * Convert a UUID to its canonical form
 */
export function canonicalUUID(uuid: string | number): string {
  if (typeof uuid === 'number') {
    uuid = uuid.toString(16);
  }

  uuid = uuid.toLowerCase();

  // Strip 0x prefix (e.g. '0x1800' → '1800')
  if (uuid.startsWith('0x')) {
    uuid = uuid.slice(2);
  }

  // If it's a 4-character UUID, expand it
  if (uuid.length === 4) {
    uuid = `0000${uuid}-0000-1000-8000-00805f9b34fb`;
  }

  // If it's an 8-character UUID, expand it
  if (uuid.length === 8) {
    uuid = `${uuid}-0000-1000-8000-00805f9b34fb`;
  }

  return uuid;
}

/**
 * Check if a device name matches a filter
 */
export function matchesNameFilter(
  deviceName: string | undefined,
  filter: { name?: string; namePrefix?: string }
): boolean {
  if (!deviceName) return false;
  
  if (filter.name) {
    return deviceName === filter.name;
  }
  
  if (filter.namePrefix) {
    return deviceName.startsWith(filter.namePrefix);
  }
  
  return true;
}

/**
 * Calculate distance from RSSI (rough estimation)
 */
export function calculateDistance(rssi: number, txPower: number = -59): number {
  // Using path-loss formula: Distance = 10^((Measured Power - RSSI) / (10 * N))
  // N is the path loss exponent (2 for free space)
  const pathLossExponent = 2;
  const distance = Math.pow(10, (txPower - rssi) / (10 * pathLossExponent));
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  
  return `${value.toFixed(2)} ${sizes[i]}`;
}

/**
 * Debounce function for event handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}