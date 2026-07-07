# Marketplace Authorization Bridge

## Background

CCM's marketplace can install MCP servers and Skills into the central tool catalog. The next requirement is that installed marketplace resources immediately become selectable in group/project authorization and then flow into runtime sync.

This update strengthens that bridge with shared install-record builders and self-test coverage.

## What Changed

`backend/modules/tools/marketplace.ts` now builds marketplace install artifacts through reusable helpers:

- `buildMarketplaceMcpToolRecord`
- `buildMarketplaceSkillRecord`
- `buildMarketplaceInstallationRecord`

The production install path still saves MCP records with `saveMcpTool(...)`, Skill records with `saveSkill(...)`, records installation metadata, and reloads `toolManager`.

The same artifact shape is now used by `runMarketplaceSelfTest()` to verify the installed resources are valid authorization candidates.

## Covered Chain

The marketplace self-test now simulates installed marketplace resources:

- MCP: `github-search`
- MCP subtool from runtime status: `github-search/searchRepos`
- Skill: `market-release-notes`

It then calls `buildToolAuthorizationOptions(...)` and verifies:

- The installed MCP appears as an authorization grant.
- The discovered MCP subtool appears as a child grant.
- The installed Skill appears as a Skill grant and `skill:<name>` tool.
- Marketplace metadata is preserved for UI provenance.
- Runtime-sensitive fields such as MCP command, env, and Skill prompt do not leak into authorization options.
- Installation records use stable keys such as `mcp:github-search`.

## Why It Matters

This protects the marketplace-to-runtime path:

1. External marketplace item is normalized.
2. Install artifact enters CCM's central MCP/Skill catalog.
3. Authorization options expose only safe selection metadata.
4. Group/project selection can grant the installed resource.
5. Runtime sync consumes the same central catalog for child-agent delivery.

The runtime sync E2E self-test separately verifies that a catalog-fed MCP/Skill selection generates the correct child-agent runtime files.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```

`npm run test:runtime-tools` now includes the expanded marketplace checks:

- `installedMcpEntersAuthorizationOptions`
- `installedSkillEntersAuthorizationOptions`
- `marketplaceMetadataPreservedForAuthorization`
- `authorizationOptionsHideInstallSecrets`
- `installationRecordUsesStableKey`
