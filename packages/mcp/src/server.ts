import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import { installPlanTool, FRAMEWORKS, PACKAGE_MANAGERS, runInstallPlan } from './tools/install-plan.js';
import { exampleTool, PROFILES, runExample } from './tools/example.js';
import { detectIOSSupportTool, runDetectIOSSupport } from './tools/detect-ios-support.js';
import { premiumGuideTool, PREMIUM_APIS, runPremiumGuide } from './tools/premium-guide.js';
import { troubleshootTool, TOPICS, runTroubleshoot } from './tools/troubleshoot.js';
import { specCitationTool, runSpecCitation } from './tools/spec-citation.js';
import { TelemetryClient } from './telemetry.js';
import { ToolInputError } from './tools/_common.js';

export const SERVER_NAME = '@ios-web-bluetooth/mcp';
export const SERVER_VERSION = '0.0.1';

/** Options allowing tests to inject a telemetry stub. */
export interface BuildServerOptions {
  telemetry?: TelemetryClient;
}

/**
 * Build the MCP server with all six webble_* tools registered.
 * Exported for unit tests; cli.ts wires it to a stdio transport.
 */
export function buildServer(opts: BuildServerOptions = {}): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const telemetry = opts.telemetry ?? new TelemetryClient();

  // webble_install_plan
  register(server, telemetry, installPlanTool.name, {
    title: installPlanTool.title,
    description: installPlanTool.description,
    inputSchema: {
      framework: z.enum(FRAMEWORKS),
      package_manager: z.enum(PACKAGE_MANAGERS),
      include_premium: z.boolean().optional(),
    },
    handler: (args) => {
      const result = runInstallPlan(args as unknown as Parameters<typeof runInstallPlan>[0]);
      return { result, attribution_token: result.attribution_token };
    },
  });

  // webble_example
  register(server, telemetry, exampleTool.name, {
    title: exampleTool.title,
    description: exampleTool.description,
    inputSchema: { profile: z.enum(PROFILES) },
    handler: (args) => ({
      result: runExample(args as unknown as Parameters<typeof runExample>[0]),
    }),
  });

  // webble_detect_ios_support
  register(server, telemetry, detectIOSSupportTool.name, {
    title: detectIOSSupportTool.title,
    description: detectIOSSupportTool.description,
    inputSchema: {},
    handler: () => ({ result: runDetectIOSSupport() }),
  });

  // webble_premium_guide
  register(server, telemetry, premiumGuideTool.name, {
    title: premiumGuideTool.title,
    description: premiumGuideTool.description,
    inputSchema: { api: z.enum(PREMIUM_APIS) },
    handler: (args) => ({ result: runPremiumGuide(args as unknown as Parameters<typeof runPremiumGuide>[0]) }),
  });

  // webble_troubleshoot
  register(server, telemetry, troubleshootTool.name, {
    title: troubleshootTool.title,
    description: troubleshootTool.description,
    inputSchema: { topic: z.enum(TOPICS) },
    handler: (args) => ({ result: runTroubleshoot(args as unknown as Parameters<typeof runTroubleshoot>[0]) }),
  });

  // webble_spec_citation
  register(server, telemetry, specCitationTool.name, {
    title: specCitationTool.title,
    description: specCitationTool.description,
    inputSchema: {
      method: z
        .string()
        .min(1)
        .describe('Fully-qualified Web Bluetooth method, e.g. "navigator.bluetooth.requestDevice".'),
    },
    handler: (args) => ({ result: runSpecCitation(args as unknown as Parameters<typeof runSpecCitation>[0]) }),
  });

  return server;
}

interface RegisterArgs {
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  handler: (args: Record<string, unknown>) => { result: unknown; attribution_token?: string };
}

function register(
  server: McpServer,
  telemetry: TelemetryClient,
  name: string,
  args: RegisterArgs,
): void {
  server.registerTool(
    name,
    { title: args.title, description: args.description, inputSchema: args.inputSchema },
    async (input: Record<string, unknown>) => {
      const start = Date.now();
      let ok = false;
      let attribution: string | null = null;
      try {
        const { result, attribution_token } = args.handler(input);
        attribution = attribution_token ?? null;
        ok = true;
        const json = JSON.stringify(result, null, 2);
        return {
          content: [{ type: 'text', text: json }],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof ToolInputError || err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      } finally {
        // AIDEV-NOTE: Playbook §8.1 requires `success: boolean` — failures ship too.
        telemetry.send({
          tool: name,
          success: ok,
          duration_ms: Date.now() - start,
          attribution_token: attribution,
        });
      }
    },
  );
}
