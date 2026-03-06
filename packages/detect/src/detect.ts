/**
 * Platform detection utilities for iOSWebBLE
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
    // Method 1: Check for the global marker set by injected-full.ts
    if (typeof window !== 'undefined' && (window as any).__webble__) {
      resolve(true);
      return;
    }

    // Method 2: Check if navigator.webble or navigator.bluetooth was injected by iOSWebBLE
    if (typeof navigator !== 'undefined') {
      if (
        ((navigator as any).webble && (navigator as any).webble.__webble) ||
        (navigator.bluetooth && (navigator.bluetooth as any).__webble)
      ) {
        resolve(true);
        return;
      }
    }

    // Method 3: Wait briefly for injection to complete
    // The content script runs at document_start, so injection should be fast
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      if (
        (typeof window !== 'undefined' && (window as any).__webble__) ||
        (typeof navigator !== 'undefined' &&
          (((navigator as any).webble && (navigator as any).webble.__webble) ||
           (navigator.bluetooth && (navigator.bluetooth as any).__webble)))
      ) {
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
