/**
 * @ios-web-bluetooth/core — SDK attribution hook.
 *
 * Closes the attribution-token round-trip between distribution channels
 * (MCP install plans, CDN snippets, direct copy/paste, GitHub READMEs,
 * npm READMEs) and the Cloudflare beacon Worker at
 * `beacon.ioswebble.com/beacon`.
 *
 * Flow:
 *   1. A distribution surface injects `<script data-webble-attr="webble_YYYYMM_<channel>_<rand>" …>`
 *      into the consumer's page.
 *   2. This module runs at polyfill-mount time, finds the first script tag
 *      whose `data-webble-attr` matches the pinned regex, and POSTs one
 *      `sdk_loaded_origin` beacon containing the token.
 *   3. The beacon Worker splits the token into `attribution_month` +
 *      `attribution_channel` and writes a row to the `webble_events` AE
 *      dataset (see `cloudflare/workers/beacon/src/index.ts`).
 *   4. The stats Worker (`cloudflare/workers/stats/src/index.ts`) aggregates
 *      those rows per channel for the public AIA counter.
 *
 * Contract invariants (must not drift — verified by grep guards):
 *   - Endpoint: `https://beacon.ioswebble.com/beacon` (apex `/beacon`).
 *   - Event name: `sdk_loaded_origin` (exact string, no variants).
 *   - Token regex: `/^webble_(\d{6})_(mcp|cdn|direct|github|npm)_([a-z0-9]{1,40})$/`,
 *     total length ≤ 80. Pinned across the MCP server (Wave I.3), the
 *     beacon Worker (Wave I.2), `website-src/openapi.yaml`, and the
 *     attribution section of `docs/distribution/cursor/README.md`.
 *
 * Design rules:
 *   - Never throws. Every failure path `console.debug`s and returns.
 *   - Never blocks the polyfill. Scheduled via `requestIdleCallback` when
 *     available, otherwise a 0ms `setTimeout`.
 *   - Per-session dedup via `sessionStorage['webble_sdk_loaded_emitted']`
 *     so SPA navigation within one tab emits exactly once.
 *   - SSR-safe: no-op when `document` or `window` are undefined.
 *   - No token → no emit. A tokenless beacon writes
 *     `attribution_channel=""` to AE, which the stats Worker treats as
 *     `direct`; emitting tokenless pollutes the dataset. If a page loads
 *     the SDK without an install-plan snippet, we stay silent.
 *
 * Opt-out (either signal suppresses emission):
 *   - `<script data-webble-attr="…" data-webble-no-telemetry>` on the SAME
 *     script tag → that token is ignored (scanner falls through to the
 *     next candidate).
 *   - `globalThis.__WEBBLE_NO_TELEMETRY__ === true` → entire hook no-ops.
 *
 * Override for self-hosted installs / tests:
 *   - `globalThis.__WEBBLE_BEACON_URL__` replaces the default endpoint.
 */

// AIDEV-NOTE: __WEBBLE_VERSION__ is a compile-time constant injected by
// `tsup` via the `define` option (see `tsup.config.ts`). The value comes
// from `packages/core/package.json#version` at build time. Declared here
// so `tsc --noEmit` accepts it; tsup rewrites every occurrence to the
// literal string before minification.
declare const __WEBBLE_VERSION__: string;

import { detectPlatform } from './platform';

// AIDEV-NOTE: This regex is byte-for-byte identical to:
//   - cloudflare/workers/beacon/src/index.ts::ATTRIBUTION_TOKEN_REGEX
//   - packages/mcp (install-plan minter, Wave I.3)
//   - docs/distribution/cursor/README.md (format spec)
// Drift here silently breaks attribution. Touching it requires a
// playbook amendment plus coordinated edits to every producer.
const ATTRIBUTION_TOKEN_REGEX =
  /^webble_\d{6}_(mcp|cdn|direct|github|npm)_[a-z0-9]{1,40}$/;
const ATTRIBUTION_TOKEN_MAX_LEN = 80;

const DEFAULT_BEACON_URL = 'https://beacon.ioswebble.com/beacon';
const SDK_LOADED_EVENT = 'sdk_loaded_origin';
const SESSION_DEDUP_KEY = 'webble_sdk_loaded_emitted';
const OPT_OUT_ATTR = 'data-webble-no-telemetry';
const ATTR_NAME = 'data-webble-attr';

let debugLoggedSkip = false;

function debug(message: string, err?: unknown): void {
  try {
    // eslint-disable-next-line no-console
    console.debug(`[webble/attribution] ${message}`, err ?? '');
  } catch {
    // If even console.debug throws (rare host shims), stay silent.
  }
}

function getBeaconUrl(): string {
  const override = (globalThis as { __WEBBLE_BEACON_URL__?: unknown }).__WEBBLE_BEACON_URL__;
  return typeof override === 'string' && override.length > 0 ? override : DEFAULT_BEACON_URL;
}

function telemetryGloballyDisabled(): boolean {
  return (globalThis as { __WEBBLE_NO_TELEMETRY__?: unknown }).__WEBBLE_NO_TELEMETRY__ === true;
}

/**
 * Scan every script tag carrying `data-webble-attr` and return the first
 * whose attribute value matches the pinned regex AND does NOT carry the
 * opt-out flag. First-match semantics: the distribution snippet is always
 * the first `data-webble-attr` script in source order (inserted at the
 * top of `<head>`), so later decoys never win.
 */
