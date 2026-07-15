# Phase 303: Reactive Compact Retry Ownership

Date: 2026-07-15

## Goal

Close the crash and replay gap around prompt-too-long reactive compaction. A group main Agent retry must be single-shot for one request epoch, owned by one process at a time, isolated by `groupId + gcs_*`, and safe against late completion after another process recovers the claim.

## Claude Code reference

The comparison focused on:

- `D:/claude-code/src/query.ts`
  - withholds recoverable prompt-too-long errors;
  - drains staged context collapse before full reactive compact;
  - preserves `hasAttemptedReactiveCompact` across stop-hook continuation;
  - permits one reactive compact retry and then surfaces the error.
- `D:/claude-code/src/services/compact/compact.ts`
  - retries compaction-internal PTL at most three times;
  - uses the reported token gap to remove enough old context;
  - does not treat PTL error text as a successful compact result.
- `D:/claude-code/src/services/api/errors.ts`
  - normalizes PTL errors and retains token-count evidence for recovery.

CCM already had deterministic PTL downgrade and WorkerContextPacket compaction, but its group-main reactive retry was only guarded by one in-memory `try/catch`. It also failed to pass the active `gcs_*` into coordinator-created WorkerContextPackets.

## Changes

### Durable exact-session ownership

Added `backend/modules/collaboration/group-reactive-compact-retry-ownership.ts`.

The body-free ledger is scoped by `groupId + gcs_*` and stores:

- retry channel and deterministic request epoch;
- claim id, owner PID/hostname, lease expiry, claim generation;
- monotonically increasing fencing token;
- claimed/recovered/failed terminal state;
- context/request hashes, character counts, error class and error fingerprint;
- checksum, atomic primary/backup writes and bounded retention.

The ledger never stores prompt text, context text, compacted text, model output, or raw error bodies.

### Crash and late-response behavior

- A live local owner makes a competing claim return `busy`.
- A dead process can be reclaimed immediately after restart.
- Remote owners remain protected until lease expiry.
- Reclaim advances the fencing token and claim generation.
- Completion from an old claim/token returns `stale_rejected`.
- A recovered or failed epoch returns `already_attempted`; it is not replayed.
- Invalid primary data with a valid backup is diagnostic only and fails closed.

### Group main Agent integration

`runGroupOrchestratorCore()` now:

1. derives the retry epoch from the exact-session coordinator context id;
2. claims ownership only after the first PTL response;
3. performs one reactive compact retry only when the claim is acquired;
4. durably settles recovered/failed before returning;
5. exposes a body-free ownership summary in `contextRecovery`;
6. refuses unscoped PTL replay when no `gcs_*` is present.

### Child Agent binding

The active `groupSessionId` now flows through:

- live group-chat and direct coordinator routes;
- task queue and secondary coordinator calls;
- coded and LLM assignment builders;
- assignment metadata;
- `WorkerContextPacket.group_session_id`.

This lets every child execution prove which group-chat session supplied its context.

### Lifecycle and observability

- Deleting a group session deletes its reactive retry ledger and backup.
- Memory Center exposes exact-session epoch totals, active claims, terminal outcomes, fencing token, claim generation and checksum state.

## Verification

New test:

`npm run test:group-reactive-compact-retry-ownership-restart`

Result: 15/15 checks passed.

Coverage includes:

- first claim acquisition;
- dead-owner recovery across real Node processes;
- fencing-token advancement;
- stale completion rejection;
- terminal single-shot behavior;
- live-owner contention;
- crash recovery;
- sibling `gcs_*` isolation;
- corrupt-primary/valid-backup fail-closed behavior;
- exact-session WorkerContextPacket binding;
- real mocked LLM PTL -> compact -> retry -> durable settlement;
- restart replay refusing a second LLM retry;
- body-free persistence;
- session deletion cleanup.

Regression checks passed:

- Phase 300 generation restart reconciliation;
- Phase 301 post-compact cleanup source scope;
- Phase 302 auto-compact circuit breaker restart;
- compact restart soak;
- auto-compaction session scope;
- group-session sidecar isolation;
- task-Agent compact-head fence;
- global-Agent global-only context;
- WorkerContextPacket compaction retry.

Full `npm run build` passed for frontend, MCP Feishu integration, and backend.

## Production verification

- URL: `http://localhost:3081`
- PID: `17740`
- command: `D:/nodejs/node.exe ccm-package/dist/server.js 3081`
- home: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200, 187824 bytes
- stderr: 0 bytes
- log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase303.log`
- error log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase303.err.log`

Visual verification:

- desktop 1280 x 720 rendered without horizontal overflow;
- mobile 390 x 844 reported equal client/scroll width and zero visible buttons outside the viewport;
- browser console errors/warnings: 0;
- the in-app browser produced a desktop screenshot; mobile screenshot capture timed out twice, so mobile verification used DOM state and pixel-boundary metrics rather than claiming screenshot evidence.

## Remaining direction

The long-term goal remains active. The next audit should move WorkerContextPacket compact outcome/strategy/PTL-hint ledgers from group-wide aggregation to exact `gcs_*` projections, so one conversation's Worker pressure cannot tune another conversation's retry strategy.
