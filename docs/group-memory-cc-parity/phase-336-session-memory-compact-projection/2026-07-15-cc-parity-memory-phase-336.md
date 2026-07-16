# CCM Memory Phase 336: Session Memory Compact Projection

Date: 2026-07-15

## Goal

Close the large-memory compact gap against Claude Code without modifying or permanently distilling the original group Session Memory. Compact must consume a bounded, section-aware projection that respects the model payload gate, remains exact-session scoped, and can be configured by the user in Memory Center.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\prompts.ts`
- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`

Claude Code gives Session Memory a normal total budget of 12,000 tokens and approximately 2,000 tokens per top-level Markdown section. Before compact reuse it projects the file again, truncates at line boundaries, includes an explicit section-truncated marker, and points the model to the complete Session Memory file when truncation occurs. The source file is not rewritten by this operation.

## Previous Gap

CCM verified `summary.md`, its snapshot, exact `group + gcs_*` scope, cursor, checksum, and API invariants, but then passed the complete Markdown into the true post-compact payload gate. A very large historical or manually edited Session Memory could therefore reach the auto-compact threshold and incorrectly fall back to traditional compaction.

## Implementation

### Read-only section projection

`backend/modules/collaboration/group-memory-compaction.ts` now provides:

- `buildGroupSessionMemoryCompactProjection()`
- `verifyGroupSessionMemoryCompactProjection()`
- `ccm-group-session-memory-compact-projection-v1`

The projection:

- splits on top-level `# ` Markdown sections;
- defaults to 2,000 tokens per section and 12,000 tokens total;
- truncates only at line boundaries and adds `[... section truncated for length ...]`;
- includes the complete `summary.md` path whenever content is truncated or omitted;
- leaves the original Markdown, snapshot, and checksum unchanged;
- stores a body-free receipt bound to `group + gcs_*`, source and projected checksums, file path, section counts, token estimates, and configured budgets.

Session Memory selection now evaluates the projected Markdown with the existing true post-compact payload gate. The final model input is therefore bounded both by the CC-style projection and by the actual model auto-compact threshold.

### User configuration

The orchestrator configuration and Memory Center expose:

```text
sessionMemoryCompactMaxSectionTokens = 2000
sessionMemoryCompactMaxTotalTokens = 12000
```

Users may set section budgets from 250 to 20,000 tokens and total budgets from 1,000 to 100,000 tokens. The total cannot be smaller than the section budget. These values control only the compact-time model projection; they do not rewrite the complete Session Memory.

### Visibility and isolation

- Memory Center shows original/projected tokens, truncated sections, and the complete source path.
- Controlled project child-Agent context receives the same projection evidence and source path.
- Sibling group sessions cannot reuse the projection or source snapshot.
- Global Agent remains outside the group Session Memory path and continues using only global context.
- Existing pre-projection v1 selection receipts remain restart-compatible.

## Verification

Dedicated restart test:

```text
PHASE336_RESULT={"checks":17,"passed":17}
```

It covers a huge single line, line-boundary truncation, multiple sections, per-section and total budgets, large-memory selection rather than traditional fallback, source immutability, receipt tamper rejection, exact-session isolation, restart recovery, body-free storage, Memory Center visibility, child-Agent visibility, Global Agent separation, CC defaults, custom persistence, and invalid configuration rejection.

Adjacent regressions:

```text
Phase 330 Session Memory compact selection: 15/15
Phase 331 API invariant closure: 14/14
Phase 332 post-compact session reset: 14/14
Phase 335 prompt-cache cause attribution: 18/18
npm run check: passed
npm run build: passed (frontend, MCP Feishu, backend)
```

## Result

A 3MB Session Memory is no longer sent whole and is not arbitrarily rewritten. CCM keeps the complete file as the source of truth, produces a CC-compatible bounded projection for model use, records exactly what was projected, and lets the user adjust the projection budget in Memory Center.
