/**
 * @ios-web-bluetooth/react - Production-grade Web Bluetooth SDK for React
 * 
 * One-line integration for Web Bluetooth in React applications
 * with full Safari support through the WebBLE extension.
 */

// Core exports
export { WebBLEProvider, useWebBLE } from './core/WebBLEProvider';
export { WebBLEClient } from './core/WebBLEClient';
export { ExtensionDetector } from './core/ExtensionDetector';

// Hook exports
export { useBluetooth } from './hooks/useBluetooth';
export { useDevice } from './hooks/useDevice';
export { useCharacteristic } from './hooks/useCharacteristic';
export { useNotifications } from './hooks/useNotifications';
export { useScan } from './hooks/useScan';
export { useConnection } from './hooks/useConnection';
export { useProfile } from './hooks/useProfile';

// Component exports
export { DeviceScanner } from './components/DeviceScanner';
export { ServiceExplorer } from './components/ServiceExplorer';
export { ConnectionStatus } from './components/ConnectionStatus';
export { InstallationWizard } from './components/InstallationWizard';

// Type exports
export type {
  WebBLEConfig,
  BluetoothDeviceInfo,
  GATTServiceInfo,
  GATTCharacteristicInfo,
  ConnectionState,
  ScanState,
  NotificationHandler
} from './types';

// Utility exports
export { 
  getServiceName,
  getCharacteristicName,
  parseValue,
  formatValue
} from './utils/bluetooth-utils';

// Main namespace export for convenient access
import { WebBLEProvider, useWebBLE } from './core/WebBLEProvider';
import { useBluetooth } from './hooks/useBluetooth';
import { DeviceScanner } from './components/DeviceScanner';

export const WebBLE = {
  Provider: WebBLEProvider,
  useWebBLE,
  useBluetooth,
  DeviceScanner
};

// Default export for simple import
export default WebBLE;