/**
 * Bluetooth utility functions for the React SDK
 */
/**
 * Get the human-readable name for a service UUID.
 * Accepts short-form (0X1800), hex (1800), or canonical UUIDs.
 */
export declare function getServiceName(uuid: string): string;
/**
 * Get the human-readable name for a characteristic UUID.
 * Accepts short-form (0X2A37), hex (2a37), or canonical UUIDs.
 */
export declare function getCharacteristicName(uuid: string): string;
/**
 * Parse a DataView value based on the characteristic UUID
 */
export declare function parseValue(value: DataView, uuid: string): any;
/**
 * Format a value for writing to a characteristic
 */
export declare function formatValue(value: any, uuid: string): ArrayBuffer;
/**
 * Convert a UUID to its canonical form
 */
export declare function canonicalUUID(uuid: string | number): string;
/**
 * Check if a device name matches a filter
 */
export declare function matchesNameFilter(deviceName: string | undefined, filter: {
    name?: string;
    namePrefix?: string;
}): boolean;
/**
 * Calculate distance from RSSI (rough estimation)
 */
export declare function calculateDistance(rssi: number, txPower?: number): number;
/**
 * Format bytes to human readable string
 */
export declare function formatBytes(bytes: number): string;
/**
 * Debounce function for event handlers
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
