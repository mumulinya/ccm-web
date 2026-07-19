# Memory Center live token display

## Problem

Memory Center displayed `0 tokens` for a group session that had messages and memory facts. The UI was reading only `compaction.postCompactTokenCount`, which is naturally empty before the first successful compaction.

## Change

- Group-session summaries now expose the latest context-pressure token sample as `currentTokens`.
- If no pressure sample exists, the backend estimates the exact session messages.
- The response also includes the effective automatic threshold, remaining tokens, pressure percentage, message count, source, and sample timestamp.
- Current usage may come from the latest pressure sample, but the displayed threshold always comes from the current Memory Center configuration rather than a stale historical sample.
- The sidebar displays `current / automatic threshold`.
- The detail strip displays current usage, automatic threshold, remaining tokens, and health.
- Historical before/after values appear only after an actual compaction.

This does not alter compaction thresholds or perform a compaction. It only exposes runtime data already used by the compaction engine.

## Verification

- `npm run test:memory-center-live-token-display`: `14/14`
- backend build: passed
- frontend build: passed, `2,059` modules
- production overview after restart: current `2,166`, threshold `460,000`, remaining `457,834`, effective window `496,000`
- in-app browser visual verification: passed
- real Provider calls: `0`
