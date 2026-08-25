# Quickstart

Get `navigator.bluetooth` working inside iOS Safari in under 10 minutes.

## 1. Install the beacio Safari Web Extension

1. Install **beacio** from the App Store on iPhone: <https://apps.apple.com/app/id6761301368>.
2. Launch the app once to finish first-run setup.
3. Open **Settings → Apps → Safari → Extensions → beacio** and enable the extension.
4. Tap **beacio** again, choose **Always Allow**, then **Always Allow on Every Website**.

## 2. Load the polyfill

**CDN (fastest):**
```html
<script src="https://beacio.com/beacio.js"></script>
```

**npm (production):**
```bash
npm install @beacio/core
```
```js
import '@beacio/core/auto';
```

The core package is a zero-config polyfill. It detects the extension, mounts `navigator.bluetooth`, and mounts the iOS-only surface at `window.beacioIOS`.

## 3. Verify

```js
if (await navigator.bluetooth.getAvailability()) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  });
  console.log('Paired with', device.name);
}
```

If `getAvailability()` returns `false`, the extension is not enabled on this site. See [Troubleshooting](#extension-not-detected).

## Framework-specific guides

- [HTML / plain JS](https://beacio.com/docs/quickstart-html)
- [React](https://beacio.com/docs/quickstart-react)
- [Vue](https://beacio.com/docs/quickstart-vue)
- [Svelte / SvelteKit](https://beacio.com/docs/quickstart-svelte)
- [Angular](https://beacio.com/docs/quickstart-angular)
- [Next.js](https://beacio.com/docs/quickstart-next)

→ Canonical docs: https://beacio.com/docs/quickstart
