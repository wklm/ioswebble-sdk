/**
 * R-52 / SMELL-WEB-02 — copy-consistency guard for the iOS grant-control wording.
 *
 * One domain string — the label of Safari's per-extension grant control — was
 * hand-copied across the SDK's user-facing surfaces in three spellings:
 * the canonical "Allow on Every Website" (~30 live website surfaces, the
 * U9-DOCS-COHERENCE truth that R-43's GRANT_WORDING_CANONICAL anchor enforces),
 * the SDK's dropped-"on" "Allow Every Website" (errors.ts SUGGESTIONS,
 * detect/i18n.ts EN_STRINGS, packages/core/README.md), and a third form
 * "Other Websites to Allow" in examples/web-scanner/extension-detector.js.
 *
 * This guard pins the convergence: the canonical string is sourced from ONE
 * shared constant (IOS_GRANT_WORDING_CANONICAL in src/error-taxonomy.ts — the
 * shared leaf both the SDK entry and the detect subpath already bundle, so
 * neither grows), every live surface composes it, and the banned spellings
 * appear nowhere on the four surfaces.
 *
 * R-43 split respected: the Settings-app row is a DIFFERENT control — device
 * evidence (docs/reviews/2026-08-18-onboarding-friction/OUTCOME.md §F-B,
 * iOS 26.6) says it reads "Other Websites". The example's Settings walkthrough
 * keeps THAT label; it must only drop the third "Other Websites to Allow" form.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { IOS_GRANT_WORDING_CANONICAL } from '../src/error-taxonomy';
import { BeacioError } from '../src/errors';
import { EN_STRINGS } from '../src/detect/i18n';

/** The dropped-"on" SDK spelling — never a substring of the canonical form. */
const BANNED_ALLOW_EVERY = /Allow\s+Every\s+Website/;
/** The third form introduced into examples/ — a Settings-row walkthrough. */
const BANNED_SETTINGS_THIRD_FORM = 'Other Websites to Allow';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const read = (...segments: string[]): string =>
  fs.readFileSync(path.join(repoRoot, ...segments), 'utf8');

/** Every .ts source under packages/core/src, as [relativePath, text] pairs. */
function coreSrcFiles(dir = path.join(repoRoot, 'packages', 'core', 'src')): [string, string][] {
  const out: [string, string][] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...coreSrcFiles(full));
    else if (entry.name.endsWith('.ts')) out.push([path.relative(repoRoot, full), fs.readFileSync(full, 'utf8')]);
  }
  return out;
}

describe('R-52 / SMELL-WEB-02: the iOS grant-control wording has ONE canonical source', () => {
  it('the shared constant exists and IS the canonical ~30-site wording', () => {
    expect(IOS_GRANT_WORDING_CANONICAL).toBe('Allow on Every Website');
  });

  it('single source: the literal appears exactly once in packages/core/src (the constant itself)', () => {
    const hits = coreSrcFiles()
      .map(([file, text]) => ({ file, count: text.split(IOS_GRANT_WORDING_CANONICAL).length - 1 }))
      .filter((h) => h.count > 0);
    expect(hits).toEqual([
      { file: path.join('packages', 'core', 'src', 'error-taxonomy.ts'), count: 1 },
    ]);
  });

  it('no banned spelling survives in the two live TS surfaces (source text, comments included)', () => {
    for (const file of ['packages/core/src/errors.ts', 'packages/core/src/detect/i18n.ts']) {
      expect({ file, banned: BANNED_ALLOW_EVERY.test(read(file)) }).toEqual({ file, banned: false });
    }
  });

  it('BeacioError.suggestion for EXTENSION_NOT_ENABLED composes the canonical constant', () => {
    const suggestion = new BeacioError('EXTENSION_NOT_ENABLED').suggestion;
    expect(suggestion).toContain(IOS_GRANT_WORDING_CANONICAL);
    expect(suggestion).not.toMatch(BANNED_ALLOW_EVERY);
  });

  it('every EN_STRINGS surface naming the grant composes the canonical constant', () => {
    const surfaces: Record<string, string> = {
      'states.denied.body': EN_STRINGS.states.denied.body,
      'steps[Allow website access].why': EN_STRINGS.steps[3].why,
      howBody: EN_STRINGS.howBody,
      'error.messages.EXTENSION_NOT_ENABLED': EN_STRINGS.error.messages.EXTENSION_NOT_ENABLED,
    };
    for (const [name, text] of Object.entries(surfaces)) {
      expect({ name, containsCanonical: text.includes(IOS_GRANT_WORDING_CANONICAL) }).toEqual({ name, containsCanonical: true });
      expect({ name, banned: BANNED_ALLOW_EVERY.test(text) }).toEqual({ name, banned: false });
    }
  });

  it('packages/core/README.md error table uses the canonical spelling, never the banned one', () => {
    const readme = read('packages', 'core', 'README.md');
    expect(readme).toContain(IOS_GRANT_WORDING_CANONICAL);
    expect(readme).not.toMatch(BANNED_ALLOW_EVERY);
  });

  it('extension-detector.js keeps the device-true Settings label and drops the third form', () => {
    const detector = read('examples', 'web-scanner', 'extension-detector.js');
    expect(detector).not.toContain(BANNED_SETTINGS_THIRD_FORM);
    // OUTCOME F-B (iOS 26.6): the Settings row reads "Other Websites" — the
    // R-43 split forbids canonicalizing it into the Safari grant wording.
    expect(detector).toContain('Other Websites');
  });
});
