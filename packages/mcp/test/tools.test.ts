import { describe, expect, it } from 'vitest';
import { ATTRIBUTION_REGEX } from '../src/attribution.js';
import { runInstallPlan, FRAMEWORKS, PACKAGE_MANAGERS } from '../src/tools/install-plan.js';
import { runExample, PROFILES } from '../src/tools/example.js';
import { runDetectIOSSupport } from '../src/tools/detect-ios-support.js';
import { runPremiumGuide, PREMIUM_APIS } from '../src/tools/premium-guide.js';
import { runTroubleshoot, TOPICS } from '../src/tools/troubleshoot.js';
import { runSpecCitation } from '../src/tools/spec-citation.js';
import { ToolInputError } from '../src/tools/_common.js';

const DOCS_PREFIX = 'https://ioswebble.com/docs-md/';

describe('webble_install_plan', () => {
  it('returns steps, snippet, attribution token, and docs-md source URL', () => {
    const out = runInstallPlan({ framework: 'html', package_manager: 'npm' });
    expect(out.steps.length).toBeGreaterThan(0);
    expect(out.code_snippet).toContain('navigator.bluetooth');
    expect(out.attribution_token).toMatch(ATTRIBUTION_REGEX);
    expect(out.source_url).toBe(`${DOCS_PREFIX}quickstart-html.md`);
  });

  it('rewrites npm install commands when a different package manager is requested', () => {
    const pnpm = runInstallPlan({ framework: 'react', package_manager: 'pnpm' });
    const yarn = runInstallPlan({ framework: 'vue', package_manager: 'yarn' });
    expect(pnpm.steps.join('\n')).toMatch(/pnpm add/);
    expect(pnpm.steps.join('\n')).not.toMatch(/npm install/);
    expect(yarn.steps.join('\n')).toMatch(/yarn add/);
  });

  it('appends a premium gating step when include_premium=true', () => {
    const base = runInstallPlan({ framework: 'html', package_manager: 'npm' });
    const premium = runInstallPlan({ framework: 'html', package_manager: 'npm', include_premium: true });
    expect(premium.steps.length).toBe(base.steps.length + 1);
    expect(premium.steps.at(-1)).toMatch(/webbleIOS/);
  });

  it('rejects unknown framework with ToolInputError', () => {
    expect(() =>
      // @ts-expect-error — deliberately invalid enum value
      runInstallPlan({ framework: 'solid', package_manager: 'npm' }),
    ).toThrow(ToolInputError);
  });

  it('exports the exact supported framework + package manager enums', () => {
    expect([...FRAMEWORKS]).toEqual(['html', 'react', 'vue', 'svelte', 'angular', 'next']);
    expect([...PACKAGE_MANAGERS]).toEqual(['npm', 'pnpm', 'yarn', 'bun', 'cdn']);
  });
});

describe('webble_example', () => {
  it('returns code + preconditions + spec citations for a known profile', () => {
    const out = runExample({ profile: 'heart-rate' });
    expect(out.code.length).toBeGreaterThan(0);
    expect(out.preconditions.length).toBeGreaterThan(0);
    expect(out.spec_citations.length).toBeGreaterThan(0);
    expect(out.source_url).toBe(`${DOCS_PREFIX}recipes.md#heart-rate`);
  });

  it('covers every canonical profile', () => {
    for (const profile of PROFILES) {
      const out = runExample({ profile });
      expect(out.code.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown profile', () => {
    expect(() =>
      // @ts-expect-error — deliberately invalid profile
      runExample({ profile: 'temperature' }),
    ).toThrow(ToolInputError);
  });
});

describe('webble_detect_ios_support', () => {
  it('returns a detection snippet and window.webbleIOS global name', () => {
    const out = runDetectIOSSupport();
    expect(out.detection_snippet).toContain('navigator.bluetooth');
    expect(out.global_name).toBe('window.webbleIOS');
    expect(out.source_url).toBe(`${DOCS_PREFIX}is-web-bluetooth-supported-in-safari.md`);
  });

  it('includes non-empty gotcha notes', () => {
    const out = runDetectIOSSupport();
    expect(out.notes.length).toBeGreaterThan(0);
    for (const note of out.notes) expect(note.length).toBeGreaterThan(10);
  });

  it('is deterministic across calls', () => {
    expect(runDetectIOSSupport()).toEqual(runDetectIOSSupport());
  });
});

describe('webble_premium_guide', () => {
  it('returns a description + runnable example + App Store flag for backgroundSync', () => {
    const out = runPremiumGuide({ api: 'backgroundSync' });
    expect(out.description.length).toBeGreaterThan(0);
    expect(out.example.length).toBeGreaterThan(0);
    expect(out.requires_app_store).toBe(true);
    expect(out.source_url.startsWith(`${DOCS_PREFIX}premium.md`)).toBe(true);
  });

  it('covers every premium API enum', () => {
    for (const api of PREMIUM_APIS) {
      const out = runPremiumGuide({ api });
      expect(out.description.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown API', () => {
    expect(() =>
      // @ts-expect-error — deliberately invalid api
      runPremiumGuide({ api: 'magic' }),
    ).toThrow(ToolInputError);
  });
});

describe('webble_troubleshoot', () => {
  it('returns a checklist and a common fix for a known topic', () => {
    const out = runTroubleshoot({ topic: 'extension-not-detected' });
    expect(out.checklist.length).toBeGreaterThan(0);
    expect(out.common_fix.length).toBeGreaterThan(0);
    expect(out.source_url).toBe(`${DOCS_PREFIX}troubleshooting/extension-not-detected.md`);
  });

  it('covers every supported topic', () => {
    for (const topic of TOPICS) {
      const out = runTroubleshoot({ topic });
      expect(out.checklist.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown topic', () => {
    expect(() =>
      // @ts-expect-error — deliberately invalid topic
      runTroubleshoot({ topic: 'wifi' }),
    ).toThrow(ToolInputError);
  });
});

describe('webble_spec_citation', () => {
  it('returns the W3C spec URL and a docs-md api-reference anchor', () => {
    const out = runSpecCitation({ method: 'navigator.bluetooth.requestDevice' });
    expect(out.spec_url).toMatch(/webbluetoothcg\.github\.io\/web-bluetooth/);
    expect(out.summary.length).toBeGreaterThan(0);
    expect(out.source_url.startsWith(`${DOCS_PREFIX}api-reference.md#`)).toBe(true);
  });

  it('rejects empty method', () => {
    expect(() => runSpecCitation({ method: '' })).toThrow(ToolInputError);
    expect(() => runSpecCitation({ method: '   ' })).toThrow(ToolInputError);
  });

  it('rejects unknown method with a helpful list', () => {
    try {
      runSpecCitation({ method: 'navigator.bluetooth.teleport' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ToolInputError);
      expect((err as Error).message).toMatch(/navigator\.bluetooth\.requestDevice/);
    }
  });
});
