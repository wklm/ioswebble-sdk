/**
 * Jest setup — polyfills missing from the jsdom build Jest ships.
 *
 * jsdom (at least through v22) does not attach TextEncoder / TextDecoder to
 * the global scope even though they exist in Node ≥11. Tests that exercise
 * UTF-8 helpers (dataview-helpers.readUtf8, characteristic string parsing)
 * need them on `globalThis` before the test module graph loads, so this runs
 * via `setupFiles` — not `setupFilesAfterEach`.
 */
const { TextEncoder, TextDecoder } = require('node:util');

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}
