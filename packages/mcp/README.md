# @ios-web-bluetooth/mcp

MCP server for AI coding agents -- scaffold BLE web apps, verify integration, get code examples. Works with Claude Code, Cursor, Copilot, and any MCP-compatible client.

## Install

Add to your `claude_desktop_config.json` (or equivalent MCP config):

```json
{
  "mcpServers": {
    "ioswebble": {
      "command": "npx",
      "args": ["-y", "@ios-web-bluetooth/mcp"]
    }
  }
}
```

Or run directly:

```bash
npx -y @ios-web-bluetooth/mcp
```

## Tools

| Tool | Description |
|------|-------------|
| `ioswebble_init` | Add iOSWebBLE to a web project. Auto-detects framework (Next.js, React, Vue, Nuxt, HTML) and adds detection snippet. Accepts `projectPath`, optional `apiKey` and `framework`. |
| `ioswebble_check` | Verify iOSWebBLE is correctly integrated. Accepts `projectPath`. |

## Resources

- `ioswebble://status` -- server status
- `ioswebble://docs/integration` -- integration guide

## Full SDK reference

For LLM context: <https://ioswebble.com/llms-full.txt>

## Two scopes

The **`@ios-web-bluetooth/*`** packages (`core`, `profiles`, `react`) are the cross-browser BLE SDK -- they work on any platform with Web Bluetooth support (Chrome, Edge, iOS Safari via the extension). The **`@ios-web-bluetooth/*`** packages (`detect`, `cli`, `mcp`, `skill`) handle iOS-specific extension detection, install prompts, and agent tooling. Use both together for full iOS Safari coverage.
