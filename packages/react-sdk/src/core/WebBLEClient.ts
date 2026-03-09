/**
 * WebBLEClient - Core client wrapper for Web Bluetooth API
 * Provides a unified interface for all Bluetooth operations
 */
import type { RequestDeviceOptions } from '../types';

interface WebBLEConfig {
  autoConnect?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
  apiKey?: string;
}

export class WebBLEClient {
  private config: WebBLEConfig;
  private deviceCache: Map<string, BluetoothDevice>;
  private reconnectTimers: Map<string, NodeJS.Timeout>;

  constructor(config?: WebBLEConfig) {
    this.config = {
      autoConnect: false,
      cacheTimeout: 30000,
      retryAttempts: 3,
      ...config
    };
    this.deviceCache = new Map();
    this.reconnectTimers = new Map();
  }

  /**
   * Request a Bluetooth device from the user
   */
  async requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice | null> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API is not available');
      }

      const nativeOptions = options || { acceptAllDevices: true as const };
      const device = await navigator.bluetooth.requestDevice(nativeOptions as globalThis.RequestDeviceOptions);
      
      if (device) {
        this.deviceCache.set(device.id, device);
        
        if (this.config.autoConnect && device.gatt) {
          await this.connectWithRetry(device);
        }
      }
      
      return device;
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  /**
   * Get list of previously paired devices
   */
  async getDevices(): Promise<BluetoothDevice[]> {
    try {
      if (!navigator.bluetooth?.getDevices) {
        return Array.from(this.deviceCache.values());
      }

      const devices = await navigator.bluetooth.getDevices();
      
      // Update cache with new devices
      devices.forEach(device => {
        this.deviceCache.set(device.id, device);
      });
      
      // Return all cached devices (which now includes both old and new)
      return Array.from(this.deviceCache.values());
    } catch (error) {
      console.error('Failed to get devices:', error);
      return Array.from(this.deviceCache.values());
    }
  }

  /**
   * Start scanning for BLE advertisements
   */
  async requestLEScan(options?: BluetoothLEScanOptions): Promise<BluetoothLEScan | null> {
    try {
      if (!navigator.bluetooth?.requestLEScan) {
        throw new Error('LE Scan API is not available');
      }

      const scan = await navigator.bluetooth.requestLEScan(options || { acceptAllAdvertisements: true });
      
      // Handle advertisement events
      if (navigator.bluetooth && 'addEventListener' in navigator.bluetooth) {
        navigator.bluetooth.addEventListener('advertisementreceived', this.handleAdvertisement);
      }
      
      return scan;
    } catch (error) {
      if ((error as Error).name === 'NotAllowedError') {
        return null; // Permission denied
      }
      throw error;
    }
  }

  /**
   * Connect to a device with retry logic
   */
  private async connectWithRetry(device: BluetoothDevice, attempt = 0): Promise<BluetoothRemoteGATTServer | null> {
    try {
      if (!device.gatt) {
        throw new Error('Device does not support GATT');
      }

      const server = await device.gatt.connect();

      if (this.config.apiKey) {
        import('@ios-web-bluetooth/detect').then(m => m.reportEvent(this.config.apiKey!, 'ble_connected')).catch(() => {});
      }

      // Clear any reconnect timer
      const timer = this.reconnectTimers.get(device.id);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(device.id);
      }
      
      // Set up disconnect handler for auto-reconnect
      if (this.config.autoConnect) {
        device.addEventListener('gattserverdisconnected', () => {
          this.scheduleReconnect(device);
        });
      }
      
      return server;
    } catch (error) {
      if (attempt < (this.config.retryAttempts || 3)) {
        await this.delay(1000 * Math.pow(2, attempt)); // Exponential backoff
        return this.connectWithRetry(device, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(device: BluetoothDevice) {
    const existingTimer = this.reconnectTimers.get(device.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        await this.connectWithRetry(device);
      } catch (error) {
        console.error(`Failed to reconnect to device ${device.name || device.id}:`, error);
      }
    }, 5000);

    this.reconnectTimers.set(device.id, timer);
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle advertisement received event
   */
  private handleAdvertisement = (event: Event) => {
    const advertisementEvent = event as BluetoothAdvertisingEvent;
    const device = advertisementEvent.device;
    
    // Update device cache
    this.deviceCache.set(device.id, device);
    
    // Auto-connect if configured
    if (this.config.autoConnect && device.gatt && !device.gatt.connected) {
      this.connectWithRetry(device).catch(console.error);
    }
  };

  /**
   * Clean up resources
   */
  dispose() {
    // Clear all reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
    
    // Remove event listeners
    if (navigator.bluetooth && 'removeEventListener' in navigator.bluetooth) {
      navigator.bluetooth.removeEventListener('advertisementreceived', this.handleAdvertisement);
    }
    
    // Clear cache
    this.deviceCache.clear();
  }
}