# Backend User-Visible Role Language V1

Date: 2026-07-08

## Goal

Continue aligning the global main Agent and group main Agent user experience with the Claude Code-style work chain:

- user-facing text should be friendly and understandable;
- internal role names and execution protocol details should stay in technical details or internal work orders;
- ordinary chat should remain plain and should not expose Todo/task machinery.

## Changes

- Added `backend/agents/user-facing-text.ts` as a shared backend sanitizer for user-visible role wording and protocol terminology.
- Connected the shared sanitizer to:
  - streamlined main Agent display;
  - workchain Todo/progress/checkpoint text;
  - unified delivery reports;
  - group status follow-up summaries;
  - group live clarification/task intake summaries;
  - global Agent visible replies, dispatch summaries, and direct dispatch output;
  - Agent QA and task-notification previews.
- Reworded visible defaults from internal labels such as `主 Agent`, `子 Agent`, `群聊主 Agent`, and `项目 Agent` toward `我`, `执行成员`, `协作群`, and `项目执行成员`.
- Kept internal work orders and execution contracts intact where third-party coding agents still need exact protocol wording.
- Fixed a build-blocking type mismatch in the group orchestrator replay-repair dispatch matcher by making the match score return shape consistent.

## Verification

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`

All listed checks passed.