function findAttributionToken(): string | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    `script[${ATTR_NAME}]`,
  );
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    if (script.hasAttribute(OPT_OUT_ATTR)) continue;
    const raw = script.getAttribute(ATTR_NAME);
    if (typeof raw !== 'string') continue;
    if (raw.length === 0 || raw.length > ATTRIBUTION_TOKEN_MAX_LEN) continue;
    if (!ATTRIBUTION_TOKEN_REGEX.test(raw)) continue;
    return raw;
  }
  return null;
}

interface SdkLoadedPayload {
  event: typeof SDK_LOADED_EVENT;
  attribution_token: string;
  props: {
    sdk_version: string;
    platform: string;
  };
}

function buildPayload(token: string): SdkLoadedPayload {
  // `detectPlatform()` is platform-dependent but itself guards against
  // missing `navigator`; safe to call inside an idle callback.
  let platform = 'unsupported';
  try {
    platform = detectPlatform();
  } catch {
    // Leave platform='unsupported' on unexpected probe failure.
  }

  return {
    event: SDK_LOADED_EVENT,
    attribution_token: token,
    props: {
      sdk_version: typeof __WEBBLE_VERSION__ === 'string' ? __WEBBLE_VERSION__ : '0.0.0',
      platform,
    },
  };
}

function postBeacon(payload: SdkLoadedPayload): void {
  const url = getBeaconUrl();
  const body = JSON.stringify(payload);

  // navigator.sendBeacon is the correct transport: it survives pagehide,
  // does not count against active fetch budgets, and the UA batches it.
  // MIME type is JSON so the Worker's `req.json()` parses it directly.
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && typeof nav.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      const queued = nav.sendBeacon(url, blob);
      if (queued) return;
      // Browser rejected (e.g. quota exceeded); fall through to fetch.
    } catch (err) {
      debug('sendBeacon threw, falling back to fetch', err);
    }
  }

  if (typeof fetch !== 'function') {
    debug('no sendBeacon and no fetch available — skipping emit');
    return;
  }

  try {
    // `keepalive: true` lets the request outlive the document. `mode: cors`
    // + `credentials: omit` keeps this a simple POST without cookies; the
    // Worker explicitly returns `Access-Control-Allow-Origin: *`.
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
    }).catch((err) => debug('fetch rejected', err));
  } catch (err) {
    debug('fetch threw synchronously', err);
  }
}

function alreadyEmittedThisSession(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(SESSION_DEDUP_KEY) === '1';
  } catch {
    // sessionStorage can throw in sandboxed iframes / disabled-storage
    // modes. Treat as "not emitted" so a single cross-origin iframe does
    // not silently suppress every future emit; the per-page guard in
    // applyPolyfill already dedups within one document load.
    return false;
  }
}

function markEmittedThisSession(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(SESSION_DEDUP_KEY, '1');
  } catch {
    // Storage quota or disabled — swallow.
  }
}

function runEmit(): void {
  if (telemetryGloballyDisabled()) return;
  if (alreadyEmittedThisSession()) return;

  const token = findAttributionToken();
  if (!token) {
    if (!debugLoggedSkip) {
      debugLoggedSkip = true;
      debug(
        'no data-webble-attr script with a valid attribution token found; ' +
          'skipping sdk_loaded_origin beacon to avoid polluting the dataset ' +
          'with empty-channel rows.',
      );
    }
    return;
  }

  // Mark before network emit: a failed send should not cause a retry on
  // the next applyPolyfill() re-entry within this session (AE dedup
  // does not exist, and we prefer under-counting to double-counting).
  markEmittedThisSession();

  try {
    const payload = buildPayload(token);
    postBeacon(payload);
  } catch (err) {
    debug('emit failed', err);
  }
}

/**
 * Fire-and-forget `sdk_loaded_origin` beacon. Safe to call multiple
 * times; the per-session dedup guard ensures at most one network emit
 * per tab. Called from `applyPolyfill()` at polyfill-mount time.
 *
 * No-ops in the following cases:
 *   - SSR / Worker contexts (no `document` or `window`).
 *   - `globalThis.__WEBBLE_NO_TELEMETRY__ === true`.
 *   - `sessionStorage[webble_sdk_loaded_emitted] === '1'`.
 *   - No `<script data-webble-attr>` tag with a regex-valid token.
 *   - Every candidate script carries `data-webble-no-telemetry`.
 */
export function emitSdkLoadedOrigin(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (telemetryGloballyDisabled()) return;

  const schedule: (cb: () => void) => void = (() => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (typeof ric === 'function') return (cb) => ric(cb);
    return (cb) => setTimeout(cb, 0);
  })();

  try {
    schedule(() => {
      try {
        runEmit();
      } catch (err) {
        debug('runEmit threw', err);
      }
    });
  } catch (err) {
    debug('failed to schedule emit', err);
  }
}

// Exported for tests only. Not part of the public API; do not import
// from application code.
export const __internals = {
  ATTRIBUTION_TOKEN_REGEX,
  ATTRIBUTION_TOKEN_MAX_LEN,
  DEFAULT_BEACON_URL,
  SESSION_DEDUP_KEY,
  findAttributionToken,
  buildPayload,
  runEmit,
  resetDebugSkipFlag: () => {
    debugLoggedSkip = false;
  },
};
