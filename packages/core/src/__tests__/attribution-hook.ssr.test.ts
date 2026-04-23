/**
 * @jest-environment node
 *
 * Verifies that `emitSdkLoadedOrigin()` is a no-op in SSR contexts where
 * neither `document` nor `window` exist. This must run under the `node`
 * Jest environment: jsdom installs `document` as a non-configurable
 * property, so the guard cannot be exercised from inside a jsdom test.
 */

type SsrAttributionModule = typeof import('../attribution-hook');

describe('emitSdkLoadedOrigin — SSR safety (node env)', () => {
  it('returns without touching the network when document/window are absent', () => {
    // Sanity-check the environment — if either of these leak in, the
    // assertion below proves nothing.
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');

    // A throwing `fetch` would surface if the hook mistakenly tried the
    // fetch fallback. `sendBeacon` is naturally absent because there is
    // no `navigator` either.
    const fetchSpy = jest.fn(() => {
      throw new Error('hook should not invoke fetch in SSR');
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    let mod: SsrAttributionModule | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('../attribution-hook');
    });
    if (!mod) throw new Error('failed to load attribution-hook');

    expect(() => mod!.emitSdkLoadedOrigin()).not.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
