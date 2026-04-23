/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  // AIDEV-NOTE: `jest.setup.js` polyfills TextEncoder/TextDecoder onto
  // globalThis; jsdom does not attach them even though Node has had them
  // since v11. `dataview-helpers.readUtf8` needs them at module-load.
  setupFiles: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/tests', '<rootDir>/src/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    // AIDEV-NOTE: Point ts-jest at `tsconfig.test.json` so Jest globals
    // (`describe`, `expect`, `jest`) and Node types (`require`) resolve
    // without polluting the production tsconfig that drives `dist/`.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // AIDEV-NOTE: `__WEBBLE_VERSION__` is a compile-time constant injected
  // by tsup (see `tsup.config.ts`). ts-jest compiles TS directly and
  // does not run tsup, so we supply a deterministic stand-in for tests.
  globals: {
    __WEBBLE_VERSION__: '0.0.0-test',
  },
};
