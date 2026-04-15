import React, { useEffect, useState, useCallback } from 'react';
import { ExtensionDetector, type ExtensionInstallState } from '../core/ExtensionDetector';

interface InstallationWizardProps {
  onComplete?: () => void;
  onInstalledInactive?: () => void;
  /** Preferred onboarding URL override */
  startOnboardingUrl?: string;
  /** App Store URL override */
  appStoreUrl?: string;
  /** Operator/app name shown in the prompt */
  operatorName?: string;
  className?: string;
}

const DEFAULT_SETUP_URL = 'https://ioswebble.com/setup.html';

export const navigationController = {
  navigateToUrl(url: string) {
    window.location.href = url;
  }
};

/**
 * InstallationWizard - iOS-native style extension installation prompt.
 *
 * Renders as a bottom sheet overlay on iOS Safari, or a simple
 * inline message on other platforms.
 */
export function InstallationWizard({
  onComplete,
  onInstalledInactive,
  startOnboardingUrl,
  appStoreUrl,
  operatorName,
  className,
}: InstallationWizardProps) {
  const [installState, setInstallState] = useState<ExtensionInstallState>('not-installed');
  const [isChecking, setIsChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const detectorRef = React.useRef(new ExtensionDetector());
  const detector = detectorRef.current;

  const displayName = operatorName || (typeof document !== 'undefined' ? document.title : '') || 'this website';

  useEffect(() => {
    const checkInstallation = async () => {
      setIsChecking(true);
      try {
        const state = await detector.detectInstallState();
        setInstallState(state);
        if (state === 'active') {
          onComplete?.();
        } else if (state === 'installed-inactive') {
          onInstalledInactive?.();
        }
      } catch {
        setInstallState('not-installed');
      } finally {
        setIsChecking(false);
      }
    };

    checkInstallation();

    const handleReady = () => {
      setInstallState('active');
      onComplete?.();
    };
    window.addEventListener('webble:extension:ready', handleReady);
    return () => window.removeEventListener('webble:extension:ready', handleReady);
  }, []);

  const handleInstall = useCallback(() => {
    // Save return context before redirecting
    try {
      localStorage.setItem(
        'ioswebble_return',
        JSON.stringify({ url: window.location.href, timestamp: Date.now() })
      );
      navigator.clipboard?.writeText(
        `webble://return?url=${encodeURIComponent(window.location.href)}`
      );
    } catch { /* noop */ }
    navigationController.navigateToUrl(startOnboardingUrl || appStoreUrl || DEFAULT_SETUP_URL);
  }, [appStoreUrl, startOnboardingUrl]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(
        'ioswebble_dismiss_until',
        String(Date.now() + 14 * 86400000)
      );
    } catch { /* noop */ }
  }, []);

  if (isChecking) return null;
  if (installState === 'active' || dismissed) return null;

  return (
    <div className={className} style={overlayStyle} data-webble-wizard="" data-webble-state={installState}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()} data-webble-wizard-sheet="">
        <div style={handleBarStyle} data-webble-wizard-handle="" />

        <div style={headerStyle} data-webble-wizard-header="">
          <div style={iconStyle} data-webble-wizard-icon="">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
              <path d="M14.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-5 0c.83 0 1.5-.67 1.5-1.5S10.33 8.5 9.5 8.5 8 9.17 8 10s.67 1.5 1.5 1.5zm2.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
          </div>
          <div style={titleStyle} data-webble-wizard-title="">Bluetooth Required</div>
        </div>

        <div style={bodyStyle} data-webble-wizard-body="">
          To connect to your device, {esc(displayName)} needs the WebBLE Safari extension.
        </div>

        <div style={metaStyle} data-webble-wizard-meta="">
          <span style={starsStyle}>★★★★★</span>
          <span>4.8</span>
          <span>·</span>
          <span>Free</span>
          <span>·</span>
          <span>Takes 1 minute</span>
        </div>

          <button style={buttonStyle} onClick={handleInstall} data-webble-wizard-action="">
          {installState === 'installed-inactive' ? 'Finish Safari Setup' : 'Start Setup'}
          </button>

        <details style={detailsStyle} data-webble-wizard-details="">
          <summary style={summaryStyle}>How does this work?</summary>
          <p style={detailsTextStyle}>
            WebBLE is a free Safari extension that enables Bluetooth communication
            between this website and your device. After a quick one-time setup, Bluetooth
            will work seamlessly in Safari.
          </p>
        </details>

        <details style={detailsStyle} data-webble-wizard-details="">
          <summary style={summaryStyle}>Privacy: No data collected</summary>
          <p style={detailsTextStyle}>
            WebBLE processes all Bluetooth data locally on your device. No browsing data,
            device data, or personal information is ever collected or transmitted.
          </p>
        </details>

        <button style={dismissStyle} onClick={handleDismiss} data-webble-wizard-dismiss="">
          Not now
        </button>
      </div>
    </div>
  );
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Inline styles matching the iOS-native bottom sheet design
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2147483647,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.4)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  backdropFilter: 'blur(4px)',
};

const sheetStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px 16px 0 0',
  padding: '12px 24px 34px',
  maxWidth: 420,
  width: '100%',
};

const handleBarStyle: React.CSSProperties = {
  width: 36,
  height: 5,
  borderRadius: 3,
  background: '#d1d1d6',
  margin: '0 auto 16px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
};

const iconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: '#007aff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 600,
  color: '#000',
};

const bodyStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.4,
  color: '#8e8e93',
  marginBottom: 16,
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8e8e93',
  marginBottom: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const starsStyle: React.CSSProperties = {
  color: '#ff9500',
  letterSpacing: 1,
};

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: 14,
  background: '#007aff',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  fontSize: 17,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
};

const detailsStyle: React.CSSProperties = {
  marginTop: 16,
};

const summaryStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#007aff',
  cursor: 'pointer',
  padding: '4px 0',
};

const detailsTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8e8e93',
  lineHeight: 1.5,
  padding: '8px 0 4px',
};

const dismissStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: 12,
  background: 'none',
  border: 'none',
  fontSize: 15,
  color: '#8e8e93',
  cursor: 'pointer',
  textAlign: 'center',
  marginTop: 8,
};
