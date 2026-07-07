# Phase 21 - External Claude Include Approval Ledger

## Goal

Move CCM closer to Claude Code's external `CLAUDE.md` include safety model by adding a durable warning/approval ledger for project and managed Claude memory includes that point outside the approved memory root.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
  - `D:\claude-code\src\interactiveHelpers.tsx`
  - `D:\claude-code\src\utils\config.ts`
- Claude Code detects external non-user memory includes with `getExternalClaudeMdIncludes()`.
- Claude Code suppresses repeated warnings with `hasClaudeMdExternalIncludesWarningShown`.
- Claude Code allows loading external includes after `hasClaudeMdExternalIncludesApproved`.
- User memory external includes are not warned the same way as project/managed memory.

## Implementation

- Added `ccm-claude-memory-external-include-approval-ledger-v1`.
- Added per-group ledger file:
  - `.claude-external-include-approvals.json`
  - stored under the group's typed `MEMORY.md` directory.
- Added exported APIs:
  - `getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId)`
  - `loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId)`
  - `approveGroupClaudeMemoryExternalInclude(groupId, input)`
  - `markGroupClaudeMemoryExternalIncludeWarningShown(groupId, input)`
- Project and managed external includes now:
  - show up as `external_include_skipped`;
  - carry `approvalRequired: true`;
  - expose `approvalKey`;
  - populate `externalIncludeApproval.pendingExternalIncludes`;
  - set `shouldShowWarning` until warning has been marked shown.
- Approved external includes are imported on later memory imports and become normal typed memory docs.
- User external includes remain allowed by default, matching Claude Code's user-memory behavior.
- Child Agent and global Agent rendered context now mention pending external include approval state and ledger paths.

## Selftests

- Added `runGroupClaudeMemoryExternalIncludeApprovalSelfTest()`.
- The selftest verifies:
  - first project import skips an external include and requires approval;
  - the external include sentinel is not present before approval;
  - marking warning shown suppresses repeat warning;
  - approving the include persists to the ledger;
  - a second import loads the approved external include;
  - typed memory recall can find the approved include sentinel.

## Operational Memory

- This is not yet a UI prompt, but it gives CCM the same core state machine Claude Code uses:
  - detect external include;
  - warn once;
  - persist approval;
  - load only after approval.
- The approval is group-scoped, which fits CCM's multi-group architecture better than one global process flag.
- External include approvals become part of the source audit surface, so future child Agent sessions can see why an include was loaded or skipped.

## Still Open

- A UI/API route still needs to call the approval and warning APIs from real user interaction.
- Full setting-source enable/disable parity is still incomplete.
- First-class `InstructionsLoaded` hook execution remains future work.
- Include extraction is still conservative rather than a full Markdown lexer clone.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - full dist memory regression including `runGroupClaudeMemoryExternalIncludeApprovalSelfTest()`

Dist regression result:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
  "projectImport": true,
  "projectImportContext": true,
  "globalClaudeImport": true,
  "globalClaudeImportContext": true,
  "externalApproval": true,
  "reloadAudit": true,
  "distill": true,
  "distillQuality": true,
  "sourceManifest": true,
  "context": true,
  "globalContext": true,
  "warning": true,
  "preserved": true,
  "audit": true,
  "timeBased": true,
  "partial": true,
  "sidecar": true,
  "ptl": true,
  "recovery": true,
  "micro": true,
  "hook": true,
  "quality": true,
  "integration": true,
  "auto": true
}
```
