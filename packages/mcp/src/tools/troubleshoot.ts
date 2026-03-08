/**
 * ioswebble_troubleshoot tool implementation
 *
 * Diagnoses issues from error codes or symptom descriptions.
 * Error codes match WebBLEErrorCode from @ios-web-bluetooth/core/errors.ts.
 */

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

interface DiagnosticEntry {
  title: string;
  cause: string;
  fix: string[];
  code?: string;
}

const ERROR_DIAGNOSTICS: Record<string, DiagnosticEntry> = {
  BLUETOOTH_UNAVAILABLE: {
    title: 'Bluetooth Unavailable',
    cause: 'The browser does not support Web Bluetooth, or the device has Bluetooth turned off.',
    fix: [
      'Ensure Bluetooth is enabled in iOS Settings > Bluetooth.',
      'Verify the WebBLE Safari extension is installed and enabled.',
      'Check that the site is served over HTTPS (localhost is exempted).',
      'Use `ble.getAvailability()` to check before calling `requestDevice()`.',
    ],
    code: `const ble = new WebBLE()
if (!ble.isSupported) {
  console.log('Platform:', ble.platform) // 'ios-extension', 'chrome', 'unsupported'
}`,
  },

  EXTENSION_NOT_INSTALLED: {
    title: 'WebBLE Extension Not Installed',
    cause: 'The user is on iOS Safari but has not installed the WebBLE app/extension.',
    fix: [
      'Add `@ios-web-bluetooth/detect` to show an automatic install banner on iOS Safari.',
      'The detection snippet is a no-op on Chrome/Android (native Web Bluetooth).',
      'Direct users to install the WebBLE app from the App Store.',
      'After installing, they must enable the extension in Safari Settings > Extensions.',
    ],
    code: `import { initIOSWebBLE } from '@ios-web-bluetooth/detect'
initIOSWebBLE({ key: 'wbl_YOUR_API_KEY' })`,
  },

  DEVICE_NOT_FOUND: {
    title: 'No Matching Device Found',
    cause: 'No BLE device matching the scan filters was discovered, or the user cancelled the picker.',
    fix: [
      'Ensure the BLE device is powered on and advertising.',
      'Bring the device within Bluetooth range (typically < 10 meters).',
      'Check that your `filters` include the correct service UUIDs.',
      'Try `acceptAllDevices: true` with `optionalServices` to test discovery.',
      'Use Bluetooth SIG names (e.g. `heart_rate`) — they are resolved to full UUIDs automatically.',
    ],
    code: `// Debug: accept all devices
const device = await ble.requestDevice({
  acceptAllDevices: true,
  optionalServices: ['heart_rate', 'battery_service']
})`,
  },

  DEVICE_DISCONNECTED: {
    title: 'Device Disconnected',
    cause: 'A GATT operation was attempted on a device that is not connected.',
    fix: [
      'Call `await device.connect()` before read/write/subscribe operations.',
      'Check `device.connected` before performing GATT operations.',
      'Add a `device.on("disconnected", ...)` handler to detect unexpected disconnections.',
      'Consider auto-reconnect logic in your disconnect handler.',
    ],
    code: `device.on('disconnected', () => {
  console.log('Lost connection, attempting reconnect...')
  device.connect().catch(console.error)
})`,
  },

  SERVICE_NOT_FOUND: {
    title: 'Service Not Found',
    cause: 'The requested GATT service UUID does not exist on the connected device.',
    fix: [
      'Verify the service UUID matches what the device actually advertises.',
      'Include the service in `filters` or `optionalServices` when calling `requestDevice()`.',
      'Services not declared in the request are blocked by the Web Bluetooth security model.',
      'Use a BLE scanner app to inspect the device\'s actual service list.',
    ],
    code: `const device = await ble.requestDevice({
  filters: [{ services: ['heart_rate'] }],
  optionalServices: ['battery_service', 'device_information']
})`,
  },

  CHARACTERISTIC_NOT_FOUND: {
    title: 'Characteristic Not Found',
    cause: 'The requested characteristic UUID does not exist within the specified service.',
    fix: [
      'Check the characteristic UUID is correct for this service.',
      'Use Bluetooth SIG names (e.g. `heart_rate_measurement`) or hex UUIDs (e.g. `2a37`).',
      'Verify the device firmware actually includes this characteristic.',
      'Use a BLE scanner app to inspect the service\'s characteristic list.',
    ],
  },

  CHARACTERISTIC_NOT_READABLE: {
    title: 'Characteristic Not Readable',
    cause: 'The characteristic does not have the Read property.',
    fix: [
      'Check the characteristic properties — it may only support Notify or Write.',
      'Use `device.subscribe()` instead if the characteristic supports Notify.',
      'Consult the device documentation for supported operations per characteristic.',
    ],
  },

  CHARACTERISTIC_NOT_WRITABLE: {
    title: 'Characteristic Not Writable',
    cause: 'The characteristic does not have the Write property.',
    fix: [
      'Check the characteristic properties — it may only support Read or Notify.',
      'Some characteristics use Write Without Response instead of Write.',
      'Try `device.writeWithoutResponse(service, characteristic, value)` instead.',
    ],
  },

  CHARACTERISTIC_NOT_NOTIFIABLE: {
    title: 'Characteristic Not Notifiable',
    cause: 'The characteristic does not support Notify or Indicate.',
    fix: [
      'Check the characteristic properties — it may only support Read.',
      'Use `device.read()` for periodic polling as an alternative.',
      'Consult the device documentation for which characteristics support notifications.',
    ],
  },

  GATT_OPERATION_FAILED: {
    title: 'GATT Operation Failed',
    cause: 'A generic GATT error occurred. The device may have disconnected, or the operation was rejected.',
    fix: [
      'Check if the device is still connected with `device.connected`.',
      'Ensure no other GATT operation is in progress on the same characteristic.',
      'Try reconnecting: `device.disconnect()` then `device.connect()`.',
      'Some devices have rate limits — add a small delay between rapid operations.',
    ],
  },

  PERMISSION_DENIED: {
    title: 'Bluetooth Permission Denied',
    cause: 'The user denied the Bluetooth permission prompt.',
    fix: [
      'Bluetooth requests must be triggered by a user gesture (button click, tap).',
      'Do not call `requestDevice()` on page load — Safari will block it.',
      'If previously denied, the user must grant permission in iOS Settings > Safari > WebBLE.',
    ],
    code: `// Always trigger from a user gesture
button.addEventListener('click', async () => {
  const device = await ble.requestDevice({ ... })
})`,
  },

  SCAN_ALREADY_IN_PROGRESS: {
    title: 'Scan Already in Progress',
    cause: 'A `requestDevice()` call was made while another scan is already active.',
    fix: [
      'Wait for the current `requestDevice()` promise to resolve or reject before starting another.',
      'Disable the scan button while a scan is in progress.',
    ],
  },

  CONNECTION_TIMEOUT: {
    title: 'Connection Timeout',
    cause: 'The device did not respond to the connection request within the timeout period.',
    fix: [
      'Ensure the device is in range and powered on.',
      'Some devices need to be in pairing mode to accept connections.',
      'Try moving closer to the device.',
      'Restart Bluetooth on the iOS device (Settings > Bluetooth > toggle off/on).',
    ],
  },

  USER_CANCELLED: {
    title: 'User Cancelled',
    cause: 'The user dismissed the device picker dialog without selecting a device.',
    fix: [
      'This is normal user behavior — no action needed.',
      'Catch this error and handle it gracefully (e.g. show a "try again" prompt).',
    ],
    code: `try {
  const device = await ble.requestDevice({ ... })
} catch (e) {
  if (e.code === 'USER_CANCELLED') {
    // User dismissed the picker — show a friendly message
    console.log('No device selected')
  } else {
    throw e // Re-throw unexpected errors
  }
}`,
  },

  TIMEOUT: {
    title: 'Operation Timeout',
    cause: 'A BLE operation did not complete within the expected time.',
    fix: [
      'Check device connectivity and range.',
      'The device may be busy or unresponsive — try disconnecting and reconnecting.',
      'Some operations (especially large writes) may take longer on certain devices.',
    ],
  },
};

