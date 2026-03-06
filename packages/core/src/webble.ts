import { WebBLEDevice } from './device';
import { WebBLEError } from './errors';
import { detectPlatform, getBluetoothAPI } from './platform';
import type { Platform, WebBLEOptions, RequestDeviceOptions } from './types';

/**
 * Core WebBLE SDK entry point. Handles platform detection and device discovery.
 *
 * @example
 * ```typescript
 * import { WebBLE } from '@wklm/core'
 *
 * const ble = new WebBLE()
 * const device = await ble.requestDevice({
 *   filters: [{ services: ['heart_rate'] }]
 * })
 * await device.connect()
 * ```
 */
export class WebBLE {
  readonly platform: Platform;
  readonly isSupported: boolean;

  private bluetooth: Bluetooth | null;

  constructor(options?: WebBLEOptions) {
    this.platform = options?.platform ?? detectPlatform();
    this.bluetooth = this.platform !== 'unsupported' ? getBluetoothAPI() : null;
    this.isSupported = this.bluetooth !== null;
  }

  /**
   * Prompt the user to select a BLE device. Opens the browser's device picker.
   * Use `filters` to narrow results by service UUID or device name.
   *
   * @example
   * ```typescript
   * // Filter by service
   * const device = await ble.requestDevice({
   *   filters: [{ services: ['heart_rate'] }]
   * })
   *
   * // Accept all devices
   * const device = await ble.requestDevice({ acceptAllDevices: true })
   * ```
   *
   * @throws {WebBLEError} `BLUETOOTH_UNAVAILABLE` — browser doesn't support Web Bluetooth
   * @throws {WebBLEError} `USER_CANCELLED` — user dismissed the device picker
   * @throws {WebBLEError} `DEVICE_NOT_FOUND` — no matching devices found
   */
  async requestDevice(options?: RequestDeviceOptions): Promise<WebBLEDevice> {
    if (!this.bluetooth) throw new WebBLEError('BLUETOOTH_UNAVAILABLE');

    try {
      const device = await this.bluetooth.requestDevice(
        (options as any) ?? { acceptAllDevices: true },
      );
      return new WebBLEDevice(device);
    } catch (e) {
      throw WebBLEError.from(e, 'DEVICE_NOT_FOUND');
    }
  }

  /** Check if Bluetooth is available on this device/browser. */
  async getAvailability(): Promise<boolean> {
    if (!this.bluetooth) return false;
    try {
      return await this.bluetooth.getAvailability();
    } catch {
      return false;
    }
  }
}
