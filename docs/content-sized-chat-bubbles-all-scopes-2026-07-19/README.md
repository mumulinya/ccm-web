# Content-Sized Chat Bubbles Across All Scopes

## Goal

Make ordinary user and Agent text bubbles follow their rendered text size instead of stretching to a fixed message area.

## Scope

- Group main Agent conversations.
- Global Agent conversations.
- Project Agent conversations.
- Music Assistant conversations.

## Behavior

- Ordinary text uses `width: fit-content`, `height: auto`, and zero artificial minimum dimensions.
- User messages remain right-aligned and Agent messages remain left-aligned.
- Long text still wraps within each page's responsive maximum width.
- Group Agent replies explicitly distinguish text-only output from task, delivery, work-event, orchestration, and file-change content.
- Global and project messages mark structured content separately so task cards, execution panels, reports, and code evidence retain a stable work area.
- Music Assistant text bubbles now size to their content while song-result lists can still expand naturally.

## Verification

- `npm run build:frontend`: passed with 2,076 modules transformed.
- Compiled GroupChat, GlobalAgent, ProjectManager, and MusicPlayer CSS assets all contain their content-sized rules.
- Structured-message selectors remain present in global and project production assets.
- No Provider or paid model calls were made.
