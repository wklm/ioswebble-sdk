# AIDEV-NOTE Annotation Policy

Signal non-obvious decisions to future readers with four tiers:

- `// AIDEV-NOTE:` — general implementation note
- `// AIDEV-NOTE: SPEC-AMBIGUITY —` — beacio spec interpretation decision
- `// AIDEV-NOTE: SECURITY —` — security-critical rationale
- `// AIDEV-NOTE: PERF —` — performance-sensitive trade-off

Place annotations above the relevant code block. Use sparingly — only for decisions a future maintainer would otherwise question.

→ Full source: `AGENTS.md`
