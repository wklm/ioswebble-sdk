# Swift Best Practices

## MUST

- Uppercase UUID strings for all handler/cache keys — `uuid.uppercased()`, never `uuid.lowercased()`
- Use array-based continuation stores (`ContinuationList<T>`, `ContinuationMap<T>`) for async BLE ops
- Resume continuations outside the `Mutex.withLock` closure
- Validate all message parameters before processing
- Enforce `postMessage` origin checks (no `'*'`)
- Use Xcode MCP tools for Swift file mutations (keeps `pbxproj` in sync)
- Call `XcodeListWindows` before any other Xcode MCP tool
- Follow Apple Swift style conventions

## MUST NOT

- Never expose raw `CBPeripheral`/`CBCharacteristic`/`CBDescriptor`/`CBService` to web context
- Never use a single `CheckedContinuation` variable — concurrent callers overwrite
- Never resume continuations inside a `Mutex.withLock` closure
- Never edit Swift files with filesystem tools

## Annotations

Document non-obvious decisions:
- `// AIDEV-NOTE:` — general implementation note
- `// AIDEV-NOTE: SPEC-AMBIGUITY —` — beacio spec interpretation
- `// AIDEV-NOTE: SECURITY —` — security-critical rationale
- `// AIDEV-NOTE: PERF —` — performance-sensitive trade-off

→ Full source: `AGENTS.md`
