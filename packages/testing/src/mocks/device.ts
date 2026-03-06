/**
 * Mock BLE Device — stateful device with GATT server, services, characteristics
 */

import {
  MockGATTServer,
  type MockServiceConfig,
} from './characteristics';

let deviceIdCounter = 0;

export interface MockDeviceOptions {
  /** Device ID (auto-generated if not provided) */
  id?: string;
  /** Device name */
  name?: string;
  /** Advertised service UUIDs */
  serviceUUIDs?: string[];
  /** GATT service configurations */
  services?: MockServiceConfig[];
  /** Initial RSSI value */
  rssi?: number;
}

export class MockBleDevice {
  readonly id: string;
  readonly name: string | undefined;
  private _serviceUUIDs: string[];
  private _gatt: MockGATTServer;
  private _listeners: Map<string, Set<EventListener>> = new Map();
  private _rssi: number;

  constructor(options: MockDeviceOptions = {}) {
    this.id = options.id ?? `mock-device-${++deviceIdCounter}`;
    this.name = options.name;
    this._serviceUUIDs = options.serviceUUIDs ?? [];
    this._gatt = new MockGATTServer(this, options.services ?? []);
    this._rssi = options.rssi ?? -60;
  }

  /** Check if this device matches a scan filter */
  matchesFilter(filter: BluetoothLEScanFilter): boolean {
    if (filter.services) {
      const hasService = filter.services.some((uuid) =>
        this._serviceUUIDs.includes(String(uuid))
      );
      if (!hasService) return false;
    }
    if (filter.name && filter.name !== this.name) return false;
    if (filter.namePrefix && !this.name?.startsWith(filter.namePrefix))
      return false;
    return true;
  }

  /** Return a Web Bluetooth-compatible BluetoothDevice object */
  asBluetoothDevice(): BluetoothDevice {
    const self = this;
    // Build the device proxy first, then wire up gatt to avoid circular calls
    const proxy = {
      id: this.id,
      name: this.name ?? null,
      gatt: null as unknown as BluetoothRemoteGATTServer,
      watchAdvertisements: async () => {},
      addEventListener: (type: string, listener: EventListener) => {
        self._addListener(type, listener);
      },
      removeEventListener: (type: string, listener: EventListener) => {
        self._removeListener(type, listener);
      },
      dispatchEvent: (_event: Event) => true,
      forget: async () => {},
      onadvertisementreceived: null,
      ongattserverdisconnected: null,
      oncharacteristicvaluechanged: null,
      onserviceadded: null,
      onservicechanged: null,
      onserviceremoved: null,
    } as unknown as BluetoothDevice;
    // Wire gatt with a back-reference to the proxy (no recursion)
    (proxy as any).gatt = this._gatt.asBluetoothRemoteGATTServer(proxy);
    return proxy;
  }

  /** Simulate a disconnect event */
  simulateDisconnect(): void {
    this._gatt.disconnect();
    this._emit('gattserverdisconnected', new Event('gattserverdisconnected'));
  }

  /** Get the mock GATT server for direct test control */
  get gatt(): MockGATTServer {
    return this._gatt;
  }

  // --- Internal ---

  private _addListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type)!.add(listener);
  }

  private _removeListener(type: string, listener: EventListener): void {
    this._listeners.get(type)?.delete(listener);
  }

  private _emit(type: string, event: Event): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}