const SYMPTOM_MAP: Array<{ patterns: string[]; errorCode: string; extra?: string }> = [
  { patterns: ['not installed', 'no extension', 'extension missing', 'install banner'], errorCode: 'EXTENSION_NOT_INSTALLED' },
  { patterns: ['bluetooth off', 'bt off', 'not available', 'unsupported', 'not supported'], errorCode: 'BLUETOOTH_UNAVAILABLE' },
  { patterns: ['no device', 'can\'t find', 'cannot find', 'not found', 'nothing shows', 'empty list'], errorCode: 'DEVICE_NOT_FOUND' },
  { patterns: ['disconnect', 'lost connection', 'dropped', 'gatt server'], errorCode: 'DEVICE_DISCONNECTED' },
  { patterns: ['service not found', 'no service', 'wrong service'], errorCode: 'SERVICE_NOT_FOUND' },
  { patterns: ['characteristic not found', 'no characteristic', 'wrong uuid'], errorCode: 'CHARACTERISTIC_NOT_FOUND' },
  { patterns: ['can\'t read', 'cannot read', 'not readable'], errorCode: 'CHARACTERISTIC_NOT_READABLE' },
  { patterns: ['can\'t write', 'cannot write', 'not writable', 'write failed'], errorCode: 'CHARACTERISTIC_NOT_WRITABLE' },
  { patterns: ['can\'t notify', 'cannot notify', 'not notifiable', 'no notifications'], errorCode: 'CHARACTERISTIC_NOT_NOTIFIABLE' },
  { patterns: ['gatt failed', 'gatt error', 'operation failed'], errorCode: 'GATT_OPERATION_FAILED' },
  { patterns: ['permission', 'denied', 'blocked'], errorCode: 'PERMISSION_DENIED' },
  { patterns: ['already scanning', 'scan in progress', 'duplicate scan'], errorCode: 'SCAN_ALREADY_IN_PROGRESS' },
  { patterns: ['timeout', 'timed out', 'took too long'], errorCode: 'CONNECTION_TIMEOUT' },
  { patterns: ['cancel', 'dismissed', 'picker closed'], errorCode: 'USER_CANCELLED' },
];

