import { useState, useCallback, useEffect, useRef } from 'react';
import type { NotificationHandler, CharacteristicProperties } from '../types';

export interface UseCharacteristicReturn {
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  value: DataView | null;
  properties: CharacteristicProperties | null;
  read: () => Promise<DataView | null>;
  write: (value: BufferSource) => Promise<void>;
  writeWithoutResponse: (value: BufferSource) => Promise<void>;
  subscribe: (handler: NotificationHandler) => Promise<void>;
  unsubscribe: () => Promise<void>;
  isNotifying: boolean;
  getDescriptor: (uuid: string) => Promise<BluetoothRemoteGATTDescriptor | null>;
  getDescriptors: () => Promise<BluetoothRemoteGATTDescriptor[]>;
  error: Error | null;
}

/**
 * useCharacteristic - Hook for managing a GATT characteristic
 * 
 * @param characteristic - The BluetoothRemoteGATTCharacteristic instance
 * @param service - The parent BluetoothRemoteGATTService 
 * @param device - The parent BluetoothDevice
 * @returns Characteristic state and control methods
 */
export function useCharacteristic(
  characteristic?: BluetoothRemoteGATTCharacteristic | null,
  service?: BluetoothRemoteGATTService | null,
  device?: BluetoothDevice | null
): UseCharacteristicReturn {
  const [value, setValue] = useState<DataView | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  
  const notificationHandlerRef = useRef<NotificationHandler | null>(null);
  const eventHandlerRef = useRef<((event: any) => void) | null>(null);

  // Extract properties from characteristic
  const properties = characteristic?.properties || null;

  // Read characteristic value
  const read = useCallback(async (): Promise<DataView | null> => {
    if (!characteristic) {
      setError(new Error('No characteristic available'));
      return null;
    }

    if (!properties?.read) {
      setError(new Error('Characteristic does not support read'));
      return null;
    }

    try {
      setError(null);
      const readValue = await characteristic.readValue();
      setValue(readValue);
      return readValue;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [characteristic, properties]);

  // Write characteristic value
  const write = useCallback(async (value: BufferSource): Promise<void> => {
    if (!characteristic) {
      setError(new Error('No characteristic available'));
      return;
    }

    if (!properties?.write && !properties?.writeWithoutResponse) {
      setError(new Error('Characteristic does not support write'));
      return;
    }

    try {
      setError(null);
      if (properties?.write) {
        await characteristic.writeValue(value);
      } else if (properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(value);
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [characteristic, properties]);

  // Write without response
  const writeWithoutResponse = useCallback(async (value: BufferSource): Promise<void> => {
    if (!characteristic) {
      setError(new Error('No characteristic available'));
      return;
    }

    if (!properties?.writeWithoutResponse) {
      setError(new Error('Characteristic does not support write without response'));
      return;
    }

    try {
      setError(null);
      if (characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(value);
      } else {
        // Fallback to regular write if writeValueWithoutResponse is not available
        await characteristic.writeValue(value);
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [characteristic, properties]);

  // Subscribe to notifications
  const subscribe = useCallback(async (handler: NotificationHandler): Promise<void> => {
    if (!characteristic) {
      setError(new Error('No characteristic available'));
      return;
    }

    if (!properties?.notify && !properties?.indicate) {
      setError(new Error('Characteristic does not support notifications'));
      return;
    }

    try {
      setError(null);
      
      // Start notifications
      await characteristic.startNotifications();
      
      // Store the handler
      notificationHandlerRef.current = handler;
      
      // Create event handler
      const handleValueChanged = (event: any) => {
        const value = event.target?.value;
        if (value) {
          setValue(value);
          if (notificationHandlerRef.current) {
            notificationHandlerRef.current(value);
          }
        }
      };
      
      eventHandlerRef.current = handleValueChanged;
      characteristic.addEventListener('characteristicvaluechanged', handleValueChanged);
      
      setIsNotifying(true);
    } catch (err) {
      setError(err as Error);
      setIsNotifying(false);
    }
  }, [characteristic, properties]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!characteristic) {
      return;
    }

    try {
      setError(null);
      
      // Stop notifications
      await characteristic.stopNotifications();
      
      // Remove event listener
      if (eventHandlerRef.current) {
        characteristic.removeEventListener('characteristicvaluechanged', eventHandlerRef.current);
        eventHandlerRef.current = null;
      }
      
      notificationHandlerRef.current = null;
      setIsNotifying(false);
    } catch (err) {
      setError(err as Error);
    }
  }, [characteristic]);

  // Get descriptor by UUID
  const getDescriptor = useCallback(async (uuid: string): Promise<BluetoothRemoteGATTDescriptor | null> => {
    if (!characteristic) {
      setError(new Error('No characteristic available'));
      return null;
    }

    try {
      setError(null);
      return await characteristic.getDescriptor(uuid);
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [characteristic]);

  // Get all descriptors
  const getDescriptors = useCallback(async (): Promise<BluetoothRemoteGATTDescriptor[]> => {
    if (!characteristic) {
      setError(new Error('No characteristic available'));
      return [];
    }

    try {
      setError(null);
      return await characteristic.getDescriptors();
    } catch (err) {
      setError(err as Error);
      return [];
    }
  }, [characteristic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (characteristic && eventHandlerRef.current) {
        characteristic.removeEventListener('characteristicvaluechanged', eventHandlerRef.current);
      }
    };
  }, [characteristic]);

  return {
    characteristic: characteristic || null,
    value,
    properties,
    read,
    write,
    writeWithoutResponse,
    subscribe,
    unsubscribe,
    isNotifying,
    getDescriptor,
    getDescriptors,
    error
  };
}