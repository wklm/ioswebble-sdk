import {
  createMockBluetooth,
  installMockBluetooth,
  MockBleDevice,
  BLE_UUIDS,
  devices,
} from '../src';

describe('MockBluetooth', () => {
  let mock: ReturnType<typeof createMockBluetooth>;

  beforeEach(() => {
    mock = createMockBluetooth();
  });

  afterEach(() => {
    mock.reset();
  });

  test('reports availability', async () => {
    expect(await mock.getAvailability()).toBe(true);
    mock.setAvailable(false);
    expect(await mock.getAvailability()).toBe(false);
  });

  test('throws when Bluetooth unavailable', async () => {
    mock.setAvailable(false);
    await expect(mock.requestDevice()).rejects.toThrow('not available');
  });

  test('requestDevice finds matching device by service', async () => {
    mock.addDevice(devices.heartRate());
    const device = await mock.requestDevice({
      filters: [{ services: [BLE_UUIDS.services.HEART_RATE] }],
    });
    expect(device.name).toBe('Mock HR Sensor');
  });

  test('requestDevice throws when no match', async () => {
    mock.addDevice(devices.heartRate());
    await expect(
      mock.requestDevice({
        filters: [{ services: ['nonexistent-uuid'] }],
      })
    ).rejects.toThrow('No devices found');
  });

  test('requestDevice with acceptAllDevices returns all', async () => {
    mock.addDevice(devices.heartRate());
    mock.addDevice(devices.battery());
    const device = await mock.requestDevice({ acceptAllDevices: true });
    expect(device).toBeDefined();
  });

  test('getDevices returns registered devices', async () => {
    mock.addDevice(devices.heartRate());
    mock.addDevice(devices.battery());
    const allDevices = await mock.getDevices();
    expect(allDevices).toHaveLength(2);
  });

  test('filter by name prefix', async () => {
    mock.addDevice(devices.heartRate('Polar H10'));
    mock.addDevice(devices.battery('Samsung Watch'));
    const device = await mock.requestDevice({
      filters: [{ namePrefix: 'Polar' }],
    });
    expect(device.name).toBe('Polar H10');
  });

  test('reset clears all state', async () => {
    mock.addDevice(devices.heartRate());
    mock.reset();
    const allDevices = await mock.getDevices();
    expect(allDevices).toHaveLength(0);
    expect(await mock.getAvailability()).toBe(true);
  });
});

