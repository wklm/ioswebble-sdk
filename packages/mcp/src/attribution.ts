/**
 * Attribution token — SHARED CONTRACT with Wave I.2 beacon Worker.
 *
 * Worker regex: /^webble_\d{6}_(mcp|cdn|direct|github|npm)_[a-z0-9]{1,40}$/
 * MCP always emits the `mcp` channel. Example: webble_202604_mcp_3p9xq2k8m4r
 *
 * Format: `webble_YYYYMM_mcp_<random>`
 *   - YYYYMM: current UTC year-month, zero-padded.
 *   - <random>: 8–16 chars from [a-z0-9]. Total length ≤ 80.
 */
export const ATTRIBUTION_REGEX = /^webble_\d{6}_mcp_[a-z0-9]{8,16}$/;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomSuffix(length: number, rand: () => number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  }
  return out;
}

export interface TokenOptions {
  /** UTC date source — defaults to `new Date()`. Injected for deterministic tests. */
  now?: Date;
  /** PRNG in [0, 1) — defaults to Math.random. Injected for deterministic tests. */
  random?: () => number;
  /** Random-suffix length (8–16 inclusive). Defaults to 11. */
  suffixLength?: number;
}

export function generateAttributionToken(opts: TokenOptions = {}): string {
  const now = opts.now ?? new Date();
  const rand = opts.random ?? Math.random;
  const suffixLength = opts.suffixLength ?? 11;
  if (suffixLength < 8 || suffixLength > 16) {
    throw new RangeError(`suffixLength must be 8..16 (got ${suffixLength})`);
  }
  const yyyy = now.getUTCFullYear().toString().padStart(4, '0');
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const token = `webble_${yyyy}${mm}_mcp_${randomSuffix(suffixLength, rand)}`;
  // Defensive: max total length 80 chars — `webble_` (7) + 6 + `_mcp_` (5) + 16 = 34, well under.
  if (token.length > 80) {
    throw new Error(`attribution token exceeds 80 chars: ${token}`);
  }
  return token;
}
