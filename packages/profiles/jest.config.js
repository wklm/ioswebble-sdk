/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@ios-web-bluetooth/core$': '<rootDir>/../core/src/index.ts',
  },
};
