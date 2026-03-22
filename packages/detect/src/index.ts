/**
 * @ios-web-bluetooth/detect
 *
 * Detects iOS Safari, checks if the WebBLE extension is installed,
 * and shows an install banner if not. No-op on all other platforms.
 *
 * Your existing Web Bluetooth code works unchanged — this package only
 * handles the "extension not installed" case on iOS Safari.
 */

export { isIOSSafari, isExtensionInstalled } from './detect';
export { showInstallBanner, removeInstallBanner } from './banner';
export type { BannerOptions } from './banner';
export { reportEvent, validateApiKey } from './api';
import { reportEvent } from './api';
export interface IOSWebBLEOptions {
  /** Optional API key for campaign tracking */
  key?: string;
  /** Operator/app name shown in the prompt (e.g. "FitTracker") */
  operatorName?: string;
  /** Install banner configuration, or false to disable */
  banner?:
    | {
        /** 'sheet' (default) for iOS bottom sheet, 'banner' for lightweight bar */
        mode?: 'sheet' | 'banner';
        position?: 'top' | 'bottom';
        text?: string;
        buttonText?: string;
        style?: Record<string, string>;
        appStoreUrl?: string;
        /** Days to suppress after dismiss (default: 14) */
        dismissDays?: number;
      }
    | false;
  /** Called when the extension is detected and ready */
  onReady?: () => void;
  /** Called when the extension is NOT installed */
  onNotInstalled?: () => void;
}

/**
 * Initialize WebBLE detection.
 *
 * On iOS Safari: checks if the extension is installed, dispatches events,
 * and optionally shows an install banner.
 *
 * On all other platforms: no-op (returns immediately).
 */
export async function initIOSWebBLE(options: IOSWebBLEOptions): Promise<void> {
  const { isIOSSafari, isExtensionInstalled } = await import('./detect');

  if (!isIOSSafari()) return;

  const installed = await isExtensionInstalled();

  if (installed) {
    reportEvent(options.key ?? '', 'extension_active');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ioswebble:ready'));
    }
    options.onReady?.();
    return;
  }

  // Extension NOT installed
  reportEvent(options.key ?? '', 'detect');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ioswebble:notinstalled'));
  }
  options.onNotInstalled?.();

  // Show install banner unless explicitly disabled
  if (options.banner !== false) {
    const { showInstallBanner } = await import('./banner');
    const bannerConfig = typeof options.banner === 'object' ? options.banner : {};
    const bannerOpts: import('./banner').BannerOptions = {
      ...bannerConfig,
      apiKey: options.key ?? '',
      operatorName: options.operatorName,
    };
    showInstallBanner(bannerOpts);
    reportEvent(options.key ?? '', 'install_prompted');
  }
}
