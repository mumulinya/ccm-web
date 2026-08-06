# Music Cover-Adaptive Theme And Space Control

## Theme

- Removed fixed purple from the soundscape spectrum, seek progress, playback glow, active queue wash, assistant message surfaces, and primary library controls.
- Spectrum canvas colors are read from the current cover palette and refreshed without forcing style calculation on every animation frame.
- The base surface uses neutral charcoal and blue-gray colors.
- Cyan is reserved for playback and selection state.
- Source identity remains semantic: local cyan, Bilibili pink, and NetEase red.
- Unreadable cover pixels continue to use the deterministic fallback palette.

## Keyboard Control

- Space toggles play and pause while the music page is active.
- Space does not run while focus is in an input, textarea, select, button, editable region, or modal dialog.
- Repeated keydown and modified shortcuts are ignored.
- The shortcut prevents page scrolling when it handles playback.

## Verification

- Frontend production build.
- TypeScript workspace check.
- Music render regression verifies play, pause, page scroll stability, and input exclusion.
- Desktop, immersive, and mobile screenshots.
- Mocked browser media methods and music APIs; paid provider calls: 0.
