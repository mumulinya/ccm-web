# CCM Memory Phase 343: Session Memory Custom Template

Date: 2026-07-16

## Goal

Let users define the structure of Session Memory from Memory Center while preserving exact-session isolation, bounded model input, deterministic replay, compact projection, and the separation between group memory and Global Agent context.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\prompts.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

Claude Code loads an optional `session-memory/config/template.md`, falls back to a built-in template, initializes a new Session Memory file from that structure, preserves each heading and italic description during extraction, and uses the selected template when checking whether memory is still empty.

## Previous Gap

CCM already supported exact-session Session Memory, model extraction, custom update prompts, compact projection, receipts, and signed replay. Its output structure was still fixed in source code, so users could not adapt the memory schema for different project domains. A single process-wide template would also be unsafe for CCM because independent `gcs_*` conversations must not inherit one another's structure.

## Implementation

CCM now supports two template levels:

- global default at `~/.cc-connect/session-memory/config/template.md`;
- exact-session override at `~/.cc-connect/group-session-memory/<groupId--gcs_*>/config/template.md`.

Exact-session configuration wins over global configuration. Resetting an exact override restores global inheritance without copying or changing any sibling session.

A valid template contains 1 to 20 top-level sections. Every `# Heading` must be followed immediately by an `_italic description_` line. The parser rejects duplicate headings, nested headings, body content before the first section, NUL characters, missing descriptions, and files larger than 48,000 characters.

The resolved template drives the complete memory lifecycle:

- extraction prompt structure and section count;
- output validation and template-description filtering;
- merge quality scoring;
- model-input budget accounting;
- request audit and compressed request artifacts;
- receipt template binding and signed replay verification;
- compact-context projection.

The fixed extraction budget already includes the built-in template. Custom templates are therefore charged only for token growth above the default template, avoiding duplicate accounting at the 4,300-token boundary while preventing larger custom schemas from escaping the model-input limit.

## Replay And Compatibility

Each new extraction artifact records the resolved template checksum and section count. Replay rebuilds the request using that exact template and verifies its binding before accepting the result. Legacy artifacts without template metadata continue to replay against the built-in default template.

Memory Center exposes prompt and template tabs, global and exact-session selectors, save and reset-to-inheritance actions, client-side structure validation, row-level source/checksum/section visibility, and fleet totals.

Global Agent remains unchanged. It consumes only global context and does not load any group Session Memory template or group conversation history.

## Verification

Dedicated test:

```text
PHASE343_RESULT={"checks":20,"passed":20}
```

The test covers global persistence, sibling inheritance, exact-session override and isolation, parser rejection rules, dynamic extraction prompts, dynamic output validation, dynamic merge scoring, real model extraction delivery, receipt binding, compact projection, restart recovery, signed replay, reset inheritance, Memory Center backend fields, and UI controls.

Adjacent regressions:

```text
Phase 342 custom update prompt: 17/17
Phase 341 structured tool transcript: 15/15
Phase 340 canonical replay: 14/14
Phase 339 safe cursor advance: 12/12
Phase 336 compact projection: 17/17
Session Memory model extraction: 12/12
```

Release verification:

```text
npm run build: passed
npm run check: passed
npm run docs:check: 328 parity documents, 1022 links, 0 failures
runtime template API: ccm-group-session-memory-custom-template-profile-v1, 10 default sections
runtime fleet overview: custom-template global/exact/configured fields present
desktop 1280x720: no page overflow, template editor loaded, 0 console errors
mobile 390x844: no page overflow, responsive template editor, 0 console errors
```

## Result

Users can now control both what isolated Session Memory emphasizes and how it is structured, globally or for one exact `gcs_*` conversation. The chosen schema is bounded, auditable, replayable, compact-safe, isolated from sibling sessions, and never injected into Global Agent context.
