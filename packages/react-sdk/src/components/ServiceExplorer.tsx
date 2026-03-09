import React, { useState, useCallback, useEffect } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useCharacteristic } from '../hooks/useCharacteristic';
import { getServiceName, getCharacteristicName } from '../utils/bluetooth-utils';

interface ServiceExplorerProps {
  device?: BluetoothDevice | null;
  className?: string;
  autoConnect?: boolean;
  onCharacteristicSelect?: (characteristicId: string) => void;
  expandedByDefault?: boolean;
}

interface CharacteristicItemProps {
  characteristic: BluetoothRemoteGATTCharacteristic;
  service: BluetoothRemoteGATTService;
  onSelect?: (characteristicId: string) => void;
}

interface ServiceItemProps {
  service: BluetoothRemoteGATTService;
  isExpanded: boolean;
  onToggle: () => void;
  onCharacteristicSelect?: (characteristicId: string) => void;
}

function CharacteristicItem({ characteristic, service, onSelect }: CharacteristicItemProps) {
  const { value, read, write, subscribe, unsubscribe, isNotifying, error } = useCharacteristic(characteristic, service);
  const [inputValue, setInputValue] = useState('');
  const [showValue, setShowValue] = useState(false);

  const handleRead = useCallback(async () => {
    await read();
    setShowValue(true);
  }, [read]);

  const handleWrite = useCallback(async () => {
    if (inputValue) {
      const encoder = new TextEncoder();
      const data = encoder.encode(inputValue);
      await write(data);
      setInputValue('');
    }
  }, [write, inputValue]);

  const handleNotifications = useCallback(async () => {
    if (isNotifying) {
      await unsubscribe();
    } else {
      await subscribe((_event: any) => {
        // Notification handler is managed by the hook
      });
    }
  }, [isNotifying, subscribe, unsubscribe]);

  const formatValue = useCallback((value: DataView | null) => {
    if (!value) return 'No data';
    
    const bytes = Array.from(new Uint8Array(value.buffer));
    const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const text = new TextDecoder().decode(value);
    
    return {
      hex,
      text: text.replace(/[\x00-\x1F\x7F-\x9F]/g, '.'),
      bytes: bytes.length
    };
  }, []);

  const characteristicName = getCharacteristicName(characteristic.uuid);
  const properties = characteristic.properties;

  return (
    <li className="characteristic-item">
      <div className="characteristic-header">
        <button 
          className="characteristic-name"
          onClick={() => onSelect?.(characteristic.uuid)}
          aria-label={`Select characteristic ${characteristicName}`}
        >
          {characteristicName}
        </button>
        <div className="characteristic-properties">
          {properties?.read && <span className="property read">R</span>}
          {properties?.write && <span className="property write">W</span>}
          {properties?.writeWithoutResponse && <span className="property write-no-response">WNR</span>}
          {properties?.notify && <span className="property notify">N</span>}
          {properties?.indicate && <span className="property indicate">I</span>}
        </div>
      </div>

      <div className="characteristic-controls">
        {properties?.read && (
          <button onClick={handleRead} className="control-button read">
            Read
          </button>
        )}
        
        {properties?.write && (
          <div className="write-control">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter value to write"
              className="write-input"
            />
            <button onClick={handleWrite} className="control-button write">
              Write
            </button>
          </div>
        )}
        
        {properties?.notify && (
          <button onClick={handleNotifications} className="control-button notify">
            {isNotifying ? 'Stop Notify' : 'Start Notify'}
          </button>
        )}
      </div>

      {showValue && value && (() => {
        const formatted = formatValue(value);
        if (typeof formatted === 'string') {
          return (
            <div className="characteristic-value">
              <div>{formatted}</div>
            </div>
          );
        }
        return (
          <div className="characteristic-value">
            <div>Value ({formatted.bytes} bytes):</div>
            <div className="value-hex">Hex: {formatted.hex}</div>
            <div className="value-text">Text: {formatted.text}</div>
          </div>
        );
      })()}

      {error && (
        <div className="characteristic-error" role="alert">
          Error: {error.message}
        </div>
      )}
    </li>
  );
}

