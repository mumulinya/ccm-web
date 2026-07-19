# Music Bottom Player Redesign

## Problem

The previous bottom player limited the seek bar to 200px and split the footer into fixed 35/30/35 percent sections. On wide screens this left a large empty area while the most important controls and timestamps stayed too small.

## Changes

- Moved the seek bar to the top edge and let it span the player width.
- Rebuilt the content as track information, transport controls, and time/volume sections.
- Replaced text and emoji controls with Lucide playback icons.
- Added a playback queue shortcut and a playing indicator on the cover.
- The queue shortcut changes the library view without scrolling the outer workspace.
- Enlarged the play target and improved seek/volume hover handles.
- Added a two-row mobile layout with track information above the controls.

## Verification

- Frontend production build.
- Music render regression on desktop and mobile.
- Queue shortcut regression verifies that changing the queue view never scrolls the workspace.
- No paid provider calls.
