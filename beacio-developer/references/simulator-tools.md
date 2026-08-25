# Simulator Verification Tools

Three external tools power the verification loop:

| Tool | Purpose | Key Flags |
|------|---------|-----------|
| `xcsift` | Parse xcodebuild output into structured JSON | `-w` for warnings |
| `axe` | Simulator UI automation | `describe-ui`, `tap -x -y`, `--udid` required |
| `magick` | Screenshot resize and annotation | `-resize 33.333%` for 3x→1x |

Install: `brew install xcsift cameroncooke/axe/axe imagemagick`

## Coordinate System
- Simulator captures at 3x retina resolution
- Always resize to 1x before reading coordinates
- Both `axe tap` and `axe describe-ui` use 1x point coordinates

## Crash Detection
If `axe describe-ui` returns only Springboard's PID, the app has crashed back to home screen.

## Output Directory
All screenshots and logs go to `DerivedData/tmp/`.

→ Full source: `AGENTS.md` and `COMMANDS.md`
