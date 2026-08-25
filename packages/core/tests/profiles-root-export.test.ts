/**
 * Heart-rate reading must be reachable OUT OF THE BOX from `@beacio/core`.
 *
 * The profiles have existed since the profile pass, but only behind the
 * `@beacio/core/profiles` subpath — so the obvious first import a developer
 * writes, `import { HeartRateProfile } from '@beacio/core'`, resolved to
 * nothing and they hand-rolled a flags-byte parser instead (exactly what the
 * marketing demo did until the CIRQA Smart Band report). The barrel is the
 * discovery surface: what ships in the box has to be on it.
 *
 * Locked here:
 *   - the profile classes + the standalone parser are named exports of the
 *     ROOT barrel, not just the subpath;
 *   - the subpath keeps working (it is the tree-shake-friendly import and is
 *     what every existing doc and consumer uses) and is the SAME binding, not
 *     a divergent copy;
 *   - parseHeartRate decodes the real frame the reported band sends.
 */

import { describe, expect, it } from '@jest/globals';

import {
  HeartRateProfile,
  parseHeartRate,
  HEART_RATE_SERVICES,
  BatteryProfile,
  DeviceInfoProfile,
  NordicUARTProfile,
  HM10SerialProfile,
  BaseProfile,
  defineProfile,
  deriveOptionalServices,
} from '../src/index';
import * as profilesSubpath from '../src/profiles';

function frame(...bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('@beacio/core root barrel — profiles', () => {
  it('exports the heart-rate surface from the package root', () => {
    expect(typeof HeartRateProfile).toBe('function');
    expect(typeof parseHeartRate).toBe('function');
    expect(HEART_RATE_SERVICES).toContain('0000180d-0000-1000-8000-00805f9b34fb');
  });

  it('exports the remaining built-in profiles and the profile toolkit', () => {
    expect(typeof BatteryProfile).toBe('function');
    expect(typeof DeviceInfoProfile).toBe('function');
    expect(typeof NordicUARTProfile).toBe('function');
    expect(typeof HM10SerialProfile).toBe('function');
    expect(typeof BaseProfile).toBe('function');
    expect(typeof defineProfile).toBe('function');
    expect(typeof deriveOptionalServices).toBe('function');
  });

  it('root and subpath resolve to the SAME binding, never a divergent copy', () => {
    expect(HeartRateProfile).toBe(profilesSubpath.HeartRateProfile);
    expect(parseHeartRate).toBe(profilesSubpath.parseHeartRate);
    expect(BatteryProfile).toBe(profilesSubpath.BatteryProfile);
  });

  it('decodes the frame the reported CIRQA Smart Band actually sends', () => {
    // flags 0x06 → uint8 format, sensor contact supported AND detected.
    expect(parseHeartRate(frame(0x06, 0x46))).toEqual({
      bpm: 70,
      contact: true,
      energyExpended: null,
      rrIntervals: [],
    });
  });
});
