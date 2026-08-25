/**
 * The beacio ERROR-CONDITIONS table — the ONE enumeration of every first-party
 * condition surfacing to a page as a NotFoundError DOMException, keyed by
 * conditionId, NOT by message: chooser-cancelled and activation-dismissed share
 * one frozen cancel sentence (both USER_CANCELLED), and a message-keyed map is
 * structurally incapable of recording that (GH #354).
 * S5 of docs/reviews/2026-08-12-error-classification-panel/S5-DESIGN.md
 * (revisions R1-R3 applied; R3 extended to the sanitize fixed-point).
 *
 * LEAF: the only import is `import type` (erased), so the runtime closure is
 * this file alone — BeacioError/SUGGESTIONS/withRetry stay in ../errors.ts,
 * unreachable. Rows ship inside the bundles that emit them (auto.mjs budget
 * 3,072 B gzip; browser-auto 19,456 B), so each row const is its own
 * tree-shaking unit and the CONDITIONS aggregate is for TESTS/TOOLING ONLY —
 * nothing shipped may reference it (R1b, enforced by the step-E lint).
 * PURE discipline (leak RCA 2026-08-12): inside this leaf, no member access may
 * appear in a module-level initializer outside a PURE-annotated call — esbuild
 * must assume `X.y` can be a getter, which defeats `#__PURE__` and retains the
 * statement (and its row deps) in every importer.
 *
 * VERSION-SKEW INVARIANTS (§8.2 — App Store extension is slow, npm is fast; two
 * compiled copies WILL coexist): ids are APPEND-ONLY; message bytes are FROZEN
 * (edited only via reviewed adjudication); the classifier stays exact-sentence
 * rows first with the foreign fragments load-bearing FOREVER; no text-based
 * provenance detection, ever (S7's wire discriminator is the only channel).
 *
 * Adjudication prose (decision/openQuestion per row) is deliberately TEST-SIDE
 * (R1c): tests/error-conditions.test.ts `CONDITION_META`, totality-asserted.
 */
import type { BeacioErrorCode } from './error-taxonomy';

/**
 * GH #354 — the out-of-band discriminator between the three conditions that share
 * Chromium's byte-frozen chooser-cancellation sentence. `Symbol.for` so the
 * stringified page-bootstrap (page realm) and the npm SDK resolve the SAME symbol
 * (precedent: `Symbol.for('beacio.replayGrant')`). A hostile page CAN forge this
 * symbol, so `carriedConditionCode` validates against the closed carried-code set
 * below — never trust an arbitrary string as a BeacioErrorCode.
 */
export const CONDITION_CODE = Symbol.for('beacio.conditionCode');

/**
 * The closed set of codes a row can carry. Hardcoded LITERALS on purpose: the PURE
 * discipline forbids `ROW.code` member access in a module-level initializer. Keep in
 * sync with the rows' `code` fields (pinned by the tests' hardcoded oracle).
 */
const CARRIED_CODES: ReadonlySet<BeacioErrorCode> = new Set<BeacioErrorCode>([
  'USER_CANCELLED',
  'EXTENSION_NOT_ENABLED',
  'EXTENSION_NOT_INSTALLED',
  'DEVICE_NOT_FOUND',
]);

/** Read a validated carried code off a (possibly hostile) carrier; undefined → text fallback. */
export function carriedConditionCode(error: unknown): BeacioErrorCode | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = (error as unknown as Record<symbol, unknown>)[CONDITION_CODE];
  return typeof value === 'string' && CARRIED_CODES.has(value as BeacioErrorCode)
    ? (value as BeacioErrorCode)
    : undefined;
}

/** Every first-party NotFoundError condition. APPEND-ONLY (version skew). */
export type ConditionId =
  | 'chooser-cancelled'
  | 'activation-dismissed'
  | 'activation-enable-timed-out'
  | 'grant-wall'
  | 'cdn-dormant'
  | 'cdn-restore-pending'
  | 'unsupported-platform-install'
  | 'bridge-unavailable'
  | 'mock-no-adapter'
  | 'mock-no-device-match'
  | 'mock-service-absent'
  | 'mock-characteristic-absent'
  | 'mock-descriptor-absent';

