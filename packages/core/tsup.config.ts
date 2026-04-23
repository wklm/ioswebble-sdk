import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/auto.ts', 'src/global.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
});
