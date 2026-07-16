# Phase 355 - Provider Memory Authority Channel Proof

## Goal

Prove not only that group-session memory exists in a rendered dispatch prompt, but also which authority role the third-party Provider actually receives it through.

For Provider CLIs with a native system-prompt channel, CCM must use it and fail closed if launch binding cannot be proved. Providers without that capability may use the Phase 354 trusted user-prompt envelope, but the receipt must expose the weaker fallback role instead of reporting system-level parity.

The identity boundary remains exact `group + gcs_* + task + tas_* + project + Provider + runner request`. Global-Agent dispatch remains global-context-only and does not inherit group-session memory channels.

## Claude Code comparison

The reference source in `D:\claude-code` shows two relevant layers:

- custom Agent memory instructions are appended by `loadAgentMemoryPrompt()` to the Agent system prompt;
- `MEMORY.md` content may be injected as user context for prompt-cache sharing, with the role explicit in the assembly path.

The installed Claude Code CLI supports `--append-system-prompt-file`. The installed Codex and Cursor CLI help does not expose an equivalent system-prompt argument. Phase 355 therefore uses the strongest channel each runtime actually supports and records the distinction.

## Implementation

### Provider channel plan and evidence

`backend/agents/provider-memory-channel.ts` introduces a checksummed Provider memory-channel contract.

For Claude Code:

- the trusted memory envelope is extracted from the original final prompt;
- the user prompt receives only a neutral attachment marker;
- the exact envelope is written to a temporary system-prompt file;
- the command must contain `--append-system-prompt-file` bound to that file;
- file content, command, original prompt, transformed user prompt, envelope, source memory, Provider runtime identity, and runner request are checksummed.

For Codex, Cursor, and other CLIs without a native system-prompt argument:

- the original trusted user-prompt envelope is preserved byte-for-byte;
- the channel is recorded as `trusted_user_prompt_envelope`;
- the authority role is explicitly `user`;
- evidence cannot claim native system delivery.

Malformed, missing, altered, cross-Provider, command-unbound, file-unbound, or runner-unbound evidence is invalid. Verification deterministically replays the user/system split from the original final prompt, so a self-consistent evidence object with substituted channel content is also rejected.

### Runtime launch paths

`backend/agents/runtime.ts` supports `appendSystemPromptFile` for Claude Code and emits `--append-system-prompt-file`.

Both execution transports apply the same channel contract before process spawn:

- `backend/agents/runner.ts` for external runner requests;
- `backend/server.ts` for direct managed CLI execution.

Temporary system-prompt files are deleted after success or failure. Durable direct-dispatch spool records preserve the expected envelope binding and validate the final Provider-channel evidence.

### Canonical memory delivery

`backend/tasks/agent-sessions.ts` now requires valid Provider-channel evidence whenever the snapshot prompt proof contains a bound trusted envelope.

A successful process return is insufficient by itself. Canonical memory delivery and snapshot-sync commit require:

- exact Provider identity;
- exact original final-prompt checksum;
- exact trusted envelope and source-memory checksums;
- exact runner request id;
- Claude native system-file and command binding, or an explicit unchanged user-envelope fallback;
- valid evidence checksum.

Failure produces `provider_memory_channel_unverified`, rejects the new memory baseline, and preserves any previously committed baseline.

Group dispatch, runtime retry, direct task dispatch, and auto-assignment pass the Provider-channel requirement from the exact task-Agent memory snapshot. A bound trusted envelope also forces durable dispatch so the evidence has a runner identity.

### Memory Center

Snapshot inventory and Memory Center expose:

- required Provider memory channels;
- Claude native system-prompt deliveries;
- explicit user-prompt fallbacks;
- unverified Provider channels;
- per-row channel, authority role, status, evidence checksum, and issues.

This prevents a user-envelope fallback from being counted as system-level delivery.

## Verification

New command:

```text
npm run test:task-agent-provider-memory-channel-proof-restart
```

The 37-check restart test covers:

- Claude envelope extraction from the user prompt;
- exact system-prompt-file content and command binding;
- deterministic prompt-split replay rejecting self-consistent forged checksums;
- Claude system-authority delivery commit;
- Codex unchanged user-envelope fallback and explicit authority role;
- missing evidence rejection;
- cross-Provider evidence rejection;
- rejected evidence preventing snapshot-sync commit;
- durable direct-spool request/result binding;
- restart persistence;
- inventory and Memory Center counts;
- group, direct, and auto-assignment production enforcement.

Focused and adjacent results:

- Phase 355 Provider memory-channel restart: 37/37;
- Phase 354 trusted-envelope restart: 31/31;
- Phase 353 continuation-baseline restart: 29/29;
- Phase 352 prompt-injection restart: 27/27;
- direct durable dispatch spool: 39/39;
- runtime/tool fabric: pass;
- exact-session production entry points and restart: pass;
- full frontend, MCP, and backend build: pass;
- TypeScript checks: pass.
- documentation links: 1034/1034.

## Boundary

This phase proves the runtime launch channel and authority role that CCM selected. Claude Code receives native system-prompt delivery. Providers without a supported native system channel remain safe through the unique trusted envelope, but are intentionally reported as user-role fallback rather than full system-role parity.

Semantic use by the model remains measured separately through typed-memory usage receipts, citations, file-change artifacts, conflict feedback, and outcome scoring.
