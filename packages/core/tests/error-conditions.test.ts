/**
 * S5 steps A-B — the CONDITIONS table, the row-passing branded factory, and the
 * table-first classifier (docs/reviews/2026-08-12-error-classification-panel/
 * S5-DESIGN.md §1-§4; R1-R3 applied, R3 extended to the sanitize fixed-point).
 *
 * Oracle rules (§7-A — the table must not test itself): the 13 expected
 * (id, domName, message, code) tuples are HARDCODED below, byte-copied from the
 * emitter sources, never derived from the module; factory output is
 * byte-compared against the LEGACY template-literal interpolation (incl. R2's
 * `$`-metacharacter uuids); rows sharing a message must carry a UNIFORM code and
 * classify to it — post-V7 that is the only legal state, so a conflicting-code
 * group is a failure rather than something to adjudicate; adjudication prose
 * lives HERE in CONDITION_META (R1c), totality-asserted — never in shipped rows.
 *
 * Emitter provenance (re-verified 2026-08-12; cdn-restore-pending added by the
 * L1 restore-window work 2026-08-13): page-bootstrap.ts:532 grant-wall,
 * :606 the activation rows; src/beacio/api/bluetooth.ts:924 chooser-cancelled;
 * src/cdn/beacio.ts:559-562 cdn-dormant and :854 cdn-restore-pending (the hold
 * deadline reject); packages/core/src/auto.ts:498-503
 * unsupported-platform-install (exact concat of its three literals);
 * src/extension/injected-full.ts:347 bridge-unavailable;
 * testing/mocks/bluetooth.ts:88-91/:96-99 and characteristics.ts:90-93/
 * :167-170/:412-415 the five mock rows (R5a: the characteristic row is
 * getCharacteristic at :167-170, NOT the :136 NetworkError).
 *
 * jsdom; @jest/globals import style (project_jest_globals_import_gotcha).
 */
import { describe, expect, it } from '@jest/globals';
import {
  CONDITIONS,
  PAGE_BOOTSTRAP_CONDITIONS,
  beacioDomException,
  type ConditionId,
  type StaticConditionId,
} from '../src/error-conditions';
import { classifyError, sanitizeNativeMessage, type BeacioErrorCode } from '../src/error-taxonomy';

const SAMPLE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';

/** THE HARDCODED ORACLE — 13 tuples, byte-for-byte from the emitter sources. */
const EXPECTED: ReadonlyArray<{
  readonly id: ConditionId;
  readonly domName: 'NotFoundError';
  readonly message: string;
  readonly code: BeacioErrorCode;
}> = [
  { id: 'chooser-cancelled', domName: 'NotFoundError', message: 'User cancelled the requestDevice() chooser.', code: 'USER_CANCELLED' },
  { id: 'activation-dismissed', domName: 'NotFoundError', message: 'User cancelled the requestDevice() chooser.', code: 'USER_CANCELLED' },
  { id: 'activation-enable-timed-out', domName: 'NotFoundError', message: 'Beacio activation timed out', code: 'EXTENSION_NOT_ENABLED' },
  { id: 'grant-wall', domName: 'NotFoundError', message: 'User has not enabled Web Bluetooth for this origin.', code: 'EXTENSION_NOT_ENABLED' },
  { id: 'cdn-dormant', domName: 'NotFoundError', message: 'Beacio is installed but not active. Follow the Beacio setup prompt, then retry.', code: 'EXTENSION_NOT_ENABLED' },
  { id: 'cdn-restore-pending', domName: 'NotFoundError', message: 'Beacio is still starting up in this tab. Wait a moment, then retry.', code: 'EXTENSION_NOT_ENABLED' },
  {
    id: 'unsupported-platform-install',
    domName: 'NotFoundError',
    message: 'Web Bluetooth is not supported on this platform. On iOS Safari, install the Beacio extension. See: https://beacio.com',
    code: 'EXTENSION_NOT_INSTALLED',
  },
  { id: 'bridge-unavailable', domName: 'NotFoundError', message: 'Content script not available', code: 'DEVICE_NOT_FOUND' },
  // PERIOD-LESS on purpose — deliberately ≠ Chromium's "Bluetooth adapter not available.".
  { id: 'mock-no-adapter', domName: 'NotFoundError', message: 'Bluetooth adapter not available', code: 'DEVICE_NOT_FOUND' },
  { id: 'mock-no-device-match', domName: 'NotFoundError', message: 'No devices found matching the filter criteria', code: 'DEVICE_NOT_FOUND' },
  { id: 'mock-service-absent', domName: 'NotFoundError', message: 'No Services matching UUID {uuid} found', code: 'DEVICE_NOT_FOUND' },
  { id: 'mock-characteristic-absent', domName: 'NotFoundError', message: 'No Characteristics matching UUID {uuid} found', code: 'DEVICE_NOT_FOUND' },
  { id: 'mock-descriptor-absent', domName: 'NotFoundError', message: 'No Descriptors matching UUID {uuid} found', code: 'DEVICE_NOT_FOUND' },
];

