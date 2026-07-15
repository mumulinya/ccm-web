# Interaction Action Required Coverage

## Summary

Added dedicated required-check coverage for browser interaction actions: hover, drag/drop, scroll, and history/reload navigation. TestAgent now treats these as concrete browser evidence instead of allowing a generic browser e2e result to satisfy interaction-specific requirements.

## Changed

- Added `browserHoverSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserDragSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserScrollSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserHistorySignal(...)` in `backend/test-agent/required-checks.ts`.
- Extended `runTestAgentRequiredCheckCoverageSelfTest` with interaction-action fixtures.
- Added `runTestAgentBrowserHoverActionSelfTest`.
- Added `runTestAgentBrowserHistoryNavigationActionSelfTest`.

## Mapped Checks

- Hover checks:
  - `browser_hover`
  - `hover`
  - `hover_action`
  - `hover_interaction`
- Drag/drop checks:
  - `browser_drag`
  - `drag`
  - `drag_drop`
  - `drag_and_drop`
- Scroll checks:
  - `browser_scroll`
  - `scroll`
  - `scroll_action`
  - `scroll_position`
- History/reload checks:
  - `browser_history`
  - `history`
  - `history_navigation`
  - `browser_reload`
  - `reload`
  - `browser_back`
  - `browser_forward`

## Evidence Rules

- `browser_hover` requires passing hover action evidence such as `action:hover`.
- `browser_drag` requires passing drag/drop action evidence such as `action:dragTo`.
- `browser_scroll` requires passing scroll action evidence such as `action:scroll`.
- `browser_history` and `browser_reload` require passing history/reload action evidence such as `action:goBack`, `action:goForward`, or `action:reload`.
- Failed matching actions mark the matching required check as `not_verified`.
- Generic browser evidence leaves these specialized checks `unknown`.

## Why

Many web features only exist through direct browser interaction: hover menus, drag/drop boards, below-fold CTAs, and history/reload persistence. A normal page render or text assertion does not prove that these flows work. These checks let the group main agent ask TestAgent for specific browser-operation evidence before accepting a project-agent delivery.

## Verification

Ran:

- `runTestAgentRequiredCheckCoverageSelfTest`
- `runTestAgentBrowserHoverActionSelfTest`
- `runTestAgentBrowserHistoryNavigationActionSelfTest`
- `runTestAgentBrowserDragToActionSelfTest`
- `runTestAgentBrowserScrollActionSelfTest`

Also ran TypeScript compile checks for:

- `backend/test-agent/index.ts`
- `backend/test-agent/cli.ts`
