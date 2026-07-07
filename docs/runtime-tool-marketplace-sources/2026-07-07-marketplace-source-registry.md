# Marketplace Source Registry Upgrade

Date: 2026-07-07

## Goal

Upgrade the CCM tool marketplace from one-off custom URL loading to persistent
external source management. CCM can now keep trusted external MCP/Skill catalog
sources and reuse them from the Tools marketplace UI.

## Backend Changes

- Added `~/.cc-connect/marketplace/sources.json` as the managed source registry.
- Added `GET /api/marketplace/sources` to list saved external sources.
- Added `POST /api/marketplace/sources` to validate, read, and save an external
  source.
- Added `POST /api/marketplace/sources/delete` to remove a saved source without
  uninstalling already installed MCP/Skill resources.
- Updated `GET /api/marketplace/list` so a saved source ID can be used directly
  as the marketplace source.

## Safety Rules

- Saved external sources must use HTTPS.
- URLs with embedded credentials are rejected by the existing remote-fetch
  safety path.
- Private, loopback, link-local, and localhost targets are rejected before
  network access.
- External sources cannot claim `official` trust; saved custom sources are
  either `custom` or `community`.
- Catalog JSON and direct `SKILL.md` sources are read once before saving so
  broken catalogs do not enter the registry.
- GitHub package sources are structurally validated when saved and their
  `SKILL.md` package contents are cloned and validated during installation.

## Frontend Changes

- The Tools marketplace source selector now shows saved external sources.
- The custom source row can load a URL once or save it as a reusable source.
- A saved source can be deleted from the selector without removing installed
  tools.
- The source URL display wraps safely on narrow screens and dark mode.

## Verification

- `runMarketplaceSelfTest()` now covers saved source ID stability, HTTPS
  rejection, community trust preservation, and official-trust downgrade.
- `npm run build:backend` passed.
- `npm run build:frontend` passed.
- `npm run test:runtime-tools` passed.
- `npm run check` passed.
- Validation server on port 3081 returned HTTP 200 for the root page.
- `GET /api/marketplace/sources` returned success.
- `GET /api/marketplace/list?source=local` returned four local marketplace
  entries.
- `POST /api/marketplace/sources` rejected an `http://` source with HTTP 400.
- `GET /api/tools/runtime-readiness?deep=0` reported 6 ready current snapshots
  out of 15 total records, with the remaining records retained as historical
  audit snapshots.
