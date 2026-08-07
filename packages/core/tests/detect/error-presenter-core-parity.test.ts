/**
 * SB-SDK-05 — seam-crossing control: @beacio/detect#presentError vs @beacio/core.
 *
 * error-presenter.ts keeps the BeacioErrorCode -> copy map (COPY) and the
 * retriable set (RETRIABLE_CODES) LOCAL on purpose: @beacio/core is an OPTIONAL
 * peer (a standalone `npm i @beacio/detect` has no core), so the presenter MUST
 * NOT statically import core. (W13-RECONCILE 2026-08-05: this sentence used to
 * end "— enforced by no-toplevel-core-import.test.ts". That file has never
 * existed; nothing enforces the rule by name, so the citation is removed rather
 * than left dangling.) The
 * file's own contract comment states those local tables are "pinned to core's
 * public contract by the unit test, not by a runtime import" and that "the
 * presenter unit test is the seam-crossing control that this list still matches
 * core's source." That control did not exist: error-presenter.test.ts builds its
 * OWN local code list, so detect's tables could silently drift from core's
 * BeacioErrorCode union / RETRIABLE_CODES and every test would still pass — the
 * exact hand-maintained-enum drift hazard (a new core code would degrade a real
 * BeacioError to the generic card and mis-classify its retriability, breaking
 * AC1 "maps a BeacioError -> a friendly headline + retry for retriable codes" and
 * AC6 "each beacio error code maps to non-empty human copy").
 *
 * This is that missing control. Unlike the SHIPPED source (which must not import
 * core at module top level — a rule no named test enforces; the
 * "no-toplevel-core-import.test.ts scans only the built dist" claim that stood
 * here described a file that does not exist, W13-RECONCILE 2026-08-05), a TEST
 * may reach core's source — the
 * same way the jest config maps `@beacio/core` to core's SOURCE tree
 * (jest.config.js) and events.test.ts pins the wire event literals to core's
 * BEACIO_EVENTS. We import core's errors module by the SAME source path the
 * mapper targets (`../../src/errors`) — the genuine source-of-truth — rather
 * than the bare `@beacio/core` barrel, which ts-jest's per-file program cannot
 * resolve transitive named VALUE re-exports across for (TS2305). This sees the
 * live BeacioErrorCode union + the real BeacioError whose `.isRetriable` is
 * computed from core's private RETRIABLE_CODES — exactly what detect must track.
 *
 * Two layers of guard:
 *  1. COMPILE-TIME (code-set parity): EVERY_CODE is typed Record<BeacioErrorCode,
 *     true>. If core adds or removes a BeacioErrorCode, this object stops
 *     type-checking (ts-jest compile error) until detect's presenter is updated —
 *     the BeacioErrorCode union is erased at runtime, so this is the only way to
 *     pin the set itself.
 *  2. RUNTIME (behaviour parity): for every code, the card presentError renders
 *     for a REAL core BeacioError has non-empty, stack-free, competitor-free copy,
 *     and shows a retry affordance IFF core's BeacioError(code).isRetriable.
 *
 * jsdom; @jest/globals import style (project_jest_globals_import_gotcha).
 * Run via
 *   npx jest --config packages/detect/jest.config.js --rootDir packages/detect \
 *     error-presenter-core-parity
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
// Seam-crossing import: the SOURCE-OF-TRUTH, reached by the same source path the
// jest mapper points `@beacio/core` at (jest.config.js:
// '<rootDir>/../core/src/index.ts'). BeacioError is runtime (its `.isRetriable`
// reflects core's private RETRIABLE_CODES); BeacioErrorCode is a type (erased)
// used only to make EVERY_CODE exhaustive at compile time. Importing core's
// `errors` source directly (not the bare `@beacio/core` barrel) avoids ts-jest's
// per-file TS2305 on transitive named value re-exports while pinning the exact
// same canonical definitions.
import { BeacioError, type BeacioErrorCode } from '../../src/errors';
import { presentError } from '../../src/detect/error-presenter';

// Node builtins via require() (ts-jest emits CommonJS), typed by @types/node
// through tests/tsconfig.json — same idiom as tests/detect/
// api-host-reconciliation.test.ts, which likewise reaches repo-root sources.
const { readFileSync } = require('fs');
const { resolve } = require('path');

const CARD_ID = 'beacio-error';

/**
 * Code-set parity, layer 1 (compile-time). Listing every BeacioErrorCode as the
 * keys of a Record<BeacioErrorCode, true>: if core's union gains a member this
 * object is missing a key (TS2741) and if it loses one this object has an excess
 * key (TS2353) — either way ts-jest fails to compile this file, which is the
 * durable guard that detect's COPY/RETRIABLE tables track core's source.
 */
