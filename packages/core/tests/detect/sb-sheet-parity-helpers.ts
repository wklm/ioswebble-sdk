/**
 * Shared mechanics for the SB sheet-selector parity mirrors (#289 / #291).
 *
 * These fast jsdom tests keep the DEVICE suite's Swift signal tables
 * (Tests/BeacioUITests/StorzBickelWebE2ETests.swift) honest against the exact
 * bytes the device loads — the VENDORED drop-in bundle (js/vendor/
 * beacio-detect.js, digest-gated by vendor:sb:check). Extraction reads the
 * Swift SOURCE so neither side can drift from the other.
 *
 * Not a test suite itself — imported by the sb-*-parity test files.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect } from '@jest/globals';

export const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
export const SWIFT_SUITE = resolve(
  REPO_ROOT,
  'Tests/BeacioUITests/StorzBickelWebE2ETests.swift'
);
export const VENDORED_DETECT = resolve(
  REPO_ROOT,
  'outreach/storz-bickel/integration-demo/app/js/vendor/beacio-detect.js'
);

/** Every sheet-rendering funnel state ('active' renders the toast, not a sheet). */
export const SHEET_STATES = [
  'not-installed',
  'installed-inactive',
  'denied',
  'private-browsing',
] as const;
/** The built-in locale packs (i18n.ts EN_STRINGS/DE_STRINGS); the fork pins 'de'. */
export const LOCALES = ['en', 'de'] as const;

export type SheetState = (typeof SHEET_STATES)[number];
export type Locale = (typeof LOCALES)[number];

export function readSwiftSuite(): string {
  return readFileSync(SWIFT_SUITE, 'utf8');
}

/**
 * The Swift localized signal table, extracted from the device suite's source.
 * Pinned to the literal `setupSheetSignalFragments: [String] = [ ... ]`
 * declaration — if the declaration is renamed or removed this fails loudly
 * (that absence IS the #289 defect this extraction was born red against).
 */
export function extractSwiftSignalFragments(): string[] {
  const swift = readSwiftSuite();
  const match = swift.match(/setupSheetSignalFragments:\s*\[String\]\s*=\s*\[([\s\S]*?)\n\s*\]/);
  expect(match).not.toBeNull();
  const fragments = [...match![1]!.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!);
  expect(fragments.length).toBeGreaterThan(0);
  return fragments;
}

export type BeacioDetectGlobal = {
  showInstallBanner: (options: Record<string, unknown>) => HTMLElement | null;
};

export function loadVendoredDetect(): BeacioDetectGlobal {
  const bundle = readFileSync(VENDORED_DETECT, 'utf8');
  // The vendored bundle is the classic-<script> IIFE (globalName beacioDetect);
  // re-export it to window from inside the same indirect-eval scope.
  (window as unknown as { eval: (code: string) => void }).eval(
    `${bundle}\nwindow.beacioDetect = beacioDetect;`
  );
  const g = (window as unknown as { beacioDetect?: BeacioDetectGlobal }).beacioDetect;
  expect(g).toBeDefined();
  return g!;
}

export function clearBeacioStorage(): void {
  try {
    localStorage.removeItem('beacio_return');
    localStorage.removeItem('beacio_dismiss_until');
    localStorage.removeItem('beacio_ready_shown');
  } catch {
    /* noop */
  }
}

/** CONTAINS[c] — the NSPredicate operator the Swift signals use. */
export function containsCaseInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Per-LEAF-element texts, not the flattened sheet text: the device predicate
 * matches each XCUIElement staticText LABEL individually, so a fragment that
 * only exists spanning two DOM elements would be device-blind even though the
 * concatenated textContent contains it. Matching per leaf keeps this mirror at
 * least as strict as the hardware oracle.
 */
export function sheetLeafTexts(banner: HTMLElement): string[] {
  const leaves = [...banner.querySelectorAll<HTMLElement>('*')].filter(
    (el) => el.childElementCount === 0
  );
  return leaves.map((el) => (el.textContent || '').replace(/\s+/g, ' ')).filter(Boolean);
}

/** Render one locale×state sheet via the vendored bundle; return its per-leaf texts. */
export function renderSheetLeafTexts(
  beacioDetect: BeacioDetectGlobal,
  lang: Locale,
  state: SheetState
): string[] {
  document.getElementById('beacio-banner')?.remove();
  clearBeacioStorage();
  // forceShow mirrors the fork's call sites (SB-PRD-08 AC3) and keeps the render
  // deterministic regardless of install-state markers / dismissal cooldowns.
  const el = beacioDetect.showInstallBanner({
    operatorName: 'STORZ & BICKEL Web App',
    lang,
    state,
    forceShow: true,
  });
  expect(el).not.toBeNull();
  const banner = document.getElementById('beacio-banner');
  expect(banner).not.toBeNull();
  return sheetLeafTexts(banner!);
}
