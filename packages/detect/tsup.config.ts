import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    auto: 'src/auto.ts',
    react: 'src/react.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
  external: ['react'],
});
