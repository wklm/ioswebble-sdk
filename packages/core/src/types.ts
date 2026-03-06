export type Platform = 'safari-extension' | 'native' | 'unsupported';

export interface WebBLEOptions {
  /** Force a specific platform instead of auto-detecting */
  platform?: Platform;
}

export interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  optionalServices?: string[];
  acceptAllDevices?: boolean;
}

export type NotificationCallback = (value: DataView) => void;
