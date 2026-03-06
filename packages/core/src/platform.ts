import type { Platform } from './types';

/** Detect the current Web Bluetooth platform. */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unsupported';

  // Safari extension: navigator.webble with sentinel
  const nav = navigator as any;
  if (nav.webble?.__webble === true) return 'safari-extension';

  // Native Web Bluetooth (Chrome, Edge, etc.) — exclude CDN stubs
  if (nav.bluetooth && !nav.bluetooth.__webbleCDNStub) return 'native';

  return 'unsupported';
}

/** Get the Bluetooth API object for the current platform, or null if unsupported. */
export function getBluetoothAPI(): Bluetooth | null {
  if (typeof navigator === 'undefined') return null;

  const nav = navigator as any;

  // Safari extension provides full API on navigator.webble
  if (nav.webble?.__webble === true) return nav.webble as Bluetooth;

  // Native Web Bluetooth
  if (nav.bluetooth && !nav.bluetooth.__webbleCDNStub) return nav.bluetooth;

  return null;
}
