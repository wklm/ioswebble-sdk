export type Platform = 'safari-extension' | 'native' | 'unsupported';

export interface WebBLEOptions {
  /** Force a specific platform instead of auto-detecting */
  platform?: Platform;
}

export interface BluetoothLEScanFilter {
  services?: string[];
  name?: string;
  namePrefix?: string;
}

export interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  exclusionFilters?: BluetoothLEScanFilter[];
  optionalServices?: string[];
  optionalManufacturerData?: number[];
  acceptAllDevices?: boolean;
}

export type NotificationCallback = (value: DataView) => void;
