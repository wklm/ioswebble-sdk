/**
 * `npx ioswebble init` command
 * Auto-detects framework and adds WebBLE detection snippet
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectFramework, type Framework } from '../utils/framework-detect';

function parseArgs(args: string[]): { key?: string; framework?: string } {
  const result: { key?: string; framework?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i + 1]) {
      result.key = args[++i];
    } else if (args[i] === '--framework' && args[i + 1]) {
      result.framework = args[++i];
    }
  }
  return result;
}

function getInstallCommand(packageManager: string): string {
  switch (packageManager) {
    case 'yarn': return 'yarn add @ios-web-bluetooth/core @ios-web-bluetooth/detect';
    case 'pnpm': return 'pnpm add @ios-web-bluetooth/core @ios-web-bluetooth/detect';
    case 'bun': return 'bun add @ios-web-bluetooth/core @ios-web-bluetooth/detect';
    default: return 'npm install @ios-web-bluetooth/core @ios-web-bluetooth/detect';
  }
}

function getSnippet(framework: Framework, apiKey: string): { code: string; location: string } {
  switch (framework) {
    case 'nextjs-app':
      return {
        code: `import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react'\n`,
        location: 'Wrap children with <IOSWebBLEProvider apiKey="' + apiKey + '">{children}</IOSWebBLEProvider>',
      };
    case 'nextjs-pages':
      return {
        code: `import { IOSWebBLEProvider } from '@ios-web-bluetooth/detect/react'\n`,
        location: 'Wrap <Component /> with <IOSWebBLEProvider apiKey="' + apiKey + '">...</IOSWebBLEProvider>',
      };
    case 'react-vite':
    case 'react-cra':
      return {
        code: `import '@ios-web-bluetooth/core/auto'\nimport '@ios-web-bluetooth/detect/auto'\n// Set key: <meta name="ioswebble-key" content="${apiKey}"> in index.html\n`,
        location: 'Add import at the top of the entry file',
      };
    case 'vue':
    case 'nuxt':
      return {
        code: `import '@ios-web-bluetooth/core/auto'\nimport { initIOSWebBLE } from '@ios-web-bluetooth/detect'\ninitIOSWebBLE({ key: '${apiKey}' })\n`,
        location: 'Add to the entry file',
      };
    case 'html':
      return {
        code: `<script src="https://ioswebble.com/webble.js" data-key="${apiKey}"></script>`,
        location: 'Add before </body>',
      };
    default:
      return {
        code: `import '@ios-web-bluetooth/core/auto'\nimport { initIOSWebBLE } from '@ios-web-bluetooth/detect'\ninitIOSWebBLE({ key: '${apiKey}' })`,
        location: 'Add to your app entry point',
      };
  }
}

export async function init(args: string[]): Promise<void> {
  const options = parseArgs(args);
  const projectPath = process.cwd();

  console.log('Detecting framework...');
  const detection = detectFramework(projectPath);
  console.log(`  Framework: ${detection.framework}`);
  console.log(`  Entry file: ${detection.entryFile || '(not found)'}`);
  console.log(`  Package manager: ${detection.packageManager}`);
  console.log();

  // Get API key (optional — used for campaign tracking)
  const apiKey = options.key || process.env.IOSWEBBLE_API_KEY || 'YOUR_API_KEY';

  if (options.key) {
    const { validateApiKey } = await import('@ios-web-bluetooth/detect');
    console.log('Validating API key...');
    const config = await validateApiKey(options.key);
    if (config) {
      console.log(`  Valid — ${config.appName || 'unnamed app'} (${config.plan} plan)`);
    } else {
      console.log('  Could not validate key (invalid or network error)');
      console.log('  Proceeding anyway — the key will be checked at runtime.');
    }
    console.log();
  }

  // Install packages
  const installCmd = getInstallCommand(detection.packageManager);
  console.log(`Installing @ios-web-bluetooth/core and @ios-web-bluetooth/detect...`);
  console.log(`  Run: ${installCmd}`);
  console.log();

  // Generate snippet
  const snippet = getSnippet(
    options.framework as Framework || detection.framework,
    apiKey
  );

  if (detection.entryFile && detection.framework === 'html') {
    // For HTML, inject the script tag
    const filePath = path.join(projectPath, detection.entryFile);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('ioswebble')) {
      content = content.replace('</body>', `  ${snippet.code}\n</body>`);
      fs.writeFileSync(filePath, content);
      console.log(`Added detection snippet to ${detection.entryFile}`);
    } else {
      console.log('WebBLE already detected in entry file, skipping.');
    }
  } else if (detection.entryFile) {
    const filePath = path.join(projectPath, detection.entryFile);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('ioswebble')) {
      content = snippet.code + '\n' + content;
      fs.writeFileSync(filePath, content);
      console.log(`Added detection import to ${detection.entryFile}`);
    } else {
      console.log('WebBLE already detected in entry file, skipping.');
    }
  }

  console.log();
  console.log('Integration complete!');
  console.log();
  console.log('Next steps:');
  console.log(`  1. ${installCmd}`);
  if (detection.entryFile) {
    console.log(`  2. ${snippet.location}`);
  }
  console.log(`  3. Run: npx ioswebble check`);

  // Suggest React SDK if React is detected
  if (['nextjs-app', 'nextjs-pages', 'react-vite', 'react-cra'].includes(detection.framework)) {
    console.log();
    console.log('React detected! Also consider:');
    const reactPkg = detection.packageManager === 'yarn' ? 'yarn add @ios-web-bluetooth/react' :
      detection.packageManager === 'pnpm' ? 'pnpm add @ios-web-bluetooth/react' :
      detection.packageManager === 'bun' ? 'bun add @ios-web-bluetooth/react' :
      'npm install @ios-web-bluetooth/react';
    console.log(`  ${reactPkg} — React hooks for BLE (useDevice, useScan, useProfile)`);
  }
}