const EVERY_CODE: Record<BeacioErrorCode, true> = {
  INVALID_PARAMETER: true,
  BLUETOOTH_UNAVAILABLE: true,
  EXTENSION_NOT_INSTALLED: true,
  PERMISSION_DENIED: true,
  DEVICE_NOT_FOUND: true,
  DEVICE_DISCONNECTED: true,
  CONNECTION_TIMEOUT: true,
  SERVICE_NOT_FOUND: true,
  CHARACTERISTIC_NOT_FOUND: true,
  CHARACTERISTIC_NOT_READABLE: true,
  CHARACTERISTIC_NOT_WRITABLE: true,
  CHARACTERISTIC_NOT_NOTIFIABLE: true,
  GATT_OPERATION_FAILED: true,
  SCAN_ALREADY_IN_PROGRESS: true,
  CONNECTION_LIMIT_REACHED: true,
  USER_CANCELLED: true,
  TIMEOUT: true,
  WRITE_INCOMPLETE: true,
};
const ALL_CORE_CODES = Object.keys(EVERY_CODE) as BeacioErrorCode[];

/** Tokens that would betray a leaked stack frame / native URL in the card. */
const STACK_TOKENS = ['\n    at ', '.ts:', '.js:', 'webkit', 'WebKit', 'http://', 'https://', 'eval ('];

function cardEl(): HTMLElement | null {
  return document.getElementById(CARD_ID);
}
function cardText(): string {
  return (cardEl()?.textContent || '').replace(/\s+/g, ' ');
}
function hasRetryAffordance(): boolean {
  const el = cardEl();
  if (!el) return false;
  return Array.from(el.querySelectorAll<HTMLElement>('button, a')).some((c) =>
    /retry|try again|reconnect/i.test(c.textContent || '')
  );
}
function clear(): void {
  cardEl()?.remove();
  document.body.innerHTML = '';
}

