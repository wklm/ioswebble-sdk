/**
 * ExtensionDetector - Automatically detects if the WebBLE Safari extension is installed
 */

export class ExtensionDetector {
  private isDetected: boolean = false;
  private detectionPromise: Promise<boolean> | null = null;
  private readonly DETECTION_TIMEOUT = 3000;

  /**
   * Check if the extension is installed.
   * Checks the global marker and navigator.webble/__webble (set by the extension).
   */
  isInstalled(): boolean {
    if (typeof window !== 'undefined' && (window as any).__webble__) {
      this.isDetected = true;
      return true;
    }

    if (typeof navigator !== 'undefined') {
      if (
        ((navigator as any).webble && (navigator as any).webble.__webble) ||
        (navigator.bluetooth && (navigator.bluetooth as any).__webble)
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
  async detect(): Promise<boolean> {
    if (this.isDetected) {
      return true;
    }

    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.performDetection();
    const result = await this.detectionPromise;
    this.detectionPromise = null;

    return result;
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
1. Install the iOSWebBLE extension from the App Store
2. In Safari, tap aA in the address bar
3. Tap "Manage Extensions" and enable iOSWebBLE
4. Tap aA again, tap the iOSWebBLE icon
5. Choose "Always Allow" then "Always Allow on Every Website"
6. Refresh this page`;
  }

  /**
   * Open the extension store for installation
   */
  openExtensionStore() {
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

    // Check for Safari
    const userAgent = navigator.userAgent.toLowerCase();
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');

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

    if (!window?.isSecureContext) {
      return 'Web Bluetooth requires a secure context (HTTPS or localhost)';
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');

    if (isSafari && !this.isInstalled()) {
      return 'Safari requires the WebBLE extension for Bluetooth support';
    }

    if (!('bluetooth' in navigator) && !isSafari) {
      return 'Your browser does not support Web Bluetooth';
    }

    return null;
  }
}
