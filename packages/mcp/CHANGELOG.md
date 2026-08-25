# Changelog

All notable changes to `@beacio/mcp` will be documented in this file.

## 2.1.0 — 2026-08-25

- Version aligned with App Store / Safari extension **2.1.0** — every `@beacio/*` package now versions in lockstep with the app release.
- `@beacio/core` dependency range moves to `^2.1.0`.
- Registry descriptors (`packages/mcp/server.json` and both `docs/distribution/*/mcp-registry/server-manifest.json`) now agree on 2.1.0. `packages/mcp/server.json` had been stranded at 2.0.0 because `verify-version-sync.sh` did not cover it; it does now, both the server `version` and `packages[0].version`.
- No MCP tool or resource surface change relative to 2.0.0.

## 2.0.0 — 2026-06-16

- BREAKING (MCP resource URIs): the resource URI scheme was renamed `ioswebble://` → `beacio://`. Every exposed resource now resolves under the `beacio://` scheme (`beacio://docs/quickstart`, `beacio://docs/api`, `beacio://profiles`, `beacio://uuids`, `beacio://errors`, `beacio://schema`, `beacio://changelog`). Update any cached resource URIs to the new scheme.
- The server identity (`com.beacio/mcp`) and the npm package name (`@beacio/mcp`) are unchanged — only the resource scheme moved. The rename has no shim: there are no consumers reading these URIs, so no dual-export or migration handler is provided.
