# Troubleshooting

## Extension Not Detected After Installation

On iOS Safari, the most common issue is that the user enabled the extension but did not grant website permissions.

Guide users to:

1. tap `aA` in the Safari address bar
2. tap the `iOSWebBLE` extension icon
3. choose `Always Allow`
4. choose `Always Allow on Every Website`

`Allow for One Day` expires silently and often looks like a broken integration later.

## `navigator.bluetooth` Is Undefined

- On iOS Safari: the extension is not installed or not granted permissions
- On Firefox: Web Bluetooth is not supported
- On Chrome or Edge: Web Bluetooth should work natively

## `requestDevice()` Fails On Page Load

Safari iOS requires a direct user gesture. Move the call into a click or tap handler.

```typescript
button.addEventListener('click', async () => {
  const device = await ble.requestDevice({
    filters: [{ services: ['heart_rate'] }],
  });
});
```

Do not call `requestDevice()` from `useEffect`, `DOMContentLoaded`, timers, or startup code.

## HTTPS Required

Use HTTPS in production. Web Bluetooth requires a secure context.

## Background Sync URLs Rejected

If a background registration includes `template.url`, it must:

- use `https://`
- match the same origin as the registering page

## Good Test Targets

- Hosted demo: <https://ioswebble.com/demo>
- Hosted docs: <https://ioswebble.com/docs>

## Support

- GitHub Issues: <https://github.com/wklm/ioswebble-sdk/issues>
- Email: <mailto:support@ioswebble.com>
- Product page: <https://ioswebble.com/for-hardware-companies>
