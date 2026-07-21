# CCM Group Tool Continuity

- groupId: group-business-chain--gcs_mrt2sg1w_9b7vey
- generatedAt: 2026-07-20T10:22:26.816Z
- strategy: cc-tool-skill-continuity-context-v1
- status: empty
- shouldReuseAsContext: true
- shouldBypassAuthorization: false

## Use Policy
- Treat this as continuity context for the group chat and fresh third-party child Agent sessions.
- This snapshot never grants tools and never bypasses CCM runtime authorization.
- Real dispatch must still pass the current runtime tool gate, MCP config sync, and authorization readiness checks.