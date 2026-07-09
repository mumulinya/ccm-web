# TestAgent Browser Provider Summary

## Goal

Make browser provider selection machine-readable for the future group/main-agent handoff. Preflight details were already captured in metadata and markdown, but downstream consumers still had to infer which provider was available, selected, attempted, or blocked.

## Changes

- Added `backend/test-agent/browser/provider-summary.ts`.
- Added `browserProviderSummary` to TestAgent reports and verdicts.
- Added browser provider summary formatting to CLI report summaries.
- Added `## Browser Provider Summary` to markdown reports.
- Added contract schema support for `browserProviderSummary`.
- Added artifact-verifier consistency checks so verdict provider summary must match the report.
- Exported `buildBrowserProviderSummary` and `formatBrowserProviderSummaryLine` from `backend/test-agent/index.ts`.
- Extended `runTestAgentBrowserPreflightSelfTest` to verify report, verdict, CLI, markdown, and contract propagation.

## Behavior

The summary includes:

- preferred provider,
- status: `not_required`, `provider_none`, `ready`, `used`, `blocked`, or `unavailable`,
- selected provider,
- available providers,
- attempted providers,
- whether fallback was used,
- per-provider availability, selection, attempt flag, result counts, reason, tools, and diagnostics.

This gives a coordinator enough evidence to distinguish:

- browser verification was not needed,
- browser verification was disabled,
- providers were available but not used,
- a provider actually ran checks,
- all browser providers were blocked or unavailable,
- fallback from a preferred provider happened.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- `runTestAgentBrowserPreflightSelfTest`

## Follow-Up

- Later group-chat integration can read `verdict.browserProviderSummary` instead of parsing markdown or metadata.
- If `status` is `blocked` or `unavailable`, the main agent can route the issue as environment/provider setup rather than product-code rework.
