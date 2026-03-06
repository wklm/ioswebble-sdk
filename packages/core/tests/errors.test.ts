import { WebBLEError } from '../src/errors';

describe('WebBLEError', () => {
  it('sets code, hint, and name', () => {
    const err = new WebBLEError('UNSUPPORTED');
    expect(err.code).toBe('UNSUPPORTED');
    expect(err.hint).toBe('Web Bluetooth not available on this platform');
    expect(err.name).toBe('WebBLEError');
    expect(err.message).toBe(err.hint);
  });

  it('appends custom message to hint', () => {
    const err = new WebBLEError('GATT_ERROR', 'read failed');
    expect(err.hint).toBe('GATT operation failed: read failed');
  });

  it('is instanceof Error', () => {
    expect(new WebBLEError('TIMEOUT')).toBeInstanceOf(Error);
  });
});

describe('WebBLEError.from', () => {
  it('returns same instance for WebBLEError input', () => {
    const original = new WebBLEError('TIMEOUT');
    expect(WebBLEError.from(original)).toBe(original);
  });

  it('maps "User cancelled" to USER_CANCELLED', () => {
    const err = WebBLEError.from(new Error('User cancelled the request'));
    expect(err.code).toBe('USER_CANCELLED');
  });

  it('maps "User canceled" (US spelling) to USER_CANCELLED', () => {
    const err = WebBLEError.from(new Error('User canceled'));
    expect(err.code).toBe('USER_CANCELLED');
  });

  it('maps "no devices found" to DEVICE_NOT_FOUND', () => {
    const err = WebBLEError.from(new Error('no devices found'));
    expect(err.code).toBe('DEVICE_NOT_FOUND');
  });

  it('maps "No Devices" to DEVICE_NOT_FOUND', () => {
    const err = WebBLEError.from(new Error('No Devices'));
    expect(err.code).toBe('DEVICE_NOT_FOUND');
  });

  it('defaults to GATT_ERROR for unknown errors', () => {
    const err = WebBLEError.from(new Error('something else'));
    expect(err.code).toBe('GATT_ERROR');
    expect(err.hint).toContain('something else');
  });

  it('handles string input', () => {
    const err = WebBLEError.from('raw string error');
    expect(err.code).toBe('GATT_ERROR');
    expect(err.hint).toContain('raw string error');
  });

  it('uses provided fallback code', () => {
    const err = WebBLEError.from(new Error('oops'), 'TIMEOUT');
    expect(err.code).toBe('TIMEOUT');
  });
});
