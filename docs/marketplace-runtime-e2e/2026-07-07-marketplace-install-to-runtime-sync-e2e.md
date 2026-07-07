# Marketplace Install To Runtime Sync E2E

## Background

CCM's marketplace, authorization, and runtime sync paths were covered by separate tests:

- Marketplace install/uninstall persisted MCP and Skill records.
- Authorization options listed installed resources.
- Runtime sync could consume package-backed Skills when given a synthetic catalog.

The missing proof was the complete installed-resource path:

1. Install MCP and Skill from the marketplace.
2. Load the installed catalog records.
3. Build authorization options from those records.
4. Sync those exact installed records into a child-agent runtime.

## What Changed

`backend/modules/tools/marketplace.ts` now runs a stronger install E2E self-test.

After installing a temporary marketplace MCP and Skill into a file-backed test store, the test calls `syncRuntimeToolsWithCatalog()` with the installed MCP/Skill records and a temporary runtime root.

Production behavior is unchanged. The runtime sync call is test-only and uses injected directories so it does not write to the user's real CCM catalog or runtime storage.

`backend/tools/runtime-tool-sync.ts` now exports `syncRuntimeToolsWithCatalog()` so integration tests can use the same runtime sync implementation that production uses internally.

## Covered Flow

The E2E now verifies:

- Installed MCP JSON is persisted.
- Installed Skill JSON is persisted.
- Installed Skill package is persisted under the test Skill package root.
- Installed MCP and Skill appear in authorization options.
- Installed MCP is written to Codex native MCP config.
- Installed Skill package is copied into the Codex runtime Skill root.
- Runtime snapshot records native MCP delivery.
- The Codex gateway secret is not persisted into runtime config.
- Uninstall removes catalog records, installation records, and the managed Skill package.

## Why It Matters

This closes the practical path the user expects:

Marketplace download -> central CCM catalog -> group/project authorization -> child-agent runtime delivery.

The test now proves that a marketplace-installed Skill does not merely appear in CCM's UI; it can become an actual runtime Skill package for a child agent.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```

`npm run test:runtime-tools` surfaces the new assertions through `marketplace.marketplaceInstallE2E`.
