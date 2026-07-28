/**
 * SB cross-wire (fast half) — LOCALIZED setup-sheet selector parity (#289).
 *
 * The S&B fork pins `lang:'de'` on every sheet-rendering call site (SB-SDK-07:
 * index.html initBeacio + main.js showInstallBanner/presentError), so the
 * device suite's banner-ABSENT oracles and the twin-row precondition look for a
 * sheet that renders in GERMAN. Issue #289: the Swift signals were English-only,
 * which made those absent-assertions vacuous — they could not see what they
 * asserted absent.
 *
 * This test keeps the Swift LOCALIZED signal table
 * (StorzBickelWebE2ETests.setupSheetSignalFragments) honest against the exact
 * bytes the device loads — the VENDORED drop-in bundle (js/vendor/
 * beacio-detect.js, digest-gated by vendor:sb:check) — in both directions:
 *
 *  1. COVERAGE: every built-in locale (en, de) × sheet state renders a sheet
 *     whose text matches at least one Swift fragment (CONTAINS[c] semantics,
 *     i.e. case-insensitive substring — the same NSPredicate the device oracle
 *     uses). A locale or state the table cannot see would make the device
 *     absent-assertions vacuous again.
 *  2. LIVENESS: every Swift fragment matches at least one rendered sheet — a
 *     fragment that matches nothing (typo, stale copy after an i18n pack edit)
 *     is dead weight that silently narrows the oracle.
 *
 * The table is extracted from the Swift SOURCE, so neither side can drift from
 * the other: an i18n pack edit reddens direction 1/2 here long before the
 * device lane runs. Siblings: sb-noinject-banner-liveness.test.ts keeps the
 * (deliberately EN-only, shared) cross-wire control selectors honest;
 * sb-fork-recovery-surface-signal-parity.test.ts (#291) keeps the post-tap
 * recovery-surface signal set honest against the same sheets.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import {
  LOCALES,
  SHEET_STATES,
  clearBeacioStorage,
  containsCaseInsensitive,
  extractSwiftSignalFragments,
  loadVendoredDetect,
  renderSheetLeafTexts,
} from './sb-sheet-parity-helpers';

describe('SB localized setup-sheet selector parity (#289): Swift signals ⟷ vendored en/de sheets', () => {
  beforeEach(() => {
    clearBeacioStorage();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.getElementById('beacio-banner')?.remove();
    document.body.innerHTML = '';
    clearBeacioStorage();
  });

  it('COVERAGE: every locale×state sheet matches at least one Swift signal fragment', () => {
    const fragments = extractSwiftSignalFragments();
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
    // A blind spot here means the device suite's banner-ABSENT assertions are
    // vacuous for that locale/state (issue #289) — the oracle cannot see the
    // sheet it asserts absent.
    expect(blindSpots).toEqual([]);
  });

  it('LIVENESS: every Swift signal fragment matches at least one rendered sheet (no dead selectors)', () => {
    const fragments = extractSwiftSignalFragments();
    const beacioDetect = loadVendoredDetect();

    const renderedTexts = LOCALES.flatMap((lang) =>
      SHEET_STATES.flatMap((state) => renderSheetLeafTexts(beacioDetect, lang, state))
    );
    const dead = fragments.filter(
      (f) => !renderedTexts.some((text) => containsCaseInsensitive(text, f))
    );
    // A dead fragment (typo, or copy that drifted after an i18n pack edit)
    // silently narrows the device oracle — fix the Swift table against
    // packages/core/src/detect/i18n.ts EN_STRINGS/DE_STRINGS.
    expect(dead).toEqual([]);
  });
});
