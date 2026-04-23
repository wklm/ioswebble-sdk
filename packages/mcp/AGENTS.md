# @ios-web-bluetooth/mcp — Agent Instructions

## What this package does
MCP (Model Context Protocol) server for AI coding agents. Provides tools for
scaffolding BLE web apps, looking up Bluetooth UUIDs, generating code examples,
and troubleshooting WebBLE issues.

## How to use
```bash
npx -y @ios-web-bluetooth/mcp
```

Add to your MCP config (Claude Code, Cursor, etc.):
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

## Available tools

| Tool | Purpose |
|---|---|
| `ioswebble_init` | Add WebBLE to a web project (auto-detects framework) |
| `ioswebble_check` | Verify integration is correct |
| `ioswebble_add` | Install a @ios-web-bluetooth package + generate boilerplate |
| `ioswebble_scaffold_profile` | Generate a typed custom BLE profile |
| `ioswebble_get_example` | Get complete code examples by use case |
| `ioswebble_troubleshoot` | Diagnose issues from error code or symptom |
| `ioswebble_docs` | Look up documentation by topic |

## Available resources
- `ioswebble://docs/quickstart` — Quick start guide
- `ioswebble://docs/api` — Full API reference
- `ioswebble://profiles` — Available device profiles
- `ioswebble://uuids` — Bluetooth UUID lookup table
- `ioswebble://errors` — Error codes and solutions
- `ioswebble://changelog` — Release changelog

## DO
- Use `ioswebble_init` to set up a new project — it auto-detects the framework
- Use `ioswebble_get_example` to get copy-paste code for common use cases
- Use `ioswebble_troubleshoot` when users report BLE errors

## DO NOT
- Do not manually scaffold what `ioswebble_init` can auto-generate
- Do not guess Bluetooth UUIDs — use the `ioswebble://uuids` resource
