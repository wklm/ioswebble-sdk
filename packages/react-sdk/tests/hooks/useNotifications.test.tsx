import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WebBLEProvider } from '../../src/core/WebBLEProvider';
import { useNotifications } from '../../src/hooks/useNotifications';

describe('useNotifications Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WebBLEProvider>{children}</WebBLEProvider>
  );

  let mockCharacteristic: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock characteristic
    mockCharacteristic = {
      uuid: 'test-characteristic-uuid',
      properties: {
        notify: true,
        indicate: false
      },
      value: null as DataView | null,
      readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(4))),
      startNotifications: jest.fn().mockResolvedValue(undefined),
      stopNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.value).toBeNull();
      expect(result.current.history).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should accept a characteristic', () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Subscription management', () => {
    it('should subscribe to notifications', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      expect(mockCharacteristic.startNotifications).toHaveBeenCalled();
      expect(mockCharacteristic.addEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      );
      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should unsubscribe from notifications', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      // Subscribe first
      await act(async () => {
        await result.current.subscribe();
      });
      
      expect(result.current.isSubscribed).toBe(true);
      
      // Then unsubscribe
      await act(async () => {
        await result.current.unsubscribe();
      });
      
      expect(mockCharacteristic.stopNotifications).toHaveBeenCalled();
      expect(mockCharacteristic.removeEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      );
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should handle subscription errors', async () => {
      const error = new Error('Failed to start notifications');
      mockCharacteristic.startNotifications.mockRejectedValue(error);
      
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      expect(result.current.error).toBe(error);
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should handle missing characteristic', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      expect(result.current.error?.message).toBe('No characteristic available');
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should handle characteristics that do not support notifications', async () => {
      mockCharacteristic.properties.notify = false;
      mockCharacteristic.properties.indicate = false;
      
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      expect(result.current.error?.message).toBe('Characteristic does not support notifications');
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  describe('Notification handling', () => {
    it('should handle incoming notifications', async () => {
      const mockValue1 = new DataView(new ArrayBuffer(4));
      mockValue1.setUint32(0, 0x12345678, true);
      
      const mockValue2 = new DataView(new ArrayBuffer(4));
      mockValue2.setUint32(0, 0x87654321, true);
      
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      // Subscribe to notifications
      await act(async () => {
        await result.current.subscribe();
      });
      
      // Get the event handler that was registered
      const eventHandler = mockCharacteristic.addEventListener.mock.calls.find(
        call => call[0] === 'characteristicvaluechanged'
      )?.[1];
      
      // Simulate first notification
      if (eventHandler) {
        act(() => {
          eventHandler({ target: { value: mockValue1 } });
        });
      }
      
      expect(result.current.value).toBe(mockValue1);
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].value).toBe(mockValue1);
      expect(result.current.history[0].timestamp).toBeInstanceOf(Date);
      
      // Simulate second notification
      if (eventHandler) {
        act(() => {
          eventHandler({ target: { value: mockValue2 } });
        });
      }
      
      expect(result.current.value).toBe(mockValue2);
      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[1].value).toBe(mockValue2);
    });

    it('should limit history to maxHistory entries', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic, { maxHistory: 3 }),
        { wrapper }
      );
      
      // Subscribe to notifications
      await act(async () => {
        await result.current.subscribe();
      });
      
      // Get the event handler
      const eventHandler = mockCharacteristic.addEventListener.mock.calls.find(
        call => call[0] === 'characteristicvaluechanged'
      )?.[1];
      
      // Send 5 notifications
      for (let i = 0; i < 5; i++) {
        const mockValue = new DataView(new ArrayBuffer(4));
        mockValue.setUint32(0, i, true);
        
        if (eventHandler) {
          act(() => {
            eventHandler({ target: { value: mockValue } });
          });
        }
      }
      
      // Should only keep the last 3
      expect(result.current.history).toHaveLength(3);
      expect(result.current.history[0].value.getUint32(0, true)).toBe(2);
      expect(result.current.history[1].value.getUint32(0, true)).toBe(3);
      expect(result.current.history[2].value.getUint32(0, true)).toBe(4);
    });

    it('should clear history', async () => {
      const mockValue = new DataView(new ArrayBuffer(4));
      mockValue.setUint32(0, 0x12345678, true);
      
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      // Subscribe and receive a notification
      await act(async () => {
        await result.current.subscribe();
      });
      
      const eventHandler = mockCharacteristic.addEventListener.mock.calls.find(
        call => call[0] === 'characteristicvaluechanged'
      )?.[1];
      
      if (eventHandler) {
        act(() => {
          eventHandler({ target: { value: mockValue } });
        });
      }
      
      expect(result.current.history).toHaveLength(1);
      expect(result.current.value).toBe(mockValue);
      
      // Clear history
      act(() => {
        result.current.clear();
      });
      
      expect(result.current.history).toEqual([]);
      expect(result.current.value).toBeNull();
    });
  });

  describe('Options', () => {
    it('should auto-subscribe when autoSubscribe is true', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic, { autoSubscribe: true }),
        { wrapper }
      );
      
      // Wait for auto-subscription to complete and state to update
      await waitFor(() => {
        expect(mockCharacteristic.startNotifications).toHaveBeenCalled();
        expect(result.current.isSubscribed).toBe(true);
      });
    });

    it('should not auto-subscribe when autoSubscribe is false', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic, { autoSubscribe: false }),
        { wrapper }
      );
      
      // Give it time to potentially auto-subscribe (it shouldn't)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCharacteristic.startNotifications).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should clean up on unmount', async () => {
      const { result, unmount } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      // Subscribe to notifications
      await act(async () => {
        await result.current.subscribe();
      });
      
      // Unmount the hook
      unmount();
      
      // Check that event listener was removed
      expect(mockCharacteristic.removeEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      );
    });

    it('should handle cleanup when not subscribed', () => {
      const { unmount } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      // Should not throw when unmounting without subscription
      expect(() => unmount()).not.toThrow();
    });

    it('should handle cleanup with null characteristic', () => {
      const { unmount } = renderHook(() => useNotifications(), { wrapper });
      
      // Should not throw when unmounting with null characteristic
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Hook return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      expect(result.current).toHaveProperty('isSubscribed');
      expect(result.current).toHaveProperty('value');
      expect(result.current).toHaveProperty('history');
      expect(result.current).toHaveProperty('subscribe');
      expect(result.current).toHaveProperty('unsubscribe');
      expect(result.current).toHaveProperty('clear');
      expect(result.current).toHaveProperty('error');
    });
  });

  describe('Edge cases', () => {
    it('should handle notifications without value', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      const eventHandler = mockCharacteristic.addEventListener.mock.calls.find(
        call => call[0] === 'characteristicvaluechanged'
      )?.[1];
      
      // Send notification without value
      if (eventHandler) {
        act(() => {
          eventHandler({ target: {} });
        });
      }
      
      // Should not update value or history
      expect(result.current.value).toBeNull();
      expect(result.current.history).toEqual([]);
    });

    it('should handle multiple subscriptions gracefully', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      // Subscribe twice
      await act(async () => {
        await result.current.subscribe();
      });
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      // Should only call startNotifications once (second call should be ignored)
      expect(mockCharacteristic.startNotifications).toHaveBeenCalledTimes(1);
      expect(result.current.isSubscribed).toBe(true);
    });

    it('should handle multiple unsubscriptions gracefully', async () => {
      const { result } = renderHook(
        () => useNotifications(mockCharacteristic),
        { wrapper }
      );
      
      // Subscribe first
      await act(async () => {
        await result.current.subscribe();
      });
      
      // Unsubscribe twice
      await act(async () => {
        await result.current.unsubscribe();
      });
      
      await act(async () => {
        await result.current.unsubscribe();
      });
      
      // Should handle gracefully
      expect(mockCharacteristic.stopNotifications).toHaveBeenCalledTimes(1);
      expect(result.current.isSubscribed).toBe(false);
    });
  });
});