/** Rows whose message carries a `{uuid}` placeholder (factory REQUIRES the uuid). */
export type TemplateConditionId = 'mock-service-absent' | 'mock-characteristic-absent' | 'mock-descriptor-absent';
export type StaticConditionId = Exclude<ConditionId, TemplateConditionId>;

declare const conditionBrand: unique symbol;

/**
 * A row. BRANDED (R1a): only the leaf-private defineCondition() mints one — a
 * forged inline row needs an `as ErrorCondition` cast, banned outside this leaf
 * by the step-E lint. `domName` is pinned for S5's scope; it widens to a name
 * union only when another DOM name onboards (append-only, no silent creep).
 */
export interface ErrorCondition<K extends ConditionId = ConditionId> {
  readonly id: K;
  readonly domName: 'NotFoundError';
  readonly message: string;
  readonly code: BeacioErrorCode;
  readonly [conditionBrand]: true;
}

/** Leaf-private minting seam — the ONLY way an ErrorCondition comes to exist. */
function defineCondition<K extends ConditionId>(row: {
  readonly id: K;
  readonly domName: 'NotFoundError';
  readonly message: string;
  readonly code: BeacioErrorCode;
}): ErrorCondition<K> {
  return Object.freeze(row) as ErrorCondition<K>;
}

/** Chromium's CHOOSER_CANCELLED sentence, emitted verbatim by the Convention-5 seam (bluetooth.ts). */
export const CHOOSER_CANCELLED = /*#__PURE__*/ defineCondition({
  id: 'chooser-cancelled', domName: 'NotFoundError', code: 'USER_CANCELLED',
  message: 'User cancelled the requestDevice() chooser.',
});

/** Activation banner dismissed (content-full → page-bootstrap listener). */
export const ACTIVATION_DISMISSED = /*#__PURE__*/ defineCondition({
  id: 'activation-dismissed', domName: 'NotFoundError', code: 'USER_CANCELLED',
  message: 'User cancelled the requestDevice() chooser.',
});

/**
 * Enable-flow timed out (or ACTIVATE_BLE send failed — same user-visible copy).
 * V7: this row now carries its OWN beacio-owned sentence ("Beacio activation
 * timed out") instead of reusing Chromium's byte-frozen chooser-cancellation
 * bytes — the enable timed out, the user did NOT cancel. The code stays
 * EXTENSION_NOT_ENABLED, and the honest sentence text-classifies
 * 'extension-not-enabled' on its own (see error-taxonomy.ts NOT_FOUND_FRAGMENTS),
 * so the split no longer relies on the out-of-band discriminator alone. R3's
 * message-aware "drop the cancel-sentence lie" branch (error-taxonomy.ts) is now
 * a VERSION-SKEW GUARD only — pre-V7 emitters still ship the cancel bytes with
 * this code; the live sentence is ECHOED, never dropped to the SUGGESTION.
 */
export const ACTIVATION_ENABLE_TIMED_OUT = /*#__PURE__*/ defineCondition({
  id: 'activation-enable-timed-out', domName: 'NotFoundError', code: 'EXTENSION_NOT_ENABLED',
  message: 'Beacio activation timed out',
});

/** Grant wall: installed, origin never enabled (G1/LESCAN-01; Chromium maps the same condition onto NotFoundError, bluetooth_error.cc:161-163). */
export const GRANT_WALL = /*#__PURE__*/ defineCondition({
  id: 'grant-wall', domName: 'NotFoundError', code: 'EXTENSION_NOT_ENABLED',
  message: 'User has not enabled Web Bluetooth for this origin.',
});

/** CDN loader while the extension is dormant — grant-wall's other surface. */
export const CDN_DORMANT = /*#__PURE__*/ defineCondition({
  id: 'cdn-dormant', domName: 'NotFoundError', code: 'EXTENSION_NOT_ENABLED',
  message: 'Beacio is installed but not active. Follow the Beacio setup prompt, then retry.',
});

