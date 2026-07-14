# Phase 218: Capacity refresh and active-session revalidation

Date: 2026-07-12

## Goal

Prevent a model-capacity refresh, expiry, or downgrade from leaving child Agents on an obsolete context budget. Every WorkerContextPacket path must use the current trusted capacity, and active task sessions must rebuild and recompact before dispatch after a downgrade.

## Refresh policy

- Cache entries become refresh-due during the final 20 percent of their TTL, bounded to a lead time between one and 24 hours.
- The hourly refresh scheduler writes `~/.cc-connect/memory-control/model-capability-refresh-queue.json`.
- Refresh requests are `pending_native_telemetry` with action `refresh_on_next_native_execution`; CCM does not invent a provider query or trust Agent-authored metadata.
- A fresh native receipt replaces the due entry through the Phase 217 trust path.
- The scheduler starts only after the server owns its listening port and stops with the server.

## Stale safe bound

Expired evidence is not trusted as a fresh capability. However, an expired context window below the conservative 200K default remains a safety upper bound. CCM resolves it as `stale_safe_bound`, ensuring expiry can never increase a previously known small provider window from, for example, 64K to 200K.

Expired evidence above 200K still falls back to the conservative 200K default.

## Downgrade detection

When recording evidence, CCM resolves capacity before and after the write. If the effective context window decreases, it appends a `ccm-model-capability-downgrade-alert-v1` row to:

`~/.cc-connect/memory-control/model-capability-downgrades.jsonl`

The alert records old/new windows, sources, evidence checksums, affected sessions, and the required action.

Only known Agent runtime providers may invalidate task sessions. Unknown provider names cannot normalize accidentally to Claude Code and affect unrelated sessions.

## Active task sessions

Open task-Agent sessions retain their latest packet capacity through their bound memory snapshot. A real downgrade marks sessions with:

- `capacityRevalidationRequired=true`
- `ccm-task-agent-session-capacity-downgrade-gate-v1`
- Action `rebuild_and_recompact_before_next_dispatch`

The next dispatch must present a packet at or below the downgraded window. Otherwise dispatch fails closed. A valid packet clears the gate and emits `task_agent_capacity_revalidated` on the task timeline.

## Worker packet closure

`buildSelfContainedWorkerHandoff` now resolves provider/model capacity directly. This closes the direct-handoff and task-queue paths that could previously fall back to a shared 90K packet budget.

When reusing an old packet:

1. Current capacity is resolved again.
2. Capacity provenance participates in a new packet id.
3. A smaller window creates `ccm-worker-context-capacity-downgrade-gate-v1`.
4. Memory is compacted first.
5. `ccm-worker-context-capacity-downgrade-recompact-v1` records the retry and compaction hashes.
6. Context usage is recomputed under the new effective window.

## Memory Center

The capability API now returns refresh plan and downgrade alerts. Memory Center displays pending refresh count and recent downgrade rows with affected active-session totals.

## Verification

The Phase 218 regression proves:

- Direct worker-handoff uses provider capacity instead of 90K.
- A 320K to 64K downgrade creates an alert.
- An old packet is reidentified and memory-first recompacted to a 56K effective budget.
- An expired 64K entry remains a stale safe bound rather than expanding to 200K.
- A refresh-due entry enters the native telemetry queue.
- Existing Phase 216/217 capacity, forgery, revocation, and maintenance checks remain green.

Required gates are TypeScript checks, backend and frontend production builds, capability self-test, runtime API checks, clean self-test residue, and `git diff --check`.

## Follow-up

The next phase should add per-native-session model identity persistence so model-specific receipts can be reused without weakening unknown-model safety, and add a crash-safe lease/journal around refresh queue generation for multi-process deployments.
