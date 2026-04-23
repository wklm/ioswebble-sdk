/**
 * @ios-web-bluetooth/core/auto — Transparent Web Bluetooth polyfill entry.
 *
 * Usage: import '@ios-web-bluetooth/core/auto';
 *
 * The polyfill logic lives in `./mount-polyfill` so it can be shared with the
 * bare entry (`./index`). Both entries behave identically; keep `./auto`
 * published for backward compatibility with existing consumers and bundlers
 * that require an explicit side-effect subpath.
 */

import { applyPolyfill } from './mount-polyfill';

applyPolyfill();