/**
 * CDN loader inside Safari's POST-RESTORE window: this origin has seen the
 * extension announce before (the `beacio_seen` hint), so the tap was HELD rather
 * than funnelled — but Safari's extension-context scheduler did not deliver the
 * content script within the hold's grace window. A SIBLING of CDN_DORMANT, not a
 * reuse of it: cdn-dormant's sentence tells the user to "follow the Beacio setup
 * prompt", and in this condition there IS no setup prompt — nothing is wrong
 * with their install, the page simply has not been given the extension yet.
 * Deliberately NOT the install funnel: this person already has beacio.
 */
export const CDN_RESTORE_PENDING = /*#__PURE__*/ defineCondition({
  id: 'cdn-restore-pending', domName: 'NotFoundError', code: 'EXTENSION_NOT_ENABLED',
  message: 'Beacio is still starting up in this tab. Wait a moment, then retry.',
});

/**
 * auto.ts unsupported-platform stub. Its LEADING sentence is Chromium's
 * WEB_BLUETOOTH_NOT_SUPPORTED string verbatim — only the beacio tail may ever
 * classify it (the bare Chromium sentence must stay DEVICE_NOT_FOUND).
 */
export const UNSUPPORTED_PLATFORM_INSTALL = /*#__PURE__*/ defineCondition({
  id: 'unsupported-platform-install', domName: 'NotFoundError', code: 'EXTENSION_NOT_INSTALLED',
  message:
    'Web Bluetooth is not supported on this platform. ' +
    'On iOS Safari, install the Beacio extension. ' +
    'See: https://beacio.com',
});

/** injected-full: the content-script bridge never answered (transport failure). */
export const BRIDGE_UNAVAILABLE = /*#__PURE__*/ defineCondition({
  id: 'bridge-unavailable', domName: 'NotFoundError', code: 'DEVICE_NOT_FOUND',
  message: 'Content script not available',
});

/** Mock adapter unavailable. PERIOD-LESS on purpose (≠ Chromium's "…available."); never a classifier row. */
export const MOCK_NO_ADAPTER = /*#__PURE__*/ defineCondition({
  id: 'mock-no-adapter', domName: 'NotFoundError', code: 'DEVICE_NOT_FOUND',
  message: 'Bluetooth adapter not available',
});

/** Mock chooser: nothing matched the filters. */
export const MOCK_NO_DEVICE_MATCH = /*#__PURE__*/ defineCondition({
  id: 'mock-no-device-match', domName: 'NotFoundError', code: 'DEVICE_NOT_FOUND',
  message: 'No devices found matching the filter criteria',
});

/** Mock getPrimaryService miss ({uuid} template). SERVICE_NOT_FOUND is deliberately unreachable for DOMException carriers. */
export const MOCK_SERVICE_ABSENT = /*#__PURE__*/ defineCondition({
  id: 'mock-service-absent', domName: 'NotFoundError', code: 'DEVICE_NOT_FOUND',
  message: 'No Services matching UUID {uuid} found',
});

/** Mock getCharacteristic miss ({uuid} template; characteristics.ts:167-170 — R5a). */
export const MOCK_CHARACTERISTIC_ABSENT = /*#__PURE__*/ defineCondition({
  id: 'mock-characteristic-absent', domName: 'NotFoundError', code: 'DEVICE_NOT_FOUND',
  message: 'No Characteristics matching UUID {uuid} found',
});

/** Mock getDescriptor miss ({uuid} template). */
export const MOCK_DESCRIPTOR_ABSENT = /*#__PURE__*/ defineCondition({
  id: 'mock-descriptor-absent', domName: 'NotFoundError', code: 'DEVICE_NOT_FOUND',
  message: 'No Descriptors matching UUID {uuid} found',
});

/** TESTS/TOOLING ONLY (R1b) — referenced by nothing shipped. `satisfies` forces totality both ways. */
export const CONDITIONS = /*#__PURE__*/ Object.freeze({
  'chooser-cancelled': CHOOSER_CANCELLED,
  'activation-dismissed': ACTIVATION_DISMISSED,
  'activation-enable-timed-out': ACTIVATION_ENABLE_TIMED_OUT,
  'grant-wall': GRANT_WALL,
  'cdn-dormant': CDN_DORMANT,
  'cdn-restore-pending': CDN_RESTORE_PENDING,
  'unsupported-platform-install': UNSUPPORTED_PLATFORM_INSTALL,
  'bridge-unavailable': BRIDGE_UNAVAILABLE,
  'mock-no-adapter': MOCK_NO_ADAPTER,
  'mock-no-device-match': MOCK_NO_DEVICE_MATCH,
  'mock-service-absent': MOCK_SERVICE_ABSENT,
  'mock-characteristic-absent': MOCK_CHARACTERISTIC_ABSENT,
  'mock-descriptor-absent': MOCK_DESCRIPTOR_ABSENT,
} satisfies Record<ConditionId, ErrorCondition>);

