# @ios-web-bluetooth/detect — Agent Instructions

## What this package does
Detects iOS Safari, checks if the WebBLE extension is installed,
and shows an install banner if not. No-op on all other platforms.

> **Note**: For BLE operations, use `@ios-web-bluetooth/core` (not this package).
> Use `import '@ios-web-bluetooth/core/auto'` for transparent Safari iOS polyfill.
> This package is ONLY for extension detection and install banners.

## How it works
- Import '@ios-web-bluetooth/detect/auto' for automatic initialization
- Or call initIOSWebBLE({ key }) manually
- Or use <IOSWebBLEProvider apiKey="wbl_xxxxx"> for React apps
- The package dispatches events: 'ioswebble:ready' and 'ioswebble:notinstalled'

## DO NOT
- Do not modify navigator.bluetooth calls — this package does not touch them
- Do not conditionally import based on platform — the package handles detection
- Do not add polyfills — the Safari extension provides the full API

## Common tasks
- Change API key: update the `key` parameter in initIOSWebBLE() or apiKey prop
- Customize install banner: pass `banner: { text, position, style }` options
- Disable banner: pass `banner: false` and handle 'ioswebble:notinstalled' event
- Check integration: run `npx ioswebble check`

## Integration patterns

### React / Next.js (App Router)
In app/layout.tsx:
```tsx
import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react'
export default function RootLayout({ children }) {
  return <IOSWebBLEProvider apiKey="wbl_xxxxx">{children}</IOSWebBLEProvider>
}
```

### Next.js (Pages Router)
In pages/_app.tsx:
```tsx
import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react'
export default function App({ Component, pageProps }) {
  return <IOSWebBLEProvider apiKey="wbl_xxxxx"><Component {...pageProps} /></IOSWebBLEProvider>
}
```

### Plain HTML
```html
<script src="https://ioswebble.com/webble.js" data-key="wbl_xxxxx"></script>
```

### Any framework (manual)
```typescript
import { initIOSWebBLE } from '@ios-web-bluetooth/detect'
initIOSWebBLE({ key: 'wbl_xxxxx' })
```

### Auto-init
```typescript
// Set key via meta tag: <meta name="ioswebble-key" content="wbl_xxxxx">
import '@ios-web-bluetooth/detect/auto'
```
