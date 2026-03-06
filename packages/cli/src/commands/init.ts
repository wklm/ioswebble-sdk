/**
 * `npx ioswebble init` command
 * Auto-detects framework and adds iOSWebBLE detection snippet
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
    case 'yarn': return 'yarn add @wklm/detect';
    case 'pnpm': return 'pnpm add @wklm/detect';
    case 'bun': return 'bun add @wklm/detect';
    default: return 'npm install @wklm/detect';
  }
}

function getSnippet(framework: Framework, apiKey: string): { code: string; location: string } {
  switch (framework) {
    case 'nextjs-app':
      return {
        code: `import { IOSWebBLEProvider } from '@wklm/detect/react'\n`,
        location: 'Wrap children with <IOSWebBLEProvider apiKey="' + apiKey + '">{children}</IOSWebBLEProvider>',
      };
    case 'nextjs-pages':
      return {
        code: `import { IOSWebBLEProvider } from '@wklm/detect/react'\n`,
        location: 'Wrap <Component /> with <IOSWebBLEProvider apiKey="' + apiKey + '">...</IOSWebBLEProvider>',
      };
    case 'react-vite':
    case 'react-cra':
      return {
        code: `import '@wklm/detect/auto'\n// Set key: <meta name="ioswebble-key" content="${apiKey}"> in index.html\n`,
        location: 'Add import at the top of the entry file',
      };
    case 'vue':
    case 'nuxt':
      return {
        code: `import { initIOSWebBLE } from '@wklm/detect'\ninitIOSWebBLE({ key: '${apiKey}' })\n`,
        location: 'Add to the entry file',
      };
    case 'html':
      return {
        code: `<script src="https://ioswebble.com/webble.js" data-key="${apiKey}"></script>`,
        location: 'Add before </body>',
      };
    default:
      return {
        code: `import { initIOSWebBLE } from '@wklm/detect'\ninitIOSWebBLE({ key: '${apiKey}' })`,
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
    const { validateApiKey } = await import('@wklm/detect');
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

  // Install package
  const installCmd = getInstallCommand(detection.packageManager);
  console.log(`Installing @wklm/detect...`);
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
      console.log('iOSWebBLE already detected in entry file, skipping.');
    }
  } else if (detection.entryFile) {
    const filePath = path.join(projectPath, detection.entryFile);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('ioswebble')) {
      content = snippet.code + '\n' + content;
      fs.writeFileSync(filePath, content);
      console.log(`Added detection import to ${detection.entryFile}`);
    } else {
      console.log('iOSWebBLE already detected in entry file, skipping.');
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
}
