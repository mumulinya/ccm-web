# Phase 306: Provider Reliability Promotion Contract

Date: 2026-07-15

## Goal

Close the promotion boundary between exact group-chat session evidence and cross-group Provider reliability guidance. Corrected child-Agent receipt validation must remain owned by its `groupId--gcs_*` session, while aggregation may affect future Provider guidance only after independent root-group diversity, time-decay, evidence-volume and dominance gates pass.

## Claude Code Reference

The implementation follows the ownership and reconstruction boundaries visible in Claude Code:

- `D:/claude-code/src/services/compact/postCompactCleanup.ts` separates main-thread and subagent cleanup ownership.
- `D:/claude-code/src/services/compact/sessionMemoryCompact.ts` binds compaction and reconstruction to the active session.
- `D:/claude-code/src/QueryEngine.ts` persists compact boundaries and releases pre-boundary in-memory messages without merging unrelated sessions.
- `D:/claude-code/src/bootstrap/state.ts` resets compact-derived latches at explicit lifecycle boundaries.

CCM already had privacy-redacted, guidance-only Provider reliability aggregation. The remaining defect was structural: Phase 305 exact-session typed-memory directories could be counted as independent groups. Two `gcs_*` sessions from one group could therefore satisfy a two-group promotion threshold.

## Changes

### Exact-session Provider feedback

`recordWorkerContextPacketAssignmentBindingForCoordinator()` now persists the assignment's exact `groupSessionId`. Corrected-receipt validation derives `groupId--gcs_*` from that binding and distills feedback only into that typed-memory scope.

Provider validation rows, row identities, archives, distillation ledgers and generated feedback Markdown now carry `groupSessionId`. The ledger also records `sourceGroupId`, preserving both operational session ownership and root-group attribution. Legacy unscoped calls remain supported but are not mixed into a new exact session.

### Root-group identity

Provider reliability source loading now derives a private internal identity for every ledger:

- root group key;
- exact or legacy session key;
- ledger scope key;
- exact-session status.

Public signals expose only counts and checksums. They never expose group ids, session ids, project names, paths, task/execution ids or receipt bodies.

All ledgers from the target root group are excluded, including its sibling exact sessions. Multiple exact-session ledgers from one source group are grouped under one root-group key.

### Explicit promotion contract

Every reliability signal now carries `ccm-provider-reliability-cross-session-promotion-contract-v1`.

Promotion requires all of the following:

- enough distinct root groups, default 2;
- enough fresh root groups after half-life decay, default 2;
- minimum per-source and total weighted evidence;
- no root group exceeding the maximum evidence share, default 0.8;
- privacy redaction and guidance-only/local-first semantics.

Failure is explicit and closed with statuses such as:

- `insufficient_independent_group_diversity`;
- `insufficient_fresh_group_diversity`;
- `insufficient_decayed_evidence`;
- `single_group_evidence_dominance`;
- `eligible_guidance`.

Even eligible signals cannot override the target group's local hold/allow policy.

### Bounded source scanning

Source inventory is bounded by distinct root groups and by a per-group recent-ledger cap. A group with many conversations cannot consume the entire scan budget and crowd independent groups out of the promotion sample.

### Memory Center

The cross-group Provider reliability quality check now validates:

- root-group, session and ledger count consistency;
- exact promotion-contract schema and status;
- same-group sessions counting as one group;
- time-decay and privacy gates;
- fresh-group thresholds;
- single-group evidence-share threshold;
- guidance-only and local-first behavior.

Promotion gaps are surfaced in the quality report instead of being silently accepted.

## Verification

New test:

`npm run test:provider-reliability-exact-session-promotion`

Result: 14/14 checks passed.

Coverage includes:

- one exact session cannot promote;
- two sessions from one group still count as one group;
- all target-group sibling sessions are excluded;
- a second independent group can enable guidance;
- a single group cannot crowd the bounded source scan;
- old evidence loses promotion through decay;
- dominant single-group evidence fails closed;
- exact-session ledgers and Markdown remain separate;
- the real assignment-binding to receipt-validation call chain writes exact-session typed memory;
- no bare-group typed-memory pollution;
- provenance reports redacted group/session/ledger diversity;
- Memory Center enforces the promotion contract;
- private project/task sentinels do not cross the aggregate boundary.

Regression checks passed:

- Phase 155 cross-group Provider reliability guidance;
- Phase 156 Provider reliability snapshot ranking;
- Memory Center Provider reliability guidance and snapshot ranking;
- Phase 298 Provider native compact session capacity;
- Phase 299 Provider compact generation reset;
- Phase 300 Provider generation restart reconciliation;
- Phase 304 Worker compact session strategy isolation;
- Phase 305 exact-session compact distillation;
- group-memory resume integration;
- group auto-compaction session scope;
- compact-hook session isolation;
- global-Agent global-only context;
- Provider native compact execution receipt.

Full `npm run build` passed for frontend, MCP Feishu integration and backend.

## Production Verification

- URL: `http://localhost:3081`
- PID: `31020`
- command: `D:/nodejs/node.exe ccm-package/dist/server.js 3081`
- home: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200, 189062 bytes
- targeted Memory Center quality API: HTTP 200, 12768 bytes
- Provider reliability quality status: `empty` because production currently has no eligible source rows; promotion gap count is 0
- stderr: 0 bytes
- log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase306.log`
- error log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase306.err.log`

## Remaining Direction

The long-term goal remains active. The next audit should apply the same exact-session evidence and explicit promotion rule to other child-Agent feedback families that can influence cross-session ranking, repair prioritization or global guidance.
