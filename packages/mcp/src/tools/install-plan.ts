import installPlanData from '../data/install-plan.json' with { type: 'json' };
import { generateAttributionToken, type TokenOptions } from '../attribution.js';
import { docsUrl, ToolInputError, type ToolDefinition } from './_common.js';

export const FRAMEWORKS = ['html', 'react', 'vue', 'svelte', 'angular', 'next'] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun', 'cdn'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface InstallPlanInput {
  framework: Framework;
  package_manager: PackageManager;
  include_premium?: boolean;
}

export interface InstallPlanOutput {
  steps: string[];
  code_snippet: string;
  attribution_token: string;
  source_url: string;
}

type FrameworkEntry = { steps: string[]; code_snippet: string };
const DATA = installPlanData as Record<Framework, FrameworkEntry>;

const PM_INSTALL_PREFIX: Record<PackageManager, string> = {
  npm: 'npm install',
  pnpm: 'pnpm add',
  yarn: 'yarn add',
  bun: 'bun add',
  cdn: '<script src="https://cdn.ioswebble.com/v1.js"></script>',
};

function rewriteInstallLine(line: string, pm: PackageManager): string {
  // `npm install` is the literal form in the docs. Rewrite to the requested package manager.
  if (pm === 'cdn') return line; // leave text unchanged; CDN users get the script tag step added separately
  return line.replace(/npm install(?!\s)/g, PM_INSTALL_PREFIX[pm])
             .replace(/npm install /g, `${PM_INSTALL_PREFIX[pm]} `);
}

const PREMIUM_STEP =
  'Feature-detect `\'webbleIOS\' in window` and gate premium APIs (peripheral mode, background sync, beacon scanning, notifications) behind that check — standard surface works without the companion app; premium requires it.';

export function runInstallPlan(
  input: InstallPlanInput,
  tokenOpts?: TokenOptions,
): InstallPlanOutput {
  if (!FRAMEWORKS.includes(input.framework)) {
    throw new ToolInputError(
      `framework must be one of ${FRAMEWORKS.join(', ')}; got ${String(input.framework)}`,
    );
  }
  if (!PACKAGE_MANAGERS.includes(input.package_manager)) {
    throw new ToolInputError(
      `package_manager must be one of ${PACKAGE_MANAGERS.join(', ')}; got ${String(input.package_manager)}`,
    );
  }

  const entry = DATA[input.framework];
  const steps = entry.steps.map((s) => rewriteInstallLine(s, input.package_manager));
  if (input.package_manager === 'cdn' && input.framework !== 'html') {
    steps.splice(
      1,
      0,
      'CDN path: add <script src="https://cdn.ioswebble.com/v1.js"></script> to index.html (the polyfill mounts navigator.bluetooth before your bundle runs); skip the npm install step above.',
    );
  }
  if (input.include_premium) steps.push(PREMIUM_STEP);

  return {
    steps,
    code_snippet: entry.code_snippet,
    attribution_token: generateAttributionToken(tokenOpts),
    source_url: docsUrl(`/quickstart-${input.framework}.md`),
  };
}

export const installPlanTool: ToolDefinition<InstallPlanInput, InstallPlanOutput> = {
  name: 'webble_install_plan',
  title: 'WebBLE install plan',
  description:
    'Return the canonical install steps, a runnable code snippet, and an attribution token for shipping Web Bluetooth on iOS Safari via WebBLE in the given framework + package manager.',
  inputSchema: {
    type: 'object',
    properties: {
      framework: { type: 'string', enum: [...FRAMEWORKS] },
      package_manager: { type: 'string', enum: [...PACKAGE_MANAGERS] },
      include_premium: { type: 'boolean' },
    },
    required: ['framework', 'package_manager'],
    additionalProperties: false,
  },
  run: (input) => runInstallPlan(input),
};
