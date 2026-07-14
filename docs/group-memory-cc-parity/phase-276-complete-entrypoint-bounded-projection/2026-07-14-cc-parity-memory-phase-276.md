# CCM Memory Phase 276: Complete Entrypoint, Bounded Projection

Date: 2026-07-14

## Objective

Match Claude Code's `MEMORY.md` capacity semantics without losing topic discoverability. The on-disk index must remain complete; only the model-facing entrypoint projection may be bounded to 200 lines and 25,000 bytes.

The scope remains one `groupId--gcs_*` directory per group conversation. No index or projection is shared across sessions.

## Claude Code Reference

Reference: `D:/claude-code/src/memdir/memdir.ts`

Claude Code's `truncateEntrypointContent` reads the full `MEMORY.md`, creates a bounded context view, and appends a warning when the 200-line or 25KB cap fires. It does not overwrite the source index with the truncated view.

## Gap Found

CCM used the same numeric limits but applied them inside `buildGroupTypedMemoryIndex` before writing the file. Once an index exceeded the limits:

- links after the cutoff disappeared from the on-disk `MEMORY.md`;
- rebuilding repeated the lossy projection;
- topic files still existed but lost their stable index entry;
- the UI could not distinguish complete disk capacity from actual model input capacity.

This was a semantic mismatch despite matching constants.

## Implementation

### Complete disk index

`buildGroupTypedMemoryIndex` now writes every active typed-memory topic link to disk. Rebuilding is deterministic and idempotent. No warning or truncation marker is persisted into the source index.

### Bounded entrypoint projection

`truncateGroupTypedMemoryEntrypointContent` now returns a Claude Code-style projection with:

- original line and UTF-8 byte counts;
- loaded line and byte counts;
- independent line-cap and byte-cap flags;
- 200-line and 25,000-byte limits;
- a model-facing warning explaining partial loading;
- bounded content without mutating the disk file.

The loader uses this projection for entrypoint checksum, bytes, and token estimation. It also preserves source checksum, source bytes, and source line count for audit.

### Discoverability beyond the projection

Semantic recall continues to scan all current topic documents, not only links visible in the bounded entrypoint. A relevant topic after the 200-line/25KB projection boundary can still be selected for the current child Agent. Recall remains bound to the owning `groupId--gcs_*` directory.

### Memory Center

The typed-memory diagnostics now show:

- topic document count;
- complete disk index lines and bytes;
- model-facing projection lines and bytes;
- configured projection limits;
- whether line or byte truncation is active.

Projection truncation is a bounded-capacity state, not data loss. The panel is shown as `bounded`, while the complete source stays available on disk.

## Verification

Primary test:

- `scripts/group-typed-memory-entrypoint-projection-selftest.mjs`: 11/11 passed.

Fixture and observed values:

- 230 topic documents;
- complete disk index: 235 lines, 46,141 bytes;
- bounded projection: 129 lines, 24,940 bytes;
- both line and byte caps triggered;
- the final `phase276-topic-229.md` remained linked on disk and was selected by semantic recall;
- the other group session could not recall it;
- rebuilding produced byte-identical `MEMORY.md`;
- Memory Center reported both disk and projection capacity.

Regression suites passed:

- original typed-memory index self-test;
- typed-memory write admission: 22 checks;
- model-aware typed-memory budget: 42 checks;
- incremental distillation cursor;
- multi-artifact transaction recovery;
- session recall and deduplication;
- Memory Center session scope;
- Phase 275 auto-compaction session scope.

Full frontend, Feishu MCP integration, and backend build passed. `git diff --check` reported no whitespace errors.

## Production State

- URL: `http://localhost:3081`
- PID: `19200`
- HTTP status: 200
- stderr: empty
- lifecycle heads: 2 valid deleted tombstones, 0 failed
- live session-memory fleet rows: 0
- legacy default rows: 0
- compact-scope invalid rows: 0
- active distillation locks: 0
- prepared artifact journals: 0
- artifact stage directories: 0
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected

## Result

CCM no longer trades memory discoverability for context safety. Every session keeps a complete durable `MEMORY.md`, while the model-facing entrypoint remains bounded to Claude Code's capacity and late topics remain available through session-local semantic recall.

This completes Phase 276 only. The long-term Claude Code memory-parity goal remains active.
