# Screenshot Artifact PNG Validation

## Completed

- Extended TestAgent artifact verification with screenshot structure checks.
- `--verify-artifacts` now adds a `screenshot_png_metadata` item for manifest entries with type `screenshot`.
- Local `.png` screenshots are checked for:
  - valid PNG signature
  - first chunk is `IHDR`
  - positive width and height
  - at least one `IDAT` chunk
  - `IEND` chunk
- Verification output records:
  - `imageFormat`
  - `imageWidth`
  - `imageHeight`
- Non-PNG screenshot fallbacks, such as MCP `.capture.json` or `.capture.txt` metadata, are skipped rather than failed.
- Added the capability flag:
  - `screenshot_artifact_png_validation`
- Did not modify group chat or collaboration code.

## Files

- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/self-test.ts`
- `backend/test-agent/agent-profile.ts`

## Validation

- Independent TypeScript compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted self-test passed:
  - `runTestAgentMcpScreenshotArtifactSelfTest()`
  - generated a real 1x1 PNG from an MCP screenshot payload
  - verified `screenshot_png_metadata` reports width `1` and height `1`
  - replaced the screenshot with non-PNG content, refreshed manifest integrity, and confirmed verification failed on `Invalid PNG signature`

## Remaining

- This validates screenshot file structure; pixel-level blank/single-color detection is covered separately by `2026-07-08-screenshot-blank-image-detection.md`.
- Later visual QA can add domain-specific screenshot assertions when the project needs it.
