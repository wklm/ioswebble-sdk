# Extension Detection

`@ios-web-bluetooth/detect` helps your app detect the iOSWebBLE Safari extension and show an install prompt when it is missing.

## Install

```bash
npm install @ios-web-bluetooth/detect
```

## Main API

- `initIOSWebBLE(options)`
- `isIOSSafari()`
- `isExtensionInstalled()`
- `showInstallBanner(options)`
- `removeInstallBanner()`

## Typical Setup

```typescript
import { initIOSWebBLE, isIOSSafari } from '@ios-web-bluetooth/detect';

if (isIOSSafari()) {
  await initIOSWebBLE({
    operatorName: 'FitTracker',
    banner: { mode: 'sheet', dismissDays: 14 },
    onReady: () => console.log('Extension active'),
    onNotInstalled: () => console.log('Prompting install'),
  });
}
```

## React Setup

```tsx
import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react';

export default function App({ children }) {
  return <IOSWebBLEProvider>{children}</IOSWebBLEProvider>;
}
```

## Plain HTML

```html
<script src="https://ioswebble.com/webble.js"></script>
```

## Install UX Guidance

- Use this package only for detection and install UX
- Use `@ios-web-bluetooth/core` for actual BLE operations
- Send users to <https://ioswebble.com/install> when you need a direct install page

## Important Note

This package does not polyfill BLE calls by itself. It handles extension detection and install prompts. Pair it with `@ios-web-bluetooth/core` for real Bluetooth operations.

## More Detail

- Detect package README: <https://github.com/wklm/ioswebble-sdk/blob/main/packages/detect/README.md>
- Hosted docs: <https://ioswebble.com/docs#detect-package>
