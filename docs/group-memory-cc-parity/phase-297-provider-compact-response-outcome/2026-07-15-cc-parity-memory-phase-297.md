# Phase 297: Provider Compact Response Outcome

## Status

- Date: 2026-07-15
- Result: completed
- Scope: provider-confirmed applied edits, accepted-versus-applied semantics, response outcome telemetry, legacy receipt downgrade

## Claude Code and Provider evidence

Claude Code preserves Assistant message `context_management` response metadata while normalizing message blocks:

- `D:\claude-code\src\utils\messages.ts:765`
- `D:\claude-code\src\services\api\claude.ts:1719-1722`

Anthropic's context editing documentation defines the non-streaming response outcome as:

```json
{
  "context_management": {
    "applied_edits": [
      {
        "type": "clear_thinking_20251015",
        "cleared_thinking_turns": 3,
        "cleared_input_tokens": 15000
      },
      {
        "type": "clear_tool_uses_20250919",
        "cleared_tool_uses": 8,
        "cleared_input_tokens": 50000
      }
    ]
  }
}
```

Official reference: `https://platform.claude.com/docs/en/build-with-claude/context-editing`

For streaming responses, the same outcome appears on the final `message_delta` event.

## CCM gap found

Phase 296 proved that CCM's native request adapter sent an exact, checksummed `context_management` request and received an accepted HTTP response. It did not distinguish these cases:

1. Provider accepted the request and reported applied edits.
2. Provider accepted the request but omitted outcome metadata.
3. Provider accepted the strategy but reported an empty `applied_edits` list because no trigger fired.

Treating all three as `native_applied` overstated evidence and could make Memory Center report context tokens as cleared without provider confirmation.

## Implementation

### Receipt v2 outcome semantics

The platform receipt is upgraded to `ccm-provider-native-compact-execution-receipt-v2`.

The outcome states are now:

- `native_applied`: request contract passed and Provider returned one or more `applied_edits`
- `request_accepted`: HTTP request succeeded, but response outcome metadata was absent
- `no_edits_applied`: Provider explicitly returned an empty `applied_edits` array
- `request_failed`: network or non-2xx failure
- `unverified`: session, execution, runner, snapshot, plan, patch, or request evidence was incomplete or mismatched
- `advisory_only` / `not_supported`: executor does not expose a supported native request path

`strong_proof=true` is now legal only for v2 `native_applied` receipts with:

- `provider_outcome_verified=true`
- `applied_edit_count >= 1`
- valid receipt checksum
- the complete Phase 296 exact-session and execution binding

### Body-free applied edit summary

The receipt persists only bounded result metadata:

- edit type
- cleared thinking turns
- cleared tool uses
- cleared input tokens
- response context-management checksum
- total applied edit and cleared-token counts

It still does not persist request or response text, prompts, tool bodies, model output, or credentials.

### Adapter ordering

The Anthropic adapter now parses the successful response before recording the platform outcome. Non-2xx and network failures are recorded on their own paths. A malformed successful response is retained as accepted-but-unverified outcome evidence and does not become `native_applied`.

### Memory Center and migration

Memory Center separately reports:

- provider-confirmed native applied
- request accepted without outcome
- explicit no-edit result
- failed or unverified requests

Phase 296 v1 receipts remain checksum-verifiable, but historical v1 `native_applied` entries are projected as `request_accepted` with `strong_proof=false`. This prevents old accepted-only evidence from surviving as a false strong proof after the semantic upgrade.

## Verification evidence

- Provider response outcome contract: 21/21
- Real adapter applied result: passed
- Real adapter accepted-only downgrade: passed
- Explicit empty applied edits: passed
- Legacy v1 downgrade: passed
- Native plan, adapter, Memory Center readiness/proof/aging/dispatch: 6 suites passed
- Phase 295 restart soak: 11/11
- Phase 294 snip replay: 11/11
- Phase 293 resume integration: 12/12
- Boundary journal: 16/16
- Phase 292 exact-session hook isolation: 25/25
- Group-session sidecar isolation and deletion: 14/14
- Full `npm run build`: passed
- Production `http://localhost:3081/`: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200
- Production PID: `34136`
- Receipt schema: `ccm-provider-native-compact-execution-receipt-v2`
- stderr: empty
- Logs: `C:\Users\admin\.cc-connect\logs\ccm-server-phase297.log` and `C:\Users\admin\.cc-connect\logs\ccm-server-phase297.err.log`

## Long-term goal state

Phase 297 closes the accepted-versus-applied ambiguity in provider-native compaction. CCM now requires Provider response evidence before claiming that context edits actually occurred. The long-term Claude Code parity goal remains active for future upstream memory and context-management changes.
