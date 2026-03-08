/**
 * Global type augmentation for Web Bluetooth API.
 *
 * When @ios-web-bluetooth/core is installed, `navigator.bluetooth` is typed without
 * needing @types/web-bluetooth. The `@ios-web-bluetooth/core/auto` entry point
 * ensures the API is available at runtime on Safari iOS.
 */

interface Navigator {
  readonly bluetooth: Bluetooth;
}
