# Message Flow

```
Web Page (injected.js) ↔ Content Script (content.js) ↔ Background (background.js) ↔ Native Extension (Swift)
```

- **Injected** (`injected.js`): WebBluetooth API surface (`navigator.bluetooth`), device discovery, GATT ops, MessageChannel to content
- **Content** (`content.js`): Bridge injected↔background, device selection UI, tab state
- **Background** (`background.js`): Persistent connections, message routing, event pump for async notifications
- **Native** (`SafariWebExtensionHandler.swift`): CoreBluetooth interface, BLE scanning/connection/GATT

Protocol: TypeScript-typed `BeacioMessageType` enum with JSON payloads.

## Thin JS Shell + Fat Native

Native Swift is the single source of truth for all BLE state, validation, UUID canonicalization, and error handling. JS API classes (`injected-full.ts`) are thin message-forwarding proxies — they hold no local state and perform no validation.

Key native capabilities:
- Batch GATT operations: `GET_FULL_GATT_TREE`, `GET_SERVICE_WITH_CHARACTERISTICS`
- Connection state persistence: `BLEManager.swift` saves connected device UUIDs to App Group UserDefaults
- Event pump: Fixed 500ms JS polling interval; native `pollAgain` flag for immediate re-poll

→ Full source: `AGENTS.md`
