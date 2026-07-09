# MCP Skill Goal Completion Audit

## Why

The CCM MCP/Skill work now has many separate proofs: authorization inventory, runtime sync, runner gates, marketplace source proof, runtime resync, invocation audit, and chain verification. Without a machine-readable completion audit, it is too easy to mistake partial coverage for the full long-running goal.

This change adds an explicit audit report that maps the user goal to concrete evidence and keeps the goal incomplete when critical proof is missing.

## What Changed

- Added `ccm-mcp-skill-goal-completion-audit-v1`.
- Added `GET /api/tools/mcp-skill-goal-audit`.
- The audit currently evaluates:
  - central project/group authorization catalog;
  - runtime dispatch gate readiness;
  - runtime artifact delivery and resync state;
  - observed child-agent MCP/Skill invocation evidence;
  - unauthorized attempt blocking;
  - marketplace source lifecycle and runtime bridge evidence;
  - real Claude Code, Cursor, and Codex CLI E2E proof.
- The audit can report `complete`, `partial`, or `incomplete`.
- Real CLI E2E remains a required proof item and is marked missing unless explicit evidence is supplied.
- Self-tests now prove the audit can reach `complete` only with full synthetic evidence and stays `incomplete` when real CLI and marketplace evidence are missing.

## Affected Files

- `backend/modules/tools/tools.ts`
  - `buildMcpSkillGoalCompletionAudit`
  - `/api/tools/mcp-skill-goal-audit`
  - `runToolChainVerificationSelfTest`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`

## Risks And Notes

- This audit is intentionally conservative. It should not mark the long-running goal complete based only on artifact-level self-tests.
- Current-state marketplace evidence is read from recent marketplace operation audit entries.
- Real CLI E2E still needs a separate runner/probe flow with actual Claude Code, Cursor, and Codex availability.