/** R1c — the TEST-SIDE meta table: adjudication prose must never ship (it is bytes and disclosure). */
type ConditionDecision =
  | { readonly kind: 'adjudicated'; readonly note: string }
  | { readonly kind: 'awaiting-decision'; readonly openQuestion: string };

const CONDITION_META: Readonly<Record<ConditionId, ConditionDecision>> = {
  'chooser-cancelled': { kind: 'adjudicated', note: 'Convention-5 seam (bluetooth.ts:919-925): wire USER_CANCELLED → this frozen Chromium sentence.' },
  'activation-dismissed': { kind: 'adjudicated', note: 'Banner dismissed: content-full.ts:527 → page-bootstrap.ts:606. One of three sharers of the cancel sentence.' },
  'activation-enable-timed-out': {
    kind: 'adjudicated',
    note:
      'Enable-flow timeout (or ACTIVATE_BLE send failed — same user-visible copy). The code is ' +
      'truthful (EXTENSION_NOT_ENABLED) AND the sentence is now honest: V7 replaced the byte-shared ' +
      'Chromium cancel sentence with its OWN beacio-owned copy ("Beacio activation timed out"), so the ' +
      'split no longer relies on the out-of-band discriminator alone — the honest sentence ' +
      'text-classifies extension-not-enabled on its own. R3\'s message-aware "drop the cancel-sentence ' +
      'lie" branch is now a VERSION-SKEW GUARD only (pre-V7 emitters still ship cancel bytes with this ' +
      'code); the live sentence is ECHOED (adds-detail), never dropped to the SUGGESTION. ' +
      'Covers both content-full.ts:558 (timer fired) and :562 (ACTIVATE_BLE send failed).',
  },
  'grant-wall': { kind: 'adjudicated', note: 'G1/LESCAN-01 ported from page-bootstrap.ts:518-530: "API not enabled for this origin", one construction site, two callers.' },
  'cdn-dormant': { kind: 'adjudicated', note: 'Grant-wall on the CDN surface (cdn/beacio.ts requestActivation). Reported DEVICE_NOT_FOUND until 2026-08-12 because nothing enumerated it.' },
  'cdn-restore-pending': {
    kind: 'awaiting-decision',
    openQuestion:
      'L1 restore window (L1-WINDOW-RESEARCH.md §3 H4, adjudicated 2026-08-13). The DOM name and ' +
      'the sentence are settled: Safari loads extension contexts 9.3-11.5s after a session-restored ' +
      'tab commits, the CDN HOLDS a hinted tap for GRACE=25s instead of navigating to onboarding, ' +
      'and this row is what a hold that outlived its grace rejects with. The CODE is the open part. ' +
      "EXTENSION_NOT_ENABLED was chosen because NotFoundError's reason set admits only four codes " +
      '(NOT_FOUND_FRAGMENTS) and this is cdn-dormant\'s nearest sibling — but it is imperfect in ' +
      'TWO recorded ways, and neither is fixable without a human decision. (a) RETRIABILITY: this ' +
      'condition IS retriable — a second tap after the heal works, 6/6 on hardware — yet ' +
      'EXTENSION_NOT_ENABLED is outside RETRIABLE_CODES, so withRetry() will not retry the one ' +
      'condition in the table that most deserves it. (b) RECOVERY COPY: EXTENSION_NOT_ENABLED\'s ' +
      'documented remedy is "aA -> Manage Extensions -> Allow Every Website", which is wrong here — ' +
      'this user has already done that, which is exactly why the beacio_seen hint exists. The two ' +
      'candidate fixes are the same shape as the bridge-unavailable row\'s: reuse an existing ' +
      'retriable code (TIMEOUT is unreachable for a NotFoundError carrier without a new ' +
      'NOT_FOUND_FRAGMENTS row), or add a new BeacioErrorCode and grow the public taxonomy. Not taken ' +
      'unilaterally; the sentence and the hold behaviour ship now, the code is revisitable because ' +
      'ids are append-only and this row has exactly one emitter.',
  },
  'unsupported-platform-install': { kind: 'adjudicated', note: "Leading sentence is Chromium's WEB_BLUETOOTH_NOT_SUPPORTED verbatim — only the beacio tail may classify it (§4; parity NEGATIVE rows)." },
  'bridge-unavailable': {
    kind: 'awaiting-decision',
    // Ported VERBATIM from the parity discovery row (EXTENSION_BRIDGE_UNAVAILABLE candidate = panel S4.2).
    openQuestion:
      'W10-PARITY3: "Content script not available" is an internal transport failure, not a device ' +
      "absence, so DEVICE_NOT_FOUND (pinned here as today's behaviour) is dishonest to an SDK consumer. " +
      'The two candidate fixes both need a human decision because both change consumer semantics: ' +
      '(a) map it to the existing GATT_OPERATION_FAILED, which is RETRIABLE — withRetry() would then ' +
      'auto-retry a dead bridge; or (b) add a new non-retriable BeacioErrorCode (e.g. ' +
      'EXTENSION_BRIDGE_UNAVAILABLE), which grows the public taxonomy. Not taken unilaterally.',
  },
  'mock-no-adapter': { kind: 'adjudicated', note: 'Period-less ON PURPOSE (≠ Chromium\'s "Bluetooth adapter not available." — do not "fix" it); never a classifier row.' },
  'mock-no-device-match': { kind: 'adjudicated', note: 'Mock chooser found nothing; the heuristics already answer DEVICE_NOT_FOUND.' },
  'mock-service-absent': { kind: 'adjudicated', note: 'SERVICE_NOT_FOUND deliberately unreachable for DOMException carriers (the NotFoundError arm classifies by reason only); changing that is a separate reviewed decision.' },
  'mock-characteristic-absent': { kind: 'adjudicated', note: 'Same rationale as mock-service-absent; emitter is getCharacteristic (characteristics.ts:167-170 — R5a).' },
  'mock-descriptor-absent': { kind: 'adjudicated', note: 'Same rationale as mock-service-absent; emitter is the descriptor lookup (characteristics.ts:412-415).' },
};

