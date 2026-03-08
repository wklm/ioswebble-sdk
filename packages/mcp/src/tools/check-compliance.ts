/**
 * webble_check_compliance tool implementation
 *
 * Statically checks JavaScript/TypeScript code for common Safari iOS
 * Web Bluetooth issues: missing user gestures, useEffect traps,
 * missing error handling.
 */

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

interface ComplianceIssue {
  line: number;
  issue: string;
  fix: string;
}

export async function checkComplianceTool(
  code: string,
  filePath?: string
): Promise<ToolResult> {
  const lines = code.split('\n');
  const issues: ComplianceIssue[] = [];

  // Track context for multi-line analysis
  let insideUseEffect = false;
  let useEffectDepth = 0;
  let useEffectStartLine = 0;

  let insideComponentDidMount = false;
  let componentDidMountDepth = 0;
  let componentDidMountStartLine = 0;

  let insideDOMContentLoaded = false;
  let domContentLoadedDepth = 0;
  let domContentLoadedStartLine = 0;

  let hasRequestDevice = false;
  let requestDeviceInTryCatch = false;
  let insideTryCatch = false;
  let tryCatchDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Track brace depth for context detection
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    const braceChange = openBraces - closeBraces;

    // Detect useEffect entry
    if (/useEffect\s*\(/.test(line)) {
      insideUseEffect = true;
      useEffectDepth = 1;
      useEffectStartLine = lineNum;
    } else if (insideUseEffect) {
      useEffectDepth += braceChange;
      if (useEffectDepth <= 0) insideUseEffect = false;
    }

    // Detect componentDidMount entry
    if (/componentDidMount\s*\(/.test(line)) {
      insideComponentDidMount = true;
      componentDidMountDepth = 1;
      componentDidMountStartLine = lineNum;
    } else if (insideComponentDidMount) {
      componentDidMountDepth += braceChange;
      if (componentDidMountDepth <= 0) insideComponentDidMount = false;
    }

    // Detect DOMContentLoaded / window.onload / addEventListener('load')
    if (
      /DOMContentLoaded|window\.onload|addEventListener\s*\(\s*['"]load['"]/.test(
        line
      )
    ) {
      insideDOMContentLoaded = true;
      domContentLoadedDepth = 1;
      domContentLoadedStartLine = lineNum;
    } else if (insideDOMContentLoaded) {
      domContentLoadedDepth += braceChange;
      if (domContentLoadedDepth <= 0) insideDOMContentLoaded = false;
    }

    // Detect try/catch blocks
    if (/\btry\s*\{/.test(line)) {
      insideTryCatch = true;
      tryCatchDepth = 1;
    } else if (insideTryCatch) {
      tryCatchDepth += braceChange;
      if (tryCatchDepth <= 0) insideTryCatch = false;
    }

    // Check for requestDevice calls
    if (/requestDevice\s*\(/.test(line)) {
      hasRequestDevice = true;

      if (insideTryCatch) {
        requestDeviceInTryCatch = true;
      }

      // Check 1: requestDevice inside useEffect
      if (insideUseEffect) {
        issues.push({
          line: lineNum,
          issue:
            'requestDevice() called inside useEffect — silently fails on Safari iOS (no user gesture)',
          fix: 'Move requestDevice() to a click/tap event handler. Example: <button onClick={async () => { await requestDevice(...) }}>',
        });
      }

      // Check 2: requestDevice inside componentDidMount
      if (insideComponentDidMount) {
        issues.push({
          line: lineNum,
          issue:
            'requestDevice() called inside componentDidMount — silently fails on Safari iOS (no user gesture)',
          fix: 'Move requestDevice() to a click/tap event handler method.',
        });
      }

      // Check 3: requestDevice inside DOMContentLoaded/load
      if (insideDOMContentLoaded) {
        issues.push({
          line: lineNum,
          issue:
            'requestDevice() called on page load — silently fails on Safari iOS (no user gesture)',
          fix: "Move requestDevice() to a button click handler: document.querySelector('#btn').addEventListener('click', async () => { ... })",
        });
      }

      // Check 4: requestDevice at top-level (not inside any event handler)
      if (
        !insideUseEffect &&
        !insideComponentDidMount &&
        !insideDOMContentLoaded
      ) {
        // Check if it's inside a click/tap handler by scanning backwards
        let foundUserGesture = false;
        for (let j = i; j >= Math.max(0, i - 15); j--) {
          if (
            /onClick|onclick|addEventListener\s*\(\s*['"](?:click|tap|pointerdown|pointerup|touchend|mousedown|mouseup)['"]/.test(
              lines[j]
            )
          ) {
            foundUserGesture = true;
            break;
          }
        }

        if (!foundUserGesture) {
          // Check if it's inside a named function (which could be called from a handler)
          let insideNamedFunction = false;
          for (let j = i; j >= Math.max(0, i - 20); j--) {
            if (
              /(?:async\s+)?function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\(?/.test(
                lines[j]
              )
            ) {
              insideNamedFunction = true;
              break;
            }
          }

          if (!insideNamedFunction) {
            issues.push({
              line: lineNum,
              issue:
                'requestDevice() appears to be called outside a user gesture context',
              fix: 'Ensure requestDevice() is called from a click/tap event handler for Safari iOS compatibility.',
            });
          }
        }
      }
    }

    // Check 5: Raw hex UUIDs in requestDevice filters
    if (/requestDevice|services|filters/.test(line)) {
      if (/['"]0x[0-9a-fA-F]{4}['"]/.test(line)) {
        issues.push({
          line: lineNum,
          issue: 'Raw hex UUID used instead of human-readable name',
          fix: "Use human-readable names: 'heart_rate' instead of '0x180D'. The SDK resolves automatically.",
        });
      }
      if (
        /['"][0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}['"]/.test(
          line
        )
      ) {
        // Check if it's a standard BT SIG UUID (0000xxxx-0000-1000-8000-00805f9b34fb)
        if (/0000[0-9a-fA-F]{4}-0000-1000-8000-00805f9b34fb/.test(line)) {
          issues.push({
            line: lineNum,
            issue:
              'Full Bluetooth SIG UUID used instead of short human-readable name',
            fix: "Use the short name: 'heart_rate' instead of '0000180d-0000-1000-8000-00805f9b34fb'. See @ios-web-bluetooth/core resolveUUID().",
          });
        }
      }
    }
  }

  // Check 6: requestDevice without try/catch
  if (hasRequestDevice && !requestDeviceInTryCatch) {
    issues.push({
      line: 0,
      issue:
        'requestDevice() is not wrapped in try/catch — user can cancel the device picker',
      fix: 'Wrap requestDevice() in try/catch to handle USER_CANCELLED errors gracefully.',
    });
  }

  // Format output
  const fileLabel = filePath ? ` in ${filePath}` : '';

  if (issues.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `Compliance check passed${fileLabel}. No Safari iOS Web Bluetooth issues found.`,
        },
      ],
    };
  }

  const issueList = issues
    .map((issue) => {
      const lineLabel = issue.line > 0 ? `Line ${issue.line}` : 'General';
      return `**${lineLabel}:** ${issue.issue}\n  Fix: ${issue.fix}`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${issues.length} compliance issue(s)${fileLabel}:\n\n${issueList}`,
      },
    ],
  };
}
