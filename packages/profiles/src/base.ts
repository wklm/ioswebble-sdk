import type { WebBLEDevice, NotificationCallback } from '@ios-web-bluetooth/core';

/**
 * Abstract base class for all BLE GATT profiles.
 *
 * Provides common primitives for reading, writing, and subscribing to
 * Bluetooth characteristics. Concrete profiles extend this class and
 * set the {@link service} UUID to target a specific GATT service.
 *
 * Subscriptions registered via {@link subscribe} are tracked internally
 * and can be torn down in bulk with {@link stop}.
 *
 * @example
 * ```ts
 * import { BaseProfile } from '@ios-web-bluetooth/profiles';
 * import type { WebBLEDevice } from '@ios-web-bluetooth/core';
 *
 * class TemperatureProfile extends BaseProfile {
 *   protected readonly service = 'health_thermometer';
 *
 *   async readTemperature(): Promise<number> {
 *     const dv = await this.read('temperature_measurement');
 *     return dv.getFloat32(1, true);
 *   }
 * }
 *
 * const profile = new TemperatureProfile(device);
 * await profile.connect();
 * const temp = await profile.readTemperature();
 * profile.stop();
 * ```
 */
export abstract class BaseProfile {
  protected device: WebBLEDevice;
  protected abstract readonly service: string;
  private cleanups: (() => void)[] = [];

  constructor(device: WebBLEDevice) {
    this.device = device;
  }

  async connect(): Promise<void> {
    await this.device.connect();
  }

  stop(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }

  protected async read(characteristic: string): Promise<DataView> {
    return this.device.read(this.service, characteristic);
  }

  protected async write(characteristic: string, value: BufferSource): Promise<void> {
    return this.device.write(this.service, characteristic, value);
  }

  protected subscribe(characteristic: string, callback: NotificationCallback): () => void {
    const unsub = this.device.subscribe(this.service, characteristic, callback);
    this.cleanups.push(unsub);
    return unsub;
  }
}

// --- defineProfile factory ---

interface CharacteristicConfig<T> {
  uuid: string;
  parse: (dv: DataView) => T;
}

interface ProfileConfig<C extends Record<string, CharacteristicConfig<any>>> {
  name: string;
  service: string;
  characteristics: C;
}

type ParsedValues<C extends Record<string, CharacteristicConfig<any>>> = {
  [K in keyof C]: ReturnType<C[K]['parse']>;
};

interface DefinedProfile<C extends Record<string, CharacteristicConfig<any>>> {
  new (device: WebBLEDevice): BaseProfile & {
    readChar<K extends keyof C & string>(name: K): Promise<ParsedValues<C>[K]>;
    subscribeChar<K extends keyof C & string>(name: K, cb: (value: ParsedValues<C>[K]) => void): () => void;
  };
}

/**
 * Factory function that creates a typed BLE profile class from a declarative
 * configuration object. Each characteristic is defined with a UUID and a
 * `parse` function that converts the raw {@link DataView} into a typed value.
 *
 * The returned class extends {@link BaseProfile} and adds `readChar` /
 * `subscribeChar` methods that are fully typed based on the config.
 *
 * @param config - Profile configuration with service UUID and characteristic definitions.
 * @returns A constructable profile class bound to the given service and characteristics.
 *
 * @example
 * ```ts
 * import { defineProfile } from '@ios-web-bluetooth/profiles';
 *
 * const EnvironmentProfile = defineProfile({
 *   name: 'Environment',
 *   service: 'environmental_sensing',
 *   characteristics: {
 *     temperature: {
 *       uuid: 'temperature',
 *       parse: (dv: DataView) => dv.getInt16(0, true) / 100,
 *     },
 *     humidity: {
 *       uuid: 'humidity',
 *       parse: (dv: DataView) => dv.getUint16(0, true) / 100,
 *     },
 *   },
 * });
 *
 * const profile = new EnvironmentProfile(device);
 * await profile.connect();
 * const temp = await profile.readChar('temperature'); // number
 * profile.subscribeChar('humidity', (value) => {
 *   console.log(`Humidity: ${value}%`);
 * });
 * ```
 */
export function defineProfile<C extends Record<string, CharacteristicConfig<any>>>(
  config: ProfileConfig<C>,
): DefinedProfile<C> {
  return class extends BaseProfile {
    protected readonly service = config.service;

    async readChar<K extends keyof C & string>(name: K): Promise<ParsedValues<C>[K]> {
      const charConfig = config.characteristics[name];
      const dv = await this.read(charConfig.uuid);
      return charConfig.parse(dv);
    }

    subscribeChar<K extends keyof C & string>(name: K, cb: (value: ParsedValues<C>[K]) => void): () => void {
      const charConfig = config.characteristics[name];
      return this.subscribe(charConfig.uuid, (dv) => cb(charConfig.parse(dv)));
    }
  } as any;
}
