# CCM Group Tool Continuity

- groupId: runtime-real-chain-group
- generatedAt: 2026-07-12T04:05:50.938Z
- strategy: cc-tool-skill-continuity-context-v1
- status: ready
- shouldReuseAsContext: true
- shouldBypassAuthorization: false

## Use Policy
- Treat this as continuity context for the group chat and fresh third-party child Agent sessions.
- This snapshot never grants tools and never bypasses CCM runtime authorization.
- Real dispatch must still pass the current runtime tool gate, MCP config sync, and authorization readiness checks.

## Runtime Gates
- gate: dispatchReady=true; blockers=