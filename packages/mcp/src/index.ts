#!/usr/bin/env node

/**
 * @ios-web-bluetooth/mcp — MCP Server for iOSWebBLE
 *
 * Exposes 9 tools + 6 resources for AI agents to manage iOSWebBLE integration:
 *
 * Tools:
 * - ioswebble_init: Add iOSWebBLE to a web project
 * - ioswebble_check: Verify integration is correct
 * - ioswebble_add: Install a package + generate boilerplate
 * - ioswebble_scaffold_profile: Generate a typed custom BLE profile
 * - ioswebble_get_example: Return complete code examples by use case
 * - ioswebble_troubleshoot: Diagnose issues from error code or symptom
 * - ioswebble_docs: Return documentation by topic
 * - webble_suggest: Analyze project and recommend @ios-web-bluetooth packages
 * - webble_check_compliance: Check code for Safari iOS compliance issues
 *
 * Resources:
 * - ioswebble://docs/quickstart
 * - ioswebble://docs/api
 * - ioswebble://profiles
 * - ioswebble://uuids
 * - ioswebble://errors
 * - ioswebble://changelog
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { initTool } from './tools/init';
import { checkTool } from './tools/check';
import { addTool } from './tools/add';
import { scaffoldProfileTool } from './tools/scaffold-profile';
import { getExampleTool } from './tools/get-example';
import { troubleshootTool } from './tools/troubleshoot';
import { docsTool } from './tools/docs';
import { suggestTool } from './tools/suggest';
import { checkComplianceTool } from './tools/check-compliance';
import { registerResources } from './resources';

const server = new McpServer({
  name: 'ioswebble',
  version: '0.1.0',
});

// --- Tools ---

// Tool 1: Initialize integration in a project
// @ts-expect-error TS2589: MCP SDK Zod generics cause deep type instantiation
server.registerTool(
  'ioswebble_init',
  {
    title: 'Add Safari iOS Bluetooth support to a web project',
    description: 'Auto-detects framework (React, Next.js, Vue, etc.) and adds Web Bluetooth polyfill (@ios-web-bluetooth/core/auto) + detection snippet. Makes navigator.bluetooth work on Safari iOS.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      projectPath: z.string().describe('Path to the web project root'),
      apiKey: z
        .string()
        .optional()
        .describe('Optional API key for campaign tracking.'),
      framework: z
        .enum([
          'nextjs-app',
          'nextjs-pages',
          'react-vite',
          'react-cra',
          'vue',
          'nuxt',
          'sveltekit',
          'angular',
          'html',
          'auto',
        ])
        .default('auto')
        .describe(
          'Framework to configure for. "auto" detects from package.json.'
        ),
    },
  },
  async ({ projectPath, apiKey, framework }) => {
    return initTool(projectPath, apiKey, framework);
  }
);

// Tool 2: Verify integration
server.registerTool(
  'ioswebble_check',
  {
    title: 'Verify Web Bluetooth / Safari iOS integration',
    description: 'Checks @ios-web-bluetooth/core, @ios-web-bluetooth/detect, and @ios-web-bluetooth/profiles are correctly set up for BLE support.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      projectPath: z.string().describe('Path to the web project root'),
    },
  },
  async ({ projectPath }) => {
    return checkTool(projectPath);
  }
);

// Tool 3: Install package + generate boilerplate
server.registerTool(
  'ioswebble_add',
  {
    title: 'Add a Web Bluetooth SDK package',
    description: 'Install a @ios-web-bluetooth package (core, profiles, react, detect) and generate starter code for BLE / Safari iOS Bluetooth.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      projectPath: z.string().describe('Path to the web project root'),
      package: z
        .enum(['core', 'profiles', 'react', 'detect'])
        .describe('Which package to add: core, profiles, react, or detect'),
    },
  },
  async ({ projectPath, package: pkg }) => {
    return addTool(projectPath, pkg);
  }
);

// Tool 4: Scaffold a custom BLE profile
// @ts-expect-error TS2589: MCP SDK Zod generics cause deep type instantiation
server.registerTool(
  'ioswebble_scaffold_profile',
  {
    title: 'Scaffold a custom Bluetooth device profile',
    description: 'Generate a typed custom BLE device profile using defineProfile() from @ios-web-bluetooth/profiles. For heart rate, battery, etc. use built-in profiles instead.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      name: z.string().describe('Profile name (e.g. "Environment Sensor")'),
      serviceUUID: z.string().describe('BLE service UUID (e.g. "181a" or full 128-bit UUID)'),
      characteristics: z
        .array(
          z.object({
            uuid: z.string().describe('Characteristic UUID'),
            name: z.string().describe('Human-readable name (e.g. "temperature")'),
            type: z
              .enum(['read', 'write', 'notify'])
              .describe('Operation type: read, write, or notify'),
          })
        )
        .describe('Array of characteristic definitions'),
    },
  },
  async ({ name, serviceUUID, characteristics }) => {
    return scaffoldProfileTool(name, serviceUUID, characteristics);
  }
);

// Tool 5: Get complete code examples
// @ts-expect-error TS2589: MCP SDK Zod generics cause deep type instantiation
server.registerTool(
  'ioswebble_get_example',
  {
    title: 'Get a Web Bluetooth code example',
    description: 'Return a complete, copy-pasteable code example for a Bluetooth Low Energy use case (Safari iOS + Chrome).',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      useCase: z
        .enum([
          'heart-rate',
          'battery',
          'device-info',
          'custom-profile',
          'react-hooks',
          'scan-filter',
          'notifications',
        ])
        .describe('Use case to get an example for'),
    },
  },
  async ({ useCase }) => {
    return getExampleTool(useCase);
  }
);

// Tool 6: Troubleshoot issues
server.registerTool(
  'ioswebble_troubleshoot',
  {
    title: 'Troubleshoot Web Bluetooth / Safari iOS issues',
    description: 'Diagnose Bluetooth Low Energy issues from a WebBLEError code or symptom description. Covers Safari iOS extension and Chrome native.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      errorCode: z
        .string()
        .optional()
        .describe(
          'WebBLEError code (e.g. "DEVICE_NOT_FOUND", "BLUETOOTH_UNAVAILABLE")'
        ),
      symptom: z
        .string()
        .optional()
        .describe(
          'Description of the problem (e.g. "can\'t find any devices", "bluetooth not working")'
        ),
    },
  },
  async ({ errorCode, symptom }) => {
    return troubleshootTool(errorCode, symptom);
  }
);

// Tool 7: Documentation lookup
// @ts-expect-error TS2589: MCP SDK Zod generics cause deep type instantiation
server.registerTool(
  'ioswebble_docs',
  {
    title: 'Look up Web Bluetooth SDK documentation',
    description: 'Return WebBLE SDK documentation for a specific topic: quickstart, api, react, profiles, or errors. Covers Safari iOS and Chrome.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      topic: z
        .enum(['quickstart', 'api', 'react', 'profiles', 'errors'])
        .describe('Documentation topic'),
    },
  },
  async ({ topic }) => {
    return docsTool(topic);
  }
);

// Tool 8: Suggest packages for a project
server.registerTool(
  'webble_suggest',
  {
    title: 'Suggest WebBLE SDK setup for a project',
    description:
      'Analyzes a web project and recommends which @ios-web-bluetooth packages to install and how to configure them for Safari iOS Bluetooth support.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      projectPath: z.string().describe('Path to the web project root'),
      goal: z
        .string()
        .optional()
        .describe(
          'What the user wants to build (e.g. "heart rate monitor", "BLE scanner")'
        ),
    },
  },
  async ({ projectPath, goal }) => {
    return suggestTool(projectPath, goal);
  }
);

// Tool 9: Check code for Safari iOS compliance
server.registerTool(
  'webble_check_compliance',
  {
    title: 'Check Web Bluetooth code for Safari iOS compliance',
    description:
      'Statically checks JavaScript/TypeScript code for common Safari iOS Web Bluetooth issues: missing user gestures, useEffect traps, missing error handling.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      code: z
        .string()
        .describe('JavaScript/TypeScript code to check for compliance'),
      filePath: z
        .string()
        .optional()
        .describe('Optional file path for context in error messages'),
    },
  },
  async ({ code, filePath }) => {
    return checkComplianceTool(code, filePath);
  }
);

// --- Resources ---
registerResources(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
