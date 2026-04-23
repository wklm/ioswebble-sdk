/**
 * Tests for `src/attribution-hook.ts` — the SDK attribution round-trip
 * emitter. Verifies the three contract invariants (endpoint, event name,
 * token regex) plus the dedup / opt-out / fallback branches.
 *
 * jest-environment: jsdom (inherited from `jest.config.js`). Each test
 * rebuilds `document.head`, clears `sessionStorage`, and re-imports the
 * module to reset the per-session + per-process dedup guards.
 */

// We re-import the module per test block via jest.isolateModules so
// module-level state (the debug-skip latch) resets cleanly.
type AttributionModule = typeof import('../attribution-hook');

function loadModule(): AttributionModule {
  let mod: AttributionModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../attribution-hook');
  });
  if (!mod) throw new Error('failed to load attribution-hook');
  return mod;
}

function installScript(attrValue: string, opts: { optOut?: boolean } = {}): HTMLScriptElement {
  const s = document.createElement('script');
  s.setAttribute('data-webble-attr', attrValue);
  if (opts.optOut) s.setAttribute('data-webble-no-telemetry', '');
  document.head.appendChild(s);
  return s;
}

function clearScripts(): void {
  document.head.querySelectorAll('script[data-webble-attr]').forEach((n) => n.remove());
}

