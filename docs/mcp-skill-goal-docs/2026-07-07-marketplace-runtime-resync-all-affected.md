# Marketplace Runtime Resync All Affected Snapshots

## Why

Marketplace install, update, and uninstall operations can affect runtime snapshots for more reasons than catalog revision drift.

Before this change, automatic marketplace runtime resync passed `staleOnly: true` into `resyncRecentRuntimeToolSnapshots`. That covered catalog-stale snapshots, but could skip snapshots that were catalog-fresh while still blocked by dispatch readiness or delivery readiness. In the CCM MCP/Skill chain, that is too weak: after a marketplace change, every affected child-agent snapshot should be eligible for refresh so Claude Code, Cursor, Codex, and other project agents do not keep a blocked or partially delivered tool state.

## What Changed

- Marketplace runtime impact now probes readiness against the same catalog loaded from the marketplace store.
- Marketplace automatic runtime resync now passes `staleOnly: false`, while still limiting work to the affected `snapshotIds` from `runtimeImpact`.
- The marketplace E2E self-test now includes a catalog-fresh snapshot whose authorization readiness blocks dispatch.
- The self-test verifies that this non-stale but dispatch-blocked snapshot is resynced instead of skipped.
- The long-running docs policy remains active: every future MCP/Skill or marketplace capability upgrade must add its own `docs/<folder>/<md>` record.

## Affected Files

- `backend/modules/tools/marketplace.ts`
  - `buildMarketplaceRuntimeImpact`
  - `maybeAutoResyncMarketplaceRuntime`
  - `runMarketplaceInstallE2ESelfTest`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`
- `npm run check`

## Risks And Notes

- Auto resync can now do more work for affected snapshots, but the selection is still constrained by the marketplace impact snapshot IDs and the existing limit cap.
- The change intentionally does not resync unrelated recent runtime audits.
- Dispatch readiness after resync still depends on the current authorization catalog and tool manager state; this change guarantees affected blocked snapshots are retried, not that an invalid authorization magically becomes valid.
