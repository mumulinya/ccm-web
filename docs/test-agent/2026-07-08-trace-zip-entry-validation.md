# Trace ZIP Entry Validation

## Completed

- Tightened browser trace artifact verification.
- `browser_trace_zip` now scans the ZIP end-of-central-directory and central directory.
- Empty ZIP trace artifacts fail verification even when file integrity matches the manifest.
- Verification output now records:
  - `artifactEntries`
  - `artifactFormat: zip:trace` when a trace-like entry name is present
- Updated the browser evidence artifact self-test fixture from an empty ZIP to a minimal ZIP containing `trace.trace`.
- Added a tamper case that replaces the trace with an empty ZIP, refreshes manifest integrity, and confirms `--verify-artifacts` fails.
- Did not modify group chat or collaboration code.

## Files

- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Independent TypeScript compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted self-test passed:
  - `runTestAgentBrowserEvidenceArtifactSelfTest()`
  - valid trace ZIP reports `artifactEntries: 1`
  - empty trace ZIP fails with `Browser trace ZIP must contain at least one entry`
- Full TestAgent self-test matrix passed:
  - 32 passed
  - 0 failed
  - included real Playwright browser verification
  - included standalone CLI real web verification
  - included standalone handoff real web verification

## Remaining

- This validates trace ZIP structure and entry presence; parseable trace event validation is covered by `2026-07-08-trace-event-validation.md`.
- Later work can validate the full Playwright trace event schema or correlate trace events to TestAgent browser steps if orchestration needs deeper trace semantics.