describe('emitSdkLoadedOrigin — attribution hook', () => {
  const realSendBeacon = (navigator as Navigator & { sendBeacon?: unknown }).sendBeacon;
  const realFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    clearScripts();
    sessionStorage.clear();
    delete (globalThis as { __WEBBLE_NO_TELEMETRY__?: unknown }).__WEBBLE_NO_TELEMETRY__;
    delete (globalThis as { __WEBBLE_BEACON_URL__?: unknown }).__WEBBLE_BEACON_URL__;
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore transports between tests.
    if (realSendBeacon !== undefined) {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: realSendBeacon,
        configurable: true,
        writable: true,
      });
    } else {
      delete (navigator as unknown as { sendBeacon?: unknown }).sendBeacon;
    }
    if (realFetch !== undefined) {
      (globalThis as { fetch?: unknown }).fetch = realFetch;
    } else {
      delete (globalThis as { fetch?: unknown }).fetch;
    }
  });

  it('contract: token regex is byte-identical to the pinned beacon-Worker regex', () => {
    const mod = loadModule();
    // This is the string form of the regex pinned in
    // cloudflare/workers/beacon/src/index.ts. If this assertion ever
    // fails, attribution is broken — coordinate the update across
    // every producer listed in docs/distribution/cursor/README.md.
    expect(mod.__internals.ATTRIBUTION_TOKEN_REGEX.source).toBe(
      '^webble_\\d{6}_(mcp|cdn|direct|github|npm)_[a-z0-9]{12,40}$',
    );
    expect(mod.__internals.ATTRIBUTION_TOKEN_MAX_LEN).toBe(80);
    expect(mod.__internals.DEFAULT_BEACON_URL).toBe('https://beacon.ioswebble.com/beacon');
  });

  // AIDEV-NOTE: SSR safety (no `document` / no `window`) is covered by
  // `attribution-hook.ssr.test.ts` which runs under the `node` Jest
  // environment — jsdom installs `document` as a non-configurable
  // property so we cannot reliably spoof its absence from inside a
  // jsdom-hosted test.

  it('no token in DOM → no emit, and console.debug fires once across repeat calls', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).not.toHaveBeenCalled();
    // Exactly one "skipping" log across both calls — the latch prevents
    // flooding when an SPA rebuilds the polyfill state repeatedly.
    const skipLogs = debugSpy.mock.calls.filter(([msg]) =>
      typeof msg === 'string' && msg.includes('no data-webble-attr'),
    );
    expect(skipLogs.length).toBe(1);
    debugSpy.mockRestore();
  });

  it('valid token → POST payload has correct shape (event, token, props.{sdk_version, platform})', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    installScript('webble_202604_mcp_test12345678');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toBe('https://beacon.ioswebble.com/beacon');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
  });

  it('valid token → payload JSON fields are correct', () => {
    // Verify body contents via the __internals helper since Blob.text() is
    // async and we want a synchronous assertion path.
    installScript('webble_202604_cdn_abc123xyz789');
    const mod = loadModule();
    const payload = mod.__internals.buildPayload('webble_202604_cdn_abc123xyz789');
    expect(payload.event).toBe('sdk_loaded_origin');
    expect(payload.attribution_token).toBe('webble_202604_cdn_abc123xyz789');
    expect(typeof payload.props.sdk_version).toBe('string');
    expect(payload.props.sdk_version.length).toBeGreaterThan(0);
    expect(['native', 'safari-extension', 'unsupported']).toContain(payload.props.platform);
  });

  it('rejects tokens failing the pinned regex (too long, wrong channel, uppercase, garbage)', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });

    // > 80 chars
    installScript('webble_202604_mcp_' + 'a'.repeat(80));
    // Unknown channel
    installScript('webble_202604_xyz_abc123');
    // Uppercase suffix
    installScript('webble_202604_mcp_ABC123');
    // Wrong prefix
    installScript('other_202604_mcp_abc123');
    // 5-digit month
    installScript('webble_20260_mcp_abc123');
    // Empty
    installScript('');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('first-match wins in source order: bad early script does not preempt a later good one', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });

    installScript('webble_202604_xyz_badchannel');    // regex-invalid → skipped
    installScript('webble_202604_mcp_goodtoken012');   // valid → wins

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const found = mod.__internals.findAttributionToken();
    expect(found).toBe('webble_202604_mcp_goodtoken012');
  });

  it('per-session dedup: two invocations → at most one network emit', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    installScript('webble_202604_mcp_dedup0000001');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('webble_sdk_loaded_emitted')).toBe('1');
  });

  it('sendBeacon is preferred when available', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    const fetchSpy = jest.fn();
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;
    installScript('webble_202604_mcp_prefersb0012');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetch fallback is invoked when sendBeacon is unavailable', () => {
    delete (navigator as unknown as { sendBeacon?: unknown }).sendBeacon;
    const fetchSpy = jest.fn().mockResolvedValue({ status: 204, ok: true });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;
    installScript('webble_202604_mcp_fallbackfe12');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://beacon.ioswebble.com/beacon');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.keepalive).toBe(true);
    expect(init.mode).toBe('cors');
    expect(init.credentials).toBe('omit');
    expect(typeof init.body).toBe('string');
    const body = JSON.parse(init.body as string);
    expect(body.event).toBe('sdk_loaded_origin');
    expect(body.attribution_token).toBe('webble_202604_mcp_fallbackfe12');
  });

  it('fetch fallback activates when sendBeacon returns false (quota rejection)', () => {
    const sendBeacon = jest.fn().mockReturnValue(false);
    const fetchSpy = jest.fn().mockResolvedValue({ status: 204, ok: true });
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;
    installScript('webble_202604_mcp_quotaflow001');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('errors in the network transport never throw out of emitSdkLoadedOrigin', () => {
    const sendBeacon = jest.fn(() => { throw new Error('boom'); });
    const fetchSpy = jest.fn(() => { throw new Error('also boom'); });
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;
    installScript('webble_202604_mcp_errors000012');

    const mod = loadModule();
    expect(() => {
      mod.emitSdkLoadedOrigin();
      jest.runAllTimers();
    }).not.toThrow();
  });

  it('opt-out: per-script data-webble-no-telemetry skips that token', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    installScript('webble_202604_mcp_optedout0012', { optOut: true });

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('opt-out: per-script opt-out does NOT poison later valid scripts', () => {
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    installScript('webble_202604_mcp_mutedfirst01', { optOut: true });
    installScript('webble_202604_npm_livesecond12');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('opt-out: globalThis.__WEBBLE_NO_TELEMETRY__ suppresses all emits', () => {
    (globalThis as { __WEBBLE_NO_TELEMETRY__?: boolean }).__WEBBLE_NO_TELEMETRY__ = true;
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    installScript('webble_202604_mcp_globalblock1');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('override: globalThis.__WEBBLE_BEACON_URL__ replaces the endpoint', () => {
    (globalThis as { __WEBBLE_BEACON_URL__?: string }).__WEBBLE_BEACON_URL__ =
      'https://self-hosted.example/beacon';
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon, configurable: true, writable: true,
    });
    installScript('webble_202604_mcp_selfhosted12');

    const mod = loadModule();
    mod.emitSdkLoadedOrigin();
    jest.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('https://self-hosted.example/beacon');
  });
});
