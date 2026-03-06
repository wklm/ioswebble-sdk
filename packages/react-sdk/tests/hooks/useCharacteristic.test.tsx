import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WebBLEProvider } from '../../src/core/WebBLEProvider';
import { useCharacteristic } from '../../src/hooks/useCharacteristic';

describe('useCharacteristic Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WebBLEProvider>{children}</WebBLEProvider>
  );

  let mockCharacteristic: any;
  let mockService: any;
  let mockDevice: any;
  let mockGattServer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock characteristic
    mockCharacteristic = {
      uuid: 'test-characteristic-uuid',
      service: null as any,
      properties: {
        broadcast: false,
        read: true,
        writeWithoutResponse: true,
        write: true,
        notify: true,
        indicate: false,
        authenticatedSignedWrites: false,
        reliableWrite: false,
        writableAuxiliaries: false
      },
      value: null as DataView | null,
      readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(4))),
      writeValue: jest.fn().mockResolvedValue(undefined),
      writeValueWithoutResponse: jest.fn().mockResolvedValue(undefined),
      writeValueWithResponse: jest.fn().mockResolvedValue(undefined),
      startNotifications: jest.fn().mockResolvedValue(undefined),
      stopNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getDescriptor: jest.fn(),
      getDescriptors: jest.fn()
    };

    // Create mock service
    mockService = {
      uuid: 'test-service-uuid',
      device: null as any,
      isPrimary: true,
      getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
      getCharacteristics: jest.fn().mockResolvedValue([mockCharacteristic])
    };

    // Create mock GATT server
    mockGattServer = {
      connected: true,
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
      getPrimaryServices: jest.fn().mockResolvedValue([mockService])
    };

    // Create mock device
    mockDevice = {
      id: 'test-device-id',
      name: 'Test Device',
      gatt: mockGattServer,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Link references
    mockCharacteristic.service = mockService;
    mockService.device = mockDevice;
  });

  describe('Initialization', () => {
    it('should initialize with null values', () => {
      const { result } = renderHook(() => useCharacteristic(), { wrapper });
      
      expect(result.current.characteristic).toBeNull();
      expect(result.current.value).toBeNull();
      expect(result.current.properties).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isNotifying).toBe(false);
    });

    it('should accept characteristic, service, and device as parameters', () => {
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      expect(result.current.characteristic).toBe(mockCharacteristic);
      expect(result.current.properties).toEqual(mockCharacteristic.properties);
    });
  });

  describe('Reading characteristic value', () => {
    it('should read characteristic value successfully', async () => {
      const mockValue = new DataView(new ArrayBuffer(4));
      mockValue.setUint32(0, 0x12345678, true);
      mockCharacteristic.readValue.mockResolvedValue(mockValue);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      let readValue: DataView | null = null;
      await act(async () => {
        readValue = await result.current.read();
      });
      
      expect(mockCharacteristic.readValue).toHaveBeenCalled();
      expect(readValue).toBe(mockValue);
      expect(result.current.value).toBe(mockValue);
      expect(result.current.error).toBeNull();
    });

    it('should handle read errors', async () => {
      const error = new Error('Read failed');
      mockCharacteristic.readValue.mockRejectedValue(error);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.read();
      });
      
      expect(result.current.error).toBe(error);
      expect(result.current.value).toBeNull();
    });

    it('should return null when characteristic is not provided', async () => {
      const { result } = renderHook(() => useCharacteristic(), { wrapper });
      
      let readValue: DataView | null = null;
      await act(async () => {
        readValue = await result.current.read();
      });
      
      expect(readValue).toBeNull();
      expect(result.current.error?.message).toBe('No characteristic available');
    });

    it('should return null when characteristic does not support read', async () => {
      mockCharacteristic.properties.read = false;
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      let readValue: DataView | null = null;
      await act(async () => {
        readValue = await result.current.read();
      });
      
      expect(readValue).toBeNull();
      expect(result.current.error?.message).toBe('Characteristic does not support read');
    });
  });

  describe('Writing characteristic value', () => {
    it('should write value successfully', async () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setUint32(0, 0x12345678, true);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.write(buffer);
      });
      
      expect(mockCharacteristic.writeValue).toHaveBeenCalledWith(buffer);
      expect(result.current.error).toBeNull();
    });

    it('should write value without response when appropriate', async () => {
      mockCharacteristic.properties.write = false;
      mockCharacteristic.properties.writeWithoutResponse = true;
      
      const buffer = new ArrayBuffer(4);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.write(buffer);
      });
      
      expect(mockCharacteristic.writeValueWithoutResponse).toHaveBeenCalledWith(buffer);
      expect(result.current.error).toBeNull();
    });

    it('should handle write errors', async () => {
      const error = new Error('Write failed');
      mockCharacteristic.writeValue.mockRejectedValue(error);
      
      const buffer = new ArrayBuffer(4);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.write(buffer);
      });
      
      expect(result.current.error).toBe(error);
    });

    it('should handle missing characteristic', async () => {
      const { result } = renderHook(() => useCharacteristic(), { wrapper });
      
      await act(async () => {
        await result.current.write(new ArrayBuffer(4));
      });
      
      expect(result.current.error?.message).toBe('No characteristic available');
    });

    it('should handle unsupported write', async () => {
      mockCharacteristic.properties.write = false;
      mockCharacteristic.properties.writeWithoutResponse = false;
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.write(new ArrayBuffer(4));
      });
      
      expect(result.current.error?.message).toBe('Characteristic does not support write');
    });
  });

  describe('Notifications', () => {
    it('should subscribe to notifications', async () => {
      const handler = jest.fn();
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe(handler);
      });
      
      expect(mockCharacteristic.startNotifications).toHaveBeenCalled();
      expect(mockCharacteristic.addEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      );
      expect(result.current.isNotifying).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle notification events', async () => {
      const handler = jest.fn();
      const mockValue = new DataView(new ArrayBuffer(4));
      mockValue.setUint32(0, 0x12345678, true);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe(handler);
      });
      
      // Get the event handler that was registered
      const eventHandler = mockCharacteristic.addEventListener.mock.calls.find(
        call => call[0] === 'characteristicvaluechanged'
      )?.[1];
      
      // Simulate a notification event
      if (eventHandler) {
        act(() => {
          eventHandler({ target: { value: mockValue } });
        });
      }
      
      expect(handler).toHaveBeenCalledWith(mockValue);
      expect(result.current.value).toBe(mockValue);
    });

    it('should unsubscribe from notifications', async () => {
      const handler = jest.fn();
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      // Subscribe first
      await act(async () => {
        await result.current.subscribe(handler);
      });
      
      expect(result.current.isNotifying).toBe(true);
      
      // Then unsubscribe
      await act(async () => {
        await result.current.unsubscribe();
      });
      
      expect(mockCharacteristic.stopNotifications).toHaveBeenCalled();
      expect(mockCharacteristic.removeEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      );
      expect(result.current.isNotifying).toBe(false);
    });

    it('should handle notification subscription errors', async () => {
      const error = new Error('Failed to start notifications');
      mockCharacteristic.startNotifications.mockRejectedValue(error);
      
      const handler = jest.fn();
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe(handler);
      });
      
      expect(result.current.error).toBe(error);
      expect(result.current.isNotifying).toBe(false);
    });

    it('should handle missing characteristic for notifications', async () => {
      const { result } = renderHook(() => useCharacteristic(), { wrapper });
      
      await act(async () => {
        await result.current.subscribe(jest.fn());
      });
      
      expect(result.current.error?.message).toBe('No characteristic available');
      expect(result.current.isNotifying).toBe(false);
    });

    it('should handle unsupported notifications', async () => {
      mockCharacteristic.properties.notify = false;
      mockCharacteristic.properties.indicate = false;
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.subscribe(jest.fn());
      });
      
      expect(result.current.error?.message).toBe('Characteristic does not support notifications');
      expect(result.current.isNotifying).toBe(false);
    });
  });

  describe('Write without response', () => {
    it('should write without response when available', async () => {
      const buffer = new ArrayBuffer(4);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.writeWithoutResponse(buffer);
      });
      
      expect(mockCharacteristic.writeValueWithoutResponse).toHaveBeenCalledWith(buffer);
      expect(result.current.error).toBeNull();
    });

    it('should handle writeWithoutResponse errors', async () => {
      const error = new Error('Write without response failed');
      mockCharacteristic.writeValueWithoutResponse.mockRejectedValue(error);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.writeWithoutResponse(new ArrayBuffer(4));
      });
      
      expect(result.current.error).toBe(error);
    });

    it('should handle unsupported writeWithoutResponse', async () => {
      mockCharacteristic.properties.writeWithoutResponse = false;
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      await act(async () => {
        await result.current.writeWithoutResponse(new ArrayBuffer(4));
      });
      
      expect(result.current.error?.message).toBe('Characteristic does not support write without response');
    });
  });

  describe('Getting descriptors', () => {
    it('should get descriptors', async () => {
      const mockDescriptor = {
        uuid: 'test-descriptor-uuid',
        characteristic: mockCharacteristic,
        readValue: jest.fn(),
        writeValue: jest.fn()
      };
      
      mockCharacteristic.getDescriptors.mockResolvedValue([mockDescriptor]);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      let descriptors: any[] = [];
      await act(async () => {
        descriptors = await result.current.getDescriptors();
      });
      
      expect(mockCharacteristic.getDescriptors).toHaveBeenCalled();
      expect(descriptors).toEqual([mockDescriptor]);
    });

    it('should get a specific descriptor', async () => {
      const mockDescriptor = {
        uuid: 'test-descriptor-uuid',
        characteristic: mockCharacteristic,
        readValue: jest.fn(),
        writeValue: jest.fn()
      };
      
      mockCharacteristic.getDescriptor.mockResolvedValue(mockDescriptor);
      
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      let descriptor: any = null;
      await act(async () => {
        descriptor = await result.current.getDescriptor('test-descriptor-uuid');
      });
      
      expect(mockCharacteristic.getDescriptor).toHaveBeenCalledWith('test-descriptor-uuid');
      expect(descriptor).toBe(mockDescriptor);
    });
  });

  describe('Hook return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      expect(result.current).toHaveProperty('characteristic');
      expect(result.current).toHaveProperty('value');
      expect(result.current).toHaveProperty('properties');
      expect(result.current).toHaveProperty('read');
      expect(result.current).toHaveProperty('write');
      expect(result.current).toHaveProperty('writeWithoutResponse');
      expect(result.current).toHaveProperty('subscribe');
      expect(result.current).toHaveProperty('unsubscribe');
      expect(result.current).toHaveProperty('isNotifying');
      expect(result.current).toHaveProperty('getDescriptor');
      expect(result.current).toHaveProperty('getDescriptors');
      expect(result.current).toHaveProperty('error');
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners on unmount', async () => {
      const handler = jest.fn();
      
      const { result, unmount } = renderHook(
        () => useCharacteristic(mockCharacteristic, mockService, mockDevice),
        { wrapper }
      );
      
      // Subscribe to notifications
      await act(async () => {
        await result.current.subscribe(handler);
      });
      
      // Unmount the hook
      unmount();
      
      // Check that event listener was removed
      expect(mockCharacteristic.removeEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      );
    });

    it('should handle cleanup when characteristic is null', () => {
      const { unmount } = renderHook(() => useCharacteristic(), { wrapper });
      
      // Should not throw when unmounting with null characteristic
      expect(() => unmount()).not.toThrow();
    });
  });
});