/** REQUIRED for exactly the template ids, FORBIDDEN otherwise (TS2554) — no optional arguments. */
export type ConditionParams<K extends ConditionId> = K extends TemplateConditionId ? [uuid: string] : [];

/**
 * The factory — ROW-passing (R1): closes over nothing, so each importer carries
 * exactly the row consts it emits. The runtime guard is for un-typed JS callers
 * only: loud, never a silent undefined-message DOMException.
 */
export function beacioDomException<K extends ConditionId>(
  row: ErrorCondition<K>,
  ...params: ConditionParams<K>
): DOMException {
  if (!row || typeof row.message !== 'string') {
    throw new TypeError('beacio: invalid error condition');
  }
  const uuid = (params as readonly string[])[0];
  // Template rows REQUIRE a uuid (the factory is typed to enforce it, but an
  // un-typed caller of the published @beacio/core/testing surface can omit it).
  // Fail loud — never emit the literal `{uuid}` placeholder into a page-visible
  // message.
  if (row.message.includes('{uuid}') && (typeof uuid !== 'string' || uuid.length === 0)) {
    throw new TypeError('beacio: template error condition requires a uuid');
  }
  // R2: FUNCTION replacement — a string replacement would interpret $&, $', $`, $$ in the uuid.
  const message = uuid === undefined ? row.message : row.message.replace('{uuid}', () => uuid);
  const err = new DOMException(message, row.domName);
  // GH #354: carry row.code out-of-band so a byte-frozen shared sentence still
  // classifies truthfully (symbol-keyed → never collides with DOMException.code).
  Object.defineProperty(err, CONDITION_CODE, {
    value: row.code, writable: false, enumerable: false, configurable: true,
  });
  return err;
}

/** The ids the stringified page-bootstrap payload carries (design §3, C1). */
export type PageBootstrapConditionId = 'grant-wall' | 'activation-dismissed' | 'activation-enable-timed-out';

/**
 * A payload row: message + code — the bootstrap mint hardcodes the DOM name (C4)
 * and attaches `code` under the out-of-band discriminator (GH #354), so the
 * byte-frozen shared sentence still classifies truthfully in the page realm.
 */
export interface PageConditionRow {
  readonly message: string;
  readonly code: BeacioErrorCode;
}

/**
 * Payload-row projection AND the §3 static assertion in one seam: the parameter
 * constraint requires domName 'NotFoundError', so the bootstrap mint's
 * hardcoded literal (kept for the freeze's one-dynamic-site pin, C4) can never
 * drift from the table. Also the PURE-discipline fix from the header: a bare
 * `{ message: GRANT_WALL.message }` literal retained the unused payload — and
 * all three rows — in every taxonomy importer (measured +94 B gzip in
 * browser-auto); identifier-only arguments keep it droppable.
 */
const pageRow = (row: ErrorCondition & { readonly domName: 'NotFoundError' }): PageConditionRow => ({
  message: row.message,
  code: row.code,
});

/**
 * The three page-realm rows for the serialized bootstrap payload
 * (page-bootstrap.ts is STRINGIFIED for injection and cannot import the factory
 * — design §0 C1; it defines a payload-carried local mint instead).
 */
export const PAGE_BOOTSTRAP_CONDITIONS: Readonly<Record<PageBootstrapConditionId, PageConditionRow>> =
  /*#__PURE__*/ Object.freeze({
    'grant-wall': /*#__PURE__*/ pageRow(GRANT_WALL),
    'activation-dismissed': /*#__PURE__*/ pageRow(ACTIVATION_DISMISSED),
    'activation-enable-timed-out': /*#__PURE__*/ pageRow(ACTIVATION_ENABLE_TIMED_OUT),
  });
