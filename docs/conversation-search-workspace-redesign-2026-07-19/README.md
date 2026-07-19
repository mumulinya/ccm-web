# Conversation Search Workspace Redesign

## Goal

Turn the sparse conversation search page into a focused, production-style search workspace without changing its storage or backend search behavior.

## Changes

- Added a compact page identity and grouped the query, filters, and primary search action into one command area.
- Rebuilt source selection as a restrained segmented navigation with a separate saved-messages entry.
- Moved advanced filters into a structured panel with active-filter count, reset, and apply actions.
- Replaced full-width history lines with responsive recent-search items that show source, role/time constraints, timestamp, and a clear reopen affordance.
- Added useful loading, empty, failure, favorites, and no-results states.
- Search results now render as repeated message cards with clearer source, session, role, timestamp, context, task, attachment, favorite, copy, Markdown, and open-conversation actions.
- Replaced textual symbols with Lucide icons.
- Preserved the existing API, recent-search local storage, favorites, pagination, filtering, highlighting, and conversation navigation behavior.

## Responsive Behavior

- Search actions wrap into a two-row command area on narrow screens.
- Advanced filters use six, three, or two columns according to available width.
- Recent searches change from two columns to one column on mobile.
- Result cards remain inside the available content width.

## Verification

- A real local search for `你好` returned and rendered 1 result.
- Clearing the query returned to the recent-search view with the new history item intact.
- Advanced filters rendered all 6 standard fields.
- Desktop layout had no horizontal overflow.
- At 390 by 844, filters rendered in two columns, the result card stayed within the content area, and no horizontal overflow occurred.
- Browser console errors: 0.
- `npm run build:frontend`: passed with 2,076 modules transformed.
- `npm run check`: passed.
- No paid Provider or model calls were made.
