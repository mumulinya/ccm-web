# Runtime Native MCP Tool Scope

## Background

CCM supports MCP grants at both server scope and tool scope:

- `server`
- `server/tool`
- `server/*`

Before this update, runtime sync selected MCP servers by grant server name and wrote the whole server into Claude Code, Cursor, Codex, Gemini, or Qoder native MCP configuration. That was safe for full-server grants, but it could overexpose tools when a group or project only authorized one MCP subtool.

Example:

- Authorized grant: `filesystem/list_directory`
- Unsafe native outcome: the child agent can see the entire `filesystem` MCP server

The CCM proxy executor already rejects unauthorized MCP calls, but native MCP configuration needed the same fail-closed behavior.

## Change

`backend/tools/runtime-tool-sync.ts` now distinguishes native-safe grants from proxy-enforced grants:

- Full server grants, such as `search` or `search/*`, are written into native MCP config.
- Tool-level grants, such as `payments/createInvoice`, are not written into native MCP config.
- Tool-level grants are marked as `proxy_only` in `mcp_statuses`.
- Tool-level grants still produce exact permission rules such as `mcp__ccm__payments__createInvoice`.
- Runtime prompts now tell child agents that tool-level MCP grants must use the CCM proxy execution protocol.

This keeps child agents able to use authorized subtools while preventing native runtime discovery of unauthorized tools from the same MCP server.

## Audit Shape

Native server grant:

```json
{
  "name": "search",
  "serverName": "ccm__search",
  "state": "synced",
  "delivery": "native",
  "grants": ["search"],
  "tools": []
}
```

Tool-level grant:

```json
{
  "name": "payments",
  "serverName": "ccm__payments",
  "state": "proxy_only",
  "delivery": "proxy",
  "grants": ["payments/createInvoice"],
  "tools": ["createInvoice"]
}
```

## Readiness

Runtime readiness now validates native MCP lists only for `state: "synced"` MCP servers. `proxy_only` MCP grants are treated as delivered through CCM's proxy channel and are not expected to appear in Codex or other native MCP lists.

This avoids false negatives for intentionally filtered tool-level grants.

## User-Facing Summary

Runtime task events now report MCP delivery as separate counts:

- Native MCP
- Proxy MCP
- Skill

This avoids describing proxy-only MCP grants as native MCP sync.

## Verification

The runtime self-test now checks:

- Tool-scoped MCP grants remain proxy-only.
- Full-server MCP grants can use native MCP config.
- Grant matching preserves `server/tool` records.
- Audit helpers distinguish native and proxy-only MCP delivery.

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```