describe('SB-SDK-05 seam: presentError tracks @beacio/core BeacioErrorCode contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    clear();
  });

  // Sanity: the compile-time set above must enumerate at least core's known codes
  // (a non-empty, plausible count) so a silently-emptied union can't pass vacuously.
  it('enumerates the full core code set (compile-time-exhaustive)', () => {
    expect(ALL_CORE_CODES.length).toBeGreaterThanOrEqual(18);
  });

  // RUNTIME parity, layer 2: for EVERY core code, presentError must render a real,
  // branded, leak-free card — driven off a genuine core BeacioError, not detect's
  // own copy of the list. A core code that detect's COPY table lacks would fall to
  // the generic card; this asserts a card renders with non-empty, clean copy for
  // each one (and, critically, that it is keyed off core's enumeration).
  it('renders non-empty, stack-free, competitor-free copy for every core BeacioErrorCode', () => {
    for (const code of ALL_CORE_CODES) {
      clear();
      const err = new BeacioError(code);
      const el = presentError(err);
      expect(el).not.toBeNull();
      const text = cardText();
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain('undefined');
      expect(text).not.toMatch(/Bluefy/i);
      for (const tok of STACK_TOKENS) {
        expect(text).not.toContain(tok);
      }
    }
  });

  // RETRIABLE parity: pins detect's LOCAL RETRIABLE_CODES to core's source.
  //
  // Subtlety the presenter forces (error-presenter.ts resolve()): for a coded
  // error that ALREADY carries a boolean `.isRetriable` (a real BeacioError), the
  // card trusts THAT value and never consults detect's local set — so passing a
  // real BeacioError would test core round-tripping, NOT detect's table. detect's
  // local RETRIABLE_CODES is the fallback used when the coded input lacks
  // `.isRetriable` (and for raw DOMExceptions). So drive THAT branch: present a
  // coded-SHAPED object WITHOUT `.isRetriable` (code only), which makes the card
  // fall back to detect's local set, and assert it matches core's truth
  // (new BeacioError(code).isRetriable, computed from core's private
  // RETRIABLE_CODES). If detect's local set drifts from core's, the rendered
  // affordance diverges and this fails — the guard that the shipped presenter's
  // copy of the retriable set still tracks core, with no runtime core import.
  it("shows the retry affordance for exactly the codes core marks retriable (detect's local fallback set tracks core)", () => {
    for (const code of ALL_CORE_CODES) {
      const coreTruth = new BeacioError(code).isRetriable;
      clear();
      // Code-only coded shape (no `.isRetriable`) → presenter uses detect's local
      // RETRIABLE_CODES, the exact table this guard pins.
      presentError({ code });
      expect(hasRetryAffordance()).toBe(coreTruth);
    }
  });

  // The raw-DOMException path also resolves retriability from detect's local set;
  // assert the local set is internally consistent with what the coded-fallback
  // path yields for the same code, so neither presenter branch can drift alone.
  it("a code's retriability is consistent across the coded-fallback and DOMException paths", () => {
    // NetworkError -> DEVICE_DISCONNECTED (retriable); NotFoundError ->
    // DEVICE_NOT_FOUND (not). Both must agree with the coded-fallback path.
    clear();
    presentError(new DOMException('lost', 'NetworkError'));
    const domDisconnected = hasRetryAffordance();
    clear();
    presentError({ code: 'DEVICE_DISCONNECTED' as BeacioErrorCode });
    expect(domDisconnected).toBe(hasRetryAffordance());
    expect(domDisconnected).toBe(new BeacioError('DEVICE_DISCONNECTED').isRetriable);
  });
});

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * W10-PARITY2 — the DUPLICATED CANCELLATION PREDICATE (strategic review, Risk 5)
 *
 * `error-presenter.ts` (`isUserCancellationMessage`, ~:197) is a deliberate,
 * comment-only-locked COPY of core's `errors.ts` (`isUserCancellationMessage`,
 * ~:143). Its own comment says: "The detect bundle ships standalone and
 * deliberately has NO runtime import of core, so this is a local copy of core's
 * `isUserCancellationMessage` (`../errors.ts`). Keep the two in lockstep — a raw
 * DOMException must not be presented as 'device not found' here while core codes
 * it USER_CANCELLED."
 *
 * "Keep the two in lockstep" was, until this block, enforced by NOTHING: the
 * suites above pin detect's COPY/RETRIABLE tables, and errors.test.ts pins core's
 * classifier, but no test ever pushed a NotFoundError-CARRYING-A-CANCELLATION-
 * MESSAGE through the PRESENTER. So the copies could silently diverge, and the
 * user-visible consequence is concrete and bad: a user who dismisses the chooser
 * gets a red "device not found" card instead of a silent cancel.
 *
 * Web Bluetooth OVERLOADS NotFoundError (Chromium `bluetooth_error.cc` 148-178):
 * a dismissed chooser and a dozen genuine failures share the DOM name, so the
 * MESSAGE is the only discriminator — which is exactly why two hand-copied
 * message predicates are a live hazard rather than a cosmetic duplication.
 *
 * Three layers, each of which must RED on a real divergence:
 *  1. CANONICAL: the exact Chromium cancellation string classified through BOTH
 *     paths — core `BeacioError.from(...).code` and the presenter's rendered
 *     `data-beacio-error-code` — must agree AND equal 'USER_CANCELLED'.
 *  2. VARIANT TABLE: case, stack suffix, US spelling, non-DOMException carrier,
 *     plus NEGATIVE NotFoundError messages (a "no devices" failure). The negative
 *     rows are what stop a predicate perturbed to `return true` from passing.
 *  3. EMITTER: the THIRD copy of this knowledge — the literal the SHIPPED
 *     polyfill actually throws (`src/extension/page-bootstrap.ts`,
 *     `src/beacio/api/bluetooth.ts`). Without it the two predicates could stay in
 *     perfect agreement with each other while agreeing about nothing real.
 *
 * RED-arms (adversarial, both directions): perturbing EITHER predicate (e.g.
 * dropping the 'user cancelled' branch in error-presenter.ts OR in errors.ts) or
 * the shipped emitter literal MUST turn this block RED. Verified by perturb →
 * RED → revert → GREEN; see docs/reviews/2026-07-29-chromium-wpt-test-port/
 * fixes/W10-PARITY2.md for the verbatim evidence.
 */

