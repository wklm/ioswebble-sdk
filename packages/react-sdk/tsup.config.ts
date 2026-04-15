import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@ios-web-bluetooth/core',
    '@ios-web-bluetooth/detect',
    '@ios-web-bluetooth/profiles',
  ],
});
