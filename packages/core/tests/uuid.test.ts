import { describe, expect, it } from '@jest/globals';
import { resolveUUID, getServiceName, getCharacteristicName } from '../src/uuid';

const BASE = '-0000-1000-8000-00805f9b34fb';

describe('resolveUUID', () => {
  it('resolves named service to full UUID', () => {
    expect(resolveUUID('heart_rate')).toBe('0000180d' + BASE);
  });

  it('resolves named characteristic to full UUID', () => {
    expect(resolveUUID('heart_rate_measurement')).toBe('00002a37' + BASE);
  });

  it('resolves camelCase service names silently', () => {
    expect(resolveUUID('heartRate')).toBe('0000180d' + BASE);
  });

  it('resolves kebab-case service names silently', () => {
    expect(resolveUUID('running-speed-and-cadence')).toBe('00001814' + BASE);
  });

  it('resolves camelCase characteristic names silently', () => {
    expect(resolveUUID('heartRateMeasurement')).toBe('00002a37' + BASE);
  });

  it('resolves dotted characteristic names silently', () => {
    expect(resolveUUID('heart.rate.measurement')).toBe('00002a37' + BASE);
  });

  it('resolves names with omitted underscores silently', () => {
    expect(resolveUUID('heartrate')).toBe('0000180d' + BASE);
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

  it('canonicalizes mixed-case full UUIDs to lowercase', () => {
    expect(resolveUUID('12345678-1234-1234-1234-ABCDEFABCDEF')).toBe('12345678-1234-1234-1234-abcdefabcdef');
  });

  it('lowercases input', () => {
    expect(resolveUUID('180D')).toBe('0000180d' + BASE);
  });

  it('suggests close Levenshtein matches (edit distance 1)', () => {
    expect(() => resolveUUID('heart_rat')).toThrow(/Did you mean "heart_rate"/);
  });

  it('suggests close matches when normalization cannot resolve', () => {
    expect(() => resolveUUID('heartrat')).toThrow(/Did you mean "heart_rate"/);
  });

  it('suggests matches at edit distance 2', () => {
    expect(() => resolveUUID('hrat_rate')).toThrow(/Did you mean "heart_rate"/);
  });

  it('suggests prefix matches when ≥4 chars', () => {
    expect(() => resolveUUID('environmental_')).toThrow(/Did you mean "environmental_sensing"/);
  });

  it('throws without suggestion for distant strings', () => {
    const err = () => resolveUUID('totally_bogus');
    expect(err).toThrow(/Invalid UUID/);
    expect(err).toThrow(/Expected a 128-bit UUID/);
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
