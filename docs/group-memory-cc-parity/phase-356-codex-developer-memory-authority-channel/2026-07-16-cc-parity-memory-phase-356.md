# Phase 356: Codex developer memory authority channel

Date: 2026-07-16

## Goal

Raise Codex task-agent group memory from a trusted user-prompt fallback to the documented `developer_instructions` authority channel, while retaining a fail-closed, version-bound fallback for runtimes whose capability is not verified.

## Source comparison

- The current Codex configuration reference documents top-level `developer_instructions` as additional instructions injected before `AGENTS.md`.
- The Codex CLI documents `-c` / `--config` as a one-run arbitrary configuration override whose value is parsed as TOML.
- The installed runtime is `codex-cli 0.115.0`; both initial `codex exec` and `codex exec resume` expose `--config`.
- A separate custom-agent `developer_instructions` field also exists, but Phase 356 intentionally uses the top-level execution configuration contract rather than confusing it with subagent-role configuration.

References:

- https://learn.chatgpt.com/docs/config-file/config-reference
- https://learn.chatgpt.com/docs/config-file/config-advanced#one-off-overrides-from-the-cli

## Implementation

### Authority selection

`backend/agents/provider-memory-channel.ts` now selects:

| Provider/capability | Channel | Authority |
| --- | --- | --- |
| Claude Code | `native_system_prompt_file` | `system` |
| Codex `0.115.0+` | `native_developer_instructions_config` | `developer` |
| Unsupported or unverified runtime | `trusted_user_prompt_envelope` | `user` |

Codex developer activation is bound to `CODEX_DEVELOPER_INSTRUCTIONS_MIN_VERSION = 0.115.0`. Missing, malformed, or older version evidence does not receive developer authority.

### Prompt separation

For a capable Codex runtime:

1. Verify the unique checksummed trusted-memory envelope.
2. Remove the envelope from the Provider user prompt and leave a non-memory attachment marker.
3. Write the exact envelope to a request-specific developer-instructions file.
4. Keep the user task on stdin.
5. Launch Codex through `codex-prompt-runner`, which adds one `--config developer_instructions=<TOML string>` override.

The raw memory body is therefore absent from the shell command and the user-role prompt.

### Launch helper

`backend/agents/codex-prompt-runner.ts` resolves the Windows npm Codex entry to its Node script when possible. This avoids routing the long developer configuration through `cmd.exe` and preserves the user prompt on stdin. The same path is used for initial and resumed Codex sessions.

### Evidence and fail-closed delivery

Provider evidence now binds:

- selected channel and authority role;
- original, user, system, and developer prompt checksums;
- exact developer-instructions file checksum;
- command-to-file binding;
- Provider semantic version and executable identity;
- runner request id and trusted envelope/source checksums.

Verification replays channel selection from the original prompt and recorded runtime version. A tampered file, wrong Provider, changed prompt split, missing command binding, or unsupported authority claim rejects memory delivery and the memory snapshot sync commit.

### Memory Center

Task-agent snapshot inventory and Memory Center reports now expose `providerMemoryNativeDeveloperCount` in addition to native-system, user-fallback, and unverified counts.

## Production paths

Both execution paths materialize, bind, and clean up the request-specific developer file:

- `backend/agents/runner.ts`
- `backend/server.ts`

The existing four group task dispatch entry points already require provider-memory channel evidence, so Codex gains developer authority without weakening group/session isolation.

## Verification

- Phase 356 Codex developer channel restart self-test: `45/45`
- Phase 352 prompt injection proof: `27/27`
- Phase 353 continuation baseline proof: `29/29`
- Phase 354 trusted envelope proof: `31/31`
- Phase 355 provider authority channel proof: `37/37`
- Native continuation/rebudget: `28/28`
- Direct dispatch spool: `39/39`
- Runtime path integrity: pass
- Runtime initial/resume session self-test: pass
- Backend and MCP TypeScript check: pass

The Phase 356 test includes a fake resolved Codex CLI entry and proves that the helper sends the exact envelope through `developer_instructions` while sending only the user task through stdin.

## Remaining parity work

- Probe and version-bind higher-authority channels for Cursor and other Providers when they publish stable contracts.
- Add post-launch Provider acknowledgement that the requested developer/system instruction channel was actually accepted, not only correctly constructed before process start.
- Continue comparing compaction and memory-use behavior against Claude Code source and runtime changes.

The long-term Claude Code memory parity goal remains active.
