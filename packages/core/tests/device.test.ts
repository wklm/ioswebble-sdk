import { describe, expect, it, jest } from '@jest/globals';
import { WebBLEDevice } from '../src/device';

type MockCharacteristic = {
  value: DataView | null;
  addEventListener: ReturnType<typeof jest.fn>;
  removeEventListener: ReturnType<typeof jest.fn>;
  readValue: ReturnType<typeof jest.fn>;
  startNotifications: ReturnType<typeof jest.fn>;
  stopNotifications: ReturnType<typeof jest.fn>;
  writeValueWithResponse: ReturnType<typeof jest.fn>;
  writeValueWithoutResponse: ReturnType<typeof jest.fn>;
};

type MockService = {
  uuid: string;
  getCharacteristic: ReturnType<typeof jest.fn>;
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises(turns = 6): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

function createConnectedDevice(options?: {
  characteristicPromise?: Promise<MockCharacteristic>;
  startNotificationsPromise?: Promise<MockCharacteristic>;
  writeWithResponsePromise?: Promise<void>;
  writeWithoutResponsePromise?: Promise<void>;
  getMtu?: () => Promise<number | null>;
  getWriteLimits?: () => Promise<{ withResponse?: number | null; withoutResponse?: number | null; mtu?: number | null } | null>;
  getPrimaryServices?: () => Promise<MockService[]>;
}) {
  const addEventListener = jest.fn();
  const removeEventListener = jest.fn();

  const characteristic: MockCharacteristic = {
    value: null,
    addEventListener,
    removeEventListener,
    readValue: jest.fn(() => Promise.resolve(characteristic.value)),
    startNotifications: jest.fn(() => options?.startNotificationsPromise ?? Promise.resolve(characteristic)),
    stopNotifications: jest.fn(() => Promise.resolve()),
    writeValueWithResponse: jest.fn(() => options?.writeWithResponsePromise ?? Promise.resolve()),
    writeValueWithoutResponse: jest.fn(() => options?.writeWithoutResponsePromise ?? Promise.resolve()),
  };

  const service: MockService = {
    uuid: '0000180d-0000-1000-8000-00805f9b34fb',
    getCharacteristic: jest.fn(() => options?.characteristicPromise ?? Promise.resolve(characteristic)),
  };

  const server = {
    connected: true,
    disconnect: jest.fn(),
    getPrimaryService: jest.fn(() => Promise.resolve(service)),
    getPrimaryServices: jest.fn(() => options?.getPrimaryServices?.() ?? Promise.resolve([service])),
  };

  const rawDevice = {
    id: 'device-1',
    name: 'Test Device',
    gatt: {
      connect: jest.fn(() => Promise.resolve(server)),
      getMtu: options?.getMtu,
      getWriteLimits: options?.getWriteLimits,
    },
    addEventListener: jest.fn(),
  } as unknown as ConstructorParameters<typeof WebBLEDevice>[0];

  const device = new WebBLEDevice(rawDevice);

  return {
    device,
    characteristic,
    addEventListener,
    removeEventListener,
    stopNotifications: characteristic.stopNotifications,
    startNotifications: characteristic.startNotifications,
    writeValueWithResponse: characteristic.writeValueWithResponse,
    writeValueWithoutResponse: characteristic.writeValueWithoutResponse,
    getPrimaryService: server.getPrimaryService,
    getPrimaryServices: server.getPrimaryServices,
    service,
  };
}

describe('WebBLEDevice.write', () => {
  it('rejects invalid timeout values', async () => {
    const { device } = createConnectedDevice();

    await device.connect();

    await expect(
      device.write('heart_rate', 'heart_rate_measurement', new Uint8Array([1]), { timeoutMs: 0 }),
    ).rejects.toThrow('Invalid timeoutMs');
  });

  it('writes with response by default', async () => {
    const { device, writeValueWithResponse, writeValueWithoutResponse } = createConnectedDevice();

    await device.connect();

    const value = new Uint8Array([1, 2, 3]);
    await device.write('heart_rate', 'heart_rate_measurement', value);

    expect(writeValueWithResponse).toHaveBeenCalledTimes(1);
    expect(writeValueWithResponse).toHaveBeenCalledWith(value);
    expect(writeValueWithoutResponse).not.toHaveBeenCalled();
  });

  it('times out write with response when timeoutMs elapses first', async () => {
    jest.useFakeTimers();
    try {
      const never = new Promise<void>(() => {});
      const { device } = createConnectedDevice({ writeWithResponsePromise: never });

      await device.connect();

      const promise = device.write('heart_rate', 'heart_rate_measurement', new Uint8Array([1]), { timeoutMs: 25 });
      const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
      await jest.advanceTimersByTimeAsync(25);

      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('preserves native rejection when write fails before timeout', async () => {
    jest.useFakeTimers();
    try {
      const nativeError = new Error('write failed');
      const { device } = createConnectedDevice({ writeWithResponsePromise: Promise.reject(nativeError) });

      await device.connect();

      const promise = device.write('heart_rate', 'heart_rate_measurement', new Uint8Array([1]), { timeoutMs: 50 });
      await Promise.resolve();

      await expect(promise).rejects.toMatchObject({ code: 'GATT_OPERATION_FAILED' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('supports the unified write API for writes without response', async () => {
    const { device, writeValueWithResponse, writeValueWithoutResponse } = createConnectedDevice();

    await device.connect();

    const value = new Uint8Array([4, 5, 6]);
    await device.write('heart_rate', 'heart_rate_measurement', value, { mode: 'without-response' });

    expect(writeValueWithoutResponse).toHaveBeenCalledTimes(1);
    expect(writeValueWithoutResponse).toHaveBeenCalledWith(value);
    expect(writeValueWithResponse).not.toHaveBeenCalled();
  });

  it('keeps writeWithoutResponse as a backward-compatible alias', async () => {
    const { device, writeValueWithResponse, writeValueWithoutResponse } = createConnectedDevice();

    await device.connect();

    const value = new Uint8Array([7, 8, 9]);
    await device.writeWithoutResponse('heart_rate', 'heart_rate_measurement', value);

    expect(writeValueWithoutResponse).toHaveBeenCalledTimes(1);
    expect(writeValueWithoutResponse).toHaveBeenCalledWith(value);
    expect(writeValueWithResponse).not.toHaveBeenCalled();
  });

  it('supports timeoutMs on writeWithoutResponse alias', async () => {
    jest.useFakeTimers();
    try {
      const never = new Promise<void>(() => {});
      const { device } = createConnectedDevice({ writeWithoutResponsePromise: never });

      await device.connect();

      const promise = device.writeWithoutResponse(
        'heart_rate',
        'heart_rate_measurement',
        new Uint8Array([1]),
        { timeoutMs: 30 },
      );
      const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
      await jest.advanceTimersByTimeAsync(30);

      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('writes large payloads in chunks and returns transfer metadata', async () => {
    const { device, writeValueWithResponse } = createConnectedDevice({
      getWriteLimits: async () => ({ withResponse: 5 }),
    });

    await device.connect();

    const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const result = await device.writeLarge('heart_rate', 'heart_rate_measurement', payload);

    expect(writeValueWithResponse).toHaveBeenCalledTimes(2);
    expect((writeValueWithResponse.mock.calls[0]?.[0] as Uint8Array).byteLength).toBe(5);
    expect((writeValueWithResponse.mock.calls[1]?.[0] as Uint8Array).byteLength).toBe(4);
    expect(result).toEqual({
      bytesWritten: 9,
      totalBytes: 9,
      chunkSize: 5,
      chunkCount: 2,
    });
  });

  it('throws WRITE_INCOMPLETE when a later chunk fails', async () => {
    const { device, writeValueWithResponse } = createConnectedDevice({
      getWriteLimits: async () => ({ withResponse: 4 }),
    });

    await device.connect();

    writeValueWithResponse
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementationOnce(() => Promise.reject(new Error('link dropped')));

    const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
    await expect(
      device.writeLarge('heart_rate', 'heart_rate_measurement', payload),
    ).rejects.toMatchObject({ code: 'WRITE_INCOMPLETE' });
  });
});

describe('WebBLEDevice.getWriteLimits', () => {
  it('returns null limits when the underlying platform exposes no transport metadata', async () => {
    const { device } = createConnectedDevice();

    await device.connect();

    await expect(device.getWriteLimits()).resolves.toEqual({
      withResponse: null,
      withoutResponse: null,
      mtu: null,
    });
    await expect(device.getMtu()).resolves.toBeNull();
  });

  it('uses platform-reported write limits when available', async () => {
    const { device } = createConnectedDevice({
      getWriteLimits: async () => ({ withResponse: 185, withoutResponse: 182, mtu: 185 }),
    });

    await device.connect();

    await expect(device.getWriteLimits()).resolves.toEqual({
      withResponse: 185,
      withoutResponse: 182,
      mtu: 185,
    });
    await expect(device.getMtu()).resolves.toBe(185);
  });

  it('falls back to getMtu when only MTU is exposed', async () => {
    const { device } = createConnectedDevice({ getMtu: async () => 247 });

    await device.connect();

    await expect(device.getWriteLimits()).resolves.toEqual({
      withResponse: null,
      withoutResponse: null,
      mtu: 247,
    });
  });

  it('requires an active connection', async () => {
    const { device } = createConnectedDevice();

    await expect(device.getWriteLimits()).rejects.toMatchObject({ code: 'DEVICE_DISCONNECTED' });
  });
});

describe('WebBLEDevice.subscribe', () => {
  it('does not keep a stale callback when unsubscribed before characteristic resolution completes', async () => {
    const characteristicDeferred = deferred<MockCharacteristic>();
    const { device, characteristic, addEventListener, startNotifications } = createConnectedDevice({
      characteristicPromise: characteristicDeferred.promise,
    });

    await device.connect();

    const staleCallback = jest.fn();
    const activeCallback = jest.fn();

    const unsubscribeStale = device.subscribe('heart_rate', 'heart_rate_measurement', staleCallback);
    unsubscribeStale();

    characteristicDeferred.resolve(characteristic);
    await flushPromises();

    expect(startNotifications).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalled();

    device.subscribe('heart_rate', 'heart_rate_measurement', activeCallback);
    await flushPromises();

    expect(startNotifications).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([72]).buffer);
    listener({ target: characteristic } as unknown as Event);

    expect(staleCallback).not.toHaveBeenCalled();
    expect(activeCallback).toHaveBeenCalledTimes(1);
  });

  it('cleans up notification startup when unsubscribe happens before startup settles', async () => {
    const startupDeferred = deferred<MockCharacteristic>();
    const { device, characteristic, addEventListener, removeEventListener, startNotifications, stopNotifications } = createConnectedDevice({
      startNotificationsPromise: startupDeferred.promise,
    });

    await device.connect();

    const callback = jest.fn();
    const unsubscribe = device.subscribe('heart_rate', 'heart_rate_measurement', callback);
    await flushPromises();

    expect(startNotifications).toHaveBeenCalledTimes(1);

    unsubscribe();
    unsubscribe();

    startupDeferred.resolve(characteristic);
    await flushPromises(12);

    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(stopNotifications).toHaveBeenCalledTimes(1);

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([91]).buffer);
    listener({ target: characteristic } as unknown as Event);
    expect(callback).not.toHaveBeenCalled();
  });

  it('shares one native notification lifecycle between subscribe and notifications', async () => {
    const { device, characteristic, addEventListener, removeEventListener, startNotifications, stopNotifications } = createConnectedDevice();

    await device.connect();

    const callback = jest.fn();
    const unsubscribe = device.subscribe('heart_rate', 'heart_rate_measurement', callback);
    const iterator = device.notifications('heart_rate', 'heart_rate_measurement', { maxQueueSize: 16 })[Symbol.asyncIterator]();

    await flushPromises();

    expect(startNotifications).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    const firstValue = new DataView(new Uint8Array([72]).buffer);
    const firstNext = iterator.next();

    characteristic.value = firstValue;
    listener({ target: characteristic } as unknown as Event);

    await expect(firstNext).resolves.toEqual({ value: firstValue, done: false });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(firstValue);

    unsubscribe();
    await flushPromises();

    expect(removeEventListener).not.toHaveBeenCalled();
    expect(stopNotifications).not.toHaveBeenCalled();

    const secondValue = new DataView(new Uint8Array([73]).buffer);
    const secondNext = iterator.next();

    characteristic.value = secondValue;
    listener({ target: characteristic } as unknown as Event);

    await expect(secondNext).resolves.toEqual({ value: secondValue, done: false });
    expect(callback).toHaveBeenCalledTimes(1);

    if (!iterator.return) throw new Error('Async iterator is missing return()');
    await iterator.return(undefined);
    await flushPromises(12);

    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(stopNotifications).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate delivery after re-subscribing to the same characteristic', async () => {
    const { device, characteristic, addEventListener, removeEventListener, startNotifications, stopNotifications } = createConnectedDevice();

    await device.connect();

    const firstCallback = jest.fn();
    const unsubscribeFirst = device.subscribe('heart_rate', 'heart_rate_measurement', firstCallback);
    await flushPromises();

    expect(startNotifications).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);

    const firstListener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([80]).buffer);
    firstListener({ target: characteristic } as unknown as Event);
    expect(firstCallback).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    await flushPromises();

    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(stopNotifications).toHaveBeenCalledTimes(1);

    const secondCallback = jest.fn();
    device.subscribe('heart_rate', 'heart_rate_measurement', secondCallback);
    await flushPromises();

    expect(startNotifications).toHaveBeenCalledTimes(2);
    expect(addEventListener).toHaveBeenCalledTimes(2);

    const secondListener = addEventListener.mock.calls[1]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([81]).buffer);
    secondListener({ target: characteristic } as unknown as Event);

    expect(firstCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it('enables autoRecover by default', async () => {
    const { device } = createConnectedDevice();
    await device.connect();

    const unsubscribe = device.subscribe('heart_rate', 'heart_rate_measurement', jest.fn());
    const registrySize = (device as unknown as { recoveryRegistry: Map<string, unknown> }).recoveryRegistry.size;

    expect(registrySize).toBe(1);
    unsubscribe();
  });

  it('surfaces subscribe startup errors via onError callback', async () => {
    const startupError = new Error('start failed');
    const { device } = createConnectedDevice({
      startNotificationsPromise: Promise.reject(startupError),
    });

    await device.connect();

    const onError = jest.fn();
    device.subscribe('heart_rate', 'heart_rate_measurement', jest.fn(), { onError });
    await flushPromises(12);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: 'GATT_OPERATION_FAILED' });
  });
});

describe('WebBLEDevice.notifications', () => {
  it('throws on queue overflow by default', async () => {
    const { device, characteristic, addEventListener } = createConnectedDevice();
    await device.connect();

    const iterator = device.notifications('heart_rate', 'heart_rate_measurement', { maxQueueSize: 1 })[Symbol.asyncIterator]();
    const bootstrap = iterator.next();
    await flushPromises();

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([1]).buffer);
    listener({ target: characteristic } as unknown as Event);
    await expect(bootstrap).resolves.toEqual({ value: characteristic.value, done: false });

    characteristic.value = new DataView(new Uint8Array([2]).buffer);
    listener({ target: characteristic } as unknown as Event);
    characteristic.value = new DataView(new Uint8Array([3]).buffer);
    listener({ target: characteristic } as unknown as Event);

    await expect(iterator.next()).rejects.toMatchObject({
      message: expect.stringContaining('Notification queue overflowed'),
    });

    if (!iterator.return) throw new Error('Async iterator is missing return()');
    await iterator.return(undefined);
  });

  it('supports drop-oldest overflow strategy with callback', async () => {
    const { device, characteristic, addEventListener } = createConnectedDevice();
    await device.connect();

    const onOverflow = jest.fn();
    const iterator = device.notifications('heart_rate', 'heart_rate_measurement', {
      maxQueueSize: 1,
      overflowStrategy: 'drop-oldest',
      onOverflow,
    })[Symbol.asyncIterator]();
    const bootstrap = iterator.next();
    await flushPromises();

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    const first = new DataView(new Uint8Array([1]).buffer);
    const second = new DataView(new Uint8Array([2]).buffer);
    const third = new DataView(new Uint8Array([3]).buffer);

    characteristic.value = first;
    listener({ target: characteristic } as unknown as Event);
    await expect(bootstrap).resolves.toEqual({ value: first, done: false });

    characteristic.value = second;
    listener({ target: characteristic } as unknown as Event);
    characteristic.value = third;
    listener({ target: characteristic } as unknown as Event);

    await expect(iterator.next()).resolves.toEqual({ value: third, done: false });
    expect(onOverflow).toHaveBeenCalledTimes(1);

    if (!iterator.return) throw new Error('Async iterator is missing return()');
    await iterator.return(undefined);
  });

  it('defaults notifications() to a bounded queue when maxQueueSize is omitted', async () => {
    const { device, characteristic, addEventListener } = createConnectedDevice();
    await device.connect();

    const iterator = device.notifications('heart_rate', 'heart_rate_measurement')[Symbol.asyncIterator]();
    const pending = iterator.next();
    await flushPromises();

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([55]).buffer);
    listener({ target: characteristic } as unknown as Event);

    await expect(pending).resolves.toEqual({ value: characteristic.value, done: false });
    if (!iterator.return) throw new Error('Async iterator is missing return()');
    await iterator.return(undefined);
  });

  it('emits queue-overflow and rejects the next iterator pull after overflow', async () => {
    const { device, characteristic, addEventListener } = createConnectedDevice();
    await device.connect();

    const overflowListener = jest.fn();
    device.on('queue-overflow', overflowListener);

    const iterator = device.notifications('heart_rate', 'heart_rate_measurement', { maxQueueSize: 1 })[Symbol.asyncIterator]();
    const bootstrap = iterator.next();
    await flushPromises();

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([1]).buffer);
    listener({ target: characteristic } as unknown as Event);
    await expect(bootstrap).resolves.toEqual({ value: characteristic.value, done: false });

    characteristic.value = new DataView(new Uint8Array([2]).buffer);
    listener({ target: characteristic } as unknown as Event);
    characteristic.value = new DataView(new Uint8Array([3]).buffer);
    listener({ target: characteristic } as unknown as Event);
    characteristic.value = new DataView(new Uint8Array([4]).buffer);
    listener({ target: characteristic } as unknown as Event);

    await expect(iterator.next()).rejects.toMatchObject({
      message: expect.stringContaining('Notification queue overflowed'),
    });
    expect(overflowListener).toHaveBeenCalledTimes(1);

    if (!iterator.return) throw new Error('Async iterator is missing return()');
    await iterator.return(undefined);
  });
});

describe('WebBLEDevice.connect and disconnect lifecycle', () => {
  it('resolves an existing reconnect gate even when reconnect recovery fails', async () => {
    const characteristicDeferred = deferred<MockCharacteristic>();
    const { device } = createConnectedDevice({ characteristicPromise: characteristicDeferred.promise });
    await device.connect();

    const lostListener = jest.fn();
    device.on('subscription-lost', lostListener);
    device.subscribe('heart_rate', 'heart_rate_measurement', jest.fn());
    await flushPromises();

    const disconnectHandler = (device as unknown as { handleDisconnect: () => void }).handleDisconnect.bind(device);
    disconnectHandler();

    const reconnectPromise = device.connect();
    characteristicDeferred.reject(new Error('service changed'));

    await expect(reconnectPromise).resolves.toBeUndefined();

    const reconnectGate = (device as unknown as { reconnectGate: { promise: Promise<void> } | null }).reconnectGate;
    expect(reconnectGate).toBeNull();
    expect(lostListener).toHaveBeenCalledTimes(1);
  });

  it('tracks the last disconnect reason', async () => {
    const { device } = createConnectedDevice();
    await device.connect();

    device.disconnect();
    expect(device.getLastDisconnectReason()).toBe('intentional');

    const disconnectHandler = (device as unknown as { handleDisconnect: () => void }).handleDisconnect.bind(device);
    (device as unknown as { intentionalDisconnect: boolean }).intentionalDisconnect = false;
    disconnectHandler();

    expect(device.getLastDisconnectReason()).toBe('unexpected');
  });
});

describe('WebBLEDevice advanced APIs', () => {
  it('returns effective MTU from write limits when available', async () => {
    const { device } = createConnectedDevice({
      getWriteLimits: async () => ({ withResponse: 185, withoutResponse: 182, mtu: 188 }),
    });
    await device.connect();

    await expect(device.getEffectiveMtu()).resolves.toBe(188);
  });

  it('falls back to ATT default MTU when transport metadata is unavailable', async () => {
    const { device } = createConnectedDevice();
    await device.connect();

    await expect(device.getEffectiveMtu()).resolves.toBe(23);
  });

  it('returns recovery-only subscriptions from getActiveSubscriptions', async () => {
    const { device } = createConnectedDevice();
    await device.connect();

    const callback = jest.fn();
    device.subscribe('heart_rate', 'heart_rate_measurement', callback);
    await flushPromises();

    const disconnectHandler = (device as unknown as { handleDisconnect: () => void }).handleDisconnect.bind(device);
    (device as unknown as { intentionalDisconnect: boolean }).intentionalDisconnect = false;
    disconnectHandler();

    expect(device.getActiveSubscriptions()).toEqual([
      expect.objectContaining({
        service: '0000180d-0000-1000-8000-00805f9b34fb',
        characteristic: '00002a37-0000-1000-8000-00805f9b34fb',
        callbackCount: 1,
        autoRecovering: true,
        nativeActive: false,
      }),
    ]);
  });

  it('emits subscription-lost when recovery cannot restore a characteristic', async () => {
    const characteristicDeferred = deferred<MockCharacteristic>();
    const { device } = createConnectedDevice({ characteristicPromise: characteristicDeferred.promise });
    await device.connect();

    const lostListener = jest.fn();
    device.on('subscription-lost', lostListener);
    device.subscribe('heart_rate', 'heart_rate_measurement', jest.fn());
    await flushPromises();

    const disconnectHandler = (device as unknown as { handleDisconnect: () => void }).handleDisconnect.bind(device);
    (device as unknown as { intentionalDisconnect: boolean }).intentionalDisconnect = false;
    disconnectHandler();

    const reconnectPromise = device.connect();
    characteristicDeferred.reject(new Error('characteristic not found'));
    await expect(reconnectPromise).resolves.toBeUndefined();

    expect(lostListener).toHaveBeenCalledTimes(1);
    expect(lostListener.mock.calls[0]?.[0]).toMatchObject({
      service: 'heart_rate',
      characteristic: 'heart_rate_measurement',
      error: expect.objectContaining({ code: 'CHARACTERISTIC_NOT_FOUND' }),
    });
  });

  it('routes notification callback failures through addErrorListener', async () => {
    const { device, characteristic, addEventListener } = createConnectedDevice();
    await device.connect();

    const errorListener = jest.fn();
    device.addErrorListener(errorListener);
    device.subscribe('heart_rate', 'heart_rate_measurement', () => {
      throw new Error('callback blew up');
    });
    await flushPromises();

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([7]).buffer);
    listener({ target: characteristic } as unknown as Event);

    expect(errorListener).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'callback blew up' }),
      expect.objectContaining({ operation: 'device.notification-callback' }),
    );
  });

  it('removes error listeners cleanly', async () => {
    const { device, characteristic, addEventListener } = createConnectedDevice();
    await device.connect();

    const errorListener = jest.fn();
    device.addErrorListener(errorListener);
    device.removeErrorListener(errorListener);
    device.subscribe('heart_rate', 'heart_rate_measurement', () => {
      throw new Error('callback blew up');
    });
    await flushPromises();

    const listener = addEventListener.mock.calls[0]?.[1] as (event: Event) => void;
    characteristic.value = new DataView(new Uint8Array([7]).buffer);
    listener({ target: characteristic } as unknown as Event);

    expect(errorListener).not.toHaveBeenCalled();
  });

  it('reuses cached primary services consistently', async () => {
    const primaryService = {
      uuid: '0000180d-0000-1000-8000-00805f9b34fb',
      getCharacteristic: jest.fn(),
    };
    const { device, getPrimaryService, getPrimaryServices } = createConnectedDevice({
      getPrimaryServices: async () => [primaryService],
    });
    await device.connect();

    const services = await device.getPrimaryServices();
    await device.read('heart_rate', 'heart_rate_measurement').catch(() => undefined);

    expect(services[0]).toBe(primaryService);
    expect(getPrimaryServices).toHaveBeenCalledTimes(1);
    expect(getPrimaryService).not.toHaveBeenCalled();
  });

  it('supports async parse functions for typed reads', async () => {
    const { device, characteristic } = createConnectedDevice();
    const rawValue = new DataView(new Uint8Array([42]).buffer);
    characteristic.value = rawValue;

    characteristic.readValue = jest.fn(() => Promise.resolve(rawValue));
    await device.connect();

    const parsed = await device.read('heart_rate', 'heart_rate_measurement', async (value) => ({
      bpm: value.getUint8(0),
    }));

    expect(parsed).toEqual({ bpm: 42 });
  });

  it('returns retry metadata from writeFragmented and preserves WRITE_INCOMPLETE on partial failure', async () => {
    const { device, writeValueWithResponse } = createConnectedDevice({
      getWriteLimits: async () => ({ withResponse: 3 }),
    });
    await device.connect();

    writeValueWithResponse
      .mockImplementationOnce(() => Promise.reject(new Error('busy')))
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementationOnce(() => Promise.resolve());

    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const result = await device.writeFragmented('heart_rate', 'heart_rate_measurement', payload, { maxRetries: 1 });

    expect(result).toEqual({
      bytesWritten: 5,
      totalBytes: 5,
      chunkSize: 3,
      chunkCount: 2,
      retryCount: 1,
    });

    writeValueWithResponse.mockReset();
    writeValueWithResponse
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementationOnce(() => Promise.reject(new Error('link dropped')));

    await expect(
      device.writeFragmented('heart_rate', 'heart_rate_measurement', new Uint8Array([1, 2, 3, 4, 5, 6]), { maxRetries: 0 }),
    ).rejects.toMatchObject({ code: 'WRITE_INCOMPLETE', retryAfterMs: 1000 });
  });
});
