# Artifact Verifier Verdict Consistency

## Completed

- Extended `--verify-artifacts` beyond file integrity checks.
- Added a semantic `verdict_consistency` verification item when an artifact manifest includes both:
  - `report_json`
  - `verdict_json`
- The verifier now checks that `verdict.json` matches `report.json` for:
  - report/work-order/task/group identifiers
  - status and recommendation
  - summary
  - `canAccept`, `needsRework`, `needsHuman`
  - failed/unknown required checks
  - failed/unknown acceptance criteria
  - core artifact paths
- The verifier also compares manifest metadata against the report so a mismatched manifest/report pair is rejected.
- Kept legacy compatibility:
  - manifests without `verdict_json` are skipped as legacy if the report does not reference a verdict artifact
  - manifests with a report that references `verdictJsonPath` but no `verdict_json` entry fail verification
- Did not modify group chat or collaboration code.

## Files

- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Independent TypeScript compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted artifact verifier self-test passed:
  - intact artifact manifest passes
  - tampered `verdict.json` with refreshed manifest sha256 fails only on `verdict_consistency`
  - tampered markdown report still fails on file size/integrity
- Full TestAgent self-test matrix passed:
  - 32 passed
  - 0 failed
  - included real Playwright browser verification
  - included standalone CLI real web verification
  - included standalone handoff real web verification

## Remaining

- When group-main-agent integration is ready, it can use `--verify-artifacts` before trusting `verdict.json`.
- A later integration step should define how the group main agent stores and displays failed `verdict_consistency` details.
