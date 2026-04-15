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

export type ExtensionInstallState = 'not-installed' | 'installed-inactive' | 'active';

function hasWindowMarker(): boolean {
  return typeof window !== 'undefined' && (window as any).__webble?.status === 'installed';
}

function hasNavigatorMarker(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return Boolean((navigator as any).webble && (navigator as any).webble.__webble);
}

function hasInstallMarker(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.webbleInstalled === 'true';
}

function hasActiveMarker(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.webbleExtension === 'true';
}

function resolveInstallState(): ExtensionInstallState {
  if (hasNavigatorMarker() || hasActiveMarker()) {
    return 'active';
  }
  if (hasWindowMarker() || hasInstallMarker()) {
    return 'installed-inactive';
  }
  return 'not-installed';
}

export async function getExtensionInstallState(): Promise<ExtensionInstallState> {
  // Fast-path: if @ios-web-bluetooth/core is installed, use its platform detection
  try {
    const { detectPlatform } = await import('@ios-web-bluetooth/core');
    if (detectPlatform() === 'safari-extension') return 'active';
  } catch { /* core not installed — fall through */ }

  return new Promise((resolve) => {
    // Method 1: Check for the global marker set by injected-full.ts
    const immediateState = resolveInstallState();
    if (immediateState !== 'not-installed') {
      resolve(immediateState);
      return;
    }

    // Method 3: Wait briefly for injection to complete
    // The content script runs at document_start, so injection should be fast
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      const state = resolveInstallState();
      if (state !== 'not-installed') {
        clearInterval(interval);
        resolve(state);
      }
      if (checks > 20) {
        // 2 seconds max wait
        clearInterval(interval);
        resolve('not-installed');
      }
    }, 100);
  });
}

export async function isExtensionInstalled(): Promise<boolean> {
  return (await getExtensionInstallState()) !== 'not-installed';
}