describe('MockBleDevice GATT operations', () => {
  let mock: ReturnType<typeof createMockBluetooth>;

  beforeEach(() => {
    mock = createMockBluetooth();
  });

  afterEach(() => {
    mock.reset();
  });

  test('connect and read characteristic', async () => {
    mock.addDevice(devices.heartRate());
    const btDevice = await mock.requestDevice({
      filters: [{ services: [BLE_UUIDS.services.HEART_RATE] }],
    });

    const server = await btDevice.gatt!.connect();
    expect(server.connected).toBe(true);

    const service = await server.getPrimaryService(
      BLE_UUIDS.services.HEART_RATE
    );
    const char = await service.getCharacteristic(
      BLE_UUIDS.characteristics.HEART_RATE_MEASUREMENT
    );
    const value = await char.readValue();
    expect(value.getUint8(1)).toBe(72); // 72 bpm
  });

  test('write characteristic stores value', async () => {
    const device = mock.addDevice({
      name: 'Write Test',
      serviceUUIDs: ['test-service'],
      services: [
        {
          uuid: 'test-service',
          characteristics: [
            {
              uuid: 'test-char',
              properties: { read: true, write: true },
              value: new Uint8Array([0]),
            },
          ],
        },
      ],
    });

    const btDevice = device.asBluetoothDevice();
    await btDevice.gatt!.connect();
    const service = await btDevice.gatt!.getPrimaryService('test-service');
    const char = await service.getCharacteristic('test-char');

    await char.writeValue(new Uint8Array([42]).buffer);
    const value = await char.readValue();
    expect(value.getUint8(0)).toBe(42);
  });

  test('notification pump delivers events', async () => {
    const device = mock.addDevice(devices.heartRate());
    const btDevice = device.asBluetoothDevice();
    await btDevice.gatt!.connect();

    const service = await btDevice.gatt!.getPrimaryService(
      BLE_UUIDS.services.HEART_RATE
    );
    const char = await service.getCharacteristic(
      BLE_UUIDS.characteristics.HEART_RATE_MEASUREMENT
    );

    await char.startNotifications();

    const received: number[] = [];
    char.addEventListener('characteristicvaluechanged', ((event: Event) => {
      const target = (event as any).target;
      received.push(target.value.getUint8(1));
    }) as EventListener);

    // Pump notifications via mock device
    const mockChar = device.gatt
      .getService(BLE_UUIDS.services.HEART_RATE)
      ?.getChar(BLE_UUIDS.characteristics.HEART_RATE_MEASUREMENT);

    mockChar!.emitNotification(new Uint8Array([0x00, 80]));
    mockChar!.emitNotification(new Uint8Array([0x00, 85]));
    mockChar!.emitNotification(new Uint8Array([0x00, 90]));

    expect(received).toEqual([80, 85, 90]);
  });

  test('disconnect emits event', async () => {
    const device = mock.addDevice(devices.heartRate());
    const btDevice = device.asBluetoothDevice();
    await btDevice.gatt!.connect();

    let disconnected = false;
    btDevice.addEventListener('gattserverdisconnected', () => {
      disconnected = true;
    });

    device.simulateDisconnect();
    expect(disconnected).toBe(true);
    expect(btDevice.gatt!.connected).toBe(false);
  });

  test('GATT operations throw when disconnected', async () => {
    const device = mock.addDevice(devices.heartRate());
    const btDevice = device.asBluetoothDevice();

    // Not connected yet — getPrimaryService should throw
    await expect(
      btDevice.gatt!.getPrimaryService(BLE_UUIDS.services.HEART_RATE)
    ).rejects.toThrow('disconnected');
  });

  test('service not found throws', async () => {
    const device = mock.addDevice(devices.heartRate());
    const btDevice = device.asBluetoothDevice();
    await btDevice.gatt!.connect();

    await expect(
      btDevice.gatt!.getPrimaryService('nonexistent')
    ).rejects.toThrow('No Services matching');
  });

  test('read on non-readable characteristic throws', async () => {
    const device = mock.addDevice({
      name: 'No Read',
      serviceUUIDs: ['svc'],
      services: [
        {
          uuid: 'svc',
          characteristics: [
            {
              uuid: 'chr',
              properties: { read: false, notify: true },
            },
          ],
        },
      ],
    });

    const btDevice = device.asBluetoothDevice();
    await btDevice.gatt!.connect();
    const service = await btDevice.gatt!.getPrimaryService('svc');
    const char = await service.getCharacteristic('chr');

    await expect(char.readValue()).rejects.toThrow('does not support read');
  });
});

describe('installMockBluetooth', () => {
  test('installs on navigator.bluetooth', () => {
    const mock = installMockBluetooth({ available: true });
    expect((navigator as any).bluetooth).toBe(mock);
    mock.reset();
  });
});

describe('device factories', () => {
  test('heartRate factory produces valid config', () => {
    const config = devices.heartRate();
    expect(config.name).toBe('Mock HR Sensor');
    expect(config.serviceUUIDs).toContain(BLE_UUIDS.services.HEART_RATE);
    expect(config.services![0].characteristics).toHaveLength(2);
  });

  test('battery factory produces valid config', () => {
    const config = devices.battery();
    expect(config.name).toBe('Mock Battery Device');
    expect(config.services![0].characteristics).toHaveLength(1);
  });

  test('full factory has multiple services', () => {
    const config = devices.full();
    expect(config.services).toHaveLength(3);
    expect(config.serviceUUIDs).toHaveLength(3);
  });
});
