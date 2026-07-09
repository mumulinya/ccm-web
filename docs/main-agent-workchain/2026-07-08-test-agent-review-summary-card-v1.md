# TestAgent Review Summary Card v1

## Completed

- Added a user-visible independent review summary in the task experience card.
- The summary can read review evidence from:
  - `delivery_report.independent_review`
  - `delivery_report.independentReview`
  - delivery report `复核结论` sections
  - workchain `completion_summary.independent_review`
  - independent review gate evidence
- The card translates raw review terms such as `passed`, `failed`, `blocked`, `accept`, `needs rework`, and `verdict` into Chinese user-facing wording.
- The card keeps technical material out of the primary view:
  - raw verdict payloads
  - artifact paths
  - traces and sessions
  - stack/debug wording
- Render regression now checks that the TestAgent review summary is visible, friendly, and does not leak raw `verdict` or `passed` wording.

## Boundary

- This change does not modify TestAgent business logic.
- TestAgent still owns its handoff conversion, execution plan, browser checks, artifacts, report, and verdict generation.
- The main/global Agent UI only consumes the already-produced review evidence and makes it understandable to the user.

## Files

- `frontend/src/components/tasks/TaskExperienceCard.vue`
- `frontend/visual-regression/main-agent-display-fixture.js`
- `scripts/main-agent-decision-ui-selftest.mjs`
- `scripts/main-agent-render-regression.mjs`

## Validation

- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`
