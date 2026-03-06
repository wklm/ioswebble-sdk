/**
 * WebBLEClient - Core client wrapper for Web Bluetooth API
 * Provides a unified interface for all Bluetooth operations
 */
interface WebBLEConfig {
    autoConnect?: boolean;
    cacheTimeout?: number;
    retryAttempts?: number;
    apiKey?: string;
}
export declare class WebBLEClient {
    private config;
    private deviceCache;
    private reconnectTimers;
    constructor(config?: WebBLEConfig);
    /**
     * Request a Bluetooth device from the user
     */
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice | null>;
    /**
     * Get list of previously paired devices
     */
    getDevices(): Promise<BluetoothDevice[]>;
    /**
     * Start scanning for BLE advertisements
     */
    requestLEScan(options?: BluetoothLEScanOptions): Promise<BluetoothLEScan | null>;
    /**
     * Connect to a device with retry logic
     */
    private connectWithRetry;
    /**
     * Schedule a reconnection attempt
     */
    private scheduleReconnect;
    /**
     * Delay helper for retry logic
     */
    private delay;
    /**
     * Handle advertisement received event
     */
    private handleAdvertisement;
    /**
     * Clean up resources
     */
    dispose(): void;
}
export {};
//# sourceMappingURL=WebBLEClient.d.ts.map