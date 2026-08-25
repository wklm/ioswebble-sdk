# Verification Loop

Every non-trivial change goes through five phases:

1. **Orient** — Read relevant source and AGENTS.md. List files that will change.
2. **Plan** — One-sentence goal, ordered steps, risks and trade-offs.
3. **Implement** — One logical change per commit. Add AIDEV-NOTE annotations.
4. **Verify** — End-to-end simulator verification (see below).
5. **Report** — Summarise changes, list remaining TODOs.

## Simulator Verification Steps

1. **Build** — `BuildProject` + `GetBuildLog` via Xcode MCP. Fallback: `xcodebuild … 2>&1 | xcsift -w`
2. **Install** — `xcrun simctl install <UDID> <app-path>` (silent success)
3. **Launch** — `xcrun simctl launch --terminate-running-process <UDID> <bundle-id>` (returns PID)
4. **UI tests** (optional) — `RunAllTests` / `RunSomeTests` via Xcode MCP
5. **Screenshot** — `xcrun simctl io <UDID> screenshot <path>.png` then `magick <path>.png -resize 33.333% <path>_1x.png`
6. **Inspect UI** — `axe describe-ui --udid <UDID>` → verify app PID present
7. **Interact** — `axe tap -x X -y Y --udid <UDID>` using 1x coordinates
8. **Check memory** — EventQueue ≤ 1000 events, peripherals ≤ 100

Always use `--terminate-running-process`. Without it, launch silently fails if app is already running.

→ Full source: `AGENTS.md` and `COMMANDS.md`
