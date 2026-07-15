# Phase 296: Provider-Native Compact Execution Receipt

## Status

- Date: 2026-07-15
- Result: completed
- Scope: Anthropic request adapter execution proof, exact-session binding, body-free durable receipt, Memory Center proof consumption, CLI advisory boundary

## Claude Code parity source

Claude Code builds API microcompact policy in:

- `D:\claude-code\src\services\compact\apiMicrocompact.ts`
- `D:\claude-code\src\services\api\claude.ts`
- `D:\claude-code\src\constants\betas.ts`

The upstream behavior is request-level rather than transcript mutation:

- `getAPIContextManagement()` derives `clear_thinking_20251015` and `clear_tool_uses_20250919` edits.
- The Messages API request only includes `context_management` when the context-management beta is active.
- `context-management-2025-06-27` is carried as a provider beta.
- The persisted conversation remains the recovery source; API context edits do not authorize deleting the CCM group transcript or typed `MEMORY.md`.

## CCM gap found

CCM already had an edit plan, native apply plan, Agent receipt contract, request telemetry ledger, and Memory Center proof report. Two strong-proof gaps remained:

1. `native_applied` still began with an Agent-authored usage declaration. Platform telemetry strengthened it later, but the Agent claim remained the root record.
2. Adapter telemetry could fall back to the group-level `default` ledger and did not itself require complete group session, task-Agent session, native session, execution, runner request, and memory snapshot identity.

All current project child-Agent runtimes are external CLI transports: Claude Code, Cursor, Codex, Gemini, and Qoder. They do not expose the provider request body to CCM, so they must remain advisory and cannot produce a native API apply proof.

## Implementation

### Platform execution receipt

`provider-native-compact-execution-receipt.ts` adds:

- `ccm-provider-native-compact-execution-receipt-v1`
- exact `group_id + group_session_id`
- task-Agent and native session IDs
- execution and runner request IDs
- memory-context snapshot ID and checksum
- edit-plan, apply-plan, request-patch, request-body, and context-management checksums
- provider, transport, model, endpoint, beta headers, response status, and provider request ID
- `native_applied`, `advisory_only`, `not_supported`, `request_failed`, and `unverified` states
- a receipt checksum covering the full body-free identity record

`native_applied` is emitted only when the native request adapter observed all required bindings, the exact request patch and context-management payload match, the beta header was sent, and the provider accepted the request. Missing or mismatched evidence becomes `unverified`; provider or network failures become `request_failed`.

The ledger uses an exclusive file lock and durable atomic JSON replacement. Request messages, system prompts, tool results, API keys, and other request bodies are never persisted. Endpoint query strings and credentials are removed.

### Adapter enforcement

The Anthropic-compatible request adapter now:

1. verifies the checksummed native apply plan before merging it;
2. merges `requestPatch.body.context_management`;
3. appends `context-management-2025-06-27` without removing existing betas;
4. records platform execution receipt and legacy request telemetry on success, HTTP failure, and network failure;
5. writes both ledgers to the exact group session.

A tampered apply plan is rejected before request-patch merge.

### Provider boundary

- Anthropic API transport can become `native_applied` when the full contract is observed.
- Claude Code, Cursor, Codex, Gemini, and Qoder CLI transports remain `advisory_only`.
- OpenAI provider transport cannot accept the Anthropic context-management patch.
- Failure to record proof does not block the child Agent; it only prevents a strong native-apply claim.

### Memory Center proof priority

Group memory proof summaries and Memory Center now consume platform execution receipts before legacy Agent proof rows. A matching platform receipt is directly classified as adapter-captured, session-bound, dispatch-bound, runner-bound strong proof. Legacy Agent-authored telemetry remains weak unless independently supported by existing platform evidence.

Session deletion removes the new receipt ledger and backup together with the other exact-session memory sidecars.

## Verification evidence

- Phase 296 provider-native execution receipt: 16/16
- Native apply plan, adapter, Memory Center readiness/proof/aging/dispatch: 6 suites passed
- Compaction strategy suite: 10 suites passed
- Phase 295 restart soak: 11/11
- Phase 294 snip replay: 11/11
- Phase 293 resume integration: 12/12
- Boundary journal: 16/16
- Phase 292 exact-session hook isolation: 25/25
- Group-session sidecar isolation and deletion: 14/14
- Full `npm run build`: passed
- Production `http://localhost:3081/`: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200
- Production PID: `27284`
- Receipt module schema: `ccm-provider-native-compact-execution-receipt-v1`
- stderr: empty
- Logs: `C:\Users\admin\.cc-connect\logs\ccm-server-phase296.log` and `C:\Users\admin\.cc-connect\logs\ccm-server-phase296.err.log`

## Long-term goal state

Phase 296 closes the remaining provider-native request execution proof gap for the transport currently exposed by CCM. It does not pretend that external CLI child Agents expose their private provider requests. The long-term Claude Code parity goal remains active for future upstream memory behavior, new provider adapters, and continuing completion audits.