/**
 * Chromium's fixed English string for CHOOSER_CANCELLED — the message the beacio
 * polyfill emits verbatim for parity. Declared here as the SPEC-level anchor; the
 * emitter test below reads the real shipped literal from source rather than
 * trusting this constant, so a drift in either place is caught.
 */
const CHROMIUM_CANCEL_MESSAGE = 'User cancelled the requestDevice() chooser.';

/** Core's classification of an arbitrary thrown value. */
function coreCode(input: unknown): string {
  return BeacioError.from(input).code;
}

/**
 * The PRESENTER's classification of the same value, observed the only way a user
 * would: through the rendered card. `presentError` stamps the resolved code onto
 * `card.dataset.beacioErrorCode`, so this reads the presenter's real decision
 * (its local `isUserCancellationMessage` copy included), not a re-implementation.
 */
function presenterCode(input: unknown): string {
  // Remove any prior card first: presentError coalesces only when an identical
  // card is STILL on screen, so clearing keeps every call independent (no
  // ordering coupling between these cases — HARD RULE: idempotent tests).
  cardEl()?.remove();
  const el = presentError(input);
  expect(el).not.toBeNull();
  return el?.dataset.beacioErrorCode ?? '';
}

describe('W10-PARITY2: detect presenter and core agree on the overloaded NotFoundError', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    clear();
  });

  it('classifies the canonical Chromium cancellation string as USER_CANCELLED through BOTH paths', () => {
    const err = new DOMException(CHROMIUM_CANCEL_MESSAGE, 'NotFoundError');
    const fromCore = coreCode(err);
    const fromPresenter = presenterCode(err);
    // Agreement (the lockstep rule) …
    expect(fromPresenter).toBe(fromCore);
    // … AND agreement on the RIGHT answer, so both drifting together still reds.
    expect(fromCore).toBe('USER_CANCELLED');
  });

  it('never presents a dismissed chooser as the DEVICE_NOT_FOUND card', () => {
    // The concrete user-visible consequence of divergence, asserted directly.
    expect(presenterCode(new DOMException(CHROMIUM_CANCEL_MESSAGE, 'NotFoundError'))).not.toBe('DEVICE_NOT_FOUND');
  });

  // Table-driven parity. POSITIVE rows pin that both copies still match the real
  // message shapes; NEGATIVE rows pin that neither copy over-matches (a predicate
  // widened to `return true` — or to a bare `includes('user')` — reds here).
  const CASES: ReadonlyArray<{ label: string; error: unknown; expected: BeacioErrorCode }> = [
    {
      label: 'canonical Chromium string (NotFoundError)',
      error: new DOMException(CHROMIUM_CANCEL_MESSAGE, 'NotFoundError'),
      expected: 'USER_CANCELLED',
    },
    {
      label: 'UPPERCASED native message (core lowercases internally; the presenter lowercases at its call site)',
      error: new DOMException(CHROMIUM_CANCEL_MESSAGE.toUpperCase(), 'NotFoundError'),
      expected: 'USER_CANCELLED',
    },
    {
      label: 'US spelling ("canceled")',
      error: new DOMException('User canceled the requestDevice() chooser.', 'NotFoundError'),
      expected: 'USER_CANCELLED',
    },
    {
      label: 'stack-suffixed native message',
      error: new DOMException(`${CHROMIUM_CANCEL_MESSAGE}\n    at foo (webkit://x.js:1:2)`, 'NotFoundError'),
      expected: 'USER_CANCELLED',
    },
    {
      label: 'cancellation message on a plain Error (falls past the DOM-name switch in both)',
      error: new Error(CHROMIUM_CANCEL_MESSAGE),
      expected: 'USER_CANCELLED',
    },
    {
      label: 'NEGATIVE: genuine NotFoundError — no adapter',
      error: new DOMException('Bluetooth adapter not available.', 'NotFoundError'),
      expected: 'DEVICE_NOT_FOUND',
    },
    {
      label: 'NEGATIVE: genuine NotFoundError — nothing matched the filters',
      error: new DOMException('No Devices Found', 'NotFoundError'),
      expected: 'DEVICE_NOT_FOUND',
    },
  ];

  it.each(CASES)('core and the presenter agree: $label', ({ error, expected }) => {
    const fromCore = coreCode(error);
    const fromPresenter = presenterCode(error);
    expect(fromPresenter).toBe(fromCore);
    expect(fromCore).toBe(expected);
  });

  /**
   * Layer 3 — the EMITTER literal (the third copy of this knowledge).
   *
   * `src/extension/` is SHIPPED, public, injected JS (project rule #1: no BLE
   * logic may be ADDED there), so this guard only READS the literal out of the
   * source and feeds it through the two predicates. The emitter is selected
   * STRUCTURALLY — every `new DOMException(<literal>, 'NotFoundError')` in the
   * polyfill's two throw sites — never by matching on the message text, so the
   * selector cannot be a tautology of the thing under test.
   */
  describe('the SHIPPED polyfill emitter satisfies both predicates', () => {
    const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
    // The two places the polyfill rejects requestDevice() for a dismissed chooser.
    const EMITTER_SOURCES = ['src/extension/page-bootstrap.ts', 'src/beacio/api/bluetooth.ts'];
    // `new DOMException(<quoted literal>, <quoted>NotFoundError)`, quote-agnostic.
    const EMITTER_RE = /new DOMException\(\s*(['"`])((?:[^'"`\\]|\\.)*)\1\s*,\s*(['"`])NotFoundError\3\s*\)/g;
    // Quoted-name occurrences: the emitter FORM. Prose mentions of NotFoundError
    // in comments are unquoted and deliberately not counted.
    const QUOTED_NAME_RE = /['"`]NotFoundError['"`]/g;

    it.each(EMITTER_SOURCES)('%s throws a cancellation message BOTH predicates code USER_CANCELLED', (rel) => {
      const src: string = readFileSync(resolve(REPO_ROOT, rel), 'utf8');
      const messages = Array.from(src.matchAll(EMITTER_RE), (m) => m[2]);
      const quotedNames = (src.match(QUOTED_NAME_RE) || []).length;

      // Anti-escape: if a NotFoundError emitter is added, moved onto multiple
      // lines, or built from a variable, the structural scan silently stops
      // seeing it — so pin the counts and fail LOUDLY instead of vacuously
      // passing over zero emitters.
      expect(messages.length).toBe(1);
      expect(quotedNames).toBe(messages.length);

      for (const message of messages) {
        expect(message.length).toBeGreaterThan(0);
        const err = new DOMException(message, 'NotFoundError');
        expect(coreCode(err)).toBe('USER_CANCELLED');
        expect(presenterCode(err)).toBe('USER_CANCELLED');
      }
    });
  });
});
