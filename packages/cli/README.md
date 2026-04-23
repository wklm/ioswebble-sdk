# @ios-web-bluetooth/cli

Command-line scaffolder that wires [WebBLE](https://ioswebble.com) into an existing web project — detects the framework (Next.js App Router / Pages Router, Vite + React, CRA, Vue, Nuxt, plain HTML), installs the right packages, and injects the canonical `@ios-web-bluetooth/detect` snippet into the correct entry file. Install this package if you want a one-shot "add Web Bluetooth to my existing web app" command.

- Binary: `ioswebble` (also usable via `npx @ios-web-bluetooth/cli`).
- Commands: `init` (scaffold), `check` (verify integration).
- Auto-detects framework and entry file; respects explicit overrides.

## Install

```bash
npx @ios-web-bluetooth/cli init
```

Or install globally:

```bash
npm install -g @ios-web-bluetooth/cli
```

The published `bin` is `ioswebble`.

## Quick usage

```bash
# Auto-detect framework, add the detection snippet
npx @ios-web-bluetooth/cli init

# Specify API key and framework explicitly
npx @ios-web-bluetooth/cli init --key wbl_xxxxx --framework react

# Verify the integration is wired correctly
npx @ios-web-bluetooth/cli check
```

## Commands

| Command | Description |
|---|---|
| `init` | Detect framework (Next.js App/Pages Router, Vite+React, CRA, Vue, Nuxt, HTML) and inject the `@ios-web-bluetooth/detect` snippet into your entry file. |
| `check` | Verify the integration — entry file imports the polyfill, the detect snippet is present, and the API key is valid if supplied. |

## Options

```
--key <api-key>       Optional API key for campaign tracking
--framework <name>    Override auto-detection
                      (nextjs-app, nextjs-pages, react-vite, react-cra, vue, nuxt, html)
--help, -h            Show help
--version, -v         Show version
```

## Safari iOS constraints (read before shipping)

This CLI only wires packages into your project — it does not change the runtime contract. When your app ships to iOS Safari users, the code it generates still has to respect:

- `requestDevice()` **must be called from a user gesture** (click/tap handler). Never from `useEffect`, `setTimeout`, `DOMContentLoaded`, or page load — Safari iOS throws `SecurityError`.
- No persistent pairing — each page load starts fresh.
- BLE is blocked in cross-origin iframes. Keep BLE code in the top-level frame only.
- Web Bluetooth **does** work on iOS Safari with `@ios-web-bluetooth/core` installed.

These constraints are extracted from [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Which package do I install?

| You need… | Install |
|---|---|
| Scaffold an existing project (this CLI) | `npx @ios-web-bluetooth/cli init` |
| Plain BLE at runtime | `@ios-web-bluetooth/core` |
| React hooks for BLE | `+ @ios-web-bluetooth/react` |
| Typed device profiles | `+ @ios-web-bluetooth/profiles` |
| iOS Safari extension detection banner | `@ios-web-bluetooth/detect` |
| Mock BLE for unit tests | `@ios-web-bluetooth/testing` |
| MCP server for coding agents | `npx -y @ios-web-bluetooth/mcp` |

Decision tree: [repo README](https://github.com/wklm/WebBLE-Safari-Extension#readme) · [`packages/AGENTS.md`](https://github.com/wklm/WebBLE-Safari-Extension/blob/main/packages/AGENTS.md).

## Links

- Homepage: <https://ioswebble.com>
- Docs (machine-readable): <https://ioswebble.com/docs-md/>
- Quickstarts (HTML, React, Vue, Svelte, Angular, Next.js): <https://ioswebble.com/docs-md/>
- Source: <https://github.com/wklm/WebBLE-Safari-Extension/tree/main/packages/cli>
- Issues: <https://github.com/wklm/WebBLE-Safari-Extension/issues>

## License

MIT © wklm. Published under `@ios-web-bluetooth/cli` on npm (`publishConfig.access = public`).
