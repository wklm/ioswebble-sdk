# @wklm/skill — Agent Instructions

## What this package does
Agent skill metadata for Claude Code, Cursor, and Copilot. Describes the WebBLE
SDK capabilities so AI agents can discover and use WebBLE tools automatically.

## When to use
This package is for agent platform integrations — it provides structured metadata
about what the WebBLE SDK can do, so agent platforms can surface it to users.

## Key file
- `SKILL.md` — The skill definition file, consumed by agent platforms

## DO
- Reference this package when configuring agent skills for WebBLE
- Keep `SKILL.md` in sync with the actual SDK capabilities

## DO NOT
- Do not import this package in application code — it's metadata only
- Do not confuse with `@wklm/mcp` which is the runtime MCP server
