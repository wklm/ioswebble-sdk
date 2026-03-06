/**
 * Heart Rate Monitor Example
 * 
 * A complete example demonstrating Web Bluetooth heart rate monitoring
 * with the @wklm/react SDK
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WebBLE } from '@wklm/react';
import './HeartRateMonitor.css';

interface HeartRateData {
  heartRate: number;
  contactDetected: boolean;
  energyExpended?: number;
  rrIntervals?: number[];
}

interface RecordedData {
  timestamp: number;
  heartRate: number;
  contactDetected: boolean;
}

export function HeartRateMonitor() {
  const { isAvailable, isExtensionInstalled, requestDevice } = WebBLE.useBluetooth();
  const [deviceId, setDeviceId] = useState<string>();
  const [error, setError] = useState<string>();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedData, setRecordedData] = useState<RecordedData[]>([]);
  
  const { device, isConnected, connect, disconnect, connectionState } = WebBLE.useDevice(deviceId || '');
  const { value, isSubscribed, subscribe, unsubscribe, history } = WebBLE.useNotifications(
    deviceId ? `${deviceId}/heart_rate/heart_rate_measurement` : ''
  );
  const { connectionQuality, reconnect } = WebBLE.useConnection(deviceId || '');

  // Parse heart rate data from DataView
  const heartRateData = useMemo<HeartRateData | null>(() => {
    if (!value || !(value instanceof DataView)) return null;

    const flags = value.getUint8(0);
    const heartRateValue16Bit = flags & 0x01;
    const contactDetected = Boolean(flags & 0x02);
    const contactSupported = Boolean(flags & 0x04);
    const energyExpendedPresent = Boolean(flags & 0x08);
    const rrIntervalPresent = Boolean(flags & 0x10);

    let offset = 1;
    let heartRate: number;

    if (heartRateValue16Bit) {
      heartRate = value.getUint16(offset, true);
      offset += 2;
    } else {
      heartRate = value.getUint8(offset);
      offset += 1;
    }

    let energyExpended: number | undefined;
    if (energyExpendedPresent) {
      energyExpended = value.getUint16(offset, true);
      offset += 2;
    }

    const rrIntervals: number[] = [];
    if (rrIntervalPresent) {
      while (offset + 1 < value.byteLength) {
        rrIntervals.push(value.getUint16(offset, true));
        offset += 2;
      }
    }

    return {
      heartRate,
      contactDetected: contactSupported ? contactDetected : true,
      energyExpended,
      rrIntervals: rrIntervals.length > 0 ? rrIntervals : undefined
    };
  }, [value]);

  // Handle device connection
  const handleConnect = async () => {
    setError(undefined);
    try {
      const selectedDevice = await requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service']
      });
      
      if (selectedDevice) {
        setDeviceId(selectedDevice.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  // Auto-connect and subscribe to notifications when device is set
  useEffect(() => {
    if (deviceId && !isConnected) {
      connect();
    }
  }, [deviceId, isConnected, connect]);

  useEffect(() => {
    if (isConnected && !isSubscribed) {
      subscribe();
    }
  }, [isConnected, isSubscribed, subscribe]);

  // Handle recording
  useEffect(() => {
    if (isRecording && heartRateData) {
      setRecordedData(prev => [...prev, {
        timestamp: Date.now(),
        heartRate: heartRateData.heartRate,
        contactDetected: heartRateData.contactDetected
      }]);
    }
  }, [isRecording, heartRateData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const values = history.map(h => {
      if (typeof h.value === 'number') return h.value;
      if (h.value instanceof DataView) {
        const flags = h.value.getUint8(0);
        const is16Bit = flags & 0x01;
        return is16Bit ? h.value.getUint16(1, true) : h.value.getUint8(1);
      }
      return 0;
    }).filter(v => v > 0);

    if (values.length === 0) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  }, [history]);

  // Export data as CSV
  const exportData = useCallback(() => {
    if (recordedData.length === 0) return;

    const csv = [
      'Timestamp,Heart Rate,Contact Detected',
      ...recordedData.map(d => 
        `${new Date(d.timestamp).toISOString()},${d.heartRate},${d.contactDetected}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heart-rate-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.textContent = 'Data exported';
    successDiv.style.display = 'none';
    document.body.appendChild(successDiv);
    setTimeout(() => document.body.removeChild(successDiv), 100);
  };

  // Check if Bluetooth is available
  if (!isAvailable) {
    return (
      <div className="heart-rate-monitor">
        <div className="error-message">
          <h2>Bluetooth not available</h2>
          <p>Your browser doesn't support Web Bluetooth.</p>
        </div>
      </div>
    );
  }

  // Check if extension is installed
  if (!isExtensionInstalled) {
    return (
      <div className="heart-rate-monitor">
        <div className="error-message">
          <h2>WebBLE extension not installed</h2>
          <p>Please install the WebBLE Safari Extension to use this feature.</p>
        </div>
      </div>
    );
  }

  // Connection states
  if (connectionState === 'connecting') {
    return (
      <div className="heart-rate-monitor">
        <div className="connecting">
          <div className="spinner" />
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="heart-rate-monitor">
        <div className="connect-prompt">
          <h1>Heart Rate Monitor</h1>
          {error && <div className="error">Connection failed: {error}</div>}
          <button
            onClick={handleConnect}
            className="connect-button"
            aria-label="Connect to Heart Rate Monitor"
          >
            Connect to Heart Rate Monitor
          </button>
        </div>
      </div>
    );
  }

  // Connected and showing data
  return (
    <div className="heart-rate-monitor connected">
      <header>
        <h1>{device?.name || 'Heart Rate Monitor'}</h1>
        <div className="connection-info">
          <div 
            data-testid="connection-quality" 
            className={`connection-quality quality-${connectionQuality}`}
          >
            <span className="quality-indicator" />
            <span className="quality-text">
              {connectionQuality === 'excellent' ? 'Excellent' :
               connectionQuality === 'good' ? 'Good' :
               connectionQuality === 'fair' ? 'Fair' : 'Poor'}
            </span>
          </div>
          {connectionQuality === 'poor' && (
            <button onClick={reconnect} className="reconnect-button">
              Improve Connection
            </button>
          )}
        </div>
      </header>

      <main>
        {heartRateData ? (
          <div className="heart-rate-display">
            <div className="current-reading">
              <div className="heart-rate-value">
                <span className="value" aria-live="polite" aria-atomic="true">
                  {heartRateData.heartRate}
                </span>
                <span className="unit">BPM</span>
              </div>
              <div 
                data-testid="contact-indicator"
                className={`contact-indicator ${heartRateData.contactDetected ? 'contact-detected' : 'no-contact'}`}
              />
            </div>
            
            {/* Screen reader announcement */}
            <div role="status" className="sr-only">
              Heart rate: {heartRateData.heartRate} beats per minute
            </div>

            {heartRateData.energyExpended !== undefined && (
              <div className="energy-expended">
                Energy: {heartRateData.energyExpended} kJ
              </div>
            )}
          </div>
        ) : (
          <div className="waiting-for-data">
            <p>Waiting for heart rate data...</p>
          </div>
        )}

        {history.length > 0 && (
          <div className="heart-rate-history">
            <h2>History</h2>
            <div data-testid="heart-rate-graph" className="graph">
              {/* Simple text-based graph for testing */}
              <div className="stats">
                {stats && (
                  <>
                    <span>Min: {Math.round(stats.min)}</span>
                    <span>Max: {Math.round(stats.max)}</span>
                    <span>Avg: {stats.avg.toFixed(1)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="controls">
          <button onClick={disconnect} className="disconnect-button">
            Disconnect
          </button>
          
          <button 
            onClick={() => setIsRecording(!isRecording)}
            className={`record-button ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          {isRecording && (
            <div data-testid="recording-indicator" className="recording-indicator">
              <span className="record-dot" />
              Recording
            </div>
          )}
          
          <button 
            onClick={exportData} 
            className="export-button"
            disabled={recordedData.length === 0}
          >
            Export Data
          </button>
        </div>
      </main>
    </div>
  );
}