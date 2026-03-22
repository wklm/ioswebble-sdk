/**
 * Platform detection utilities for WebBLE
 */

export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

  return isIOS && isSafari;
}

export function isExtensionInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const hasWindowMarker = (): boolean =>
      typeof window !== 'undefined' && (window as any).__webble?.status === 'installed';

    const hasNavigatorMarker = (): boolean => {
      if (typeof navigator === 'undefined') {
        return false;
      }
      return Boolean((navigator as any).webble && (navigator as any).webble.__webble);
    };

    // Method 1: Check for the global marker set by injected-full.ts
    if (hasWindowMarker()) {
      resolve(true);
      return;
    }

    // Method 2: Check if navigator.webble was injected by WebBLE
    if (hasNavigatorMarker()) {
      resolve(true);
      return;
    }

    // Method 3: Wait briefly for injection to complete
    // The content script runs at document_start, so injection should be fast
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      if (hasWindowMarker() || hasNavigatorMarker()) {
        clearInterval(interval);
        resolve(true);
      }
      if (checks > 20) {
        // 2 seconds max wait
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}
