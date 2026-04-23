#!/usr/bin/env node
/**
 * Entry point for `webble-mcp`. Wires the MCP server to stdio so hosts
 * (Claude Desktop, Cursor, Copilot, etc.) can spawn and speak MCP.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // AIDEV-NOTE: intentionally no logging on stdout — stdio transport owns it.
  // Fatal errors go to stderr via process.on('unhandledRejection').
}

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[webble-mcp] unhandled rejection:', reason);
  process.exit(1);
});

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[webble-mcp] fatal:', err);
  process.exit(1);
});