const substituted = (message: string): string => message.replace('{uuid}', () => SAMPLE_UUID);
/** Sentinel fallback so "the arm decided" is distinguishable from "fell through". */
const classified = (message: string): BeacioErrorCode =>
  classifyError('NotFoundError', message, 'GATT_OPERATION_FAILED').code;

describe('S5-A: the CONDITIONS table (hardcoded-tuple oracle)', () => {
  it('is total over exactly the 13 expected ids, both directions', () => {
    expect(Object.keys(CONDITIONS).sort()).toEqual(EXPECTED.map((row) => row.id).sort());
    expect(EXPECTED).toHaveLength(13);
  });

  it.each(EXPECTED)('row $id carries the byte-frozen tuple', ({ id, domName, message, code }) => {
    const row = CONDITIONS[id];
    expect(row.id).toBe(id);
    expect(row.domName).toBe(domName);
    expect(row.message).toBe(message);
    expect(row.code).toBe(code);
  });

  it('R1c: shipped rows carry ONLY {id, domName, message, code} — adjudication prose does not ship', () => {
    for (const { id } of EXPECTED) {
      expect(Object.keys(CONDITIONS[id]).sort()).toEqual(['code', 'domName', 'id', 'message']);
    }
  });

  it('rows and the aggregate are frozen', () => {
    expect(Object.isFrozen(CONDITIONS)).toBe(true);
    for (const { id } of EXPECTED) expect(Object.isFrozen(CONDITIONS[id])).toBe(true);
  });

  it('CONDITION_META is total and every awaiting-decision entry carries a real open question', () => {
    expect(Object.keys(CONDITION_META).sort()).toEqual(EXPECTED.map((row) => row.id).sort());
    for (const { id } of EXPECTED) {
      const meta = CONDITION_META[id];
      if (meta.kind === 'awaiting-decision') expect(meta.openQuestion.length).toBeGreaterThan(80);
      else expect(meta.note.length).toBeGreaterThan(0);
    }
  });

  it('GH #354, expressed: chooser-cancelled + activation-dismissed share the frozen cancel sentence; enable-timed-out has its OWN honest sentence', () => {
    expect(CONDITIONS['chooser-cancelled'].message).toBe('User cancelled the requestDevice() chooser.');
    expect(CONDITIONS['activation-dismissed'].message).toBe(CONDITIONS['chooser-cancelled'].message);
    expect(CONDITIONS['chooser-cancelled'].code).toBe('USER_CANCELLED');
    expect(CONDITIONS['activation-dismissed'].code).toBe('USER_CANCELLED');
    // The enable TIMEOUT is not a cancellation — it carries its own beacio-owned
    // sentence (never the frozen cancel bytes), code EXTENSION_NOT_ENABLED.
    expect(CONDITIONS['activation-enable-timed-out'].message).toBe('Beacio activation timed out');
    expect(CONDITIONS['activation-enable-timed-out'].message).not.toBe(CONDITIONS['chooser-cancelled'].message);
    expect(CONDITIONS['activation-enable-timed-out'].code).toBe('EXTENSION_NOT_ENABLED');
  });
});

