# Phase 389: Cancellation atomic commit fence

Date: 2026-07-17

## Goal

Close the final race between an exact-session compaction cancellation request and the synchronous commit of group memory, typed memory, compact head, Provider reset state, and circuit-breaker success.

Phase 388 propagated cancellation into the model request and compact hooks. A smaller window remained after PostCompact finished:

```text
compact result ready
-> cancellation check passes
-> cancellation request arrives
-> final compact state commits
```

That ordering could report cancellation even though the compact had already committed. Phase 389 makes cancellation and final commit mutually exclusive for the same `groupId + gcs_* + acba_*` operation.

The Global Agent remains global-context-only and does not read group activity or cancellation state.

## Claude Code parity

Claude Code keeps one abort controller attached to the complete compact operation and does not accept an aborted request as a successful summary. CCM additionally needs a durable process-independent fence because cancellation and compact work may be handled by different Node processes.

The resulting CCM contract is:

- cancellation wins before the activity commit lock: no compact artifacts commit;
- commit wins the activity lock first: the compact commits and becomes durably sealed before a later cancellation can be admitted.

There is no state in which both cancellation and successful commit win.

## Lock ordering

The final production commit now uses the following order:

1. exact group-session lifecycle lock;
2. exact group-session compaction activity lock;
3. cancellation revalidation;
4. synchronous final commit;
5. activity terminal persistence as `completed` or `skipped`;
6. release activity lock, then lifecycle lock.

This preserves the Phase 386 archive/delete lifecycle fence while adding the Phase 388 cancellation fence. A cancellation request uses only the activity lock and therefore cannot enter between cancellation revalidation and final commit.

## Atomic terminal seal

`withGroupCompactionActivityCommitFence()` validates the current exact operation and rejects a pending cancellation before invoking the final commit callback.

After the callback succeeds, the same locked write moves activity directly from `current` to terminal and records:

- `commit_fence_status=sealed`;
- `commit_sealed_at`;
- compact boundary ID;
- compact transaction receipt checksum;
- checksummed activity ledger revision.

The returned body-free commit-fence summary binds the exact group, conversation, operation, boundary, transaction, commit time, and resulting ledger checksum.

A late cancellation with the completed operation ID returns `compact_commit_already_sealed`. It cannot rewrite the terminal row or latch cancellation onto a later operation.

## Memory Center

The Compaction Activity panel now includes a `commit fence` card. It shows `sealed` only when the final commit and terminal activity write completed under the same activity lock.

Cancelled operations remain unsealed. Memory Center diagnostics expose the selected conversation's latest `commitFenceStatus` and never use a sibling conversation's evidence.

## Verification

Phase 389 command:

```text
npm run test:group-compaction-cancellation-commit-fence-restart
```

Result: `24/24`.

The dedicated test proves both race outcomes:

- another Node process cancels at the production `beforeCompactionCommit` boundary and wins;
- memory, compact head, and circuit-breaker artifacts remain byte-stable when cancellation wins;
- a normal compact wins and atomically stores a sealed activity terminal;
- the terminal binds the committed boundary and compact transaction;
- a late cancellation is rejected as already sealed and cannot mutate the terminal;
- both exact-session ledgers verify independently and survive restart;
- Memory Center exposes the sealed fence after restart;
- the Memory Center quality composable declares and receives its self-test archive-result dependency.

Compatibility regression:

- Phase 388 exact-session cancellation: `24/24`;
- Phase 387 compaction activity keep-alive: `23/23`;
- Phase 386 compaction session lifecycle fence: `32/32`;
- Phase 320 compaction summary input projection: `21/21`;
- Phase 302 auto-compact circuit breaker: `12/12`;
- Phase 295 compact restart soak: `11/11`;
- Phase 275 auto-compaction exact-session scope: `12/12`;
- Phase 332 post-compact session reset: `14/14`;
- Phase 265 Task Agent lifecycle fence: `31/31`;
- Phase 264 compact-head fence: `38/38`;
- Phase 292 compact-hook session isolation: `27/27`.

Compatibility total: `245/245`.

Phase 376-389 focused memory chain: `668/668`.

Targeted memory checks through Phase 389: `1524/1524`.

## Browser acceptance

The Memory Center was rendered in headless Chrome at `1440x1000` from the Vite development server.

- `Agent 记忆控制中心` was visible exactly once;
- the context policy, Session Memory customization, Provider capability, and memory diagnostics sections rendered without overlap;
- the first pass exposed `ReferenceError: selftestResidueArchiveResult is not defined` in `useMemoryCenterQuality.js`;
- `useMemoryCenter.js` now passes the exact ref into the quality composable, whose dependency list now declares it;
- after reload, the page rendered completely with zero console or page errors.

The Phase 389 self-test now contains two static wiring checks so the missing dependency cannot silently pass a production build again.

## Engineering verification

- backend TypeScript build: passed after retrying the known Windows transient emit-file `UNKNOWN open` condition;
- frontend production build: passed (`2063` modules transformed);
- focused Phase 389 restart test: `24/24`;
- no paid Provider was called.

## Production state

No paid Claude Code, Codex, Cursor, Anthropic, or OpenAI Provider call was executed. All race transitions use isolated local processes and deterministic compaction.

The long-term Claude Code parity goal remains active.
