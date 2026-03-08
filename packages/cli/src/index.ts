#!/usr/bin/env node

/**
 * @ios-web-bluetooth/cli
 *
 * CLI tool for integrating iOSWebBLE into web projects.
 * Usage: npx ioswebble <command> [options]
 */

import { init } from './commands/init';
import { check } from './commands/check';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
  iOSWebBLE CLI - Add iOS Safari Bluetooth support to any web app

  Usage: npx ioswebble <command> [options]

  Commands:
    init              Auto-detect framework and add detection snippet
    check             Verify iOSWebBLE integration is correct

  Options:
    --help, -h        Show this help message
    --version, -v     Show version

  Examples:
    npx ioswebble init
    npx ioswebble init --key wbl_xxxxx --framework react
    npx ioswebble check
  `);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../package.json');
    console.log(pkg.version);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'init':
        await init(args.slice(1));
        break;
      case 'check':
        await check(args.slice(1));
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
