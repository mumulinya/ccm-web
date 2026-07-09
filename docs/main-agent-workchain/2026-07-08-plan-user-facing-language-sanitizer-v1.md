# Plan User-Facing Language Sanitizer v1

Date: 2026-07-08

## Goal

Make the group main Agent and global main Agent plan views read like a user-facing work plan instead of exposing internal coordinator wording. The underlying structured protocol still keeps main/child Agent roles for routing and technical details.

## Changes

- Added `sanitizeUserFacingPlanText` in `frontend/src/utils/agentDisplay.js`.
- Converted plan confirmation copy from internal role language to user language:
  - "确认后我才会..."
  - "安排执行成员"
  - "技术记录默认放在技术详情里"
- Applied the same sanitizer to:
  - `TaskExperienceCard.vue` plan approval cards, plan steps, execution boundaries, acceptance lists, work order preview, and confirmed-plan follow-up.
  - `ProjectTaskIntakeMessage.vue` top intake summary, including hiding `coordinator` as `我会统一跟进`.
  - group task action confirmation prompts.
  - usability workbench plan revision prompts.
  - project tool configuration helper text.
- Updated render regression assertions to verify:
  - group intake plan approval uses "我" language.
  - plan approval does not visibly show `主 Agent` or `子 Agent`.
  - group intake top summary hides `coordinator`.
  - global plan copy uses "安排执行成员".

## Validation

Planned:

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run test:render-regression`
