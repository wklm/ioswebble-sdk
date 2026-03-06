import { useState, useCallback, useEffect, useRef } from 'react';
import type { UseNotificationsReturn, NotificationEntry } from '../types';

export interface NotificationOptions {
  autoSubscribe?: boolean;
  maxHistory?: number;
}

/**
 * useNotifications - Hook for managing characteristic notifications
 * 
 * @param characteristic - The BluetoothRemoteGATTCharacteristic to monitor
 * @param options - Optional configuration for notifications
 * @returns Notification state and control methods
 */
export function useNotifications(
  characteristic?: BluetoothRemoteGATTCharacteristic | null,
  options?: NotificationOptions
): UseNotificationsReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [value, setValue] = useState<DataView | null>(null);
  const [history, setHistory] = useState<NotificationEntry[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  const eventHandlerRef = useRef<((event: any) => void) | null>(null);
  const maxHistory = options?.maxHistory ?? 100;
  const autoSubscribe = options?.autoSubscribe ?? false;

  // Subscribe to notifications
  const subscribe = useCallback(async (): Promise<void> => {
    // If already subscribed, do nothing
    if (isSubscribed) {
      return;
    }

    if (!characteristic) {
      setError(new Error('No characteristic available'));
      return;
    }

    const properties = characteristic.properties;
    if (!properties?.notify && !properties?.indicate) {
      setError(new Error('Characteristic does not support notifications'));
      return;
    }

    try {
      setError(null);
      
      // Start notifications
      await characteristic.startNotifications();
      
      // Create event handler
      const handleValueChanged = (event: any) => {
        const newValue = event.target?.value;
        if (newValue) {
          setValue(newValue);
          setHistory(prev => {
            const newEntry: NotificationEntry = {
              timestamp: new Date(),
              value: newValue
            };
            
            // Keep only the last maxHistory entries
            const updatedHistory = [...prev, newEntry];
            if (updatedHistory.length > maxHistory) {
              return updatedHistory.slice(-maxHistory);
            }
            return updatedHistory;
          });
        }
      };
      
      eventHandlerRef.current = handleValueChanged;
      characteristic.addEventListener('characteristicvaluechanged', handleValueChanged);
      
      setIsSubscribed(true);
    } catch (err) {
      setError(err as Error);
      setIsSubscribed(false);
    }
  }, [characteristic, isSubscribed, maxHistory]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async (): Promise<void> => {
    // If not subscribed, do nothing
    if (!isSubscribed) {
      return;
    }

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
      
      setIsSubscribed(false);
    } catch (err) {
      setError(err as Error);
    }
  }, [characteristic, isSubscribed]);

  // Clear history and value
  const clear = useCallback((): void => {
    setHistory([]);
    setValue(null);
  }, []);

  // Auto-subscribe if requested
  useEffect(() => {
    if (autoSubscribe && characteristic && !isSubscribed) {
      subscribe();
    }
  }, [autoSubscribe, characteristic, isSubscribed, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (characteristic && eventHandlerRef.current) {
        characteristic.removeEventListener('characteristicvaluechanged', eventHandlerRef.current);
      }
    };
  }, [characteristic]);

  return {
    isSubscribed,
    value,
    history,
    subscribe,
    unsubscribe,
    clear,
    error
  };
}