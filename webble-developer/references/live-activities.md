# Live Activities

ActivityKit integration for Lock Screen and Dynamic Island widgets.

## Key Files

| File | Purpose |
|------|---------|
| `LiveActivityModels.swift` | Shared ActivityKit attributes and content-state models |
| `BLEMonitorLiveActivity.swift` | Lock Screen and Dynamic Island entry point |
| `DynamicIslandViews.swift` | Expanded, compact, minimal Dynamic Island views |
| `LiveActivityDesignTokens.swift` | Widget-specific color and spacing tokens |
| `BLELiveActivityBundle.swift` | Widget bundle root |

## Architecture
- `LiveActivityManager` — session lifecycle management with coalesced updates
- `LiveActivityStateEngine` — state machine that derives phases and content

## Mode Constraint
Live Activities are available ONLY in `.ipcRelay` mode. The Dynamic Island / Lock Screen state reflects companion-app-managed background monitoring. Standalone mode does not own the durable app-side monitoring lifecycle that ActivityKit needs.

→ Full source: `AGENTS.md`
