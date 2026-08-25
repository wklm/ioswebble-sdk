/**
 * R-14 (STD-PKG-01 + SMELL-PKG-01) — the `classifyThrown` seam.
 *
 * Pins what the refactor dissolved:
 *  - `classifyThrown(error: unknown, fallback: BeacioErrorCode)` exists and owns
 *    the carrier destructuring (DOM-name dance, message extraction, the GH #354
 *    carried code) that used to be copy-pasted at BOTH production call sites
 *    (`errors.ts` BeacioError.from, `detect/error-presenter.ts` resolve);
 *  - `classifyError` carries NO optional 4th argument — its signature is
 *    `(domName, rawMessage, fallback)`, asserted here at the TYPE level;
 *  - the carried-code authority behaves identically through the seam;
 *  - Error/string fallback parity between `classifyThrown` and `classifyError`.
 */
import { describe, expect, it } from '@jest/globals';
import { classifyError, classifyThrown, type BeacioErrorCode } from '../src/error-taxonomy';
import { ACTIVATION_DISMISSED, ACTIVATION_ENABLE_TIMED_OUT, CONDITION_CODE, beacioDomException } from '../src/error-conditions';

/** Chromium's byte-frozen chooser-cancellation sentence (shared by three conditions). */
const CHROMIUM_CANCEL_MESSAGE = 'User cancelled the requestDevice() chooser.';

describe('R-14: classifyThrown(error, fallback) is the thrown-value seam', () => {
  it('classifies a DOMException by name and message', () => {
    expect(classifyThrown(new DOMException(CHROMIUM_CANCEL_MESSAGE, 'NotFoundError'), 'DEVICE_NOT_FOUND')).toEqual({
      code: 'USER_CANCELLED',
      nativeMessage: 'restates-the-code',
    });
    expect(classifyThrown(new TypeError("Invalid UUID: 'bogus'"), 'GATT_OPERATION_FAILED').code).toBe('INVALID_PARAMETER');
    expect(classifyThrown(new DOMException('GATT Server is disconnected', 'NetworkError'), 'GATT_OPERATION_FAILED').code).toBe(
      'DEVICE_DISCONNECTED',
    );
  });

  it('classifies a plain Error by the message rules and honours the required fallback', () => {
    expect(classifyThrown(new Error('something else'), 'GATT_OPERATION_FAILED').code).toBe('GATT_OPERATION_FAILED');
    expect(classifyThrown(new Error('something else'), 'TIMEOUT').code).toBe('TIMEOUT');
    expect(classifyThrown(new Error('no devices found'), 'GATT_OPERATION_FAILED')).toEqual({
      code: 'DEVICE_NOT_FOUND',
      nativeMessage: 'restates-the-code',
    });
  });

  it('classifies a bare string (a carrier with no DOM name) through the message rules', () => {
    expect(classifyThrown('raw string error', 'GATT_OPERATION_FAILED').code).toBe('GATT_OPERATION_FAILED');
    expect(classifyThrown('User canceled', 'GATT_OPERATION_FAILED').code).toBe('USER_CANCELLED');
  });

  it('agrees with classifyError on every non-carried carrier (behavioural parity)', () => {
    const cases: ReadonlyArray<{ domName: string; message: string; fallback: BeacioErrorCode }> = [
      { domName: 'NotFoundError', message: CHROMIUM_CANCEL_MESSAGE, fallback: 'DEVICE_NOT_FOUND' },
      { domName: 'NotFoundError', message: 'Bluetooth adapter not available.', fallback: 'DEVICE_NOT_FOUND' },
      { domName: '', message: 'Beacio activation timed out', fallback: 'GATT_OPERATION_FAILED' },
      { domName: 'TimeoutError', message: 'slow', fallback: 'GATT_OPERATION_FAILED' },
      { domName: '', message: 'something else', fallback: 'GATT_OPERATION_FAILED' },
    ];
    for (const { domName, message, fallback } of cases) {
      const carrier = domName === '' ? new Error(message) : new DOMException(message, domName);
      expect(classifyThrown(carrier, fallback)).toEqual(classifyError(domName, message, fallback));
    }
  });
});

describe('R-14: the carried code stays authoritative through the seam (GH #354)', () => {
  it('a minted condition classifies by its carried code, not its frozen bytes', () => {
    expect(classifyThrown(beacioDomException(ACTIVATION_DISMISSED), 'DEVICE_NOT_FOUND')).toEqual({
      code: 'USER_CANCELLED',
      nativeMessage: 'restates-the-code',
    });
    expect(classifyThrown(beacioDomException(ACTIVATION_ENABLE_TIMED_OUT), 'DEVICE_NOT_FOUND')).toEqual({
      code: 'EXTENSION_NOT_ENABLED',
      nativeMessage: 'adds-detail',
    });
  });

  it('R3 version-skew guard: carried EXTENSION_NOT_ENABLED + frozen cancel sentence restates (drops the lie)', () => {
    const preV7 = new DOMException(CHROMIUM_CANCEL_MESSAGE, 'NotFoundError');
    Object.defineProperty(preV7, CONDITION_CODE, {
      value: 'EXTENSION_NOT_ENABLED',
      writable: false,
      enumerable: false,
      configurable: true,
    });
    expect(classifyThrown(preV7, 'DEVICE_NOT_FOUND')).toEqual({
      code: 'EXTENSION_NOT_ENABLED',
      nativeMessage: 'restates-the-code',
    });
  });

  it('a forged out-of-band code is rejected; text classification decides', () => {
    const forged = new DOMException(CHROMIUM_CANCEL_MESSAGE, 'NotFoundError');
    Object.defineProperty(forged, CONDITION_CODE, {
      value: 'NOT_A_CODE',
      writable: false,
      enumerable: false,
      configurable: true,
    });
    expect(classifyThrown(forged, 'DEVICE_NOT_FOUND').code).toBe('USER_CANCELLED');
  });
});

describe('R-14: classifyError has no optional 4th argument (type-level)', () => {
  it('rejects a carried 4th positional argument at compile time', () => {
    // Runtime: JS ignores extra positional arguments, so the call still answers
    // the three-argument (no-carried) decision — pin that it is exactly that.
    // @ts-expect-error — R-14: classifyError takes (domName, rawMessage, fallback) only; carried authority lives in classifyThrown.
    const viaFourArgs = classifyError('', CHROMIUM_CANCEL_MESSAGE, 'GATT_OPERATION_FAILED', 'USER_CANCELLED');
    expect(viaFourArgs).toEqual(classifyError('', CHROMIUM_CANCEL_MESSAGE, 'GATT_OPERATION_FAILED'));
  });
});
