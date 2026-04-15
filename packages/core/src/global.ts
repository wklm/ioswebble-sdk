/// <reference types="web-bluetooth" />

export {};

declare global {
  interface Navigator {
    bluetooth: Bluetooth;
    webble?: Bluetooth;
  }
}
