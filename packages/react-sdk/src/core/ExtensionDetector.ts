/**
 * ExtensionDetector - Automatically detects if the WebBLE Safari extension is installed
 */

export class ExtensionDetector {
  private isDetected: boolean = false;
  private detectionPromise: Promise<boolean> | null = null;
  private readonly DETECTION_TIMEOUT = 3000;

  /**
   * Determine whether the given user agent represents Safari (excluding
   * iOS in-app/alternate browsers such as Chrome iOS, Firefox iOS, Edge iOS,
   * and Opera iOS).
   *
   * This keeps Safari detection logic consistent between isBrowserSupported()
   * and getBrowserCompatibilityMessage().
   */
  private isSafariUserAgent(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();

    // Known iOS alternate browser markers that should NOT be treated as Safari.
    const isAlternateIosBrowser =
      ua.includes('crios') || // Chrome on iOS
      ua.includes('fxios') || // Firefox on iOS
      ua.includes('edgios') || // Edge on iOS
      ua.includes('opios'); // Opera on iOS

    return ua.includes('safari') && !ua.includes('chrome') && !isAlternateIosBrowser;
  }

  /**
   * Check if the extension is installed.
   * Checks the global marker and navigator.webble / navigator.bluetooth markers set by the extension.
   */
  isInstalled(): boolean {
    // Bug E1 fix: extension sets window.__webble (not window.__webble__).
    // Check for the status field to confirm it's the real extension object.
    if (typeof window !== 'undefined' && (window as any).__webble?.status === 'installed') {
      this.isDetected = true;
      return true;
    }

    if (typeof navigator !== 'undefined') {
      if (
        ((navigator as any).webble && (navigator as any).webble.__webble) ||
        ((navigator as any).bluetooth && (navigator as any).bluetooth.__webble)
      ) {
        this.isDetected = true;
        return true;
      }
    }

    return this.isDetected;
  }

  /**
   * Detect extension with a timeout
   */
  detect(): Promise<boolean> {
    if (this.isDetected) {
      return Promise.resolve(true);
    }

    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.performDetection().finally(() => {
      this.detectionPromise = null;
    });
    return this.detectionPromise;
  }

  /**
   * Perform the actual detection
   */
  private async performDetection(): Promise<boolean> {
    return new Promise((resolve) => {
      // Check if already available
      if (this.isInstalled()) {
        resolve(true);
        return;
      }

      // Check if window is available
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      let resolved = false;

      // Listen for extension ready event
      const handleExtensionReady = () => {
        if (!resolved) {
          resolved = true;
          this.isDetected = true;
          window.removeEventListener('webble:extension:ready', handleExtensionReady);
          resolve(true);
        }
      };

      window.addEventListener('webble:extension:ready', handleExtensionReady);

      // Timeout after specified duration
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener('webble:extension:ready', handleExtensionReady);
          resolve(this.isInstalled());
        }
      }, this.DETECTION_TIMEOUT);
    });
  }

  /**
   * Get installation instructions for iOS Safari
   */
  getInstallationInstructions(): string {
    return `To use Bluetooth on Safari for iOS:
1. Install the WebBLE extension from the App Store
2. In Safari, tap aA in the address bar
3. Tap "Manage Extensions" and enable WebBLE
4. Tap aA again, tap the WebBLE icon
5. Choose "Always Allow" then "Always Allow on Every Website"
6. Refresh this page`;
  }

  /**
   * Open the extension store for installation
   */
  openExtensionStore() {
    // Bug E2 fix: guard against SSR where navigator is unavailable.
    if (typeof navigator === 'undefined') return;
    const userAgent = navigator.userAgent.toLowerCase();

    const appStoreUrl = 'https://apps.apple.com/app/ioswebble/id0000000000';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      window.open(appStoreUrl, '_blank');
    } else {
      window.open('https://ioswebble.com', '_blank');
    }
  }

  /**
   * Check if the browser supports Web Bluetooth
   */
  isBrowserSupported(): boolean {
    // Check if window exists
    if (typeof window === 'undefined') {
      return false;
    }

    // Check for secure context - explicitly check the property value
    if ('isSecureContext' in window && !window.isSecureContext) {
      return false;
    }

    // Bug E4 fix: Chrome on iOS uses 'CriOS' in its UA string, not 'chrome'.
    // Extension only works in Safari; exclude iOS in-app/alternate browsers
    // (e.g., CriOS, FxiOS, EdgiOS, OPiOS) to avoid false positives.
    const userAgent = navigator.userAgent;
    const isSafari = this.isSafariUserAgent(userAgent);

    if (isSafari) {
      // Safari needs our extension
      return true;
    }

    // Other browsers should have native support
    return 'bluetooth' in navigator;
  }

  /**
   * Get browser compatibility message
   */
  getBrowserCompatibilityMessage(): string | null {
    // Check if window exists
    if (typeof window === 'undefined') {
      return 'Window object not available';
    }

    // Bug E3 fix: normalize isSecureContext check to match isBrowserSupported().
    // Use the same "property exists AND is false" guard so both methods agree.
    if ('isSecureContext' in window && !window.isSecureContext) {
      return 'Web Bluetooth requires a secure context (HTTPS or localhost)';
    }

    // Bug E4 fix: use the same Safari detection (including CriOS/OPiOS and other
    // iOS alternate-browser exclusions) as isBrowserSupported().
    const userAgent = navigator.userAgent;
    const isSafari = this.isSafariUserAgent(userAgent);

    if (isSafari && !this.isInstalled()) {
      return 'Safari requires the WebBLE extension for Bluetooth support';
    }

    if (!('bluetooth' in navigator) && !isSafari) {
      return 'Your browser does not support Web Bluetooth';
    }

    return null;
  }
}
