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
export declare function useCharacteristic(characteristic?: BluetoothRemoteGATTCharacteristic | null, service?: BluetoothRemoteGATTService | null, device?: BluetoothDevice | null): UseCharacteristicReturn;
//# sourceMappingURL=useCharacteristic.d.ts.map