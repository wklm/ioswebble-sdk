import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// AIDEV-NOTE: Inject the package version as a compile-time constant so
// `src/attribution-hook.ts` can report `sdk_version` without reading
// package.json at runtime. Reading at config-time avoids a JSON-import
// assertion loader and keeps the minified bundle free of fs access.
const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(here, 'package.json'), 'utf8'),
) as { version: string };

export default defineConfig({
  entry: ['src/index.ts', 'src/auto.ts', 'src/global.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
  define: {
    __WEBBLE_VERSION__: JSON.stringify(pkg.version),
  },
});
