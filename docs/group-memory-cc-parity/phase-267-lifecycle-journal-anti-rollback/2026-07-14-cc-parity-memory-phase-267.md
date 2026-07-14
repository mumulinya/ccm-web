# Phase 267: Lifecycle Journal Anti-Rollback

## Goal

Prevent a valid but older `active` lifecycle backup from replacing a newer `archived` or `deleted` group-session state after disk corruption, partial writes, restart, or journal rollback.

The protected identity remains `groupId + gcs_*`. Old conversations are not migrated. A replacement session uses a new ID and independent memory.

## Risk Found

The previous lifecycle reader tried the primary head and then `${head}.bak`. `writeJsonAtomic` intentionally stores the prior generation in `.bak` before replacing the primary.

This meant the following sequence was possible:

1. generation 1 is `active`
2. generation 2 commits a `deleted` tombstone
3. `.bak` still contains the internally valid generation-1 `active` head
4. the tombstone primary becomes unreadable
5. the old reader accepts `.bak` and treats the deleted session as active

Delivery and Runner fences cannot protect the system if the authoritative lifecycle reader itself rolls backward.

## Commit Protocol

Each lifecycle transition now persists three independently checked artifacts:

1. the replaceable primary head
2. an append-only checksum-chained lifecycle journal
3. an immutable per-generation commit receipt

After the journal and receipt commit, CCM also writes a latest committed replica for primary-file recovery.

Journal records bind:

- exact group and `gcs_*` session
- monotonic generation and status
- lifecycle head ID and checksum
- previous head checksum
- previous journal-record checksum
- record checksum

Immutable commit receipts bind:

- generation and status
- lifecycle head ID and checksum
- exact journal-record checksum
- commit checksum

Receipt files use create-only writes. An existing generation receipt must be byte-equivalent by checksum or the transition fails.

## Authoritative Read

A lifecycle head is readable only when all of these agree:

- the highest immutable commit receipt
- the latest valid journal record
- one valid head candidate

Candidates are checked in this order:

1. primary head
2. latest committed replica
3. committed-replica backup
4. ordinary previous-generation backup

A candidate is accepted only when generation, status, head ID, and head checksum exactly match the journal and highest commit receipt. Internal checksum validity alone is insufficient.

Consequences:

- corrupt primary with a current committed replica: recover safely
- corrupt primary and current replica with only old active backups: fail closed
- truncated journal matching an old backup: fail closed
- corrupt or missing highest receipt: fail closed
- valid deleted tombstone: remains authoritative

## Legacy Bootstrap

`bootstrapGroupSessionLifecycleJournals` runs before lifecycle cancellation reconciliation and task-queue resume.

An existing primary without a journal may be adopted once only when the primary head is internally valid. Bootstrap writes a genesis journal record, immutable generation receipt, and committed replica without changing the lifecycle ID, generation, status, or checksum.

An unreadable legacy primary is not adopted. It remains unavailable and triggers fail-closed behavior.

No transcript or memory content is copied during bootstrap.

## Memory Center

Memory Center now returns `groupSessionLifecycleIntegrityReport` and shows a `lifecycle anchors` metric with:

- discovered head count
- anchored count
- committed-replica recovery count
- fail-closed count
- invalid journal count
- invalid commit-chain count
- invalid primary count
- deleted tombstone count

An unavailable authoritative head creates a critical `group_session_lifecycle_integrity` alert.

## Claude Code Reference

The durability approach follows the conservative persistence behavior visible in:

- `D:/claude-code/src/utils/file.ts`
- `D:/claude-code/src/utils/config.ts`
- `D:/claude-code/src/utils/fileHistory.ts`

Claude Code uses atomic writes, retained versions, explicit corruption handling, and avoids silently replacing corrupt current state with an unproven backup. CCM adds generation receipts because its lifecycle state is a security boundary for independently running third-party Agents.

## Verification

- `npm run check`: pass
- `npm run build`: pass after one transient Windows file-lock retry
- lifecycle anti-rollback self-test: pass, 38 assertions
- valid generation-3 active backup rejected after generation-4 deletion: pass
- corrupt primary recovered only from generation-4 committed replica: pass
- corrupt primary and replica with valid generation-3 backups: fail closed
- truncated journal matching generation-3 active backup: fail closed
- corrupt highest immutable receipt: fail closed
- missing highest immutable receipt: fail closed
- Runner rejects unavailable authoritative lifecycle head: pass
- Memory Center exposes fail-closed provenance: pass
- legacy primary bootstrap preserves original head checksum: pass
- Phase 266 process-abort regression: pass, 33 assertions
- Phase 265 delivery-fence regression: pass, 31 assertions
- Phase 264 compact-head regression: pass, 38 assertions
- Runner runtime-tool gate regression: pass, 14/14 checks
- production legacy bootstrap: 10 heads checked, 8 adopted, 2 current, 0 failed
- production lifecycle integrity: 10/10 anchored, 0 fail-closed
- production overview API: HTTP 200
- production server: `http://localhost:3081`, PID 30728
- production stderr: empty

## Result

Lifecycle recovery is now anti-rollback. A stale `active` backup can no longer resurrect an archived or deleted group session merely because it has a valid internal checksum. Task Agent dispatch, process abort, delivery, reinjection, and artifact proof all consume a lifecycle state anchored by a monotonic journal and immutable generation receipt.

