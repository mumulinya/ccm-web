# Phase 323: Post-compact Invoked Skill Attachment

Date: 2026-07-15

## Goal

Match Claude Code's post-compact invoked Skill attachment behavior for CCM group sessions. A Skill that was actually invoked in the current `gcs_*` session must remain usable after compaction by restoring its current controlled `SKILL.md` or prompt body, not only its name.

## Delivered

- Added exact `group_id + gcs_*` invoked Skill collection from messages, receipts, runtime tooling, delivery summaries, and work events.
- Deduplicates by Skill name and orders attachments by most recent invocation.
- Reads only the current controlled Skill catalog:
  - CCM internal `templates/skills/<name>/SKILL.md`.
  - Managed packages under `SKILL_PACKAGES_DIR`.
  - Catalog prompt Skills as synthesized Skill markdown.
- Matches Claude Code budgets:
  - Maximum 5,000 tokens per Skill.
  - Maximum 25,000 tokens for all invoked Skills.
  - Head-preserving truncation.
- Records catalog drift when the historical invocation hash no longer matches current content.
- Added a body-free, checksum-verifiable receipt:
  - `ccm-group-post-compact-invoked-skill-attachment-v1`.
  - Stores names, hashes, counts, token budgets, drift diagnostics, and a manifest checksum.
  - Rejects tampering, cross-group verification, and cross-session verification.
- Integrated the attachment into:
  - Full group compaction.
  - Partial compact sidecar segments.
  - Synchronous group memory snapshots.
  - Group main Agent context packets.
  - Child Agent memory bundles.
  - Self-contained third-party Worker prompts and runtime packets.
- The attachment restores execution method context only. It does not expand runtime tool or Skill authorization.
- Added a Memory Center panel that exposes body-free diagnostics only.

## Isolation

- The source is the complete current session message array supplied by the exact group session operation.
- There is no group-level or sibling-session fallback.
- Other `gcs_*` sessions and other groups cannot contribute Skill bodies.
- Raw group transcript JSON and `tasks.json` are not modified by the projection.

## Verification

Phase 323 restart self-test: 31/31 passed.

- Newest invocation ordering.
- 5K per-Skill and 25K aggregate budgets.
- Head preservation under truncation.
- Full, partial sidecar, and synchronous snapshot consistency.
- Main Agent and final third-party Worker prompt delivery.
- Body-free receipt, tamper rejection, cross-group rejection, and cross-session rejection.
- Catalog drift diagnostics.
- Restart persistence.
- Raw transcript immutability.
- Memory Center diagnostics and panel presence.

Key regressions:

- Phase 322 post-compact file restore dedup: 25/25.
- Phase 321 post-compact child task status: 28/28.
- Phase 320 compaction summary input projection: 21/21.
- Compact restart soak: 11/11.
- Compaction hook exact-session isolation: 27/27.
- Full `npm run build`: passed.
- Focused `git diff --check`: passed; line-ending warnings only.

## Completion Meaning

The production memory path is now approximately 98% complete for the requested Claude Code-style behavior. The long-term goal remains active so future Claude Code source changes and newly discovered edge semantics can be audited without treating the current system as incomplete or unusable.
