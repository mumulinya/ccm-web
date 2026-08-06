# Music Immersive Experience

## Scope

This update completes the six requested atmosphere and playback experience upgrades without changing music-provider or library data behavior.

## Experience

1. The current cover is sampled in the browser to derive primary, accent, and secondary colors. A deterministic title-based palette is used when pixels cannot be read.
2. The header fullscreen icon opens a viewport-filling immersive mode. It keeps the cover, lyrics, next recommendation, and playback controls while hiding the library.
3. Existing Web Audio bass and treble measurements now gently affect backdrop light, cover saturation, panel borders, and the soundscape line. Paused playback returns the variables to zero.
4. Lyrics remain separate from danmaku. The active line stays centered, adjacent lines retain readable context, and past lines recede.
5. Background, cover, title, artist, lyrics title, and mini-player art transition together when the track changes. Background and cover layers crossfade without a blank frame.
6. On mobile the mini player is fixed above navigation. Its collapsed state shows track and play controls; its expanded state adds transport, queue, time, mute, and volume controls.

## Safety

- Palette extraction uses a request generation so a late image cannot recolor a newer track.
- Cross-origin or unreadable covers use the deterministic fallback palette.
- Reduced-motion preferences disable nonessential transitions and animations.
- The mobile content area reserves space for the fixed player and its expanded state.

## Verification

- Frontend production build.
- TypeScript workspace check.
- Desktop normal and immersive screenshots.
- Mobile collapsed and expanded player assertions.
- Cover palette CSS variable assertion.
- Library, playlist, assistant, download center, queue-scroll, and responsive regression.
- Mocked music APIs only; paid provider calls: 0.
