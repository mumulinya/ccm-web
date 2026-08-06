# Group Chat Dropdown Switcher

## Changes

- Replaced the horizontal group-card strip with one native group selector.
- Each option contains only the group name.
- Selecting an option continues to use the existing group-selection flow, so the left session sidebar, messages, memory state, and tools switch together.
- Preserved the separate new-group command.
- Removed the old expanded/collapsed group-list state, toggle controls, card styling, and mobile list behavior.
- Added desktop and mobile sizing for the selector.

## Verification

- `npm run build:frontend`: passed with 2,076 modules transformed.
- No Provider or paid model calls were made.
