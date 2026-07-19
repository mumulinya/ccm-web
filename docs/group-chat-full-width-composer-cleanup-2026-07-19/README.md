# Group Chat Full-Width Composer Cleanup

## Changes

- Removed the 1120px maximum width from the group message flow.
- Removed the 1120px maximum width from the group composer region.
- Reduced wide-screen horizontal padding so the workspace uses the full area to the right of the session sidebar.
- Added a backward-compatible `showTemplateButton` option to `ChatComposer`.
- Disabled the visible template/book button for group chat only; attachment support and template infrastructure remain available elsewhere.

## Verification

- `npm run build:frontend`: passed with 2,076 modules transformed.
- The production bundle includes the full-width group layout and conditional template-button rendering.
- No Provider or paid model calls were made.
