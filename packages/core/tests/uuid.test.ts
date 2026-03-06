import { resolveUUID, getServiceName, getCharacteristicName } from '../src/uuid';

const BASE = '-0000-1000-8000-00805f9b34fb';

describe('resolveUUID', () => {
  it('resolves named service to full UUID', () => {
    expect(resolveUUID('heart_rate')).toBe('0000180d' + BASE);
  });

  it('resolves named characteristic to full UUID', () => {
    expect(resolveUUID('heart_rate_measurement')).toBe('00002a37' + BASE);
  });

  it('expands 4-hex shorthand', () => {
    expect(resolveUUID('180d')).toBe('0000180d' + BASE);
  });

  it('expands 8-hex shorthand', () => {
    expect(resolveUUID('0000180d')).toBe('0000180d' + BASE);
  });

  it('passes through full 128-bit UUID', () => {
    const full = '12345678-1234-1234-1234-123456789abc';
    expect(resolveUUID(full)).toBe(full);
  });

  it('lowercases input', () => {
    expect(resolveUUID('180D')).toBe('0000180d' + BASE);
  });

  it('passes through unknown names as-is (lowercased)', () => {
    expect(resolveUUID('unknown_thing')).toBe('unknown_thing');
  });
});

describe('getServiceName', () => {
  it('returns name for known service UUID', () => {
    expect(getServiceName('0000180d' + BASE)).toBe('heart_rate');
  });

  it('returns undefined for unknown UUID', () => {
    expect(getServiceName('00000000' + BASE)).toBeUndefined();
  });

  it('is case-insensitive', () => {
    expect(getServiceName('0000180D' + BASE)).toBe('heart_rate');
  });
});

describe('getCharacteristicName', () => {
  it('returns name for known characteristic UUID', () => {
    expect(getCharacteristicName('00002a37' + BASE)).toBe('heart_rate_measurement');
  });

  it('returns undefined for unknown UUID', () => {
    expect(getCharacteristicName('00000000' + BASE)).toBeUndefined();
  });
});
