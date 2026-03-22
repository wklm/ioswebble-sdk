/**
 * React component for WebBLE detection.
 *
 * Usage:
 *   import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react'
 *
 *   export default function Layout({ children }) {
 *     return <IOSWebBLEProvider apiKey="wbl_xxxxx">{children}</IOSWebBLEProvider>
 *   }
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import type { IOSWebBLEOptions, BannerOptions } from './index';

interface IOSWebBLEContextValue {
  /** Whether the extension is installed */
  isInstalled: boolean | null;
  /** Whether detection is still in progress */
  isDetecting: boolean;
  /** Whether we're on iOS Safari */
  isIOSSafari: boolean;
}

const IOSWebBLEContext = createContext<IOSWebBLEContextValue>({
  isInstalled: null,
  isDetecting: true,
  isIOSSafari: false,
});

export function useIOSWebBLE(): IOSWebBLEContextValue {
  return useContext(IOSWebBLEContext);
}

interface IOSWebBLEProviderProps {
  apiKey?: string;
  /** Operator/app name shown in the install prompt (e.g. "FitTracker") */
  operatorName?: string;
  banner?: BannerOptions | false;
  onReady?: () => void;
  onNotInstalled?: () => void;
  children: React.ReactNode;
}

export function IOSWebBLEProvider({
  apiKey,
  operatorName,
  banner,
  onReady,
  onNotInstalled,
  children,
}: IOSWebBLEProviderProps) {
  const [state, setState] = useState<IOSWebBLEContextValue>({
    isInstalled: null,
    isDetecting: true,
    isIOSSafari: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      const { isIOSSafari: checkIOS } = await import('./detect');

      if (!checkIOS()) {
        if (!cancelled) {
          setState({ isInstalled: null, isDetecting: false, isIOSSafari: false });
        }
        return;
      }

      const { initIOSWebBLE } = await import('./index');

      const options: IOSWebBLEOptions = {
        key: apiKey ?? undefined,
        operatorName,
        banner,
        onReady: () => {
          if (!cancelled) {
            setState({ isInstalled: true, isDetecting: false, isIOSSafari: true });
          }
          onReady?.();
        },
        onNotInstalled: () => {
          if (!cancelled) {
            setState({ isInstalled: false, isDetecting: false, isIOSSafari: true });
          }
          onNotInstalled?.();
        },
      };

      await initIOSWebBLE(options);
    }

    detect();

    return () => {
      cancelled = true;
    };
  }, [apiKey, operatorName, banner, onReady, onNotInstalled]);

  return (
    <IOSWebBLEContext.Provider value={state}>
      {children}
    </IOSWebBLEContext.Provider>
  );
}
