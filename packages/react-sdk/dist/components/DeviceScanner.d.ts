import React from 'react';
import type { BluetoothLEScanFilter } from '../types';
interface DeviceScannerProps {
    onDeviceSelected?: (device: BluetoothDevice) => void;
    filters?: BluetoothLEScanFilter[];
    className?: string;
    autoConnect?: boolean;
    showRssi?: boolean;
    sortByRssi?: boolean;
    maxDevices?: number;
    scanDuration?: number;
}
/**
 * DeviceScanner - Full-featured device scanner UI component
 */
export declare function DeviceScanner({ onDeviceSelected, filters, className, autoConnect, showRssi, sortByRssi, maxDevices, scanDuration }: DeviceScannerProps): React.JSX.Element;
export {};
