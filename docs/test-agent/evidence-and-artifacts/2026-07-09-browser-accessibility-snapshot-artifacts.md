# Browser Accessibility Snapshot Artifacts

## Summary

Added Playwright accessibility snapshot evidence artifacts for standalone TestAgent browser checks. TestAgent now saves a replayable text snapshot of the accessible page structure after each real Playwright browser check, so a group-main-agent or human reviewer can inspect accessibility-facing evidence in addition to screenshots, DOM snapshots, console logs, and network logs.

## Added

- New business helper:
  - `backend/test-agent/browser/accessibility-snapshot-artifacts.ts`
- New browser evidence artifact type:
  - `accessibility_snapshot`
- New manifest file type:
  - `browser_accessibility_snapshot`
- New manifest summary field:
  - `browserAccessibilitySnapshots`
- New capability profile entry:
  - `browser_accessibility_snapshot_artifacts`
- New required-check coverage mapping:
  - `browser_accessibility_snapshot`
  - `accessibility_snapshot`
  - `a11y_snapshot`
- New self-test:
  - `runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest`

## Behavior

For Playwright browser checks, TestAgent writes:

```text
accessibility-snapshots/<project>-<check>-<index>.aria.txt
```

The artifact uses Playwright `locator.ariaSnapshot()` when available and falls back to a conservative DOM-derived accessibility outline when that API is not present. The manifest records it as `browser_accessibility_snapshot`, and the artifact verifier checks that the file is non-empty and contains role/name lines.

## Handoff Impact

When a handoff includes a browser surface, the handoff work-order builder now infers `browser_accessibility_snapshot` as a required check. This gives future group-chat orchestration a concrete evidence item to ask TestAgent for without changing the collaboration code yet.

## Verification

- Added a real Playwright self-test page with labeled inputs, button name/description, and live status text.
- The self-test verifies:
  - Playwright creates the `.aria.txt` artifact.
  - The snapshot includes user-facing accessible names.
  - The artifact manifest contains `browser_accessibility_snapshot`.
  - Required-check coverage marks `browser_accessibility_snapshot` verified.
  - The artifact verifier emits passing `browser_accessibility_snapshot_text` metadata.
