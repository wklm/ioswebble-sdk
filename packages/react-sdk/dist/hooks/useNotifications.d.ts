import type { UseNotificationsReturn } from '../types';
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
export declare function useNotifications(characteristic?: BluetoothRemoteGATTCharacteristic | null, options?: NotificationOptions): UseNotificationsReturn;
//# sourceMappingURL=useNotifications.d.ts.map