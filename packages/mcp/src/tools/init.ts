/**
 * ioswebble_init tool implementation
 */

import * as fs from 'fs';
import * as path from 'path';

type Framework =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'react-vite'
  | 'react-cra'
  | 'vue'
  | 'nuxt'
  | 'sveltekit'
  | 'angular'
  | 'html'
  | 'auto';

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

function detectFramework(projectPath: string): Framework {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return fs.existsSync(path.join(projectPath, 'index.html')) ? 'html' : 'auto';
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps?.next) {
    const hasAppRouter = ['app/layout.tsx', 'app/layout.jsx', 'src/app/layout.tsx', 'src/app/layout.jsx']
      .some(f => fs.existsSync(path.join(projectPath, f)));
    return hasAppRouter ? 'nextjs-app' : 'nextjs-pages';
  }
  if (deps?.nuxt) return 'nuxt';
  if (deps?.['@sveltejs/kit']) return 'sveltekit';
  if (deps?.react && deps?.vite) return 'react-vite';
  if (deps?.react) return 'react-cra';
  if (deps?.vue) return 'vue';
  if (deps?.['@angular/core']) return 'angular';
  if (fs.existsSync(path.join(projectPath, 'index.html'))) return 'html';
  return 'auto';
}

function findEntryFile(projectPath: string, framework: Framework): string | null {
  const candidates: Record<string, string[]> = {
    'nextjs-app': ['app/layout.tsx', 'app/layout.jsx', 'src/app/layout.tsx', 'src/app/layout.jsx'],
    'nextjs-pages': ['pages/_app.tsx', 'pages/_app.jsx', 'src/pages/_app.tsx', 'src/pages/_app.jsx'],
    'react-vite': ['src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/main.js'],
    'react-cra': ['src/index.tsx', 'src/index.jsx', 'src/index.ts', 'src/index.js'],
    'vue': ['src/main.ts', 'src/main.js'],
    'nuxt': ['app.vue', 'layouts/default.vue'],
    'sveltekit': ['src/routes/+layout.svelte'],
    'angular': ['src/app/app.component.ts'],
    'html': ['index.html', 'public/index.html'],
  };

  const filesToCheck = candidates[framework] || ['index.html', 'src/index.ts', 'src/main.ts'];
  for (const file of filesToCheck) {
    if (fs.existsSync(path.join(projectPath, file))) return file;
  }
  return null;
}

function getSnippetForFramework(framework: Framework, apiKey: string): string {
  switch (framework) {
    case 'nextjs-app':
    case 'nextjs-pages':
      return `import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react'`;
    case 'react-vite':
    case 'react-cra':
      return `import '@ios-web-bluetooth/detect/auto'`;
    case 'vue':
    case 'nuxt':
      return `import { initIOSWebBLE } from '@ios-web-bluetooth/detect'\ninitIOSWebBLE({ key: '${apiKey}' })`;
    case 'html':
      return `<script src="https://ioswebble.com/webble.js" data-key="${apiKey}"></script>`;
    default:
      return `import { initIOSWebBLE } from '@ios-web-bluetooth/detect'\ninitIOSWebBLE({ key: '${apiKey}' })`;
  }
}

export async function initTool(
  projectPath: string,
  apiKey?: string,
  framework?: string
): Promise<ToolResult> {
  const resolvedFramework = (framework === 'auto' || !framework)
    ? detectFramework(projectPath)
    : framework as Framework;

  const entryFile = findEntryFile(projectPath, resolvedFramework);
  const key = apiKey || process.env.IOSWEBBLE_API_KEY || 'wbl_YOUR_API_KEY';
  const snippet = getSnippetForFramework(resolvedFramework, key);

  const lines: string[] = [];

  if (key && key !== 'wbl_YOUR_API_KEY') {
    lines.push(`Using API key: ${key.slice(0, 8)}...`);
  }

  lines.push(`Detected framework: ${resolvedFramework}`);

  if (entryFile) {
    const filePath = path.join(projectPath, entryFile);
    const content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes('ioswebble') || content.includes('IOSWebBLE')) {
      lines.push(`WebBLE already integrated in ${entryFile}. No changes needed.`);
    } else if (resolvedFramework === 'html') {
      const updated = content.replace('</body>', `  ${snippet}\n</body>`);
      fs.writeFileSync(filePath, updated);
      lines.push(`Modified: ${entryFile} (added detection script tag before </body>)`);
    } else {
      const updated = snippet + '\n\n' + content;
      fs.writeFileSync(filePath, updated);
      lines.push(`Modified: ${entryFile} (added import at top)`);
    }
  } else {
    lines.push('Could not auto-detect entry file.');
    lines.push(`Manually add this to your entry point:\n\n${snippet}`);
  }

  lines.push('');
  lines.push('Next steps:');
  lines.push('1. Install: npm install @ios-web-bluetooth/detect');
  if (resolvedFramework === 'nextjs-app' || resolvedFramework === 'nextjs-pages') {
    lines.push(`2. Wrap children with <IOSWebBLEProvider apiKey="${key}">{children}</IOSWebBLEProvider>`);
  }
  lines.push(`${resolvedFramework.startsWith('nextjs') ? '3' : '2'}. Verify: npx ioswebble check`);

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
