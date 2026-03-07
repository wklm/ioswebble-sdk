export { WebBLE } from './webble';
export { WebBLEDevice } from './device';
export { WebBLEError } from './errors';
export type { WebBLEErrorCode } from './errors';
export { resolveUUID, getServiceName, getCharacteristicName } from './uuid';
export { BluetoothUUID, canonicalUUID, getService, getCharacteristic, getDescriptor } from './bluetooth-uuid';
export { detectPlatform, getBluetoothAPI } from './platform';
export type { Platform, WebBLEOptions, RequestDeviceOptions, BluetoothLEScanFilter, NotificationCallback } from './types';
