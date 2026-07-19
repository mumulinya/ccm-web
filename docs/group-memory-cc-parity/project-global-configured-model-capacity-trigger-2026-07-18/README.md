# Project and global configured model-capacity trigger

## Correction

The `10K / 5 messages / 40K` Session Memory window decides how much recent raw conversation is retained after compaction. It does not decide when automatic compaction starts.

Automatic compaction now uses the same configured model-capacity resolver for group, project, and Global Agent sessions:

```text
configured context window
  -> subtract reserved model output capacity
  -> subtract automatic-compaction safety buffer
  -> apply the configured threshold when present, capped by safe capacity
```

## Effective presets

- `Automatic`: default `200K` capacity produces a `167K` automatic threshold unless trusted Provider capacity supplies a different window.
- `516K`: configured threshold `460K`.
- `1M`: configured threshold `900K`.
- `Custom`: uses the saved context window and automatic threshold after backend validation.

There is no project/global `50K` automatic fallback anymore. Manual `/compact` remains independent of the automatic threshold.

## Implementation

- `backend/modules/projects/project-session-compaction.ts`
- `backend/agents/global/memory.ts`
- shared resolver: `backend/modules/collaboration/group-compaction-strategy.ts`

Both compact results now record the resolved model capacity and effective automatic threshold for diagnosis.

## Verification

- dynamic window and capacity test: `23/23`
- project session binding/compaction test: `56/56`
- Global Agent model compaction test: `24/24`
- real Provider calls: `0`
