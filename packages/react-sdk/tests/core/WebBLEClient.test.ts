import { WebBLEClient } from '../../src/core/WebBLEClient';

// Mock types
const mockDevice = {
  id: 'test-device-1',
  name: 'Test Device',
  gatt: {
    connected: false,
    connect: jest.fn(),
    disconnect: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  watchAdvertisements: jest.fn(),
  unwatchAdvertisements: jest.fn(),
  forget: jest.fn()
};

const mockDevice2 = {
  id: 'test-device-2',
  name: 'Test Device 2',
  gatt: {
    connected: false,
    connect: jest.fn(),
    disconnect: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  watchAdvertisements: jest.fn(),
  unwatchAdvertisements: jest.fn(),
  forget: jest.fn()
};

const mockScan = {
  active: true,
  stop: jest.fn()
};

describe('WebBLEClient', () => {
  let client: WebBLEClient;
  let originalNavigator: any;
  let setTimeoutSpy: jest.SpyInstance;
  let clearTimeoutSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    client = new WebBLEClient();
    originalNavigator = global.navigator;
    
    // Setup spies
    jest.useFakeTimers();
    setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Reset mock functions
    mockDevice.gatt.connect.mockReset();
    mockDevice.addEventListener.mockReset();
    mockDevice2.gatt.connect.mockReset();
    mockScan.stop.mockReset();
    
    // Setup default navigator.bluetooth
    Object.defineProperty(global.navigator, 'bluetooth', {
      value: {
        requestDevice: jest.fn(),
        getDevices: jest.fn(),
        requestLEScan: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const client = new WebBLEClient();
      expect(client).toBeDefined();
    });

    it('should create with custom config', () => {
      const config = {
        autoConnect: true,
        cacheTimeout: 60000,
        retryAttempts: 5
      };
      const client = new WebBLEClient(config);
      expect(client).toBeDefined();
    });
  });

  describe('requestDevice', () => {
    it('should request a device and return it', async () => {
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      const device = await client.requestDevice({ acceptAllDevices: true });
      
      expect(device).toBe(mockDevice);
      expect(navigator.bluetooth.requestDevice).toHaveBeenCalledWith({ acceptAllDevices: true });
    });

    it('should use default options when none provided', async () => {
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await client.requestDevice();
      
      expect(navigator.bluetooth.requestDevice).toHaveBeenCalledWith({ acceptAllDevices: true });
    });

    it('should cache the device', async () => {
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      const device = await client.requestDevice();
      
      // Verify device is cached by calling getDevices
      navigator.bluetooth.getDevices.mockResolvedValue([]);
      const devices = await client.getDevices();
      expect(devices).toContain(device);
    });

    it('should auto-connect if configured', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      mockDevice.gatt.connect.mockResolvedValue({ connected: true });
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await autoClient.requestDevice();
      
      expect(mockDevice.gatt.connect).toHaveBeenCalled();
    });

    it('should return null when user cancels', async () => {
      const error = new Error('User cancelled');
      error.name = 'NotFoundError';
      navigator.bluetooth.requestDevice.mockRejectedValue(error);
      
      const device = await client.requestDevice();
      
      expect(device).toBeNull();
    });

    it('should throw error when bluetooth not available', async () => {
      // @ts-ignore
      delete navigator.bluetooth;
      
      await expect(client.requestDevice()).rejects.toThrow('Web Bluetooth API is not available');
    });

    it('should rethrow non-NotFoundError errors', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      navigator.bluetooth.requestDevice.mockRejectedValue(error);
      
      await expect(client.requestDevice()).rejects.toThrow('Permission denied');
    });
  });

  describe('getDevices', () => {
    it('should return devices from bluetooth.getDevices', async () => {
      navigator.bluetooth.getDevices.mockResolvedValue([mockDevice, mockDevice2]);
      
      const devices = await client.getDevices();
      
      expect(devices).toEqual([mockDevice, mockDevice2]);
      expect(navigator.bluetooth.getDevices).toHaveBeenCalled();
    });

    it('should return cached devices when getDevices not available', async () => {
      delete navigator.bluetooth.getDevices;
      
      // Cache a device first
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      await client.requestDevice();
      
      const devices = await client.getDevices();
      
      expect(devices).toEqual([mockDevice]);
    });

    it('should update cache with returned devices', async () => {
      navigator.bluetooth.getDevices.mockResolvedValue([mockDevice, mockDevice2]);
      
      await client.getDevices();
      
      // Now check cache by removing getDevices
      delete navigator.bluetooth.getDevices;
      const cachedDevices = await client.getDevices();
      
      expect(cachedDevices).toContain(mockDevice);
      expect(cachedDevices).toContain(mockDevice2);
    });

    it('should return cached devices on error', async () => {
      navigator.bluetooth.getDevices.mockRejectedValue(new Error('Failed'));
      
      // Cache a device first
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      await client.requestDevice();
      
      const devices = await client.getDevices();
      
      expect(devices).toEqual([mockDevice]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get devices:', expect.any(Error));
    });
  });

  describe('requestLEScan', () => {
    it('should start LE scan and return scan object', async () => {
      navigator.bluetooth.requestLEScan.mockResolvedValue(mockScan);
      
      const scan = await client.requestLEScan({ acceptAllAdvertisements: true });
      
      expect(scan).toBe(mockScan);
      expect(navigator.bluetooth.requestLEScan).toHaveBeenCalledWith({ acceptAllAdvertisements: true });
    });

    it('should use default options when none provided', async () => {
      navigator.bluetooth.requestLEScan.mockResolvedValue(mockScan);
      
      await client.requestLEScan();
      
      expect(navigator.bluetooth.requestLEScan).toHaveBeenCalledWith({ acceptAllAdvertisements: true });
    });

    it('should add advertisement event listener', async () => {
      navigator.bluetooth.requestLEScan.mockResolvedValue(mockScan);
      
      await client.requestLEScan();
      
      expect(navigator.bluetooth.addEventListener).toHaveBeenCalledWith(
        'advertisementreceived',
        expect.any(Function)
      );
    });

    it('should return null on permission denied', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      navigator.bluetooth.requestLEScan.mockRejectedValue(error);
      
      const scan = await client.requestLEScan();
      
      expect(scan).toBeNull();
    });

    it('should throw error when LE scan not available', async () => {
      delete navigator.bluetooth.requestLEScan;
      
      await expect(client.requestLEScan()).rejects.toThrow('LE Scan API is not available');
    });

    it('should rethrow non-NotAllowedError errors', async () => {
      const error = new Error('Unknown error');
      navigator.bluetooth.requestLEScan.mockRejectedValue(error);
      
      await expect(client.requestLEScan()).rejects.toThrow('Unknown error');
    });
  });

  describe('connectWithRetry', () => {
    it('should connect successfully on first attempt', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      const mockServer = { connected: true };
      mockDevice.gatt.connect.mockResolvedValue(mockServer);
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await autoClient.requestDevice();
      
      expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(1);
    });

    it('should retry on connection failure', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true, retryAttempts: 2 });
      
      mockDevice.gatt.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ connected: true });
      
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      const requestPromise = autoClient.requestDevice();
      
      // First attempt fails
      await jest.runAllTimersAsync();
      
      // Second attempt succeeds
      await requestPromise;
      
      expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for retries', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true, retryAttempts: 2 });
      
      let attempt = 0;
      mockDevice.gatt.connect.mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new Error('Failed 1'));
        }
        if (attempt === 2) {
          return Promise.reject(new Error('Failed 2'));
        }
        return Promise.resolve({ connected: true });
      });
      
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      const requestPromise = autoClient.requestDevice();
      
      // Process all microtasks and advance time for exponential backoff
      for (let i = 0; i < 3; i++) {
        // Process microtasks for the promise chain
        await Promise.resolve();
        await Promise.resolve();
        
        if (i < 2) {
          // Advance timers for delay: 1000ms * 2^i
          jest.advanceTimersByTime(1000 * Math.pow(2, i));
          // Let the setTimeout callback execute
          await Promise.resolve();
        }
      }
      
      await requestPromise;
      
      expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(3);
    }, 15000);

    it('should set up disconnect handler for auto-reconnect', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      mockDevice.gatt.connect.mockResolvedValue({ connected: true });
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await autoClient.requestDevice();
      
      expect(mockDevice.addEventListener).toHaveBeenCalledWith(
        'gattserverdisconnected',
        expect.any(Function)
      );
    });

    it('should not auto-connect when device does not support GATT', async () => {
      const deviceNoGatt = { ...mockDevice, gatt: null };
      navigator.bluetooth.requestDevice.mockResolvedValue(deviceNoGatt);
      
      const autoClient = new WebBLEClient({ autoConnect: true });
      
      const device = await autoClient.requestDevice();
      
      expect(device).toBe(deviceNoGatt);
      // Should not attempt to connect when gatt is null
      expect(mockDevice.gatt.connect).not.toHaveBeenCalled();
    });
  });

  describe('scheduleReconnect', () => {
    it('should schedule reconnection after disconnect', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      mockDevice.gatt.connect.mockResolvedValue({ connected: true });
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await autoClient.requestDevice();
      
      // Get the disconnect handler
      const disconnectHandler = mockDevice.addEventListener.mock.calls.find(
        call => call[0] === 'gattserverdisconnected'
      )[1];
      
      // Clear previous setTimeout calls
      setTimeoutSpy.mockClear();
      
      // Trigger disconnect
      disconnectHandler();
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should clear existing timer before scheduling new one', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      mockDevice.gatt.connect.mockResolvedValue({ connected: true });
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await autoClient.requestDevice();
      
      const disconnectHandler = mockDevice.addEventListener.mock.calls.find(
        call => call[0] === 'gattserverdisconnected'
      )[1];
      
      // Trigger disconnect twice
      disconnectHandler();
      
      // Wait for timer to be set
      await Promise.resolve();
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      const clearCountBefore = clearTimeoutSpy.mock.calls.length;
      
      disconnectHandler();
      
      // Should clear the first timer when setting new one
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(clearCountBefore);
    });

    it.todo('should log error if reconnection fails');
  });

  describe('handleAdvertisement', () => {
    it('should cache device from advertisement event', async () => {
      navigator.bluetooth.requestLEScan.mockResolvedValue(mockScan);
      
      await client.requestLEScan();
      
      const handler = navigator.bluetooth.addEventListener.mock.calls.find(
        call => call[0] === 'advertisementreceived'
      )[1];
      
      const event = {
        device: mockDevice,
        uuids: ['0000180d-0000-1000-8000-00805f9b34fb'],
        manufacturerData: new Map(),
        serviceData: new Map(),
        rssi: -60,
        txPower: -40
      };
      
      handler(event);
      
      // Check device is cached
      delete navigator.bluetooth.getDevices;
      const devices = await client.getDevices();
      expect(devices).toContain(mockDevice);
    });

    it('should auto-connect to advertised device if configured', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      navigator.bluetooth.requestLEScan.mockResolvedValue(mockScan);
      mockDevice.gatt.connected = false;
      mockDevice.gatt.connect.mockResolvedValue({ connected: true });
      
      await autoClient.requestLEScan();
      
      const handler = navigator.bluetooth.addEventListener.mock.calls.find(
        call => call[0] === 'advertisementreceived'
      )[1];
      
      const event = { device: mockDevice };
      
      handler(event);
      
      expect(mockDevice.gatt.connect).toHaveBeenCalled();
    });

    it('should not auto-connect if device already connected', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      navigator.bluetooth.requestLEScan.mockResolvedValue(mockScan);
      mockDevice.gatt.connected = true;
      
      await autoClient.requestLEScan();
      
      const handler = navigator.bluetooth.addEventListener.mock.calls.find(
        call => call[0] === 'advertisementreceived'
      )[1];
      
      const event = { device: mockDevice };
      
      handler(event);
      
      expect(mockDevice.gatt.connect).not.toHaveBeenCalled();
    });

    it.todo('should handle connection errors silently');
  });

  describe('dispose', () => {
    it('should clear all reconnect timers', async () => {
      const autoClient = new WebBLEClient({ autoConnect: true });
      mockDevice.gatt.connect.mockResolvedValue({ connected: true });
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await autoClient.requestDevice();
      
      const disconnectHandler = mockDevice.addEventListener.mock.calls.find(
        call => call[0] === 'gattserverdisconnected'
      )[1];
      
      disconnectHandler();
      
      // Wait for setTimeout to be called
      await Promise.resolve();
      
      // Check if setTimeout was called and get the timer
      expect(setTimeoutSpy).toHaveBeenCalled();
      const timerCall = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
      expect(timerCall).toBeDefined();
      
      // Dispose should clear timers
      const clearCountBefore = clearTimeoutSpy.mock.calls.length;
      autoClient.dispose();
      
      // Verify at least one timer was cleared
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(clearCountBefore);
    });

    it('should remove event listeners', async () => {
      navigator.bluetooth.requestLEScan.mockResolvedValue(mockScan);
      
      await client.requestLEScan();
      
      client.dispose();
      
      expect(navigator.bluetooth.removeEventListener).toHaveBeenCalledWith(
        'advertisementreceived',
        expect.any(Function)
      );
    });

    it('should clear device cache', async () => {
      navigator.bluetooth.requestDevice.mockResolvedValue(mockDevice);
      
      await client.requestDevice();
      
      client.dispose();
      
      // Cache should be empty
      delete navigator.bluetooth.getDevices;
      const devices = await client.getDevices();
      expect(devices).toEqual([]);
    });

    it('should handle missing removeEventListener', () => {
      delete navigator.bluetooth.removeEventListener;
      
      expect(() => client.dispose()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle device without name', async () => {
      // Test the main functionality - that device without name works
      const deviceNoName = { ...mockDevice, name: null };
      navigator.bluetooth.requestDevice.mockResolvedValue(deviceNoName);
      
      const result = await client.requestDevice();
      
      expect(result).toBe(deviceNoName);
      expect(result.name).toBeNull();
    });

    it('should handle multiple devices', async () => {
      navigator.bluetooth.requestDevice
        .mockResolvedValueOnce(mockDevice)
        .mockResolvedValueOnce(mockDevice2);
      
      await client.requestDevice();
      await client.requestDevice();
      
      delete navigator.bluetooth.getDevices;
      const devices = await client.getDevices();
      
      expect(devices).toHaveLength(2);
      expect(devices).toContain(mockDevice);
      expect(devices).toContain(mockDevice2);
    });
  });
});