export async function troubleshootTool(
  errorCode?: string,
  symptom?: string,
): Promise<ToolResult> {
  const lines: string[] = [];

  // If error code is provided, look it up directly
  if (errorCode) {
    const code = errorCode.toUpperCase().replace(/[^A-Z_]/g, '');
    const diag = ERROR_DIAGNOSTICS[code];
    if (diag) {
      lines.push(`## ${diag.title}`);
      lines.push(`**Error code**: \`${code}\``);
      lines.push('');
      lines.push(`**Cause**: ${diag.cause}`);
      lines.push('');
      lines.push('**Fix**:');
      for (const fix of diag.fix) {
        lines.push(`- ${fix}`);
      }
      if (diag.code) {
        lines.push('');
        lines.push('**Example**:');
        lines.push('```typescript');
        lines.push(diag.code);
        lines.push('```');
      }
    } else {
      lines.push(`Unknown error code: \`${errorCode}\`.`);
      lines.push('');
      lines.push('Valid error codes: ' + Object.keys(ERROR_DIAGNOSTICS).map(c => `\`${c}\``).join(', '));
    }
  }

  // If symptom is provided, fuzzy match
  if (symptom) {
    const lower = symptom.toLowerCase();
    const matches = SYMPTOM_MAP.filter(entry =>
      entry.patterns.some(p => lower.includes(p))
    );

    if (matches.length > 0) {
      if (lines.length > 0) lines.push('\n---\n');
      lines.push(`## Symptom analysis: "${symptom}"`);
      lines.push('');

      for (const match of matches) {
        const diag = ERROR_DIAGNOSTICS[match.errorCode];
        if (diag) {
          lines.push(`### ${diag.title} (\`${match.errorCode}\`)`);
          lines.push(`**Cause**: ${diag.cause}`);
          lines.push('');
          lines.push('**Fix**:');
          for (const fix of diag.fix) {
            lines.push(`- ${fix}`);
          }
          if (diag.code) {
            lines.push('');
            lines.push('```typescript');
            lines.push(diag.code);
            lines.push('```');
          }
          lines.push('');
        }
      }
    } else {
      if (lines.length > 0) lines.push('\n---\n');
      lines.push(`Could not match symptom "${symptom}" to a known issue.`);
      lines.push('');
      lines.push('**General troubleshooting steps**:');
      lines.push('1. Check Bluetooth is enabled on the iOS device');
      lines.push('2. Verify the WebBLE extension is enabled in Safari Settings > Extensions');
      lines.push('3. Ensure the site is served over HTTPS');
      lines.push('4. Confirm the BLE device is powered on and in range');
      lines.push('5. Try: Settings > Safari > Clear History and Website Data, then reload');
      lines.push('6. Restart the Safari app');
    }
  }

  if (!errorCode && !symptom) {
    lines.push('Provide an `errorCode` or `symptom` (or both) to get diagnostics.');
    lines.push('');
    lines.push('**Error codes**: ' + Object.keys(ERROR_DIAGNOSTICS).map(c => `\`${c}\``).join(', '));
    lines.push('');
    lines.push('**Example symptoms**: "can\'t find device", "bluetooth off", "permission denied", "disconnect"');
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
