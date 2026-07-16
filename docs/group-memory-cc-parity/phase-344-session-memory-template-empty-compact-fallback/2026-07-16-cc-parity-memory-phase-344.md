# CCM Memory Phase 344: Dynamic Template Empty Compact Fallback

Date: 2026-07-16

## Goal

Prevent a Session Memory file that still contains only its configured template from being treated as useful compact context, even when a stale or incorrect snapshot says `hasSummary=true`.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\prompts.ts`
- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`

Claude Code compares Session Memory content with the currently resolved `template.md`. If they are equal after trimming, Session Memory is empty and compact falls back to the legacy summary path instead of injecting headings and template instructions as conversation memory.

## Previous Gap

CCM's session-memory-first compact selection checked the exact session, snapshot and Markdown paths, checksum, extraction state, cursor, API message invariants, and projected token budget. Its empty check trusted only `snapshot.hasSummary`.

That flag did not prove that `summary.md` contained content below the template descriptions. A template-only file with `hasSummary=true` and a matching checksum could therefore be selected, especially after custom templates made the empty structure session-specific.

## Implementation

Session Memory customization now lives in a dependency-light shared module:

- `backend/modules/collaboration/group-session-memory-customization.ts`

Model extraction, compact selection, Memory Center, and external tests use the same parser, default template, global/exact inheritance rules, checksums, and file locations. This avoids a `compaction -> extraction -> memory -> compaction` import cycle.

The shared template-state inspector:

- resolves the exact-session template before the global template;
- falls back to the built-in 10-section template;
- normalizes CRLF and trailing whitespace;
- compares the complete Markdown with the resolved template;
- returns only body-free scope, source, checksum, section count, and `templateOnly` evidence.

Compact selection now verifies the Markdown checksum first and then rejects template-only content with `session_memory_empty_template`. A separate `session_memory_snapshot_has_no_summary` reason covers a populated file whose snapshot explicitly says it has no summary.

## Receipt And Compatibility

New `ccm-group-session-memory-compact-selection-v1` receipts use contract version 2 and bind:

- `template_empty_checked`
- `template_only`
- `template_scope_id`
- `template_source`
- `template_checksum`
- `template_section_count`

A selected version 2 receipt is invalid unless the template check ran, the content is not template-only, the template scope matches the exact `group--gcs_*` scope, and a valid source/checksum/section contract is present. Empty-template fallback receipts must carry affirmative empty evidence.

Existing version 1 receipts remain valid for restart and replay. Their historical checksum is verified without retroactively requiring fields that did not exist when they were committed.

## Visibility And Isolation

The group main-Agent and project child-Agent memory context now states which template source was checked, its exact scope, section count, checksum, and whether the file was template-only. Memory Center shows the same evidence beside Session Memory compact selection.

No template body is copied into the receipt. Sibling `gcs_*` sessions resolve and bind their own exact templates. Global Agent remains outside group Session Memory and continues consuming only global context.

## Verification

Dedicated restart test:

```text
PHASE344_RESULT={"checks":17,"passed":17}
```

Coverage includes exact template-only fallback, stale `hasSummary=true`, CRLF normalization, populated selection, version 2 verification, sibling exact-template isolation, false snapshot summary handling, receipt tamper rejection, legacy version 1 compatibility, boundary restart, body-free storage, group/child context visibility, Memory Center visibility, and raw transcript immutability.

Adjacent regressions:

```text
Phase 343 custom template: 20/20
Phase 342 custom prompt: 17/17
Phase 336 compact projection: 17/17
Phase 330 compact selection: 15/15
Boundary journal: 16/16
```

Release verification:

```text
npm run build: passed
npm run check: passed
npm run docs:check: 329 parity documents, 1023 links, 0 failures
runtime template API: ccm-group-session-memory-custom-template-profile-v1, 10 default sections
runtime compact selection contract: version 2 present in production output
desktop 1280x720: no page overflow, prompt/template controls visible, 0 console errors
mobile 390x844: no page overflow, customization panel visible, 0 console errors
```

## Result

Session Memory compact reuse now depends on real content, not a mutable summary flag. Dynamic global and exact-session templates are part of the compact trust boundary, while legacy receipts and sibling-session isolation remain intact.
