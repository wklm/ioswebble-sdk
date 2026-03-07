/**
 * @wklm/core/auto — Transparent Web Bluetooth polyfill.
 *
 * Usage: import '@wklm/core/auto';
 *
 * - Chrome/Edge (native bluetooth): no-op
 * - Safari iOS (with extension): ensures navigator.bluetooth maps to extension API
 * - Safari iOS (without extension): lazy-loads install prompt on first requestDevice()
 * - Unsupported platforms: no-op (graceful degradation)
 */

import { detectPlatform, getBluetoothAPI } from './platform';

function applyPolyfill(): void {
  if (typeof navigator === 'undefined') return;

  const platform = detectPlatform();

  if (platform === 'native') {
    // Chrome, Edge, etc. — native Web Bluetooth already works
    return;
  }

  if (platform === 'safari-extension') {
    // Extension provides full API on navigator.webble — proxy to navigator.bluetooth
    const api = getBluetoothAPI();
    if (api && !navigator.bluetooth) {
      Object.defineProperty(navigator, 'bluetooth', {
        get: () => api,
        configurable: true,
      });
    }
    return;
  }

  // Unsupported or Safari without extension — install lazy proxy
  if (!navigator.bluetooth) {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'requestDevice') {
          return async (...args: unknown[]) => {
            // Attempt dynamic import of @wklm/detect for install banner
            try {
              const detect = await import('@wklm/detect');
              if (typeof detect.showInstallBanner === 'function') {
                detect.showInstallBanner();
              }
            } catch {
              // @wklm/detect not installed — throw descriptive error
            }
            throw new Error(
              'Web Bluetooth is not supported on this platform. ' +
              'On iOS Safari, install the WebBLE extension. ' +
              'See: https://ioswebble.com'
            );
          };
        }
        if (prop === 'getAvailability') {
          return async () => false;
        }
        return undefined;
      },
    };

    const proxy = new Proxy({} as Record<string, unknown>, handler);
    Object.defineProperty(navigator, 'bluetooth', {
      get: () => proxy,
      configurable: true,
    });
  }
}

applyPolyfill();
