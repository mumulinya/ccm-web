# Group Chat Workspace Visual Refresh

## Goal

Turn the group chat screen into a quieter collaboration workspace without changing group, session, Agent dispatch, attachment, context-meter, or tool behavior.

## Changes

- Reworked the group switcher into a compact workspace strip with clearer active state and restrained member metadata.
- Tightened the current-group/session toolbar while preserving every existing action.
- Centered the message stream on a shared 1120px reading axis and constrained conversational bubbles independently from task cards.
- Added a compact error-message presentation so short provider failures no longer stretch across most of the viewport.
- Routed ordinary Agent replies through the existing user-facing sanitizer and collapsed excessive blank lines.
- Grouped turn controls and the composer into one stable bottom region aligned with the message stream.
- Added responsive widths for desktop, tablet, and mobile layouts.

## Verification

- `npm run build:frontend`: passed.
- `npm run check`: passed.
- Direct sanitizer assertion for excessive message newlines: passed.
- Compiled CSS contains the message-error, centered-flow, and composer-region selectors.
- Automated browser screenshot verification was attempted against the local development page, but the browser-control URL policy blocked access. No alternate browser-control path was used.

No Provider or paid model calls were made.
