# Claude Plugin Marketplace Import

## Background

CCM already supports its own marketplace catalog format, direct `SKILL.md` URLs, GitHub Skill packages, and Smithery MCP servers.

Claude Code uses a plugin marketplace format with a top-level `plugins` array. Each plugin can declare:

- `source`
- `skills`
- `mcpServers`
- plugin metadata such as `name`, `description`, and `version`

For CCM, importing a whole Claude plugin would also import commands, agents, hooks, and other behavior outside CCM's group/project MCP/Skill authorization model. The safer path is to convert only the parts CCM can govern.

## What Changed

`backend/modules/tools/marketplace.ts` can now read Claude plugin marketplace JSON and convert supported parts into CCM marketplace items.

Supported conversion:

- Inline `plugins[].mcpServers` records become CCM `mcp` marketplace items.
- `plugins[].skills` paths become CCM `skill` marketplace items when the plugin source can be resolved to a GitHub package path.
- Relative plugin sources are resolved against GitHub-hosted marketplace JSON URLs, including `raw.githubusercontent.com/.../marketplace.json`.
- GitHub default branch paths use `tree/HEAD/...`; installer treats `HEAD` as "use repository default branch" instead of passing it as `git clone --branch HEAD`.

Unsupported/plugin-only behavior is intentionally not imported:

- commands
- agents
- hooks
- output styles
- arbitrary plugin manifests
- non-inline MCP references such as relative `.mcp.json`, `.mcpb`, or `.dxt`

Those can be added later only if they can be mapped into CCM's authorization and runtime sync model without expanding permissions.

## Permission Boundary

Converted resources enter the existing CCM flow:

1. Marketplace item preview/install.
2. Central MCP/Skill catalog persistence.
3. Group/project authorization.
4. Runtime sync into Claude Code, Cursor, Codex, and other supported child agents.

The conversion does not make a Claude plugin globally active and does not bypass CCM authorization.

## Test Coverage

`npm run test:runtime-tools` now verifies that a Claude marketplace fixture:

- Converts an inline MCP server into a CCM MCP item.
- Converts a relative Skill path into a GitHub Skill package URL.
- Preserves community/custom source trust instead of allowing external catalogs to claim official trust.
- Keeps installed resources flowing into authorization options through the existing marketplace E2E.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```
