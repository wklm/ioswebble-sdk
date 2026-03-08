/**
 * ioswebble_scaffold_profile tool implementation
 *
 * Generates a typed custom BLE profile using defineProfile() from @ios-web-bluetooth/profiles.
 */

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

interface CharacteristicInput {
  uuid: string;
  name: string;
  type: 'read' | 'write' | 'notify';
}

function toClassName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') + 'Profile';
}

function toCamelCase(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/);
  return parts
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function generateParseFunction(char: CharacteristicInput): string {
  const camel = toCamelCase(char.name);
  // Generate a sensible default parse function based on the characteristic name
  const nameLower = char.name.toLowerCase();

  if (nameLower.includes('temperature') || nameLower.includes('temp')) {
    return `(dv: DataView) => dv.getInt16(0, true) / 100`;
  }
  if (nameLower.includes('humidity') || nameLower.includes('pressure')) {
    return `(dv: DataView) => dv.getUint16(0, true) / 100`;
  }
  if (nameLower.includes('level') || nameLower.includes('percent') || nameLower.includes('battery')) {
    return `(dv: DataView) => dv.getUint8(0)`;
  }
  if (nameLower.includes('name') || nameLower.includes('string') || nameLower.includes('text')) {
    return `(dv: DataView) => new TextDecoder().decode(dv.buffer)`;
  }
  // Default: return the raw DataView
  return `(dv: DataView) => dv`;
}

export async function scaffoldProfileTool(
  name: string,
  serviceUUID: string,
  characteristics: CharacteristicInput[],
): Promise<ToolResult> {
  const className = toClassName(name);
  const readChars = characteristics.filter(c => c.type === 'read');
  const writeChars = characteristics.filter(c => c.type === 'write');
  const notifyChars = characteristics.filter(c => c.type === 'notify');

  const lines: string[] = [];

  // File header
  lines.push(`import { defineProfile } from '@ios-web-bluetooth/profiles'`);
  lines.push(`import type { WebBLEDevice } from '@ios-web-bluetooth/core'`);
  lines.push('');

  // Generate data types for notify characteristics
  for (const char of notifyChars) {
    const typeName = toCamelCase(char.name).charAt(0).toUpperCase() + toCamelCase(char.name).slice(1) + 'Data';
    lines.push(`export interface ${typeName} {`);
    lines.push(`  // TODO: Define parsed fields for ${char.name}`);
    lines.push(`  raw: DataView`);
    lines.push(`}`);
    lines.push('');
  }

  // Generate profile using defineProfile
  lines.push(`export const ${className} = defineProfile({`);
  lines.push(`  name: '${name}',`);
  lines.push(`  service: '${serviceUUID}',`);
  lines.push(`  characteristics: {`);

  for (const char of characteristics) {
    const camel = toCamelCase(char.name);
    const parseFn = generateParseFunction(char);
    lines.push(`    ${camel}: {`);
    lines.push(`      uuid: '${char.uuid}',`);
    lines.push(`      parse: ${parseFn},`);
    lines.push(`    },`);
  }

  lines.push(`  },`);
  lines.push(`})`);
  lines.push('');

  // Generate usage example
  lines.push(`// --- Usage example ---`);
  lines.push(`//`);
  lines.push(`// import { WebBLE } from '@ios-web-bluetooth/core'`);
  lines.push(`// import { ${className} } from './${name.toLowerCase().replace(/\s+/g, '-')}-profile'`);
  lines.push(`//`);
  lines.push(`// const ble = new WebBLE()`);
  lines.push(`// const device = await ble.requestDevice({`);
  lines.push(`//   filters: [{ services: ['${serviceUUID}'] }]`);
  lines.push(`// })`);
  lines.push(`// await device.connect()`);
  lines.push(`//`);
  lines.push(`// const profile = new ${className}(device)`);

  for (const char of readChars) {
    const camel = toCamelCase(char.name);
    lines.push(`// const ${camel} = await profile.readChar('${camel}')`);
  }

  for (const char of notifyChars) {
    const camel = toCamelCase(char.name);
    lines.push(`// const unsub = profile.subscribeChar('${camel}', (value) => {`);
    lines.push(`//   console.log('${char.name}:', value)`);
    lines.push(`// })`);
  }

  for (const char of writeChars) {
    const camel = toCamelCase(char.name);
    lines.push(`// await profile.writeChar('${camel}', new Uint8Array([0x01]))`);
    lines.push(`// Note: defineProfile does not include writeChar — use device.write() directly:`);
    lines.push(`// await device.write('${serviceUUID}', '${char.uuid}', new Uint8Array([0x01]))`);
  }

  lines.push(`//`);
  lines.push(`// profile.stop() // clean up all subscriptions`);

  const output: string[] = [];
  output.push(`## Generated profile: ${className}`);
  output.push('');
  output.push(`Service UUID: \`${serviceUUID}\``);
  output.push(`Characteristics: ${characteristics.length} (${readChars.length} read, ${writeChars.length} write, ${notifyChars.length} notify)`);
  output.push('');
  output.push('```typescript');
  output.push(lines.join('\n'));
  output.push('```');

  if (writeChars.length > 0) {
    output.push('');
    output.push('> **Note**: `defineProfile()` generates `readChar()` and `subscribeChar()` methods.');
    output.push('> For write operations, use `device.write(service, characteristic, value)` or');
    output.push('> `device.writeWithoutResponse(service, characteristic, value)` directly.');
  }

  return {
    content: [{ type: 'text', text: output.join('\n') }],
  };
}
