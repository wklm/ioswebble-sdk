# @ios-web-bluetooth/detect

Detects iOS Safari, checks whether the [WebBLE Safari Web Extension](https://ioswebble.com) is installed and active, and shows an install banner when it is missing. No-op on every other platform. Install this package if you ship a web app to iOS users and want a zero-config prompt that walks them from "I opened your site in Safari" to "I can now pair BLE devices".

- iOS Safari-only — transparent no-op on Chrome, Edge, Android, desktop Safari. Requires iOS 15+.
- Plain JS, React, Next.js (App Router + Pages Router), Vue, Svelte, Angular.
- Configurable banner (sheet or banner mode, copy, position, dismiss days).
- Event-driven: `ioswebble:ready`, `ioswebble:installedinactive`, `ioswebble:notinstalled`, `ioswebble:statechange`.

## Install

```bash
npm install @ios-web-bluetooth/detect
```

## Quick usage

### Any framework (manual)

```ts
import { initIOSWebBLE } from '@ios-web-bluetooth/detect';

initIOSWebBLE({
  key: 'wbl_xxxxx',          // optional campaign-tracking key
  operatorName: 'MyApp',
  onReady: () => console.log('WebBLE extension active'),
  onNotInstalled: () => console.log('User needs to install WebBLE'),
});
```

### Auto-init (via `<meta>` tag)

```html
<meta name="ioswebble-key" content="wbl_xxxxx">
```

```ts
import '@ios-web-bluetooth/detect/auto';
```

### React / Next.js (App Router)

```tsx
// app/layout.tsx
import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react';

export default function RootLayout({ children }) {
  return <IOSWebBLEProvider apiKey="wbl_xxxxx">{children}</IOSWebBLEProvider>;
}
```

### React / Next.js (Pages Router)

```tsx
// pages/_app.tsx
import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react';

export default function App({ Component, pageProps }) {
  return (
    <IOSWebBLEProvider apiKey="wbl_xxxxx">
      <Component {...pageProps} />
    </IOSWebBLEProvider>
  );
}
```

### Plain HTML

```html
<script src="https://ioswebble.com/webble.js" data-key="wbl_xxxxx"></script>
```

## Safari iOS constraints (read before shipping)

This package only handles detection and the install banner. Your BLE code — `navigator.bluetooth.requestDevice()`, connect, GATT I/O — still runs on top of [`@ios-web-bluetooth/core`](https://www.npmjs.com/package/@ios-web-bluetooth/core) and must respect:

- `requestDevice()` **must be called from a user gesture** (click/tap handler). Never from `useEffect`, `setTimeout`, `DOMContentLoaded`, or page load — Safari iOS throws `SecurityError`.
- No persistent pairing — each page load starts fresh.
- BLE is blocked in cross-origin iframes. Put BLE code in the top-level frame only.
- Web Bluetooth **does** work on iOS Safari with `@ios-web-bluetooth/core` installed.

These constraints are extracted from [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## API

```ts
initIOSWebBLE(options: IOSWebBLEOptions): Promise<void>

interface IOSWebBLEOptions {
  key?: string;
  operatorName?: string;
  banner?:
    | false
    | {
        mode?: 'sheet' | 'banner';
        position?: 'top' | 'bottom';
        text?: string;
        buttonText?: string;
        style?: Record<string, string>;
        startOnboardingUrl?: string;
        appStoreUrl?: string;
        dismissDays?: number;       // default 14
      };
  onReady?: () => void;
  onInstalledInactive?: () => void;
  onNotInstalled?: () => void;
}
```

Named exports: `getExtensionInstallState`, `isExtensionInstalled`, `isIOSSafari`, `showInstallBanner`, `removeInstallBanner`, `reportEvent`, `validateApiKey`, `initIOSWebBLE`. React: `IOSWebBLEProvider`, `useIOSWebBLE` from `@ios-web-bluetooth/detect/react`.

Events (on `window`): `ioswebble:ready`, `ioswebble:installedinactive`, `ioswebble:notinstalled`, `ioswebble:statechange`.

## Which package do I install?

| You need… | Install |
|---|---|
| Extension detection + install banner (this package) | `@ios-web-bluetooth/detect` |
| Plain BLE (scan/connect/read/write/subscribe) | `@ios-web-bluetooth/core` |
| React hooks for BLE | `@ios-web-bluetooth/core` + `@ios-web-bluetooth/react` |
| Typed device profiles | `+ @ios-web-bluetooth/profiles` |
| Mock BLE for unit tests | `@ios-web-bluetooth/testing` |
| MCP server for coding agents | `npx -y @ios-web-bluetooth/mcp` |

Decision tree: [repo README](https://github.com/wklm/WebBLE-Safari-Extension#readme) · [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Links

- Homepage: <https://ioswebble.com>
- Docs (machine-readable): <https://ioswebble.com/docs-md/>
- Is Web Bluetooth supported in Safari: <https://ioswebble.com/docs-md/is-web-bluetooth-supported-in-safari.md>
- Source: <https://github.com/wklm/WebBLE-Safari-Extension/tree/main/packages/detect>
- Issues: <https://github.com/wklm/WebBLE-Safari-Extension/issues>

## License

MIT © wklm. Published under `@ios-web-bluetooth/detect` on npm (`publishConfig.access = public`).