describe('S5-A: the row-passing branded factory (R1 + R2)', () => {
  it.each(EXPECTED.filter((row) => !row.message.includes('{uuid}')))(
    'static row $id mints byte-identical output',
    ({ id, message }) => {
      const err = beacioDomException(CONDITIONS[id as StaticConditionId]);
      expect(err).toBeInstanceOf(DOMException);
      expect(err.name).toBe('NotFoundError');
      expect(err.message).toBe(message);
    }
  );

  it('template rows match the LEGACY template-literal interpolation byte-for-byte', () => {
    // The exact expressions the mocks evaluate today (characteristics.ts:91/:168/:413).
    expect(beacioDomException(CONDITIONS['mock-service-absent'], SAMPLE_UUID).message).toBe(`No Services matching UUID ${SAMPLE_UUID} found`);
    expect(beacioDomException(CONDITIONS['mock-characteristic-absent'], SAMPLE_UUID).message).toBe(`No Characteristics matching UUID ${SAMPLE_UUID} found`);
    expect(beacioDomException(CONDITIONS['mock-descriptor-absent'], SAMPLE_UUID).message).toBe(`No Descriptors matching UUID ${SAMPLE_UUID} found`);
  });

  it("R2: `$`-metacharacter uuids interpolate VERBATIM (string replacement would expand $&, $', $`, $$)", () => {
    for (const hostile of ["$'", '$&', '$`', '$$', "a$'b$&c"]) {
      expect(beacioDomException(CONDITIONS['mock-service-absent'], hostile).message).toBe(`No Services matching UUID ${hostile} found`);
    }
  });

  it('compile-time contract: wrong arity and forged rows are TYPE errors (a missing template uuid fails LOUD)', () => {
    // A template row missing its uuid is the ONE wrong-arity case the runtime guard
    // DOES enforce (P3 follow-up): an un-typed JS caller of the published testing
    // surface must never mint a DOMException carrying the literal `{uuid}` placeholder.
    // @ts-expect-error — a template row REQUIRES the uuid param (TS2554).
    expect(() => beacioDomException(CONDITIONS['mock-service-absent'])).toThrow(TypeError);
    // @ts-expect-error — a static row FORBIDS params (TS2554).
    expect(beacioDomException(CONDITIONS['grant-wall'], 'x')).toBeInstanceOf(DOMException);
    // @ts-expect-error — an unbranded inline row is NOT an ErrorCondition (R1a brand).
    expect(beacioDomException({ id: 'grant-wall', domName: 'NotFoundError', message: 'forged', code: 'EXTENSION_NOT_ENABLED' })).toBeInstanceOf(DOMException);
  });
});

