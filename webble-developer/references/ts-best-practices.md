# TypeScript Best Practices

## Thin Shell Pattern

JS API classes are thin message-forwarding proxies:
- Hold NO local BLE state
- Perform NO validation
- All state, validation, and UUID canonicalization lives in Swift

JS Shell files:
- `src/extension/injected-full.ts` — WebBluetooth API proxy
- `src/extension/content-full.ts` — content script bridge
- `src/extension/background-full.ts` — background script hub
- `src/extension/popup.ts` — toolbar popup logic

## Rules
- Use strict TypeScript, prefer type inference, avoid `any`
- Type messages with `BeacioMessage<T>` and `BeacioResponse<R>` generics
- Do NOT add new message types without handler in `TSProtocolHandler.swift`
- Maintain backward compatibility with existing WebBluetooth web apps
- Use `npm run build:production` for release builds (strips source maps, Terser)
- Never ship `.js.map` files in production

→ Full source: `AGENTS.md`
