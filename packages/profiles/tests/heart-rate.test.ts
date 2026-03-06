import { parseHeartRate } from '../src/heart-rate';
import type { HeartRateData } from '../src/heart-rate';

function makeDataView(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseHeartRate', () => {
  it('parses 8-bit heart rate', () => {
    // flags=0x00 (8-bit, no contact, no energy, no RR)
    const result = parseHeartRate(makeDataView([0x00, 72]));
    expect(result.bpm).toBe(72);
    expect(result.contact).toBeNull();
    expect(result.energyExpended).toBeNull();
    expect(result.rrIntervals).toEqual([]);
  });

  it('parses 16-bit heart rate', () => {
    // flags=0x01 (16-bit), HR = 256 (0x00, 0x01 little-endian)
    const result = parseHeartRate(makeDataView([0x01, 0x00, 0x01]));
    expect(result.bpm).toBe(256);
  });

  it('parses contact detected', () => {
    // flags=0x06: bits 1+2 set → contact supported + detected, 8-bit HR
    const result = parseHeartRate(makeDataView([0x06, 80]));
    expect(result.contact).toBe(true);
  });

  it('parses contact not detected', () => {
    // flags=0x04: bit 2 set (supported) but bit 1 clear → not detected
    const result = parseHeartRate(makeDataView([0x04, 80]));
    expect(result.contact).toBe(false);
  });

  it('parses energy expended', () => {
    // flags=0x08: energy present, 8-bit HR
    // HR=60, energy=100 (0x64, 0x00 little-endian)
    const result = parseHeartRate(makeDataView([0x08, 60, 0x64, 0x00]));
    expect(result.energyExpended).toBe(100);
  });

  it('parses RR intervals', () => {
    // flags=0x10: RR present, 8-bit HR
    // HR=70, RR=1024 (=1.0 sec, encoded as 0x00 0x04 little-endian)
    const result = parseHeartRate(makeDataView([0x10, 70, 0x00, 0x04]));
    expect(result.rrIntervals).toHaveLength(1);
    expect(result.rrIntervals[0]).toBeCloseTo(1.0);
  });

  it('parses multiple RR intervals', () => {
    // flags=0x10, HR=70, two RR values: 1024 and 512
    const result = parseHeartRate(
      makeDataView([0x10, 70, 0x00, 0x04, 0x00, 0x02]),
    );
    expect(result.rrIntervals).toHaveLength(2);
    expect(result.rrIntervals[0]).toBeCloseTo(1.0);
    expect(result.rrIntervals[1]).toBeCloseTo(0.5);
  });

  it('parses combined flags', () => {
    // flags=0x1E: 8-bit HR + contact supported+detected + energy + RR
    // HR=80, energy=50 (0x32 0x00), RR=512 (0x00 0x02)
    const result = parseHeartRate(
      makeDataView([0x1E, 80, 0x32, 0x00, 0x00, 0x02]),
    );
    expect(result.bpm).toBe(80);
    expect(result.contact).toBe(true);
    expect(result.energyExpended).toBe(50);
    expect(result.rrIntervals).toHaveLength(1);
    expect(result.rrIntervals[0]).toBeCloseTo(0.5);
  });
});
