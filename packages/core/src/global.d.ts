/**
 * Global type augmentation for Web Bluetooth API.
 *
 * When @wklm/core is installed, `navigator.bluetooth` is typed without
 * needing @types/web-bluetooth. The `@wklm/core/auto` entry point
 * ensures the API is available at runtime on Safari iOS.
 */

interface Navigator {
  readonly bluetooth: Bluetooth;
}
