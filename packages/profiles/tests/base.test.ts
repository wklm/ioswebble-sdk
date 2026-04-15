import { describe, expect, it, jest } from '@jest/globals';
import { defineProfile, parseRawBytes } from '../src/base';

type MockDevice = {
  connect: ReturnType<typeof jest.fn>;
  read: ReturnType<typeof jest.fn>;
  write: ReturnType<typeof jest.fn>;
  writeWithoutResponse: ReturnType<typeof jest.fn>;
  subscribe: ReturnType<typeof jest.fn>;
  disconnect: ReturnType<typeof jest.fn>;
  id: string;
  name: string;
  connected: boolean;
};

function makeMockDevice(): MockDevice {
  return {
    connect: jest.fn(async () => undefined),
    read: jest.fn(async () => new DataView(new Uint8Array([42]).buffer)),
    write: jest.fn(async () => undefined),
    writeWithoutResponse: jest.fn(async () => undefined),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    disconnect: jest.fn(),
    id: 'test-device',
    name: 'Test Device',
    connected: true,
  };
}

describe('defineProfile', () => {
  const TestProfile = defineProfile({
    name: 'test',
    service: 'battery_service',
    characteristics: {
      level: {
        uuid: 'battery_level',
        capabilities: ['read', 'notify'],
        parse: (dv: DataView) => dv.getUint8(0),
      },
      command: {
        uuid: 'battery_level',
        capabilities: ['writeWithoutResponse'],
        serialize: (value: number) => new Uint8Array([value]),
      },
      config: {
        uuid: '2a00',
        capabilities: ['read', 'write'],
        parse: (dv: DataView) => dv.getUint8(0),
        serialize: (value: number) => new Uint8Array([value]),
      },
    },
  });

  it('parseRawBytes converts buffers into DataView', () => {
    const value = parseRawBytes(new Uint8Array([1, 2, 3]));
    expect(value).toBeInstanceOf(DataView);
    expect(value.getUint8(1)).toBe(2);
  });

  it('creates a profile class', () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);
    expect(profile).toBeDefined();
  });

  it('readChar calls device.read and parses result', async () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);
    const value = await profile.readChar('level');
    expect(value).toBe(42);
    expect(device.read).toHaveBeenCalled();
  });

  it('subscribeChar calls device.subscribe', () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);
    const cb = jest.fn();
    const unsub = profile.subscribeChar('level', cb);
    expect(device.subscribe).toHaveBeenCalled();
    expect(typeof unsub).toBe('function');
  });

  it('writeChar serializes values and delegates to device.write', async () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);

    await profile.writeChar('command', 9);

    expect(device.writeWithoutResponse).toHaveBeenCalledWith(
      'battery_service',
      'battery_level',
      new Uint8Array([9]),
      { mode: 'without-response' },
    );
  });

  it('writeChar supports explicit write mode selection', async () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);

    await profile.writeChar('command', 7, { mode: 'without-response' });

    expect(device.writeWithoutResponse).toHaveBeenCalledWith(
      'battery_service',
      'battery_level',
      new Uint8Array([7]),
      { mode: 'without-response' },
    );
  });

  it('writeChar defaults to with-response when supported', async () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);

    await profile.writeChar('config', 5);

    expect(device.write).toHaveBeenCalledWith(
      'battery_service',
      '2a00',
      new Uint8Array([5]),
      { mode: 'with-response' },
    );
  });

  it('rejects invalid profile definitions at definition time', () => {
    expect(() => defineProfile({
      name: 'invalid',
      service: 'battery_service',
      characteristics: {
        broken: {
          uuid: 'battery_level',
          capabilities: ['write'],
        },
      },
    } as never)).toThrow('Characteristic broken declares write capability but is missing serialize()');
  });

  it('connect delegates to device.connect', async () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);
    await profile.connect();
    expect(device.connect).toHaveBeenCalled();
  });

  it('stop cleans up subscriptions', () => {
    const unsubFn = jest.fn();
    const device = makeMockDevice();
    device.subscribe.mockReturnValue(unsubFn);
    const profile = new TestProfile(device as never);
    profile.subscribeChar('level', jest.fn());
    profile.stop();
    expect(unsubFn).toHaveBeenCalled();
  });

  it('dispose remains compatible with stop()', () => {
    const unsubFn = jest.fn();
    const device = makeMockDevice();
    device.subscribe.mockReturnValue(unsubFn);
    const profile = new TestProfile(device as never);

    profile.subscribeChar('level', jest.fn());
    profile.dispose();

    expect(unsubFn).toHaveBeenCalled();
  });

  it('exposes canonical service and characteristic metadata', () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device as never);

    expect(profile.getServiceUUID()).toBe('battery_service');
    expect(profile.getCharacteristicUUID('config')).toBe('2a00');
    expect(profile.getCharacteristicCapabilities('level')).toEqual(['read', 'notify']);
  });
});
