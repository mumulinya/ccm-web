# Workchain CC-Style Todo Plan V1

## Completed

- Added a unified `ccm-main-agent-workchain-todo-v1` plan to the shared main-Agent workchain.
- The plan follows the Claude Code TodoWrite shape more closely:
  - every step has `content`
  - every step has `activeForm` / `active_form`
  - at most one step is `in_progress`
  - completed steps can be kept quiet by display policy
- Ordinary conversation still carries a hide policy, so normal Q&A does not show a Todo panel.
- Added a structural verification reminder:
  - if 3+ workchain steps are completed without a verification/review/check step or evidence, the workchain emits `ccm-main-agent-plan-verification-reminder-v1`.
  - this mirrors Claude Code's verification nudge before final summaries.

## Files

- `backend/agents/workchain.ts`
- `scripts/main-agent-decision-ui-selftest.mjs`

## Validation

- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- compiled `runMainAgentWorkchainSelfTest()`

## Notes

- This does not replace existing group live Todo or global stream Todo rendering.
- It gives both group and global surfaces a stable backend workchain source for plan steps, active wording, and verification reminders.
