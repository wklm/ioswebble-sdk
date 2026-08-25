# Xcode MCP Tools

17 MCP tools for interacting with Xcode. Always call `XcodeListWindows` first.

## Project Structure
- `XcodeListWindows` — Get workspace tab identifiers (required by all other tools)
- `XcodeLS` — List project structure
- `XcodeGlob` — Find files by pattern
- `XcodeGrep` — Search file contents

## File Operations
- `XcodeRead` — Read Swift files
- `XcodeUpdate` — Edit Swift files (find/replace)
- `XcodeWrite` — Create/overwrite files + auto-add to project
- `XcodeRM` — Remove files from project + filesystem
- `XcodeMV` — Move/rename files
- `XcodeMakeDir` — Create groups/directories

## Build & Diagnostics
- `BuildProject` — Build active scheme
- `GetBuildLog` — Get build log with severity filtering
- `XcodeListNavigatorIssues` — List errors/warnings
- `XcodeRefreshCodeIssuesInFile` — Compiler diagnostics

## Testing
- `RunAllTests` — All tests from active test plan
- `RunSomeTests` — Specific tests
- `GetTestList` — Discover available tests

## Preview & Docs
- `RenderPreview` — SwiftUI #Preview snapshot
- `ExecuteSnippet` — Run code in file context
- `DocumentationSearch` — Search Apple developer docs

## Rules
1. Xcode tools for Swift, filesystem tools for TS/JS
2. File mutations through Xcode tools (keeps pbxproj in sync)
3. BuildProject + GetBuildLog for builds
4. RunAllTests / RunSomeTests for tests
5. RenderPreview for SwiftUI views

→ Full source: `AGENTS.md`
