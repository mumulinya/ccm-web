# Trace Event Validation

## Completed

- Tightened `browser_trace` artifact verification beyond ZIP structure.
- `browser_trace_zip` now extracts the `trace.trace` ZIP entry when present.
- The verifier supports stored and deflated ZIP entries.
- The `trace.trace` payload is parsed as JSONL.
- Verification fails when:
  - `trace.trace` is missing
  - `trace.trace` contains no JSON events
  - any non-empty trace event line is not a JSON object
- Verification output now records:
  - `artifactEntries`
  - `artifactEvents`
  - `artifactFormat: zip:trace`
- Added the capability flag:
  - `browser_trace_event_validation`
- Did not modify group chat or collaboration code.

## Files

- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/self-test.ts`
- `backend/test-agent/agent-profile.ts`

## Validation

- Independent TypeScript compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted self-test expanded:
  - `runTestAgentBrowserEvidenceArtifactSelfTest()`
  - valid trace ZIP reports `artifactEvents: 1`
  - trace ZIP with empty `trace.trace` fails
  - empty trace ZIP still fails
- Full TestAgent self-test matrix passed:
  - 32 passed
  - 0 failed
  - included real Playwright browser verification
  - included standalone CLI real web verification
  - included standalone handoff real web verification

## Remaining

- This validates that trace events exist and are parseable JSON objects.
- It does not yet validate the full Playwright trace event schema or correlate trace events to TestAgent browser steps.