describe('S5-A: the page-bootstrap payload rows', () => {
  it('carries exactly the three page-realm conditions, message + code, byte-equal to their source rows', () => {
    expect(Object.keys(PAGE_BOOTSTRAP_CONDITIONS).sort()).toEqual(['activation-dismissed', 'activation-enable-timed-out', 'grant-wall']);
    for (const id of ['grant-wall', 'activation-dismissed', 'activation-enable-timed-out'] as const) {
      expect(Object.keys(PAGE_BOOTSTRAP_CONDITIONS[id])).toEqual(['message', 'code']);
      expect(PAGE_BOOTSTRAP_CONDITIONS[id].message).toBe(CONDITIONS[id].message);
      // GH #354: the payload row carries the truthful code out-of-band, so the
      // bootstrap mint can attach it as the symbol-keyed discriminator.
      expect(PAGE_BOOTSTRAP_CONDITIONS[id].code).toBe(CONDITIONS[id].code);
      // The bootstrap mint hardcodes 'NotFoundError' (freeze C4) — the source rows must agree.
      expect(CONDITIONS[id].domName).toBe('NotFoundError');
    }
  });
});

describe('S5-A: the sentence-group rule (every shared sentence carries ONE code, and the classifier agrees)', () => {
  const groups = new Map<string, Set<BeacioErrorCode>>();
  for (const row of EXPECTED) {
    groups.set(row.message, (groups.get(row.message) ?? new Set<BeacioErrorCode>()).add(row.code));
  }

  it.each([...groups.entries()].map(([message, codes]) => ({ message, codes: [...codes] })))(
    'sentence "$message" classifies to its one code',
    ({ message, codes }) => {
      // UNIFORMITY FIRST: post-V7 every shared sentence carries ONE code, so a
      // group that grew a conflicting code must fail HERE and by name, rather
      // than have the next line silently compare against an arbitrary
      // Set-ordered element. (This is the guard the deleted conflicting-code
      // branch used to arm; its adjudication map shipped permanently empty.)
      expect(codes).toHaveLength(1);
      expect(classified(substituted(message))).toBe(codes[0]);
    }
  );
});

describe('S5-B: table-first classifier (fragments = sanitize fixed-point of the frozen sentences)', () => {
  const SWAPPED: ReadonlyArray<{ id: ConditionId; code: BeacioErrorCode }> = [
    { id: 'activation-enable-timed-out', code: 'EXTENSION_NOT_ENABLED' },
    { id: 'grant-wall', code: 'EXTENSION_NOT_ENABLED' },
    { id: 'cdn-dormant', code: 'EXTENSION_NOT_ENABLED' },
    { id: 'cdn-restore-pending', code: 'EXTENSION_NOT_ENABLED' },
    { id: 'unsupported-platform-install', code: 'EXTENSION_NOT_INSTALLED' },
  ];

  it.each(SWAPPED)('$id: the full frozen sentence classifies to $code', ({ id, code }) => {
    expect(classified(CONDITIONS[id].message)).toBe(code);
  });

  it.each(SWAPPED)(
    '$id: R3 — the SANITIZED re-entry still classifies to $code (BeacioError.message stores the sanitized line)',
    ({ id, code }) => {
      const sanitized = sanitizeNativeMessage(CONDITIONS[id].message);
      // The re-entry carrier has no DOM name (the §8.2 version-skew scenario) — pin BOTH paths.
      expect(classified(sanitized)).toBe(code);
      expect(classifyError('', sanitized, 'GATT_OPERATION_FAILED').code).toBe(code);
    }
  );

  // The ADJUDICATED §4 narrowing: an input carrying only the OLD hand-fragment,
  // not the frozen sentence, now classifies DEVICE_NOT_FOUND. These three pins
  // were the step-B RED against the pre-swap taxonomy.
  it.each([
    { label: 'old grant-wall fragment alone', message: 'Origin has not enabled Web Bluetooth for pairing' },
    { label: 'old cdn fragment alone', message: 'The helper app is installed but not active right now' },
    { label: 'old install fragment alone', message: 'Please install the Beacio extension from the gallery' },
  ])('narrowing: $label → DEVICE_NOT_FOUND', ({ message }) => {
    expect(classified(message)).toBe('DEVICE_NOT_FOUND');
  });
});
