import { describe, expect, it, jest } from '@jest/globals';
import { WebBLE } from '../src/webble';

type MockBluetooth = {
  requestDevice: ReturnType<typeof jest.fn>;
  getAvailability: ReturnType<typeof jest.fn>;
  getDevices?: ReturnType<typeof jest.fn>;
};

function setNavigatorBluetooth(bluetooth: MockBluetooth) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: { bluetooth },
  });
}

describe('WebBLE.requestDevice', () => {
  it('normalizes service UUID fields before forwarding request options', async () => {
    const requestDevice = jest.fn(async () => ({ id: 'device-1', addEventListener: jest.fn(), gatt: { connect: jest.fn() } }));
    setNavigatorBluetooth({ requestDevice, getAvailability: jest.fn() });

    const ble = new WebBLE();
    await ble.requestDevice({
      filters: [{ services: ['heart_rate', '180F'], namePrefix: 'HR' }],
      exclusionFilters: [{ services: ['0000180D', '12345678-1234-1234-1234-ABCDEFABCDEF'], name: 'Skip' }],
      optionalServices: ['battery_service', '12345678-1234-1234-1234-ABCDEFABCDEF'],
      optionalManufacturerData: [0x004C],
    });

    const firstCall = requestDevice.mock.calls[0] as unknown as [unknown] | undefined;
    expect(firstCall?.[0]).toEqual({
      filters: [{
        services: [
          '0000180d-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb',
        ],
        namePrefix: 'HR',
      }],
      exclusionFilters: [{
        services: [
          '0000180d-0000-1000-8000-00805f9b34fb',
          '12345678-1234-1234-1234-abcdefabcdef',
        ],
        name: 'Skip',
      }],
      optionalServices: [
        '0000180f-0000-1000-8000-00805f9b34fb',
        '12345678-1234-1234-1234-abcdefabcdef',
      ],
      optionalManufacturerData: [0x004C],
    });
  });

  it('keeps default acceptAllDevices behavior when options are omitted', async () => {
    const requestDevice = jest.fn(async () => ({ id: 'device-2', addEventListener: jest.fn(), gatt: { connect: jest.fn() } }));
    setNavigatorBluetooth({ requestDevice, getAvailability: jest.fn() });

    const ble = new WebBLE();
    await ble.requestDevice();

    const firstCall = requestDevice.mock.calls[0] as unknown as [unknown] | undefined;
    expect(firstCall?.[0]).toEqual({ acceptAllDevices: true });
  });
});

describe('WebBLE.getDevices', () => {
  it('returns wrapped devices when the platform exposes getDevices', async () => {
    const getDevices = jest.fn(async () => ([
      { id: 'device-1', name: 'One', addEventListener: jest.fn(), gatt: { connect: jest.fn() } },
      { id: 'device-2', name: 'Two', addEventListener: jest.fn(), gatt: { connect: jest.fn() } },
    ]));
    setNavigatorBluetooth({ requestDevice: jest.fn(), getAvailability: jest.fn(), getDevices });

    const ble = new WebBLE();
    const devices = await ble.getDevices();

    expect(getDevices).toHaveBeenCalledTimes(1);
    expect(devices.map((device) => device.id)).toEqual(['device-1', 'device-2']);
  });

  it('returns an empty list when getDevices is unavailable', async () => {
    setNavigatorBluetooth({ requestDevice: jest.fn(), getAvailability: jest.fn() });

    const ble = new WebBLE();

    await expect(ble.getDevices()).resolves.toEqual([]);
  });

  it('exposes unified backgroundSync and peripheral surfaces from the runtime bluetooth object', async () => {
    const backgroundSync = {
      connect: jest.fn(),
      subscribe: jest.fn(),
      scan: jest.fn(),
      list: jest.fn(),
      requestPermission: jest.fn(),
      requestBackgroundConnection: jest.fn(),
      registerCharacteristicNotifications: jest.fn(),
      registerBeaconScanning: jest.fn(),
      getRegistrations: jest.fn(),
      unregister: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
    };
    const peripheral = {
      advertising: false,
      advertise: jest.fn(),
      startAdvertising: jest.fn(),
      stopAdvertising: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onwriterequest: null,
      onconnectionstatechange: null,
      onadvertisingstatechange: null,
      destroy: jest.fn(),
    };
    setNavigatorBluetooth({
      requestDevice: jest.fn(),
      getAvailability: jest.fn(),
      getDevices: jest.fn(),
      backgroundSync,
      peripheral,
      __webble: true,
    } as unknown as MockBluetooth);

    const ble = new WebBLE();

    expect(ble.backgroundSync).toBe(backgroundSync);
    expect(ble.peripheral).toBe(peripheral);
  });

  it('provides explicit unsupported proxies for relay-only APIs when unavailable', async () => {
    setNavigatorBluetooth({ requestDevice: jest.fn(), getAvailability: jest.fn() });

    const ble = new WebBLE();

    expect(() => ble.backgroundSync.list()).toThrow('This WebBLE feature requires the iOS Safari WebBLE extension runtime.');
    expect(() => ble.peripheral.startAdvertising()).toThrow('This WebBLE feature requires the iOS Safari WebBLE extension runtime.');
  });
});
