/**
 * ioswebble_check tool implementation
 *
 * Verifies WebBLE integration by checking for:
 * - @ios-web-bluetooth/detect in dependencies and source
 * - @ios-web-bluetooth/core in dependencies and source
 * - @ios-web-bluetooth/profiles in dependencies and source
 */

import * as fs from 'fs';
import * as path from 'path';

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

function walkDir(dir: string, extensions: string[], maxDepth = 4, depth = 0): string[] {
  if (depth > maxDepth) return [];
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', '.next', 'build'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath, extensions, maxDepth, depth + 1));
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch { /* skip */ }
  return files;
}

function grepProject(projectPath: string, pattern: RegExp): boolean {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.html'];
  const files = walkDir(projectPath, extensions);
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (pattern.test(content)) return true;
    } catch { /* skip */ }
  }
  return false;
}

export async function checkTool(projectPath: string): Promise<ToolResult> {
  const checks: string[] = [];
  const issues: string[] = [];
  const info: string[] = [];

  // Read package.json
  const pkgPath = path.join(projectPath, 'package.json');
  let allDeps: Record<string, string> = {};
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  }

  // 1. @ios-web-bluetooth/detect package check
  if (allDeps['@ios-web-bluetooth/detect']) {
    checks.push('[PASS] @ios-web-bluetooth/detect found in dependencies');
  } else {
    issues.push('[FAIL] @ios-web-bluetooth/detect not in dependencies. Run: npm install @ios-web-bluetooth/detect');
  }

  // 2. @ios-web-bluetooth/detect usage check
  const hasDetectInit = grepProject(projectPath, /@ioswebble\/detect|ioswebble\.com\/detect|IOSWebBLEProvider|initIOSWebBLE/);
  if (hasDetectInit) {
    checks.push('[PASS] WebBLE detection/initialization found in source files');
  } else {
    issues.push('[FAIL] No WebBLE detection found. Use ioswebble_init or ioswebble_add to add it.');
  }

  // 3. @ios-web-bluetooth/core package check
  if (allDeps['@ios-web-bluetooth/core']) {
    checks.push('[PASS] @ios-web-bluetooth/core found in dependencies');

    // Check for actual usage
    const hasCoreUsage = grepProject(projectPath, /@ios-web-bluetooth\/core|@webble\/core|new WebBLE|WebBLEDevice|WebBLEError/);
    if (hasCoreUsage) {
      checks.push('[PASS] @ios-web-bluetooth/core imports found in source files');
    } else {
      info.push('[INFO] @ios-web-bluetooth/core is installed but no imports found in source files');
    }
  } else {
    info.push('[INFO] @ios-web-bluetooth/core not installed (optional — needed for programmatic BLE access)');
  }

  // 4. @ios-web-bluetooth/profiles package check
  if (allDeps['@ios-web-bluetooth/profiles']) {
    checks.push('[PASS] @ios-web-bluetooth/profiles found in dependencies');

    const hasProfileUsage = grepProject(projectPath, /@ios-web-bluetooth\/profiles|@webble\/profiles|HeartRateProfile|BatteryProfile|DeviceInfoProfile|defineProfile/);
    if (hasProfileUsage) {
      checks.push('[PASS] @ios-web-bluetooth/profiles imports found in source files');
    } else {
      info.push('[INFO] @ios-web-bluetooth/profiles is installed but no imports found in source files');
    }
  } else {
    info.push('[INFO] @ios-web-bluetooth/profiles not installed (optional — typed BLE profile helpers)');
  }

  // 5. @ios-web-bluetooth/react package check
  if (allDeps['@ios-web-bluetooth/react']) {
    checks.push('[PASS] @ios-web-bluetooth/react found in dependencies');

    const hasReactUsage = grepProject(projectPath, /@ios-web-bluetooth\/react|@webble\/react|WebBLEProvider|useWebBLE|useDevice|useNotifications/);
    if (hasReactUsage) {
      checks.push('[PASS] @ios-web-bluetooth/react imports found in source files');
    } else {
      info.push('[INFO] @ios-web-bluetooth/react is installed but no imports found in source files');
    }
  } else {
    info.push('[INFO] @ios-web-bluetooth/react not installed (optional — React hooks and components)');
  }

  // 6. HTTPS check (check for dev server config)
  const hasHTTPS = grepProject(projectPath, /https:|ssl:|cert:|tls:/i);
  if (hasHTTPS) {
    checks.push('[PASS] HTTPS configuration detected');
  } else {
    info.push('[INFO] No HTTPS config detected — Web Bluetooth requires HTTPS (localhost is exempted)');
  }

  const result = [...checks, ...issues, ...info].join('\n');

  if (issues.length === 0) {
    return {
      content: [{ type: 'text', text: `All required checks passed (${checks.length} passed, ${info.length} info).\n\n${result}\n\nWebBLE integration detected. Ready for production.` }],
    };
  }

  return {
    content: [{ type: 'text', text: `Found ${issues.length} issue(s), ${checks.length} passed, ${info.length} info:\n\n${result}` }],
  };
}
