# @ios-web-bluetooth/detect

Detect the WebBLE Safari extension on iOS. Auto-show an install banner when the extension is not found. No-op on all other platforms.

## Install

```bash
npm install @ios-web-bluetooth/detect
```

## Usage

```typescript
import { initIOSWebBLE } from '@ios-web-bluetooth/detect';

await initIOSWebBLE({
  operatorName: 'FitTracker',
  banner: { mode: 'sheet', dismissDays: 14 },
  onReady: () => console.log('Extension active'),
  onNotInstalled: () => console.log('Prompting install'),
});
```

For React/Next.js:

```tsx
import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react';

export default function Layout({ children }) {
  return <IOSWebBLEProvider>{children}</IOSWebBLEProvider>;
}
```

For plain HTML (no bundler):

```html
<script src="https://ioswebble.com/webble.js"></script>
```

## Standalone usage (no React, no profiles)

You can use `@ios-web-bluetooth/detect` with `@ios-web-bluetooth/core` only -- no React, no profiles package needed. Together they are ~6KB gzipped.

```typescript
import { initIOSWebBLE, isIOSSafari } from '@ios-web-bluetooth/detect';
import { WebBLE, WebBLEError } from '@ios-web-bluetooth/core';

// 1. On iOS Safari, detect the extension and prompt install if missing
if (isIOSSafari()) {
  await initIOSWebBLE({
    operatorName: 'MyApp',
    banner: { mode: 'sheet' },
    onReady: () => console.log('Extension ready'),
    onNotInstalled: () => {
      // Banner is shown automatically; you can also add custom handling here
      console.log('Extension not installed -- banner shown');
    },
  });
}

// 2. Scan and connect (works on iOS Safari + Chrome + Edge)
const ble = new WebBLE();
try {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }],
  });
  await device.connect();
  const value = await device.read('heart_rate', 'heart_rate_measurement');
  console.log('Heart rate:', value.getUint8(1));
  await device.disconnect();
} catch (err) {
  if (err instanceof WebBLEError) {
    console.error(err.code, err.suggestion);
  }
}
```

### What each package provides

| Package | Purpose | Size |
|---------|---------|------|
| `@ios-web-bluetooth/core` | BLE scanning, connecting, GATT read/write/subscribe | ~4KB gzip |
| `@ios-web-bluetooth/detect` | iOS extension detection + install banner | ~2KB gzip |
| `@ios-web-bluetooth/profiles` | Typed BLE profiles (heart rate, battery, etc.) | Optional |
| `@ios-web-bluetooth/react` | React hooks (`useDevice`, `useCharacteristic`) | Optional |

## API

- **`initIOSWebBLE(options)`** -- detect extension, show banner, fire callbacks
- **`isIOSSafari()`** -- returns `true` on iOS Safari
- **`isExtensionInstalled()`** -- async check for the extension marker
- **`showInstallBanner(options)` / `removeInstallBanner()`** -- manual banner control

### `initIOSWebBLE` options

| Option | Type | Description |
|--------|------|-------------|
| `key` | `string` | Optional API key for analytics |
| `operatorName` | `string` | Your app name (shown in install banner) |
| `banner.mode` | `'sheet' \| 'bar'` | Banner display style |
| `banner.position` | `string` | Banner position |
| `banner.text` | `string` | Custom banner text |
| `banner.buttonText` | `string` | Custom button label |
| `banner.appStoreUrl` | `string` | Override App Store link |
| `banner.dismissDays` | `number` | Days before banner re-appears after dismiss |
| `banner.style` | `object` | Custom CSS styles |
| `onReady` | `() => void` | Called when extension is detected and active |
| `onNotInstalled` | `() => void` | Called when extension is not found |

## AI agent integration

MCP server for coding agents (Claude Code, Cursor, Copilot):

```
npx -y @ios-web-bluetooth/mcp
```

Full SDK reference for LLM context: <https://ioswebble.com/llms-full.txt>

## Two scopes

The **`@ios-web-bluetooth/*`** packages (`core`, `profiles`, `react`) are the cross-browser BLE SDK -- they work on any platform with Web Bluetooth support (Chrome, Edge, iOS Safari via the extension). The **`@ios-web-bluetooth/*`** packages (`detect`, `cli`, `mcp`, `skill`) handle iOS-specific extension detection, install prompts, and agent tooling. Use both together for full iOS Safari coverage.
