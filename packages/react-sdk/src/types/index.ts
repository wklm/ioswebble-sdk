/**
 * Type definitions for @ios-web-bluetooth/react SDK
 */

// Configuration types
export interface WebBLEConfig {
  autoConnect?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
  enableLogging?: boolean;
  scanTimeout?: number;
  /** API key from ioswebble.com (wbl_xxxxx) — enables install prompt on iOS Safari */
  apiKey?: string;
  /** Operator/app name shown in the install prompt (e.g. "FitTracker") */
  operatorName?: string;
  /** App Store URL override (defaults to iOSWebBLE listing) */
  appStoreUrl?: string;
}

// Device types
export interface BluetoothDeviceInfo {
  id: string;
  name?: string;
  connected: boolean;
  rssi?: number;
  txPower?: number;
  manufacturerData?: Map<number, DataView>;
  serviceData?: Map<string, DataView>;
  uuids?: string[];
  gatt?: BluetoothRemoteGATTServer;
}

// GATT types
export interface GATTServiceInfo {
  uuid: string;
  isPrimary: boolean;
  device: BluetoothDeviceInfo;
  characteristics?: GATTCharacteristicInfo[];
}

export interface GATTCharacteristicInfo {
  uuid: string;
  properties: CharacteristicProperties;
  value?: DataView;
  service: GATTServiceInfo;
  descriptors?: GATTDescriptorInfo[];
}

export interface GATTDescriptorInfo {
  uuid: string;
  value?: DataView;
  characteristic: GATTCharacteristicInfo;
}

export interface CharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

// Connection types
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

export interface ConnectionOptions {
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

// Scan types
export type ScanState = 'idle' | 'scanning' | 'stopped';

export interface ScanOptions {
  filters?: BluetoothLEScanFilter[];
  keepRepeatedDevices?: boolean;
  acceptAllAdvertisements?: boolean;
  timeout?: number;
}

export interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
  manufacturerData?: ManufacturerDataFilter[];
  serviceData?: ServiceDataFilter[];
}

export interface ManufacturerDataFilter {
  companyIdentifier: number;
  dataPrefix?: BufferSource;
  mask?: BufferSource;
}

export interface ServiceDataFilter {
  service: BluetoothServiceUUID;
  dataPrefix?: BufferSource;
  mask?: BufferSource;
}

export type BluetoothServiceUUID = number | string;

// Event types
export type NotificationHandler = (value: DataView) => void;

export interface BluetoothAdvertisingEvent {
  device: BluetoothDevice;
  uuids: string[];
  manufacturerData: Map<number, DataView>;
  serviceData: Map<string, DataView>;
  rssi: number;
  txPower: number;
}

// Error types — re-exported from @ios-web-bluetooth/core for compatibility
// Users who don't install @ios-web-bluetooth/core get this lightweight version
export { WebBLEError } from './compat-error';

// Hook return types
export interface UseBluetoothReturn {
  isAvailable: boolean;
  isExtensionInstalled: boolean;
  isSupported: boolean;
  requestDevice: (options?: RequestDeviceOptions) => Promise<BluetoothDevice | null>;
  getDevices: () => Promise<BluetoothDevice[]>;
  error: Error | null;
}

export interface UseDeviceReturn {
  device: BluetoothDevice | null;
  connectionState: ConnectionState;
  connect: (options?: ConnectionOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  services: GATTServiceInfo[];
  error: Error | null;
}

export interface UseCharacteristicReturn {
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  value: DataView | null;
  properties: CharacteristicProperties | null;
  read: () => Promise<DataView | null>;
  write: (value: BufferSource) => Promise<void>;
  subscribe: (handler: NotificationHandler) => Promise<void>;
  unsubscribe: () => Promise<void>;
  error: Error | null;
}

export interface UseNotificationsReturn {
  isSubscribed: boolean;
  value: DataView | null;
  history: NotificationEntry[];
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  clear: () => void;
  error: Error | null;
}

export interface NotificationEntry {
  timestamp: Date;
  value: DataView;
}

export interface UseScanReturn {
  scanState: ScanState;
  devices: BluetoothDevice[];
  start: (options?: ScanOptions) => Promise<void>;
  stop: () => void;
  clear: () => void;
  error: Error | null;
  setError?: (error: Error | null) => void;
}

export interface UseConnectionReturn {
  connectionState: ConnectionState;
  rssi: number | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getConnectionParameters: () => Promise<ConnectionParameters | null>;
  requestConnectionPriority: (priority: ConnectionPriority) => Promise<void>;
  error: Error | null;
  setConnectionState?: (state: ConnectionState) => void;
  setAutoReconnect?: (value: boolean) => void;
  startRssiMonitoring?: () => Promise<void>;
  stopRssiMonitoring?: () => void;
  autoReconnect?: boolean;
}

export interface ConnectionParameters {
  connectionInterval: number;
  slaveLatency: number;
  supervisionTimeout: number;
}

export type ConnectionPriority = 'balanced' | 'high' | 'low-power';

// Request types
export interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  exclusionFilters?: BluetoothLEScanFilter[];
  optionalServices?: BluetoothServiceUUID[];
  optionalManufacturerData?: number[];
  acceptAllDevices?: boolean;
}

// Utility types
export type ValueParser<T = any> = (value: DataView) => T;
export type ValueFormatter<T = any> = (value: T) => BufferSource;