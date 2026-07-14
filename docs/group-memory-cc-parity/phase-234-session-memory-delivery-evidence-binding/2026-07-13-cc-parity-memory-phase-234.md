# CCM Memory CC Parity Phase 234

Date: 2026-07-13

## Goal

Bind the exact per-group-session Session Memory extraction state to every project child Agent delivery and receipt. A child Agent must not be able to satisfy the memory gate with another group session, an older extraction, a tampered fact graph, or a superseded fact.

The long-term Claude Code parity goal remains active after this phase.

## Scope boundary

- Ownership remains `groupId::gcs_*`.
- Project child Agents receive only the owning group session projection.
- Global Agent receives global memory and routing/task state, never group Session Memory or fact bodies.
- Legacy `default` sessions are rejected. Old sessions are deleted rather than migrated.
- Model extraction artifact bodies and artifact paths are excluded from child context.

## Implemented

### Extraction delivery evidence

Every committed forked-model Session Memory extraction now immediately replays its signed request/result artifacts and persists:

- extraction execution ID
- committed receipt checksum
- signed history-head checksum
- history integrity status
- replay execution ID and replay status
- fact supersession graph checksum
- evidence checksum

Schema: `ccm-group-session-memory-model-extraction-delivery-evidence-v1`.

The evidence is stored in the owning session snapshot only. It contains no artifact body or artifact path.

### Child projection and binding

The child Session Memory projection now uses an allowlisted model receipt. Request/result artifact paths and receipt paths are removed.

Task Agent snapshots use `ccm-task-agent-group-session-memory-binding-v2`. The binding covers:

- Session Memory checksum and fencing token
- section evidence checksums and source message IDs
- extraction execution, receipt, history head and replay evidence
- fact graph checksum and validity
- active fact IDs/checksums/source message IDs
- a checksum over the full binding

Delivery receipts use `ccm-task-agent-memory-context-delivery-receipt-v2` and bind the exact v2 memory binding checksum. Dispatch fails closed before the child Agent runs when committed model memory lacks valid delivery evidence.

### Child receipt validation

`memoryContextUsage` must echo:

- binding ID
- group session ID
- Session Memory checksum
- model extraction execution ID
- model extraction replay status
- fact supersession graph checksum
- `used`, `verified`, or `ignored` with a reason

`ignored` still binds the exact delivered evidence and must provide no citations.

When a citation claims an active fact or uses its source message, `memoryFactCitations` must include the delivered `factId` and `factChecksum`. Facts absent from the active projection, including superseded facts, fail validation.

Validation schema: `ccm-task-agent-memory-context-consumption-validation-v4`.

### Memory Center

The Session Memory fleet report now audits persisted child-delivery evidence against the receipt, replay and fact graph. It exposes delivery evidence observed/invalid counts and a per-session `delivery verified/invalid` state.

## Failure behavior

- Wrong group session: rejected.
- Stale extraction execution: rejected.
- Wrong fact graph checksum: rejected.
- Superseded fact citation: rejected.
- Tampered task snapshot or delivery receipt: rejected.
- Missing/invalid committed extraction delivery evidence: child dispatch blocked.
- Ignored memory without exact evidence echo: rejected.

## Verification

- Delivery evidence binding: 14/14 passed.
- Fact supersession: 13/13 passed.
- Chain and replay: 12/12 passed.
- Artifact retention: 13/13 passed.
- Cold recovery/history: 9/9 passed.
- Model extraction: 12/12 passed.
- Extraction transaction: 11/11 passed.
- Update cadence: 17/17 passed.
- Delivery/fencing: 13/13 passed.
- Budget/fleet: 12/12 passed.
- Memory Center session scope: 5/5 passed.
- `npm run check` passed.
- Full frontend, MCP Feishu and backend build passed.
- Memory Center desktop QA passed at `1440x1000` with no horizontal, panel or card overflow.
- Memory Center mobile QA passed at `390x844` with no horizontal, panel, card or session-row overflow.
- Browser console reported zero warnings and zero errors.

The budget/fleet test first hit a Windows file-lock collision because several selftests wrote the shared metrics file in parallel. It passed when rerun alone. The one temporary metrics file was removed.

## Deployment and cleanup

- Production rebuilt and restarted at `http://localhost:3081` with PID `26020`.
- Three production groups each retain exactly one fresh active `gcs_*` session.
- Production archived sessions: 0.
- Production legacy `default` sessions: 0.
- Phase 234 runtime residue: 0.
- Removed 172 old `phase###-*` runtime test directories from the session message, scoped memory, Session Memory and typed-memory roots. Production `gm*` scopes were not touched.

## Files

- `backend/modules/collaboration/group-session-memory-model-extraction.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/tasks/agent-sessions.ts`
- `backend/agents/worker-handoff.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/group-session-memory-delivery-evidence-binding-selftest.mjs`
- `package.json`

## Next parity work

1. Add cross-replay schema migration for future extraction artifact versions without accepting legacy `default` sessions.
2. Improve low-uniqueness natural-language fact matching and semantic reference scoring.
3. Continue tightening native provider compact/reinjection receipts where third-party runtimes expose context-management APIs.
