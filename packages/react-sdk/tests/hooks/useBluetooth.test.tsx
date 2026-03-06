import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WebBLEProvider } from '../../src/core/WebBLEProvider';
import { useBluetooth } from '../../src/hooks/useBluetooth';

describe('useBluetooth Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WebBLEProvider>{children}</WebBLEProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Availability checks', () => {
    it('should return availability status', async () => {
      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      // Initial state should be false
      expect(result.current.isAvailable).toBe(false);

      // Wait for async initialization
      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });
      
      expect(navigator.bluetooth.getAvailability).toHaveBeenCalledTimes(1);
    });

    it('should detect extension installation', async () => {
      const { result } = renderHook(() => useBluetooth(), { wrapper });

      // In the test environment with mocked navigator.bluetooth, it's detected as installed
      expect(result.current.isExtensionInstalled).toBe(true);

      // Verify that the extension is detected via the presence of navigator.bluetooth
      expect(navigator.bluetooth).toBeDefined();
    });

    it('should determine browser support', () => {
      // Ensure window.isSecureContext is true in test environment
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: false
      });
      
      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      // Should be true in test environment with mocked navigator.bluetooth
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('Device management', () => {
    it('should request a device', async () => {
      const mockDevice = new (global as any).BluetoothDevice();
      mockDevice.id = 'test-device-123';
      mockDevice.name = 'Test Device';
      
      const mockRequestDevice = jest.fn().mockResolvedValue(mockDevice);
      if (navigator.bluetooth) {
        navigator.bluetooth.requestDevice = mockRequestDevice;
      }

      const { result } = renderHook(() => useBluetooth(), { wrapper });

      let device: BluetoothDevice | null = null;
      
      await act(async () => {
        device = await result.current.requestDevice({
          acceptAllDevices: true
        });
      });

      expect(mockRequestDevice).toHaveBeenCalledWith({
        acceptAllDevices: true
      });
      expect(device).toBe(mockDevice);
    });

    it('should handle device request cancellation', async () => {
      const mockRequestDevice = jest.fn().mockRejectedValue(
        new DOMException('User cancelled', 'NotFoundError')
      );
      if (navigator.bluetooth) {
        navigator.bluetooth.requestDevice = mockRequestDevice;
      }

      const { result } = renderHook(() => useBluetooth(), { wrapper });

      let device: BluetoothDevice | null = null;
      
      await act(async () => {
        device = await result.current.requestDevice({
          acceptAllDevices: true
        });
      });

      expect(device).toBeNull();
      expect(result.current.error).toBeNull(); // Cancellation shouldn't set error
    });

    it('should handle device request errors', async () => {
      const error = new Error('Bluetooth not available');
      const mockRequestDevice = jest.fn().mockRejectedValue(error);
      if (navigator.bluetooth) {
        navigator.bluetooth.requestDevice = mockRequestDevice;
      }

      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      await act(async () => {
        await result.current.requestDevice({
          acceptAllDevices: true
        });
      });

      expect(result.current.error).toBe(error);
    });

    it('should get previously paired devices', async () => {
      const mockDevices = [
        new (global as any).BluetoothDevice(),
        new (global as any).BluetoothDevice()
      ];
      mockDevices[0].id = 'device-1';
      mockDevices[1].id = 'device-2';
      
      // Update the global mock
      (navigator.bluetooth.getDevices as jest.Mock).mockResolvedValue(mockDevices);

      const { result } = renderHook(() => useBluetooth(), { wrapper });

      let devices: BluetoothDevice[] = [];
      
      await act(async () => {
        devices = await result.current.getDevices();
      });

      expect(navigator.bluetooth.getDevices).toHaveBeenCalled();
      expect(devices).toEqual(mockDevices);
    });

    it('should filter devices by service UUID', async () => {
      const mockDevice = new (global as any).BluetoothDevice();
      mockDevice.id = 'heart-rate-device';
      
      const mockRequestDevice = jest.fn().mockResolvedValue(mockDevice);
      if (navigator.bluetooth) {
        navigator.bluetooth.requestDevice = mockRequestDevice;
      }

      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      await act(async () => {
        await result.current.requestDevice({
          filters: [{ services: ['heart_rate'] }]
        });
      });

      expect(mockRequestDevice).toHaveBeenCalledWith({
        filters: [{ services: ['heart_rate'] }]
      });
    });

    it('should filter devices by name', async () => {
      const mockDevice = new (global as any).BluetoothDevice();
      mockDevice.name = 'My Device';
      
      const mockRequestDevice = jest.fn().mockResolvedValue(mockDevice);
      if (navigator.bluetooth) {
        navigator.bluetooth.requestDevice = mockRequestDevice;
      }

      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      await act(async () => {
        await result.current.requestDevice({
          filters: [{ name: 'My Device' }]
        });
      });

      expect(mockRequestDevice).toHaveBeenCalledWith({
        filters: [{ name: 'My Device' }]
      });
    });

    it('should handle optional services', async () => {
      const mockDevice = new (global as any).BluetoothDevice();
      
      const mockRequestDevice = jest.fn().mockResolvedValue(mockDevice);
      if (navigator.bluetooth) {
        navigator.bluetooth.requestDevice = mockRequestDevice;
      }

      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      await act(async () => {
        await result.current.requestDevice({
          filters: [{ services: ['heart_rate'] }],
          optionalServices: ['battery_service', 'device_information']
        });
      });

      expect(mockRequestDevice).toHaveBeenCalledWith({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service', 'device_information']
      });
    });
  });

  describe('Error handling', () => {
    it('should clear error on successful operation', async () => {
      const error = new Error('Previous error');
      const mockDevice = new (global as any).BluetoothDevice();
      
      // First set an error
      const mockRequestDevice = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockDevice);
      if (navigator.bluetooth) {
        navigator.bluetooth.requestDevice = mockRequestDevice;
      }

      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      // First request should fail
      await act(async () => {
        await result.current.requestDevice({ acceptAllDevices: true });
      });
      
      expect(result.current.error).toBe(error);
      
      // Second request should succeed and clear error
      await act(async () => {
        await result.current.requestDevice({ acceptAllDevices: true });
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Hook return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useBluetooth(), { wrapper });
      
      expect(result.current).toHaveProperty('isAvailable');
      expect(result.current).toHaveProperty('isExtensionInstalled');
      expect(result.current).toHaveProperty('isSupported');
      expect(result.current).toHaveProperty('requestDevice');
      expect(result.current).toHaveProperty('getDevices');
      expect(result.current).toHaveProperty('error');
    });

    it('should memoize functions properly', () => {
      const { result, rerender } = renderHook(() => useBluetooth(), { wrapper });
      
      const firstRequestDevice = result.current.requestDevice;
      const firstGetDevices = result.current.getDevices;
      
      rerender();
      
      expect(result.current.requestDevice).toBe(firstRequestDevice);
      expect(result.current.getDevices).toBe(firstGetDevices);
    });
  });
});