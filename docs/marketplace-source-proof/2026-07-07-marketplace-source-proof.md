# Marketplace Source Proof

Date: 2026-07-07

## Why

CCM can already load external MCP / Skill marketplace sources, preview items, install/update/uninstall resources, and resync affected runtimes. The missing piece was a stable, sanitized proof object that explains what source material was previewed or installed without exposing secrets.

This matters because external catalogs are mutable. Operators need to inspect where a tool came from, what material shape was used, and which checksum/hash was recorded before that tool enters project/group authorization and child-agent runtime sync.

## Changes

- Added `ccm-marketplace-source-proof-v1`.
- `sourceProof` includes:
  - item id, type, name, version;
  - source id/label/kind/trust/url;
  - material kind such as `stdio_mcp`, `remote_mcp`, `inline_skill`, `downloaded_skill`, or `github_skill_package`;
  - stable `materialHash`;
  - install `checksum` when available;
  - env/header keys only, never values;
  - package file/byte counts for package-backed Skills.
- Marketplace preview now returns `preview.sourceProof`.
- Preview item echo is sanitized so env/header secret values are not returned by `/api/marketplace/preview`.
- Installation records now store `sourceProof`.
- Marketplace operation audit now records sanitized `sourceProof` for install/update/uninstall.
- Tools UI preview table now displays source proof fields.

## Affected Files

- `backend/modules/tools/marketplace.ts`
- `frontend/src/components/tools/ToolsConfig.vue`
- `docs/marketplace-source-proof/2026-07-07-marketplace-source-proof.md`

## Verification

- `npm run build:backend`: passed.
- `npm run build:frontend`: passed.
- `npm run check`: passed.
- `npm run test:runtime-tools`: passed, including marketplace checks:
  - `marketplacePreviewReturnsSourceProof`
  - `marketplaceInstallationRecordCarriesSourceProof`
  - `sourceProofHidesSecretValues`
  - `marketplacePreviewHidesSecretValues`
- Direct marketplace self-test key inspection confirmed `marketplacePreviewHidesSecretValues` is present.
- Temporary server smoke on port `3101`:
  - `POST /api/marketplace/preview` returned `preview.sourceProof.schema=ccm-marketplace-source-proof-v1`.
  - Returned `materialKind=stdio_mcp`.
  - Returned `envKeys=TOKEN`.
  - Did not leak submitted env value `secret-value`.

## Risks / Notes

- `sourceProof.materialHash` is intentionally based on sanitized material, so it proves the public install shape without hashing secret values.
- Install `checksum` may still change when install material includes timestamped records; use `materialHash` for stable source-shape comparison.
