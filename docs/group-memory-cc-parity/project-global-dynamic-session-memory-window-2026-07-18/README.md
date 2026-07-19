# Project and global dynamic Session Memory window

## Goal

Remove the fixed 24-message recent window from project and Global Agent session compaction. Both scopes now select the retained raw-message window with the same defaults as Claude Code Session Memory:

- minimum retained tokens: `10,000`
- minimum retained text messages: `5`
- maximum retained tokens: `40,000`

The maximum is an approximate boundary. A single atomic message or expansion to the beginning of a user/assistant turn may exceed it, matching the priority Claude Code gives to API/message invariants.

## Claude Code source references

- `D:/claude-code/src/services/compact/sessionMemoryCompact.ts:56-60`
- `D:/claude-code/src/services/compact/sessionMemoryCompact.ts:317-396`

Claude Code expands backward from the newest messages until both minimums are satisfied, stops when the maximum is reached, and then adjusts the boundary to preserve API invariants.

## CCM implementation

- `backend/system/session-memory-window.ts`
  - shared token-window selector
  - `10K / 5 text messages / 40K` defaults
  - previous compact boundary is a hard floor
  - retained context begins at a complete conversation turn
- `backend/modules/projects/project-session-compaction.ts`
  - project compaction uses the shared selector
  - records retained token and text-message counts
  - reinjects the retained raw messages without the former 1,200-character-per-message truncation
  - oversized model input drops only oldest complete conversation rounds and always emits valid JSON
- `backend/agents/global/memory.ts`
  - Global Agent model and self-test compaction paths use the shared selector
  - removes the fixed 24-message condition
  - stores the complete window receipt on the compact boundary

Existing exact-session isolation, model-required production summaries, checksums, source-message validation, recent-message preservation, and failure fencing remain unchanged.

## Verification

- `npm run test:session-memory-dynamic-window`: `15/15`
- `node scripts/project-session-native-binding-restart-selftest.mjs`: `54/54`
- `node scripts/global-agent-model-session-compaction-selftest.mjs`: `22/22`
- backend TypeScript build: passed
- fixed 24-message runtime-window scan: no remaining match
- real Provider calls: `0`
