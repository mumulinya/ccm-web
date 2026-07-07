# Runtime Tool Catalog Revision And Stale Snapshot Gate

## Background

CCM now installs, updates, uninstalls, authorizes, and syncs MCP/Skill tools into child-agent runtimes. A remaining gap was runtime snapshot freshness.

Before this change, an old runtime snapshot could still look delivery-ready in diagnostics after an authorized MCP/Skill was updated or removed from the central catalog. New agent runs would resync, but readiness could not prove whether an existing snapshot was based on the current CCM tool catalog.

## What Changed

`backend/tools/runtime-tool-sync.ts` now computes a selected catalog revision for each runtime sync:

- the revision is scoped to the requested MCP servers and Skills;
- unrelated catalog changes do not invalidate a snapshot;
- MCP env, headers, and Skill bodies are not written into the snapshot;
- the revision is included in the authorization hash, runtime audit, and `runtime-tool-snapshot.json`;
- readiness compares the snapshot revision with the current catalog revision.

If a snapshot revision is missing or no longer matches the current catalog, `probeRuntimeToolReadiness()` adds a failed `catalog_revision` check and marks delivery as not ready. The next agent invocation will generate a fresh runtime snapshot.

## Why This Matters

This closes a practical stale-visibility gap:

- updated MCP/Skill packages force a new child-agent runtime snapshot;
- uninstalled or disabled tools make old snapshots visibly stale;
- diagnostics can distinguish "runtime files still exist" from "runtime files reflect current authorization";
- stale snapshots do not silently count as delivery-ready.

## Verification Coverage

`runRuntimeToolSyncIntegrationSelfTest()` now verifies:

- snapshots carry `catalogRevision`;
- readiness accepts the current revision;
- a simulated stale revision fails the `catalog_revision` check;
- stale revision blocks delivery readiness.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```
