# Runtime Sync E2E Self-Test

## Background

The runtime tool fabric needs more than helper-level coverage. CCM must prove that a group or project authorization snapshot can be converted into real child-agent runtime files without overexposing MCP tools.

This update adds an integration-style self-test for runtime sync while keeping production behavior unchanged.

## What Changed

`backend/tools/runtime-tool-sync.ts` now has an internal catalog-injected sync path used by self-tests:

- Production `syncRuntimeTools(...)` still loads MCP and Skill definitions from CCM's normal DB files.
- The self-test can inject an in-memory MCP/Skill catalog.
- The self-test can place strict runtime output under a temporary directory instead of `~/.cc-connect/agent-runtime`.

This avoids mutating the user's installed MCP/Skill catalog while still exercising real file generation.

## Covered Scenario

The new self-test simulates a Codex child agent with:

- MCP grant: `payments/createInvoice`
- MCP grant: `search`
- Skill grant: `release-notes`

It then verifies:

- Runtime sync succeeds without errors.
- `payments/createInvoice` is marked `proxy_only`.
- `ccm__payments` is not written to Codex native `config.toml`.
- `ccm__search` is written to Codex native `config.toml`.
- The exact permission rule `mcp__ccm__payments__createInvoice` is persisted.
- `release-notes` is written into Codex's managed Skill directory and registered in `[[skills.config]]`.
- The runtime snapshot persists both native and proxy delivery states.
- The Codex gateway secret is not written to `config.toml`.

## Why It Matters

This test directly protects the requirement that child agents can use authorized tools without gaining access to unauthorized MCP tools from the same server.

It also gives the marketplace and authorization UI a stronger safety net: after an external MCP or Skill is installed and selected for a group/project, runtime sync can be tested against actual generated runtime artifacts rather than only in-memory permission helpers.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```

`npm run test:runtime-tools` now includes `runtimeSync.runtimeSyncIntegration`.
