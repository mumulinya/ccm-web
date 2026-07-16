# Phase 348 - Provider Tool Access And Consumption Lifecycle

## Goal

Close the observability gap between memory delivery and memory use for exact group child-Agent sessions. The system must distinguish:

- memory delivered to the child prompt;
- a provider-native file read/search observed by CCM;
- memory use claimed by the child receipt;
- a claim verified by current-source proof;
- explicit ignore;
- delivery with no valid usage report.

The identity boundary is always exact `group + gcs_* + tas_* + execution + runner`. Global Agent runs remain outside this group-memory evidence chain.

## Claude Code comparison

The reference is `D:\claude-code\src\utils\sessionFileAccessHooks.ts`.

Claude Code registers internal `PostToolUse` hooks for `Read`, `Grep`, `Glob`, `Edit`, and `Write`, then records Session Memory, transcript, memdir, and team-memory access. CCM cannot assume every third-party CLI exposes the same hook surface, so Phase 348 adds a provider-neutral evidence envelope:

- Codex and Cursor native JSON streams are parsed for read, grep, glob, and command-execution access.
- Each event keeps its native-event SHA-256 and a bounded searchable representation.
- The envelope is checksummed and bound to the platform-known dispatch/session identity.
- Claude Code or another executor with no structured tool stream is reported as `capture_unavailable`; it is never upgraded to an observed read.

## Implementation

### Provider access evidence

`backend/agents/provider-tool-access-evidence.ts` adds:

- `ccm-provider-tool-access-evidence-v1`;
- extraction from provider-native JSON output;
- exact binding verification;
- per-document access matching;
- tamper and sibling-session rejection;
- explicit unsupported/unstructured states.

Both direct CLI and external Runner paths now persist and return this evidence. Durable dispatch records retain it with the existing checksummed request/result pair.

### Consumption lifecycle v3

Typed-memory consumption entries are now version 3 and carry:

- `lifecycle_state`;
- `delivery_state`;
- `access_state` and access-event count;
- provider access evidence checksum and event checksums;
- capture status and validation state.

The lifecycle preserves the existing recall-compatible `usage_state` values while adding a precise `delivered_unreported` state. A valid later receipt can upgrade the same observation from `mentioned` to `used`, `verified`, or `ignored`; contradictory strong states remain rejected.

An important fail-closed distinction is preserved:

- no receipt: record system-proven delivery as `delivered_unreported`;
- malformed, forged, or snapshot-unbound receipt: do not turn it into a ranking observation.

This prevents hostile receipt data from affecting recall while making complete non-reporting visible.

### Memory Center

The current group-session ledger now shows:

- delivery-only count;
- provider read-observed count;
- capture-unavailable count;
- recent lifecycle and access state rows;
- existing used, verified, ignored, stale, anomaly, and current-source metrics.

All rows remain scoped to the selected `group::gcs_*` memory scope.

## Verification

New command:

```text
npm run test:group-typed-memory-access-evidence-restart
```

The test covers 12 checks:

- provider evidence checksum and exact binding;
- native read-event matching;
- delivery without receipt;
- exact task-session/snapshot/delivery binding;
- later observation upgrade;
- access proof retention;
- sibling `gcs_*` isolation;
- sibling and forged evidence rejection;
- restart durability;
- explicit unsupported capture state;
- Memory Center lifecycle visibility.

Adjacent consumption-feedback and manifest-selector-consumption tests are also run to ensure ranking and selector behavior remain compatible.

## Boundary

Provider tool access proves that CCM observed a relevant native read/search event. It does not prove the model's private reasoning used the content correctly. `used` remains a bound child receipt claim; `verified` additionally requires the existing system-recomputed current-source proof. These layers are intentionally separate instead of collapsing delivery, reading, use, and verification into one optimistic flag.

## Release verification

The ACK preflight implementation continuation now inherits the last admitted typed-memory durable-dispatch requirement. This keeps both provider calls on the same recoverable dispatch path without leaking admission state across target Agents.

Final checks completed on 2026-07-16:

- provider access evidence restart: 12/12;
- typed-memory consumption feedback: 18/18;
- manifest selector consumption: 32/32;
- direct durable dispatch spool: 39/39;
- full frontend, Feishu MCP, and backend build;
- backend and Feishu MCP TypeScript checks;
- documentation catalog generation and 1,027 link checks.

Memory Center was also checked at desktop and mobile widths. Long exact group-session names now wrap inside the detail header instead of being clipped, while intentionally scrollable filter rows remain horizontally navigable.
