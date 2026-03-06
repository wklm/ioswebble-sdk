import React, { useState, useCallback, useMemo } from 'react';
import { useScan } from '../hooks/useScan';
import { useConnection } from '../hooks/useConnection';
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

interface DeviceItemProps {
  device: BluetoothDevice;
  rssi?: number;
  onSelect: (device: BluetoothDevice) => void;
  isConnecting?: boolean;
  isConnected?: boolean;
}

function DeviceItem({ device, rssi, onSelect, isConnecting, isConnected }: DeviceItemProps) {
  const getRssiIndicator = useCallback((rssi?: number) => {
    if (!rssi) return '';
    if (rssi > -50) return '████';
    if (rssi > -60) return '███░';
    if (rssi > -70) return '██░░';
    if (rssi > -80) return '█░░░';
    return '░░░░';
  }, []);

  return (
    <li className="device-item">
      <button 
        onClick={() => onSelect(device)}
        disabled={isConnecting}
        className={`device-button ${isConnected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}
        aria-label={`Select ${device.name || 'Unknown Device'}`}
      >
        <div className="device-info">
          <span className="device-name">{device.name || 'Unknown Device'}</span>
          <span className="device-id">{device.id}</span>
        </div>
        {rssi && (
          <div className="device-rssi">
            <span className="rssi-value">{rssi} dBm</span>
            <span className="rssi-bars" aria-label={`Signal strength: ${rssi} dBm`}>
              {getRssiIndicator(rssi)}
            </span>
          </div>
        )}
        {isConnected && <span className="connection-status">Connected</span>}
        {isConnecting && <span className="connection-status">Connecting...</span>}
      </button>
    </li>
  );
}

/**
 * DeviceScanner - Full-featured device scanner UI component
 */
export function DeviceScanner({ 
  onDeviceSelected, 
  filters,
  className,
  autoConnect = false,
  showRssi = true,
  sortByRssi = true,
  maxDevices = 10,
  scanDuration
}: DeviceScannerProps) {
  const { scanState, devices, start, stop, error, clear } = useScan();
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  const [deviceRssi, setDeviceRssi] = useState<Map<string, number>>(new Map());
  const { connect, connectionState } = useConnection(selectedDevice?.id);

  const handleStartScan = useCallback(async () => {
    clear();
    setDeviceRssi(new Map());
    await start({ filters });
    
    if (scanDuration) {
      setTimeout(() => {
        stop();
      }, scanDuration);
    }
  }, [start, stop, clear, filters, scanDuration]);

  const handleDeviceSelect = useCallback(async (device: BluetoothDevice) => {
    setSelectedDevice(device);
    
    if (autoConnect) {
      await connect();
    }
    
    onDeviceSelected?.(device);
  }, [connect, autoConnect, onDeviceSelected]);

  const sortedDevices = useMemo(() => {
    let devicesArray = [...devices];
    
    if (sortByRssi && showRssi) {
      devicesArray = devicesArray.sort((a, b) => {
        const rssiA = deviceRssi.get(a.id) || -100;
        const rssiB = deviceRssi.get(b.id) || -100;
        return rssiB - rssiA;
      });
    }
    
    return devicesArray.slice(0, maxDevices);
  }, [devices, deviceRssi, sortByRssi, showRssi, maxDevices]);

  return (
    <div className={`device-scanner ${className || ''}`}>
      <div className="scanner-header">
        <h2>Bluetooth Device Scanner</h2>
        <div className="scanner-status">
          {scanState === 'scanning' && (
            <span className="status-indicator scanning">● Scanning</span>
          )}
          {scanState === 'idle' && devices.length > 0 && (
            <span className="status-indicator idle">Found {devices.length} device(s)</span>
          )}
        </div>
      </div>

      <div className="scanner-controls">
        {scanState === 'idle' && (
          <button 
            onClick={handleStartScan}
            className="scan-button start"
            aria-label="Start scanning for Bluetooth devices"
          >
            Start Scan
          </button>
        )}
        {scanState === 'scanning' && (
          <button 
            onClick={stop}
            className="scan-button stop"
            aria-label="Stop scanning"
          >
            Stop Scan
          </button>
        )}
        {scanState === 'idle' && devices.length > 0 && (
          <button 
            onClick={clear}
            className="scan-button clear"
            aria-label="Clear discovered devices"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="scanner-error" role="alert">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error.message}</span>
        </div>
      )}

      {sortedDevices.length > 0 && (
        <ul className="device-list" role="list">
          {sortedDevices.map(device => (
            <DeviceItem
              key={device.id}
              device={device}
              rssi={showRssi ? deviceRssi.get(device.id) : undefined}
              onSelect={handleDeviceSelect}
              isConnecting={selectedDevice?.id === device.id && connectionState === 'connecting'}
              isConnected={selectedDevice?.id === device.id && connectionState === 'connected'}
            />
          ))}
        </ul>
      )}

      {scanState === 'scanning' && devices.length === 0 && (
        <div className="scanner-empty">
          <div className="scanning-animation">
            <div className="pulse"></div>
            <div className="pulse"></div>
            <div className="pulse"></div>
          </div>
          <p>Searching for devices...</p>
        </div>
      )}

      {scanState === 'idle' && devices.length === 0 && !error && (
        <div className="scanner-empty">
          <p>No devices found. Click "Start Scan" to search for Bluetooth devices.</p>
        </div>
      )}
    </div>
  );
}

