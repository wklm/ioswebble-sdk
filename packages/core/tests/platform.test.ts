import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { detectPlatform, getBluetoothAPI } from '../src/platform';

// Save original navigator
const originalNavigator = globalThis.navigator;

function mockNavigator(value: any) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
});

describe('detectPlatform', () => {
  it('returns unsupported when navigator is undefined', () => {
    mockNavigator(undefined);
    // detectPlatform checks typeof navigator === 'undefined'
    // With jsdom, navigator always exists, so we need to remove it
    // @ts-ignore
    delete (globalThis as any).navigator;
    expect(detectPlatform()).toBe('unsupported');
  });

  it('returns safari-extension when navigator.webble.__webble is true', () => {
    mockNavigator({ webble: { __webble: true, requestDevice: jest.fn() } });
    expect(detectPlatform()).toBe('safari-extension');
  });

  it('returns native when navigator.bluetooth exists without CDN stub', () => {
    mockNavigator({ bluetooth: { requestDevice: jest.fn() } });
    expect(detectPlatform()).toBe('native');
  });

  it('returns unsupported when navigator.bluetooth has CDN stub', () => {
    mockNavigator({ bluetooth: { __webbleCDNStub: true } });
    expect(detectPlatform()).toBe('unsupported');
  });

  it('returns unsupported when navigator has no bluetooth or webble', () => {
    mockNavigator({});
    expect(detectPlatform()).toBe('unsupported');
  });
});

describe('getBluetoothAPI', () => {
  it('returns null when navigator is undefined', () => {
    // @ts-ignore
    delete (globalThis as any).navigator;
    expect(getBluetoothAPI()).toBeNull();
  });

  it('returns webble object for safari-extension', () => {
    const webble = { __webble: true, requestDevice: jest.fn() };
    mockNavigator({ webble });
    expect(getBluetoothAPI()).toBe(webble);
  });

  it('returns bluetooth object for native', () => {
    const bluetooth = { requestDevice: jest.fn() };
    mockNavigator({ bluetooth });
    expect(getBluetoothAPI()).toBe(bluetooth);
  });

  it('returns null for CDN stub', () => {
    mockNavigator({ bluetooth: { __webbleCDNStub: true } });
    expect(getBluetoothAPI()).toBeNull();
  });
});
