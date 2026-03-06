/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
