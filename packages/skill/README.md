# @ios-web-bluetooth/skill

Claude Skill metadata package for [WebBLE](https://ioswebble.com). Ships a single `SKILL.md` with agent-facing frontmatter so Claude Code, Cursor, Copilot, and any other skill-aware coding agent can discover WebBLE when a user prompt mentions `bluetooth`, `ios`, `safari`, `ble`, `web-bluetooth`, or `requestDevice`. Install this package if you manage agent skills for a team and want "add Web Bluetooth to my iOS web app" to route to WebBLE automatically.

- No runtime code — the package only publishes `SKILL.md`.
- Keyword-matched frontmatter tuned for iOS Safari + Web Bluetooth prompts.
- Points agents at `@ios-web-bluetooth/core`, `@ios-web-bluetooth/detect`, and the MCP server.

## Install

```bash
npm install @ios-web-bluetooth/skill
```

Agents resolve the file at `node_modules/@ios-web-bluetooth/skill/SKILL.md`.

## Quick usage

There is no runtime surface. Agents read `SKILL.md` directly. Manually inspect it to confirm your agent host is picking it up:

```bash
cat node_modules/@ios-web-bluetooth/skill/SKILL.md
```

Typical agent flow:

1. User asks *"add Bluetooth support to my iOS web app"*.
2. Agent matches keywords in `SKILL.md` frontmatter (`bluetooth`, `ios`, `safari`, `web-bluetooth`).
3. Agent follows the skill's steps — install `@ios-web-bluetooth/core` and `@ios-web-bluetooth/detect`, add the polyfill import, verify with `npx @ios-web-bluetooth/cli check`.

## When to use this vs. the MCP server

| You want… | Use |
|---|---|
| Agents that auto-discover WebBLE from a prompt (Claude Code, Cursor) | `@ios-web-bluetooth/skill` (this package) |
| Tool-based agent access with install plans, examples, spec citations | `@ios-web-bluetooth/mcp` (run `npx -y @ios-web-bluetooth/mcp`) |
| Both at once | Install this package **and** run the MCP server — they complement each other |

## Which package do I install?

| You need… | Install |
|---|---|
| Agent skill metadata (this package) | `@ios-web-bluetooth/skill` |
| Tool-based MCP access for agents | `npx -y @ios-web-bluetooth/mcp` |
| Plain BLE at runtime | `@ios-web-bluetooth/core` |
| React hooks for BLE | `+ @ios-web-bluetooth/react` |
| Typed profiles | `+ @ios-web-bluetooth/profiles` |
| iOS Safari extension detection | `@ios-web-bluetooth/detect` |
| Mock BLE for unit tests | `@ios-web-bluetooth/testing` |

Decision tree: [repo README](https://github.com/wklm/WebBLE-Safari-Extension#readme) · [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Links

- Homepage: <https://ioswebble.com>
- Docs (machine-readable): <https://ioswebble.com/docs-md/>
- Full LLM corpus: <https://ioswebble.com/llms-full.txt>
- Source: <https://github.com/wklm/WebBLE-Safari-Extension/tree/main/packages/skill>
- Issues: <https://github.com/wklm/WebBLE-Safari-Extension/issues>

## License

MIT © wklm. Published under `@ios-web-bluetooth/skill` on npm (`publishConfig.access = public`).
