/**
 * Auto-initialization for WebBLE.
 *
 * Import this module to automatically detect and handle the extension:
 *   import '@ios-web-bluetooth/detect/auto'
 *
 * Reads the API key from:
 *   1. <meta name="ioswebble-key" content="wbl_xxxxx">
 *   2. window.__IOSWEBBLE_KEY__
 */

import { initIOSWebBLE } from './index';

function getApiKey(): string | null {
  // Check meta tag
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="ioswebble-key"]');
    if (meta) {
      return meta.getAttribute('content');
    }
  }

  // Check global variable
  if (typeof window !== 'undefined' && (window as any).__IOSWEBBLE_KEY__) {
    return (window as any).__IOSWEBBLE_KEY__;
  }

  return null;
}

function getOperatorName(): string | undefined {
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="ioswebble-name"]');
    if (meta) return meta.getAttribute('content') ?? undefined;
  }
  if (typeof window !== 'undefined' && (window as any).__IOSWEBBLE_NAME__) {
    return (window as any).__IOSWEBBLE_NAME__;
  }
  return undefined;
}

const key = getApiKey();
initIOSWebBLE({ key: key ?? undefined, operatorName: getOperatorName() });
