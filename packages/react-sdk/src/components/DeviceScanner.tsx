import React, { useState, useCallback, useEffect } from 'react';
import type { WebBLEDevice } from '@ios-web-bluetooth/core';
import { useScan } from '../hooks/useScan';
import { useDevice } from '../hooks/useDevice';
import type { BluetoothLEScanFilter } from '../types';

interface DeviceScannerProps {
  onDeviceSelected?: (device: WebBLEDevice) => void;
  filters?: BluetoothLEScanFilter[];
  className?: string;
  showRssi?: boolean;
  sortByRssi?: boolean;
  maxDevices?: number;
  scanDuration?: number;
  autoConnect?: boolean;
}

interface DeviceItemProps {
  device: WebBLEDevice;
  onSelect: (device: WebBLEDevice) => void;
  isConnecting?: boolean;
  isConnected?: boolean;
}

function DeviceItem({ device, onSelect, isConnecting, isConnected }: DeviceItemProps) {
  return (
    <li className="device-item" data-webble-device="" data-webble-state={isConnected ? 'connected' : isConnecting ? 'connecting' : 'idle'}>
      <button
        onClick={() => onSelect(device)}
        disabled={isConnecting}
        className={`device-button ${isConnected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}
        aria-label={`Select ${device.name ?? 'Unknown Device'}`}
        data-webble-device-button=""
      >
        <div className="device-info" data-webble-device-info="">
          <span className="device-name" data-webble-device-name="">{device.name ?? 'Unknown Device'}</span>
          <span className="device-id" data-webble-device-id="">{device.id}</span>
        </div>
        {isConnected && <span className="connection-status" data-webble-device-status="">Connected</span>}
        {isConnecting && <span className="connection-status" data-webble-device-status="">Connecting...</span>}
      </button>
    </li>
  );
}

/**
 * DeviceScanner - Full-featured device scanner UI component
 */
export function DeviceScanner(props: DeviceScannerProps) {
  const {
    onDeviceSelected,
    filters,
    className,
    maxDevices = 10,
    scanDuration,
    autoConnect = false,
  } = props;

  const { scanState, devices, start, stop, error, clear } = useScan();
  const [selectedDevice, setSelectedDevice] = useState<WebBLEDevice | null>(null);
  const [pendingAutoConnect, setPendingAutoConnect] = useState(false);
  const { connectionState, connect } = useDevice(selectedDevice);

  const handleStartScan = useCallback(async () => {
    clear();
    await start({ filters });

    if (scanDuration) {
      setTimeout(() => {
        stop();
      }, scanDuration);
    }
  }, [start, stop, clear, filters, scanDuration]);

  const handleDeviceSelect = useCallback((device: WebBLEDevice) => {
    setSelectedDevice(device);
    onDeviceSelected?.(device);
    if (autoConnect) {
      setPendingAutoConnect(true);
    }
  }, [autoConnect, onDeviceSelected]);

  // Deferred auto-connect: waits for useDevice to resolve the new device
  useEffect(() => {
    if (pendingAutoConnect && connectionState === 'disconnected') {
      setPendingAutoConnect(false);
      void connect();
    }
  }, [pendingAutoConnect, connectionState, connect]);

  const visibleDevices = devices.slice(0, maxDevices);

  return (
    <div className={`device-scanner ${className || ''}`} data-webble-scanner="" data-webble-state={scanState}>
      <div className="scanner-header" data-webble-scanner-header="">
        <h2>Bluetooth Device Scanner</h2>
        <div className="scanner-status" data-webble-scanner-status="">
          {scanState === 'scanning' && (
            <span className="status-indicator scanning">● Scanning</span>
          )}
          {scanState === 'idle' && devices.length > 0 && (
            <span className="status-indicator idle">Found {devices.length} device(s)</span>
          )}
        </div>
      </div>

      <div className="scanner-controls" data-webble-scanner-controls="">
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
        <div className="scanner-error" role="alert" data-webble-scanner-error="">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error.message}</span>
        </div>
      )}

      {visibleDevices.length > 0 && (
        <ul className="device-list" role="list" data-webble-device-list="">
          {visibleDevices.map(device => (
            <DeviceItem
              key={device.id}
              device={device}
              onSelect={handleDeviceSelect}
              isConnecting={selectedDevice?.id === device.id && connectionState === 'connecting'}
              isConnected={selectedDevice?.id === device.id && connectionState === 'connected'}
            />
          ))}
        </ul>
      )}

      {scanState === 'scanning' && devices.length === 0 && (
        <div className="scanner-empty" data-webble-scanner-empty="">
          <div className="scanning-animation" data-webble-scanner-animation="">
            <div className="pulse"></div>
            <div className="pulse"></div>
            <div className="pulse"></div>
          </div>
          <p>Searching for devices...</p>
        </div>
      )}

      {scanState === 'idle' && devices.length === 0 && !error && (
        <div className="scanner-empty" data-webble-scanner-empty="">
          <p>No devices found. Click "Start Scan" to search for Bluetooth devices.</p>
        </div>
      )}
    </div>
  );
}
