/**
 * @ios-web-bluetooth/core/auto — Transparent Web Bluetooth polyfill.
 *
 * Usage: import '@ios-web-bluetooth/core/auto';
 *
 * - Chrome/Edge (native bluetooth): no-op
 * - Safari iOS (with extension): ensures navigator.bluetooth maps to extension API
 * - Safari iOS (without extension): lazy-loads install prompt on first requestDevice()
 * - Unsupported platforms: no-op (graceful degradation)
 */

import { detectPlatform, getBluetoothAPI } from './platform';
import { BluetoothUUID } from './bluetooth-uuid';

/**
 * Patch navigator.permissions.query to support { name: 'bluetooth' }.
 * Returns 'granted' when the extension is active, 'prompt' otherwise.
 */
function patchPermissionsAPI(state: PermissionState): void {
  if (typeof navigator === 'undefined' || !navigator.permissions) return;

  const originalQuery = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = function (
    descriptor: PermissionDescriptor
  ): Promise<PermissionStatus> {
    if ((descriptor as any).name === 'bluetooth') {
      // Synthesize a PermissionStatus-like object
      const target = new EventTarget();
      const status = Object.create(target, {
        state: { get: () => state, enumerable: true },
        name: { get: () => 'bluetooth', enumerable: true },
        onchange: { value: null, writable: true, enumerable: true },
      }) as PermissionStatus;
      return Promise.resolve(status);
    }
    return originalQuery(descriptor);
  };
}

function applyPolyfill(): void {
  if (typeof navigator === 'undefined') return;

  const bluetoothNavigator = navigator as Navigator & {
    bluetooth?: Bluetooth;
  };

  // Expose BluetoothUUID global (spec §4) on all platforms
  if (typeof window !== 'undefined' && !(window as any).BluetoothUUID) {
    (window as any).BluetoothUUID = BluetoothUUID;
  }

  const platform = detectPlatform();

  if (platform === 'native') {
    // Chrome, Edge, etc. — native Web Bluetooth already works
    return;
  }

  if (platform === 'safari-extension') {
    // Extension provides full API on navigator.webble — proxy to navigator.bluetooth
    const api = getBluetoothAPI();
    if (api && !bluetoothNavigator.bluetooth) {
      Object.defineProperty(navigator, 'bluetooth', {
        get: () => api,
        configurable: true,
      });
    }
    // Permissions API: extension active → 'granted'
    patchPermissionsAPI('granted');
    return;
  }

  // Unsupported or Safari without extension — install lazy proxy
  // Permissions API: no extension → 'prompt'
  patchPermissionsAPI('prompt');
  if (!bluetoothNavigator.bluetooth) {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'requestDevice') {
          return async (...args: unknown[]) => {
            // Attempt dynamic import of @ios-web-bluetooth/detect for install banner
            try {
              const detect = await import('@ios-web-bluetooth/detect');
              if (typeof detect.showInstallBanner === 'function') {
                detect.showInstallBanner();
              }
            } catch {
              // @ios-web-bluetooth/detect not installed — throw descriptive error
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
