/**
 * ioswebble_check tool implementation
 *
 * Verifies iOSWebBLE integration by checking for:
 * - @wklm/detect in dependencies and source
 * - @wklm/core in dependencies and source
 * - @wklm/profiles in dependencies and source
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

  // 1. @wklm/detect package check
  if (allDeps['@wklm/detect']) {
    checks.push('[PASS] @wklm/detect found in dependencies');
  } else {
    issues.push('[FAIL] @wklm/detect not in dependencies. Run: npm install @wklm/detect');
  }

  // 2. @wklm/detect usage check
  const hasDetectInit = grepProject(projectPath, /@ioswebble\/detect|ioswebble\.com\/detect|IOSWebBLEProvider|initIOSWebBLE/);
  if (hasDetectInit) {
    checks.push('[PASS] iOSWebBLE detection/initialization found in source files');
  } else {
    issues.push('[FAIL] No iOSWebBLE detection found. Use ioswebble_init or ioswebble_add to add it.');
  }

  // 3. @wklm/core package check
  if (allDeps['@wklm/core']) {
    checks.push('[PASS] @wklm/core found in dependencies');

    // Check for actual usage
    const hasCoreUsage = grepProject(projectPath, /@wklm\/core|@webble\/core|new WebBLE|WebBLEDevice|WebBLEError/);
    if (hasCoreUsage) {
      checks.push('[PASS] @wklm/core imports found in source files');
    } else {
      info.push('[INFO] @wklm/core is installed but no imports found in source files');
    }
  } else {
    info.push('[INFO] @wklm/core not installed (optional — needed for programmatic BLE access)');
  }

  // 4. @wklm/profiles package check
  if (allDeps['@wklm/profiles']) {
    checks.push('[PASS] @wklm/profiles found in dependencies');

    const hasProfileUsage = grepProject(projectPath, /@wklm\/profiles|@webble\/profiles|HeartRateProfile|BatteryProfile|DeviceInfoProfile|defineProfile/);
    if (hasProfileUsage) {
      checks.push('[PASS] @wklm/profiles imports found in source files');
    } else {
      info.push('[INFO] @wklm/profiles is installed but no imports found in source files');
    }
  } else {
    info.push('[INFO] @wklm/profiles not installed (optional — typed BLE profile helpers)');
  }

  // 5. @wklm/react package check
  if (allDeps['@wklm/react']) {
    checks.push('[PASS] @wklm/react found in dependencies');

    const hasReactUsage = grepProject(projectPath, /@wklm\/react|@webble\/react|WebBLEProvider|useWebBLE|useDevice|useNotifications/);
    if (hasReactUsage) {
      checks.push('[PASS] @wklm/react imports found in source files');
    } else {
      info.push('[INFO] @wklm/react is installed but no imports found in source files');
    }
  } else {
    info.push('[INFO] @wklm/react not installed (optional — React hooks and components)');
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
      content: [{ type: 'text', text: `All required checks passed (${checks.length} passed, ${info.length} info).\n\n${result}\n\niOSWebBLE integration detected. Ready for production.` }],
    };
  }

  return {
    content: [{ type: 'text', text: `Found ${issues.length} issue(s), ${checks.length} passed, ${info.length} info:\n\n${result}` }],
  };
}
