import { defineProfile } from '../src/base';
import type { WebBLEDevice } from '@ios-web-bluetooth/core';

function makeMockDevice(): WebBLEDevice {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue(
      new DataView(new Uint8Array([42]).buffer),
    ),
    write: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    disconnect: jest.fn(),
    id: 'test-device',
    name: 'Test Device',
    connected: true,
  } as unknown as WebBLEDevice;
}

describe('defineProfile', () => {
  const TestProfile = defineProfile({
    name: 'test',
    service: 'battery_service',
    characteristics: {
      level: {
        uuid: 'battery_level',
        parse: (dv: DataView) => dv.getUint8(0),
      },
    },
  });

  it('creates a profile class', () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device);
    expect(profile).toBeDefined();
  });

  it('readChar calls device.read and parses result', async () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device);
    const value = await profile.readChar('level');
    expect(value).toBe(42);
    expect(device.read).toHaveBeenCalled();
  });

  it('subscribeChar calls device.subscribe', () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device);
    const cb = jest.fn();
    const unsub = profile.subscribeChar('level', cb);
    expect(device.subscribe).toHaveBeenCalled();
    expect(typeof unsub).toBe('function');
  });

  it('connect delegates to device.connect', async () => {
    const device = makeMockDevice();
    const profile = new TestProfile(device);
    await profile.connect();
    expect(device.connect).toHaveBeenCalled();
  });

  it('stop cleans up subscriptions', () => {
    const unsubFn = jest.fn();
    const device = makeMockDevice();
    (device.subscribe as jest.Mock).mockReturnValue(unsubFn);
    const profile = new TestProfile(device);
    profile.subscribeChar('level', jest.fn());
    profile.stop();
    expect(unsubFn).toHaveBeenCalled();
  });
});
