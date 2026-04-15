import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WebBLEProvider } from '../../src/core/WebBLEProvider';
import { useCharacteristic } from '../../src/hooks/useCharacteristic';

function createMockDevice() {
  const characteristic = {
    uuid: 'char-uuid',
    service: { uuid: 'service-uuid' },
    properties: {
      read: true,
      write: true,
      writeWithoutResponse: true,
      notify: true,
      indicate: false,
      broadcast: false,
      authenticatedSignedWrites: false,
      reliableWrite: false,
      writableAuxiliaries: false,
    },
    getDescriptor: jest.fn().mockResolvedValue({ uuid: 'descriptor-1' }),
    getDescriptors: jest.fn().mockResolvedValue([{ uuid: 'descriptor-1' }]),
  };

  const service = {
    uuid: 'service-uuid',
    getCharacteristic: jest.fn().mockResolvedValue(characteristic),
  };

  const unsubscribe = jest.fn();

  const device = {
    id: 'device-1',
    name: 'Device',
    connected: true,
    raw: {
      gatt: {
        getPrimaryService: jest.fn().mockResolvedValue(service),
      },
    },
    getPrimaryServices: jest.fn().mockResolvedValue([service]),
    read: jest.fn().mockResolvedValue(new DataView(new Uint8Array([1, 2, 3]).buffer)),
    write: jest.fn().mockResolvedValue(undefined),
    writeWithoutResponse: jest.fn().mockResolvedValue(undefined),
    subscribeAsync: jest.fn().mockImplementation(async (_svc, _char, callback) => {
      callback(new DataView(new Uint8Array([9]).buffer));
      return unsubscribe;
    }),
  };

  return { device, characteristic, unsubscribe };
}

describe('useCharacteristic', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WebBLEProvider>{children}</WebBLEProvider>
  );

  it('resolves the characteristic from device and uuids', () => {
    const { device } = createMockDevice();
    const { result } = renderHook(() => useCharacteristic(device as never, 'service-uuid', 'char-uuid'), { wrapper });

    expect(result.current.characteristicUUID).toBe('char-uuid');
    expect(result.current.serviceUUID).toBe('service-uuid');
  });

  it('reads and writes through core device methods', async () => {
    const { device } = createMockDevice();
    const { result } = renderHook(() => useCharacteristic(device as never, 'service-uuid', 'char-uuid'), { wrapper });

    await act(async () => {
      await result.current.read();
      await result.current.write(new Uint8Array([4]));
      await result.current.writeWithoutResponse(new Uint8Array([5]));
    });

    expect(device.read).toHaveBeenCalledWith('service-uuid', 'char-uuid');
    expect(device.write).toHaveBeenCalledWith('service-uuid', 'char-uuid', expect.any(Uint8Array));
    expect(device.writeWithoutResponse).toHaveBeenCalledWith('service-uuid', 'char-uuid', expect.any(Uint8Array));
    expect(result.current.value?.getUint8(0)).toBe(1);
  });

  it('subscribes and unsubscribes using device.subscribe', async () => {
    const { device, unsubscribe } = createMockDevice();
    const handler = jest.fn();
    const { result } = renderHook(() => useCharacteristic(device as never, 'service-uuid', 'char-uuid'), { wrapper });

    await act(async () => {
      await result.current.subscribe(handler);
    });

    expect(device.subscribeAsync).toHaveBeenCalledWith('service-uuid', 'char-uuid', expect.any(Function));
    expect(handler).toHaveBeenCalled();
    expect(result.current.isNotifying).toBe(true);

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(unsubscribe).toHaveBeenCalled();
    expect(result.current.isNotifying).toBe(false);
  });
});
