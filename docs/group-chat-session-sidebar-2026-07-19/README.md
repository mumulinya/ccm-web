# Group Chat Session Sidebar

## Goal

Move group-chat session management from the top dropdown into a persistent left sidebar that follows the Global Agent conversation model.

## Behavior

- Desktop opens the session sidebar by default; it can be collapsed and restored with panel icons.
- Mobile uses the same sidebar as an overlay drawer with a dismissible scrim and closes it after session selection.
- Active and archived sessions are shown separately with message counts.
- New, select, rename, archive, and delete actions are available directly from the sidebar.
- The former session dropdown, add button, and duplicate session menu were removed from the top header.
- Rename, archive, and delete now receive an exact session ID. Acting on a sibling session no longer clears or reloads the current conversation.
- Deleting the active session still follows the backend-selected replacement session and reloads its transcript and memory state.

## Verification

- `npm run build:frontend`: passed with 2,076 modules transformed.
- `npm run check`: passed for backend and Feishu MCP TypeScript projects.
- Production CSS contains the desktop sidebar, collapsed state, mobile scrim, and expand control.
- Source check confirms the old group-session dropdown is no longer rendered.

No Provider or paid model calls were made.
