#!/usr/bin/env node

/**
 * @wklm/mcp — MCP Server for iOSWebBLE
 *
 * Exposes 7 tools + 6 resources for AI agents to manage iOSWebBLE integration:
 *
 * Tools:
 * - ioswebble_init: Add iOSWebBLE to a web project
 * - ioswebble_check: Verify integration is correct
 * - ioswebble_add: Install a package + generate boilerplate
 * - ioswebble_scaffold_profile: Generate a typed custom BLE profile
 * - ioswebble_get_example: Return complete code examples by use case
 * - ioswebble_troubleshoot: Diagnose issues from error code or symptom
 * - ioswebble_docs: Return documentation by topic
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
    title: 'Add iOSWebBLE to a web project',
    description: 'Auto-detects framework and adds detection snippet.',
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
    title: 'Verify iOSWebBLE integration',
    description: 'Checks @wklm/detect, @wklm/core, and @wklm/profiles are correctly set up.',
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
    title: 'Add a @wklm package',
    description: 'Install a @wklm package and generate starter code. Auto-detects framework.',
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
    title: 'Scaffold a custom BLE profile',
    description: 'Generate a typed custom BLE profile using defineProfile() from @wklm/profiles.',
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
    title: 'Get a BLE code example',
    description: 'Return a complete, copy-pasteable code example for a BLE use case.',
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
    title: 'Troubleshoot BLE issues',
    description: 'Diagnose BLE issues from a WebBLEError code or symptom description.',
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
    title: 'Look up documentation',
    description: 'Return documentation for a specific topic: quickstart, api, react, profiles, or errors.',
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

// --- Resources ---
registerResources(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
