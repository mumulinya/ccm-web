# Unified MCP and Skill Control Center v2

Date: 2026-07-14

## Goal

Upgrade the tool configuration page from a catalog/documentation screen into an operational control center that can safely manage MCP and Skill configuration, show accurate project/group readiness, and prove real third-party Agent invocation.

## User-facing behavior

- The default screen is now **运行概况**, not the static built-in tool handbook.
- The overview separates configured scopes, verified scopes, MCP connectivity, and business runtime readiness.
- Unconfigured projects/groups and unscoped diagnostic snapshots no longer inflate the user-facing ready count.
- Technical runtime totals and historical diagnostics remain available under technical details and dedicated views.
- MCP servers can be created and edited in one editor with pre-save connection testing.
- Existing environment values are never returned to the browser. The editor only shows configured key names.
- Create, edit, toggle, and delete operations run impact analysis, reload the tool manager, resync affected runtimes, and restore the previous configuration when reloading fails.
- Skill handbooks only create links for HTTP/HTTPS URLs and always use `noopener noreferrer`.
- Closed Skill drawers are removed from the accessibility tree.

## Credential model

MCP environment variables are normalized into a structured map and stored as `ccm-secret://` references backed by the local AES-256-GCM credential store. `/api/mcp` returns a browser-safe display model with:

- redacted command and arguments
- `envConfigured`
- environment key names in `envKeys`
- no environment values

The bundled `mcp-feishu` configuration now replaces marketplace placeholder credentials with the Feishu application configured in Settings, then saves the values back as MCP-specific encrypted references. Settings remains the single user configuration entry.

## Runtime accuracy fixes

- Runtime summaries select the latest snapshot per business target.
- Unscoped test/diagnostic snapshots are collapsed by runtime instead of appearing as dozens of independent business rows.
- Missing-snapshot recovery ignores unscoped evidence when deciding whether a project/group already has a runtime snapshot.
- Snapshot-targeted resync scans a wider audit window so older business snapshots remain actionable after extensive self-tests.

## Real closure evidence

Production instance: `http://127.0.0.1:3082`

- MCP servers connected: 3/3
- Configured scopes: 3
- Verified scopes: 3/3
- Business runtime snapshots ready: 4/4
- Goal completion audit: 7/7 proven, `complete=true`
- Real read-only `mcp-feishu/list_chats` invocation succeeded for:
  - project `nova-erp-server`
  - project `smart-live-Cloud`
  - group `gmps7ha15` (智评生活开发群)
- Group `gmps7ha15` also invoked its two authorized Skills successfully.

## Component boundaries

- `ToolControlOverview.vue`: user-facing health summary and next actions
- `McpServerEditor.vue`: MCP edit, impact preview, pre-save test, and save lifecycle
- `SkillMarkdownViewer.vue`: safe Skill handbook rendering
- `ToolsConfig.vue`: page orchestration, authorization, verification, audit, runtime, and marketplace surfaces

These components were split by independent business responsibility, not by file length alone.

## Verification

- `npx tsc -p backend/tsconfig.json --noEmit`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/tools-config-production-selftest.mjs`
- `node scripts/runtime-tool-fabric-selftest.mjs`
- `node scripts/tools-config-live-scope-verification.mjs`
- `node scripts/tools-config-render-regression.mjs`

The final whole-workspace `npm run check` rerun is currently blocked by two concurrent, out-of-scope type errors in `backend/modules/collaboration/group-memory-index.ts` (`postCompactUsageArchive` on a union at lines 21099 and 21111). The tool-control backend passed its TypeScript no-emit check and backend build before those parallel changes landed; all tool-specific production and runtime self-tests listed above pass against the current source/build.

Playwright evidence:

- [desktop overview](evidence/tool-control-center-2026-07-14/desktop-overview.png)
- [desktop MCP editor](evidence/tool-control-center-2026-07-14/desktop-mcp-editor.png)
- [mobile overview](evidence/tool-control-center-2026-07-14/mobile-overview.png)
- [render report](evidence/tool-control-center-2026-07-14/report.json)

The render regression asserts no horizontal overflow on desktop/mobile, technical details default closed, 3/3 verified scopes, 7/7 goal completion, and that the MCP editor receives key names but no credential values.
