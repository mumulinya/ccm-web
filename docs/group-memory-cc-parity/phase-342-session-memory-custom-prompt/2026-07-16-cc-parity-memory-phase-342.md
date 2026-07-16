# CCM Memory Phase 342: Session Memory Custom Update Prompt

Date: 2026-07-16

## Goal

Let users tune Session Memory extraction from Memory Center without weakening exact-session isolation, bounded model input, signed replay, or the separation between group memory and Global Agent context.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\prompts.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

Claude Code loads an optional `session-memory/config/prompt.md`, performs single-pass `{{variableName}}` substitution, and uses the resolved prompt in its isolated Session Memory extraction agent.

## Previous Gap

CCM's Session Memory update policy was fixed in source code. Users could configure model capacity and compact projection in Memory Center, but could not tell Session Memory to emphasize domain-specific decisions, correction history, or exact artifacts. A single process-wide prompt would also have been insufficient for CCM because independent `gcs_*` sessions must not share an override accidentally.

## Implementation

CCM now supports two prompt levels:

- global default at `~/.cc-connect/session-memory/config/prompt.md`;
- exact-session override at `~/.cc-connect/group-session-memory/<groupId--gcs_*>/config/prompt.md`.

Exact-session configuration wins over global configuration. Resetting an exact override restores global inheritance without copying or mutating another session's file.

Supported single-pass variables are:

- `{{currentNotes}}`
- `{{notesPath}}`
- `{{scopeId}}`
- `{{groupId}}`
- `{{groupSessionId}}`

The resolved instructions are placed inside an immutable extraction envelope. They may alter emphasis, but cannot override the exact-session scope, evidence-only policy, tool prohibition, required output tags, fixed Session Memory structure, or size limits.

The expanded prompt is limited to 32,000 characters. Its token estimate is included in the fixed model-input budget, so customization cannot silently evade the 120,000-token extraction boundary.

## Replay And Visibility

Each request audit records:

- whether a custom prompt was configured;
- `default`, `global`, or `exact_session` source;
- resolved prompt checksum and character count;
- final extraction prompt checksum.

The compressed request artifact stores the resolved instructions required for deterministic replay. Replay verifies both the rebuilt final prompt and the custom-instruction checksum. Memory Center exposes global/exact editing, reset-to-inheritance, row-level source, and fleet totals. Audit records are body-free and do not duplicate the prompt text.

Global Agent remains unchanged and consumes only global context. It does not load group Session Memory prompt profiles.

## Verification

Dedicated test:

```text
PHASE342_RESULT={"checks":17,"passed":17}
```

The test covers global persistence, exact-session override, sibling-group isolation, variable substitution, fixed-budget accounting, immutable constraints, real model-extraction delivery, signed receipt binding, module-reload recovery, deterministic replay, reset inheritance, Memory Center backend totals, and UI controls.

Adjacent regressions:

```text
Phase 341 structured tool transcript: 15/15
Phase 340 canonical replay: 14/14
Phase 339 safe cursor advance: 12/12
Session Memory model extraction: 12/12
npm run check: passed
npm run build: passed
npm run docs:check: 327 parity documents, 1021 links, 0 failures
runtime API: passed
desktop 1280px and mobile 390px layout: no overflow, no console errors
```

## Result

Users can now tune what an isolated Session Memory extraction emphasizes for all group chats or one exact `gcs_*` conversation. The customization survives restart and replay while remaining bounded, auditable, and isolated from sibling group sessions and Global Agent context.
