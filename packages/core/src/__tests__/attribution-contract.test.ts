/**
 * Cross-producer contract test for `ATTRIBUTION_TOKEN_REGEX` (Wave H.15).
 *
 * The byte-identical regex `^webble_\d{6}_(mcp|cdn|direct|github|npm)_[a-z0-9]{1,40}$`
 * is pinned across six producers. If any one drifts, attribution silently
 * breaks for the channel whose tokens the validator starts rejecting.
 *
 * Rather than assert against a hardcoded string (which only catches
 * drift in core itself), this test reads each producer file from disk,
 * extracts the regex literal, and asserts every source string matches.
 *
 * Producers (keep in sync with `packages/core/src/attribution-hook.ts`
 * header comment and `docs/distribution/cursor/README.md`):
 *   1. packages/core/src/attribution-hook.ts          — SDK runtime
 *   2. cloudflare/workers/beacon/src/index.ts         — ingest Worker
 *   3. cloudflare/workers/flags/src/index.ts          — experiments Worker
 *   4. cloudflare/workers/stats/src/index.ts          — aggregation Worker
 *   5. cloudflare/workers/mcp-telemetry/src/index.ts  — MCP event Worker
 *   6. cloudflare/workers/cdn/src/index.ts            — CDN redirect Worker (H.14)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

// AIDEV-NOTE: This helper reads the raw source text of each producer/sink
// file and extracts the attribution regex *literal* as a string —
// deliberately avoiding `require`/`import` so we compare what is actually
// written on disk, not a value reconstructed (and potentially re-escaped)
// by the module system at runtime. That byte-identical comparison is the
// whole point of this contract test: the 6+ attribution call sites must
// all spell the regex exactly the same way, character for character. If
// you change the regex in one place, every call site must change too, and
// this helper is what catches drift at test time. Do not replace with
// runtime introspection (e.g. `regex.source`) — that would defeat the
// on-disk-literal guarantee.
//
// AIDEV-NOTE: Extractor grammar — matches a single-line `const FOO = /…/;`
// declaration even when the `=` is followed by a line break and leading
// whitespace. Body of the regex is everything between the first and last
// unescaped `/` on the regex-literal line (producers never split the
// pattern across multiple lines).
function extractRegexSource(file: string, constName: string): string {
  const contents = readFileSync(file, 'utf8');
  const pattern = new RegExp(
    `const\\s+${constName}\\s*(?::[^=]+)?=\\s*\\n?\\s*/(.+?)/;`,
    's',
  );
  const m = contents.match(pattern);
  if (!m) {
    throw new Error(`[contract] could not locate ${constName} literal in ${file}`);
  }
  return m[1];
}

function extractNumber(file: string, constName: string): number {
  const contents = readFileSync(file, 'utf8');
  const pattern = new RegExp(`const\\s+${constName}\\s*(?::[^=]+)?=\\s*(\\d+)\\s*;`);
  const m = contents.match(pattern);
  if (!m) {
    throw new Error(`[contract] could not locate numeric ${constName} in ${file}`);
  }
  return Number(m[1]);
}

const PRODUCERS = [
  { name: 'core/attribution-hook',         path: 'packages/core/src/attribution-hook.ts' },
  { name: 'beacon-worker',                 path: 'cloudflare/workers/beacon/src/index.ts' },
  { name: 'flags-worker',                  path: 'cloudflare/workers/flags/src/index.ts' },
  { name: 'stats-worker',                  path: 'cloudflare/workers/stats/src/index.ts' },
  { name: 'mcp-telemetry-worker',          path: 'cloudflare/workers/mcp-telemetry/src/index.ts' },
  { name: 'cdn-worker',                    path: 'cloudflare/workers/cdn/src/index.ts' },
] as const;

const CANONICAL_REGEX_SOURCE =
  '^webble_\\d{6}_(mcp|cdn|direct|github|npm)_[a-z0-9]{1,40}$';
const CANONICAL_MAX_LEN = 80;

describe('ATTRIBUTION_TOKEN_REGEX cross-producer contract', () => {
  it('covers exactly 6 producers', () => {
    // Guard against silent list shrinkage during refactors — new Workers
    // that validate tokens MUST be added here so drift can be detected.
    expect(PRODUCERS.length).toBe(6);
  });

  for (const producer of PRODUCERS) {
    it(`${producer.name}: ATTRIBUTION_TOKEN_REGEX source is canonical`, () => {
      const file = resolve(REPO_ROOT, producer.path);
      const source = extractRegexSource(file, 'ATTRIBUTION_TOKEN_REGEX');
      expect(source).toBe(CANONICAL_REGEX_SOURCE);
    });

    it(`${producer.name}: ATTRIBUTION_TOKEN_MAX_LEN is 80`, () => {
      const file = resolve(REPO_ROOT, producer.path);
      const maxLen = extractNumber(file, 'ATTRIBUTION_TOKEN_MAX_LEN');
      expect(maxLen).toBe(CANONICAL_MAX_LEN);
    });
  }
});
