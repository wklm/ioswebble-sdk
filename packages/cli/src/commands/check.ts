/**
 * `npx ioswebble check` command
 * Verifies that iOSWebBLE is correctly integrated in the project
 */

import * as fs from 'fs';
import * as path from 'path';

async function grepProject(projectPath: string, pattern: RegExp): Promise<boolean> {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.html'];
  const dirs = ['src', 'app', 'pages', 'components', 'lib', '.'];

  for (const dir of dirs) {
    const dirPath = path.join(projectPath, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = walkDir(dirPath, extensions);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (pattern.test(content)) return true;
    }
  }
  return false;
}

function walkDir(dir: string, extensions: string[], maxDepth = 4, depth = 0): string[] {
  if (depth > maxDepth) return [];
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath, extensions, maxDepth, depth + 1));
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return files;
}

export async function check(_args: string[]): Promise<void> {
  const projectPath = process.cwd();
  const issues: string[] = [];

  console.log('Checking iOSWebBLE integration...\n');

  // 1. Check if @ios-web-bluetooth/detect is in dependencies
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!allDeps['@ios-web-bluetooth/detect']) {
      issues.push('Package @ios-web-bluetooth/detect not found in dependencies');
    } else {
      console.log('  [pass] @ios-web-bluetooth/detect found in dependencies');
    }
  } else {
    // Check for CDN usage in HTML files
    const hasCdn = await grepProject(projectPath, /ioswebble\.com\/detect/);
    if (!hasCdn) {
      issues.push('No @ios-web-bluetooth/detect package or CDN script found');
    } else {
      console.log('  [pass] CDN script tag found');
    }
  }

  // 2. Search for the initialization call in source files
  const hasInit = await grepProject(
    projectPath,
    /@ioswebble\/detect|ioswebble\.com\/detect|IOSWebBLEProvider|initIOSWebBLE/
  );
  if (!hasInit) {
    issues.push('No iOSWebBLE initialization found in source files');
  } else {
    console.log('  [pass] iOSWebBLE initialization found in source files');
  }

  console.log();

  if (issues.length === 0) {
    console.log('All checks passed. iOSWebBLE integration detected. Ready.');
  } else {
    console.log(`Found ${issues.length} issue(s):`);
    issues.forEach((i) => console.log(`  [fail] ${i}`));
    process.exit(1);
  }
}
