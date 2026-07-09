# TestAgent Browser Check Source Metadata

## Goal

Make generated browser checks traceable back to the acceptance criteria that created them. The group/main agent should not need to infer why a browser check exists from its name or probe type alone.

## Changes

- Added `context` to `BrowserCheckResult`.
- Preserved `BrowserCheckSpec.context` through Playwright and MCP browser providers.
- Preserved explicit browser-check `context` during work-order normalization.
- Added source metadata to generated acceptance browser checks:
  - auto target-url smoke,
  - acceptance path smoke,
  - click flow,
  - form flow,
  - upload flow,
  - download flow,
  - responsive viewport flow.
- Added browser source details to evidence summaries and markdown browser details.
- Added browser result context into acceptance coverage matching haystacks.
- Extended `runTestAgentAcceptanceClickFlowSelfTest` to verify source propagation.

## Behavior

Generated checks now include context like:

```json
{
  "source": "acceptance_criteria",
  "generatedBy": "acceptance_click_flow",
  "acceptanceCriteria": [
    "At /menu, click \"Open settings\", then shows \"Settings panel ready\"."
  ]
}
```

The context is available on:

- `BrowserCheckSpec.context` before execution,
- `BrowserCheckResult.context` after execution,
- browser evidence detail lines,
- markdown `Browser Details`,
- acceptance coverage matching input.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- `runTestAgentAcceptanceClickFlowSelfTest`

The self-test verifies that the generated click check, Playwright browser result, evidence lines, and markdown report all retain the acceptance criterion source.

## Follow-Up

- Future group-chat integration can route browser failures by reading `report.browserResults[].context.acceptanceCriteria`.
- If needed, add a compact provider-agnostic source summary to verdict JSON for browser checks without including full browser result payloads.
