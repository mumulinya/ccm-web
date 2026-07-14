# Workchain Todo Display Bridge v1

## Completed

- Added a display-stream bridge for the unified main-agent workchain todo plan.
- `buildMainAgentDisplayStream(...)` now exposes:
  - `todo_plan`
  - `todoPlan`
  - `verification_reminder`
  - `verificationReminder`
- Frontend display normalization now preserves `workchain.todo_plan` when rebuilding display streams from historical runs or mission records.
- `TaskExperienceCard` can render a workchain todo plan through the existing `MainAgentDecisionCard` when no explicit `mainAgentDecision` object is available.
- Ordinary conversation todo plans remain hidden through `display_policy.hide_for_ordinary_conversation`.
- Render regression now covers:
  - workchain todo rendered from `display_stream.workchain.todo_plan`
  - ordinary workchain todo hidden from the user
  - raw trace details folded by default

## TestAgent Boundary

- Read the TestAgent docs for:
  - handoff CLI input
  - dry-run execution plan
  - handoff contract validation
  - verdict artifact
- This change does not modify TestAgent business logic.
- Main/global Agent UI now has a stronger path to show the main-agent plan while TestAgent continues to own its own execution and verdict artifacts.

## Files

- `backend/modules/collaboration/display.ts`
- `frontend/src/utils/agentDisplay.js`
- `frontend/src/utils/taskExperience.js`
- `frontend/src/components/tasks/TaskExperienceCard.vue`
- `frontend/src/components/agents/MainAgentDecisionCard.vue`
- `frontend/visual-regression/main-agent-display-fixture.js`
- `scripts/main-agent-decision-ui-selftest.mjs`
- `scripts/main-agent-render-regression.mjs`

## Validation

- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- compiled `runMainAgentWorkchainSelfTest()`
- compiled `runCoordinatorReworkProtocolSelfTest()`
- `git diff --check` on touched files
