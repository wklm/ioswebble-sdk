/**
 * SB cross-wire (fast half) — fork RECOVERY-surface signal coverage (#291).
 *
 * `forkRecoverySurfaceSignals` (StorzBickelWebE2ETests.swift) drives the
 * post-tap three-outcome discrimination in test_requestDevice_opens_chooser:
 * (A) chooser → PASS, (B) the fork's getAvailability-false recovery surface →
 * precondition throw, (C) neither → hard regression fail. In main.js's
 * `!available` branch TWO surfaces render:
 *
 *  - the setup sheet via initBeacio/showInstallBanner (`lang:'de'`, forceShow) —
 *    whichever funnel STATE detection resolves at tap time, and
 *  - `beacioSession.presentConnectError(denied)` — but ONLY when
 *    `beacioSession` is defined (main.js guards it), and its card body is
 *    fork-authored EN copy rendered verbatim (bypasses the i18n seam).
 *
 * Issue #291: the signal set's sheet half was the EN-only installBannerSignals
 * pair, which cannot match the German sheet — so when only the sheet renders
 * (the beacioSession-undefined path), outcome (B) misclassifies as (C): a
 * misattributed hard red on a BT-off/unauthorized device.
 *
 * This test models the Swift signal set from its SOURCE (inline CONTAINS[c]
 * literals + whichever signal tables the function body references) and asserts
 * COVERAGE: every built-in locale × sheet state the fork's recovery branch can
 * re-show renders a sheet visible to the set (per-leaf CONTAINS[c] semantics,
 * mirroring per-staticText-label matching). The fork-authored verbatim EN card
 * strings ('Turn Bluetooth on', …) stay in the set but are NOT load-bearing
 * here — this is exactly the beacioSession-undefined scenario where the sheet
 * is the ONLY recovery surface.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import {
  LOCALES,
  SHEET_STATES,
  clearBeacioStorage,
  containsCaseInsensitive,
  extractSwiftSignalFragments,
  loadVendoredDetect,
  readSwiftSuite,
  renderSheetLeafTexts,
} from './sb-sheet-parity-helpers';

/** The EN cross-wire control constants (installBannerHeading/BodyFragment). */
function extractInstallBannerConstants(): string[] {
  const swift = readSwiftSuite();
  return ['installBannerHeading', 'installBannerBodyFragment'].map((name) => {
    const m = swift.match(new RegExp(`let ${name} = "((?:[^"\\\\]|\\\\.)*)"`));
    expect(m).not.toBeNull();
    return m![1]!;
  });
}

/**
 * The recovery-surface signal set, modeled from the Swift function body:
 * inline `CONTAINS[c] '...'` literals, plus the setupSheetSignalFragments
 * table and/or the EN installBanner constants when the body references those
 * helpers. Pinned to the `forkRecoverySurfaceSignals` declaration — renaming
 * or removing it fails loudly here.
 */
function extractRecoverySignalFragments(): string[] {
  const swift = readSwiftSuite();
  const match = swift.match(/func forkRecoverySurfaceSignals[\s\S]*?\{([\s\S]*?)\n {4}\}/);
  expect(match).not.toBeNull();
  const body = match![1]!;
  const fragments = [...body.matchAll(/CONTAINS\[c\] '((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]!);
  if (/setupSheetSignal(?:s\(|Fragments)/.test(body)) {
    fragments.push(...extractSwiftSignalFragments());
  }
  if (/installBannerSignals/.test(body)) {
    fragments.push(...extractInstallBannerConstants());
  }
  expect(fragments.length).toBeGreaterThan(0);
  return fragments;
}

describe('SB fork recovery-surface signal coverage (#291): Swift signals ⟷ vendored en/de sheets', () => {
  beforeEach(() => {
    clearBeacioStorage();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.getElementById('beacio-banner')?.remove();
    document.body.innerHTML = '';
    clearBeacioStorage();
  });

  it('COVERAGE: every locale×state sheet the recovery branch can re-show is visible to the signal set', () => {
    const fragments = extractRecoverySignalFragments();
    const beacioDetect = loadVendoredDetect();

    const blindSpots: string[] = [];
    for (const lang of LOCALES) {
      for (const state of SHEET_STATES) {
        const texts = renderSheetLeafTexts(beacioDetect, lang, state);
        if (!fragments.some((f) => texts.some((t) => containsCaseInsensitive(t, f)))) {
          blindSpots.push(`${lang}/${state}: "${texts.join(' | ').slice(0, 120)}"`);
        }
      }
    }
    // A blind spot here is issue #291: on the beacioSession-undefined path the
    // sheet is the ONLY recovery surface, so a sheet the signal set cannot see
    // turns outcome (B) — the fork's own getAvailability gate firing — into a
    // misattributed outcome (C) hard failure on the device lane.
    expect(blindSpots).toEqual([]);
  });
});
