import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'heart-rate': 'src/heart-rate.ts',
    battery: 'src/battery.ts',
    'device-info': 'src/device-info.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['@wklm/core'],
});
