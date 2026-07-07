# Marketplace Update API And Operation Audit

## Background

The marketplace already supported installing and uninstalling MCP/Skill packages, and the UI could show an "update" action when a catalog version was newer than the installed record.

Before this change, updates reused the install endpoint. That worked as an overwrite path, but it left two gaps:

- external callers had no explicit update API that could reject "update before install";
- install, update, and uninstall operations were not recorded in one audit stream.

## What Changed

Backend:

- Added `/api/marketplace/update`.
- `installMarketplaceItemWithStore()` now supports `install` and `update` modes.
- Explicit update rejects items that do not already have an installation record.
- Install overwrite now returns `action: "update"` when an existing installation record is replaced.
- Install, update, and uninstall append safe operation entries to `~/.cc-connect/marketplace/operations.jsonl`.
- Operation audit records avoid MCP commands, environment values, and Skill prompt bodies.

Frontend:

- Marketplace "更新" actions now call `toolsApi.marketplace.update()`.
- First install actions continue to call `toolsApi.marketplace.install()`.

## Verification Coverage

`runMarketplaceInstallE2ESelfTest()` now verifies:

- explicit update fails before first install;
- install persists MCP and Skill package records;
- update persists the new version and updated package content;
- runtime sync consumes the updated Skill package;
- operation audit records install, update, and uninstall without leaking install secrets;
- uninstall removes catalog entries, managed Skill package directories, and installation records.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run build:frontend
npm run check
```
