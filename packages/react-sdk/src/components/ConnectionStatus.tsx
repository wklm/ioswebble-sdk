import React from 'react';
import type { WebBLEDevice } from '@ios-web-bluetooth/core';
import { useDevice } from '../hooks/useDevice';

interface ConnectionStatusProps {
  device?: WebBLEDevice | null;
  className?: string;
}

/**
 * ConnectionStatus - Connection status indicator component
 */
export function ConnectionStatus({ device = null, className }: ConnectionStatusProps) {
  const { connectionState } = useDevice(device);

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
    <div
      className={className}
      data-webble-status=""
      data-webble-state={connectionState}
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      <span
        data-webble-status-indicator=""
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: getStatusColor()
        }}
      />
      <span data-webble-status-label="">{connectionState}</span>
    </div>
  );
}
