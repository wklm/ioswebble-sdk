import { WebBLEError } from '../src/errors';

describe('WebBLEError', () => {
  it('sets code, suggestion, and name', () => {
    const err = new WebBLEError('BLUETOOTH_UNAVAILABLE');
    expect(err.code).toBe('BLUETOOTH_UNAVAILABLE');
    expect(err.suggestion).toBe('Check that the browser supports Web Bluetooth and the device has Bluetooth enabled.');
    expect(err.name).toBe('WebBLEError');
    expect(err.message).toBe(err.suggestion);
  });

  it('uses custom message instead of default suggestion for message', () => {
    const err = new WebBLEError('GATT_OPERATION_FAILED', 'read failed');
    expect(err.message).toBe('read failed');
    expect(err.suggestion).toBe('The GATT operation failed. The device may have disconnected or the characteristic may be busy.');
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

  it('defaults to GATT_OPERATION_FAILED for unknown errors', () => {
    const err = WebBLEError.from(new Error('something else'));
    expect(err.code).toBe('GATT_OPERATION_FAILED');
    expect(err.message).toContain('something else');
  });

  it('handles string input', () => {
    const err = WebBLEError.from('raw string error');
    expect(err.code).toBe('GATT_OPERATION_FAILED');
    expect(err.message).toContain('raw string error');
  });

  it('uses provided fallback code', () => {
    const err = WebBLEError.from(new Error('oops'), 'TIMEOUT');
    expect(err.code).toBe('TIMEOUT');
  });
});