function ServiceItem({ service, isExpanded, onToggle, onCharacteristicSelect }: ServiceItemProps) {
  const serviceName = getServiceName(service.uuid);
  const [characteristics, setCharacteristics] = useState<BluetoothRemoteGATTCharacteristic[]>([]);
  const [loadingChars, setLoadingChars] = useState(false);
  
  useEffect(() => {
    if (isExpanded && characteristics.length === 0 && !loadingChars) {
      setLoadingChars(true);
      service.getCharacteristics()
        .then(chars => {
          setCharacteristics(chars);
          setLoadingChars(false);
        })
        .catch(err => {
          console.error('Failed to get characteristics:', err);
          setLoadingChars(false);
        });
    }
  }, [isExpanded, service, characteristics.length, loadingChars]);
  
  return (
    <li className="service-item">
      <button 
        className="service-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${serviceName}`}
      >
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="service-name">{serviceName}</span>
        <span className="service-type">{service.isPrimary ? 'Primary' : 'Secondary'}</span>
      </button>
      
      {isExpanded && loadingChars && (
        <div className="loading-chars">Loading characteristics...</div>
      )}
      
      {isExpanded && !loadingChars && characteristics.length > 0 && (
        <ul className="characteristics-list">
          {characteristics.map(char => (
            <CharacteristicItem
              key={char.uuid}
              characteristic={char}
              service={service}
              onSelect={onCharacteristicSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * ServiceExplorer - GATT hierarchy viewer component
 */
export function ServiceExplorer({
  device: inputDevice,
  className,
  autoConnect = false,
  onCharacteristicSelect,
  expandedByDefault = false
}: ServiceExplorerProps) {
  const { device, services, connect, disconnect, isConnected, isConnecting, error } = useDevice(inputDevice ?? null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting && device) {
      connect();
    }
  }, [autoConnect, isConnected, isConnecting, connect, device]);

  useEffect(() => {
    if (expandedByDefault && services.length > 0) {
      setExpandedServices(new Set(services.map(s => s.uuid)));
    }
  }, [expandedByDefault, services]);

  const toggleService = useCallback((serviceId: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }, []);

  const connectionState = isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected';

  if (!device) {
    return (
      <div className={`service-explorer ${className || ''}`}>
        <div className="explorer-empty">No device selected</div>
      </div>
    );
  }

  return (
    <div className={`service-explorer ${className || ''}`}>
      <div className="explorer-header">
        <h2>Service Explorer</h2>
        {device && (
          <div className="device-info">
            <span className="device-name">{device.name || 'Unknown Device'}</span>
            <span className={`connection-status ${connectionState}`}>
              {connectionState}
            </span>
          </div>
        )}
      </div>

      <div className="explorer-controls">
        {!isConnected && !isConnecting && (
          <button onClick={connect} className="connection-button connect">
            Connect to Device
          </button>
        )}
        {isConnected && (
          <button onClick={disconnect} className="connection-button disconnect">
            Disconnect
          </button>
        )}
        {isConnecting && (
          <button disabled className="connection-button connecting">
            Connecting...
          </button>
        )}
      </div>

      {error && (
        <div className="explorer-error" role="alert">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error.message}</span>
        </div>
      )}

      {isConnected && services.length === 0 && (
        <div className="explorer-empty">
          <p>Discovering services...</p>
        </div>
      )}

      {isConnected && services.length > 0 && (
        <div className="services-container">
          <div className="services-summary">
            Found {services.length} service(s)
          </div>
          <ul className="services-list" role="tree">
            {services.map(service => (
              <ServiceItem
                key={service.uuid}
                service={service}
                isExpanded={expandedServices.has(service.uuid)}
                onToggle={() => toggleService(service.uuid)}
                onCharacteristicSelect={onCharacteristicSelect}
              />
            ))}
          </ul>
        </div>
      )}

      {!isConnected && !isConnecting && !autoConnect && (
        <div className="explorer-empty">
          <p>Connect to the device to explore its services and characteristics.</p>
        </div>
      )}
    </div>
  );
}