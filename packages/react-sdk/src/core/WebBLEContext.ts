import { createContext } from 'react';
import type { RequestDeviceOptions, WebBLE, WebBLEDevice, WebBLEError } from '@ios-web-bluetooth/core';
import type { ExtensionInstallState } from './ExtensionDetector';

export interface WebBLEContextValue {
  isAvailable: boolean;
  isExtensionInstalled: boolean;
  extensionInstallState: ExtensionInstallState;
  isLoading: boolean;
  isScanning: boolean;
  devices: WebBLEDevice[];
  error: WebBLEError | null;
  core: WebBLE;
  requestDevice: (options?: RequestDeviceOptions) => Promise<WebBLEDevice | null>;
  getDevices: () => Promise<WebBLEDevice[]>;
  requestLEScan: (options?: BluetoothLEScanOptions) => Promise<BluetoothLEScan | null>;
  stopScan: () => void;
}

export const WebBLEContext = createContext<WebBLEContextValue | null>(null);
