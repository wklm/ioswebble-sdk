/**
 * webble_suggest tool implementation
 *
 * Analyzes a web project and recommends which @wklm packages to install
 * and how to configure them for Safari iOS Bluetooth support.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

interface Recommendation {
  packages: string[];
  installCommand: string;
  codeSnippet: string;
  notes: string[];
}

export async function suggestTool(
  projectPath: string,
  goal?: string
): Promise<ToolResult> {
  const pkgPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return {
      content: [
        {
          type: 'text',
          text: `No package.json found at ${projectPath}. Create a web project first, then run this tool again.`,
        },
      ],
    };
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return {
      content: [
        { type: 'text', text: `Failed to parse package.json at ${pkgPath}.` },
      ],
    };
  }

  const allDeps: Record<string, string> = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };

  // Detect framework
  const hasReact = 'react' in allDeps;
  const hasNext = 'next' in allDeps;
  const hasVue = 'vue' in allDeps;
  const hasNuxt = 'nuxt' in allDeps;
  const hasSvelte = 'svelte' in allDeps || '@sveltejs/kit' in allDeps;
  const hasAngular = '@angular/core' in allDeps;

  let framework = 'vanilla';
  if (hasNext) framework = 'Next.js';
  else if (hasReact) framework = 'React';
  else if (hasNuxt) framework = 'Nuxt';
  else if (hasVue) framework = 'Vue';
  else if (hasSvelte) framework = 'SvelteKit';
  else if (hasAngular) framework = 'Angular';

  // Check what's already installed
  const hasCore = '@wklm/core' in allDeps;
  const hasReactSdk = '@wklm/react' in allDeps;
  const hasDetect = '@wklm/detect' in allDeps;
  const hasProfiles = '@wklm/profiles' in allDeps;
  const hasTesting = '@wklm/testing' in allDeps;

  // Check for existing BLE code
  let hasBleCode = false;
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
  try {
    const srcDir = fs.existsSync(path.join(projectPath, 'src'))
      ? path.join(projectPath, 'src')
      : projectPath;
    hasBleCode = scanForPattern(
      srcDir,
      /navigator\.bluetooth|requestDevice|BluetoothDevice/,
      extensions
    );
  } catch {
    /* skip */
  }

  // Build recommendation
  const rec: Recommendation = {
    packages: [],
    installCommand: '',
    codeSnippet: '',
    notes: [],
  };

  // Always recommend core
  if (!hasCore) {
    rec.packages.push('@wklm/core');
  } else {
    rec.notes.push('@wklm/core is already installed.');
  }

  // React-based frameworks get @wklm/react
  if ((hasReact || hasNext) && !hasReactSdk) {
    rec.packages.push('@wklm/react');
  }

  // Always recommend detect for install banner
  if (!hasDetect) {
    rec.packages.push('@wklm/detect');
    rec.notes.push(
      '@wklm/detect shows an install banner on iOS Safari when the extension is missing.'
    );
  }

  // If goal mentions specific devices, suggest profiles
  if (
    goal &&
    /heart.?rate|battery|device.?info|profile/i.test(goal) &&
    !hasProfiles
  ) {
    rec.packages.push('@wklm/profiles');
  }

  // Suggest testing if they have test infrastructure
  if (
    !hasTesting &&
    ('jest' in allDeps ||
      'vitest' in allDeps ||
      '@testing-library/react' in allDeps)
  ) {
    rec.packages.push('@wklm/testing');
    rec.notes.push(
      '@wklm/testing provides mock BLE devices for your test suite.'
    );
  }

  // Build install command
  if (rec.packages.length > 0) {
    rec.installCommand = `npm install ${rec.packages.join(' ')}`;
  } else {
    rec.installCommand = '# All recommended packages are already installed.';
  }

  // Build code snippet based on framework
  if (hasReact || hasNext) {
    rec.codeSnippet = `// Add to your app entry point (e.g. layout.tsx or main.tsx)
import '@wklm/core/auto';

// In your BLE component:
import { WebBLEProvider, useBluetooth } from '@wklm/react';

function App() {
  return (
    <WebBLEProvider>
      <MyBLEComponent />
    </WebBLEProvider>
  );
}

function MyBLEComponent() {
  const { requestDevice } = useBluetooth();
  // IMPORTANT: requestDevice() must be called from a user gesture (click handler)
  return (
    <button onClick={async () => {
      const device = await requestDevice({ filters: [{ services: ['heart_rate'] }] });
    }}>Connect BLE Device</button>
  );
}`;
  } else {
    rec.codeSnippet = `// Add to your app entry point
import '@wklm/core/auto';

// In your BLE code:
import { WebBLE } from '@wklm/core';

const ble = new WebBLE();

// IMPORTANT: requestDevice() must be called from a user gesture (click handler)
document.querySelector('#connect').addEventListener('click', async () => {
  const device = await ble.requestDevice({ filters: [{ services: ['heart_rate'] }] });
  await device.connect();
  const value = await device.read('heart_rate', 'heart_rate_measurement');
});`;
  }

  if (hasBleCode) {
    rec.notes.push(
      'Existing navigator.bluetooth usage detected. The SDK wraps this automatically — your existing code will work with `import \'@wklm/core/auto\'`.'
    );
  }

  rec.notes.push(
    `Detected framework: ${framework}.`,
    'Safari iOS requires a user gesture (click/tap) to call requestDevice(). Never call it in useEffect or on page load.'
  );

  // Format output
  const output = [
    `## WebBLE SDK Recommendation for ${framework} project\n`,
    `**Install:**\n\`\`\`bash\n${rec.installCommand}\n\`\`\`\n`,
    `**Quick start:**\n\`\`\`tsx\n${rec.codeSnippet}\n\`\`\`\n`,
    `**Notes:**\n${rec.notes.map((n) => `- ${n}`).join('\n')}`,
  ].join('\n');

  return { content: [{ type: 'text', text: output }] };
}

function scanForPattern(
  dir: string,
  pattern: RegExp,
  extensions: string[],
  maxDepth = 4,
  depth = 0
): boolean {
  if (depth > maxDepth) return false;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        ['node_modules', '.git', 'dist', '.next', 'build'].includes(entry.name)
      )
        continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (scanForPattern(fullPath, pattern, extensions, maxDepth, depth + 1))
          return true;
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (pattern.test(content)) return true;
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    /* skip */
  }
  return false;
}
