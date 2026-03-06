import React from 'react';
import { useConnection } from '../hooks/useConnection';

interface ConnectionStatusProps {
  deviceId?: string;
  className?: string;
}

/**
 * ConnectionStatus - Connection status indicator component
 */
export function ConnectionStatus({ deviceId, className }: ConnectionStatusProps) {
  const { connectionState, rssi } = useConnection(deviceId);

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'green';
      case 'connecting': return 'orange';
      case 'disconnecting': return 'orange';
      case 'disconnected': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span 
        style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: getStatusColor() 
        }}
      />
      <span>{connectionState}</span>
      {rssi !== null && rssi !== undefined && <span>({rssi} dBm)</span>}
    </div>
  );
}