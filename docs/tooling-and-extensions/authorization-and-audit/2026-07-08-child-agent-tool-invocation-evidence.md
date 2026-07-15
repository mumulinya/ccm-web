# Child Agent Tool Invocation Evidence

## Background

The long-running CCM MCP/Skill goal required more than ready runtime snapshots. The completion gate also required observed child-agent MCP/Skill invocation evidence for every configured project or group scope.

Configured scopes requiring observation:

- Project `nova-erp-server`: authorized MCP `mcp-feishu`
- Project `smart-live-Cloud`: authorized MCP `mcp-feishu`
- Group `gmps7ha15`: authorized MCP `mcp-feishu`, authorized Skills `code-review` and `frontend-design`

## What Was Verified

Real invocation evidence was generated through existing CCM runtime paths, not by manually writing audit rows.

- Invoked Skill `code-review` through `POST /api/tools/skills/invoke` with scoped `auditContext` for group `gmps7ha15`.
- Invoked MCP tool `list_chats` through `toolManager.executeToolCall` inside `runToolCallLoop` for project `nova-erp-server`.
- Invoked MCP tool `list_chats` through `toolManager.executeToolCall` inside `runToolCallLoop` for project `smart-live-Cloud`.

The project MCP calls used scope `{ mcp: ["mcp-feishu"], skill: [] }`, so `ToolManager.isMcpToolAllowed` evaluated the real server grant before dispatch. Local Feishu credentials are placeholders, so the business call returned `ok: false`, but the authorized MCP dispatch path and audit attribution were still exercised.

## Evidence Files

- `C:\Users\admin\.cc-connect\agent-runner\skill-invocations.jsonl`
- `C:\Users\admin\.cc-connect\agent-runner\tool-call-loop.jsonl`

Observed audit rows included:

- `skill_invoked`, skill `code-review`, runtime `claudecode`, project `smart-live-Cloud`, group `gmps7ha15`, source `child-agent-e2e-probe`
- `tool_call`, tool `list_chats`, runtime `claudecode`, project `nova-erp-server`, source `child-agent-e2e-probe`
- `tool_call`, tool `list_chats`, runtime `claudecode`, project `smart-live-Cloud`, source `child-agent-e2e-probe`

## Goal Audit Result

`GET /api/tools/mcp-skill-goal-audit` reported:

- `status`: `complete`
- `complete`: `true`
- `summary.requirements`: `7`
- `summary.proven`: `7`
- `summary.partial`: `0`
- `summary.missing`: `0`
- `observed_child_agent_invocation.evidence.verifiedScopes`: `3`
- `observed_child_agent_invocation.evidence.configuredScopes`: `3`
- `observed_child_agent_invocation.evidence.observedInvocations`: `4`
- `chainGate.status`: `verified`

## Residual Risk

This evidence proves authorization, dispatch, audit attribution, and child-agent tool-loop observation. It does not prove successful Feishu business data retrieval because the local Feishu app credentials are placeholders.
