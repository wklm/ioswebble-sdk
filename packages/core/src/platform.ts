import type { Platform } from './types';

/**
 * Detect the current Web Bluetooth platform by probing `navigator`.
 *
 * **Detection order:**
 * 1. Safari extension -- `navigator.webble?.__webble === true`
 * 2. Native Web Bluetooth -- `navigator.bluetooth` exists (excluding CDN stubs)
 * 3. Unsupported -- No Web Bluetooth capability
 *
 * @returns The detected {@link Platform} value.
 *
 * @see {@link getBluetoothAPI} for getting the actual API object
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unsupported';

  // Safari extension: navigator.webble with sentinel
  const nav = navigator as any;
  if (nav.webble?.__webble === true) return 'safari-extension';

  // Native Web Bluetooth (Chrome, Edge, etc.) — exclude CDN stubs
  if (nav.bluetooth && !nav.bluetooth.__webbleCDNStub) return 'native';

  return 'unsupported';
}

/**
 * Get the `Bluetooth` API object for the current platform.
 *
 * Returns `navigator.webble` for the Safari extension, `navigator.bluetooth` for
 * native Web Bluetooth, or `null` if unsupported. CDN stubs (from `@ios-web-bluetooth/detect`)
 * are excluded.
 *
 * @returns The platform's `Bluetooth` API object, or `null` if unavailable.
 *
 * @see {@link detectPlatform} for identifying the platform without getting the API
 */
export function getBluetoothAPI(): Bluetooth | null {
  if (typeof navigator === 'undefined') return null;

  const nav = navigator as any;

  // Safari extension provides full API on navigator.webble
  if (nav.webble?.__webble === true) return nav.webble as Bluetooth;

  // Native Web Bluetooth
  if (nav.bluetooth && !nav.bluetooth.__webbleCDNStub) return nav.bluetooth;

  return null;
}
