# Screenshot Blank Image Detection

## Completed

- Extended TestAgent artifact verification from PNG structure checks into conservative pixel-content checks.
- `--verify-artifacts` now adds a `screenshot_png_content` item for local `.png` screenshot artifacts.
- The verifier:
  - inflates PNG `IDAT` data
  - reverses PNG scanline filters `0` through `4`
  - supports 8-bit grayscale, RGB, grayscale-alpha, and RGBA PNG screenshots
  - records `imageUniqueColors` and `imageBlank`
  - fails screenshots that are completely single-color across at least 16 pixels
- Very small images, such as 1x1 MCP screenshot payloads, are skipped for blank-image detection rather than failed.
- Non-PNG screenshot fallbacks remain skipped, preserving compatibility with MCP metadata captures.
- Added the capability flag:
  - `screenshot_blank_image_detection`
- Did not modify group chat or collaboration code.

## Files

- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/self-test.ts`
- `backend/test-agent/agent-profile.ts`

## Validation

- Independent TypeScript compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted self-test expanded:
  - `runTestAgentMcpScreenshotArtifactSelfTest()`
  - real 1x1 MCP PNG still passes structure validation and skips blank-image detection
  - a valid 4x4 solid-white PNG with refreshed manifest integrity fails on `screenshot_png_content`
  - non-PNG screenshot content still fails on `Invalid PNG signature`
- Full TestAgent self-test matrix passed:
  - 32 passed
  - 0 failed
  - included real Playwright browser verification
  - included standalone CLI real web verification
  - included standalone handoff real web verification

## Remaining

- This is a conservative blank/single-color detector, not full visual QA.
- Later work can add richer image heuristics such as near-blank thresholds, text/OCR checks, or viewport-specific screenshot expectations.
