import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contextModule = await import(pathToFileURL(path.join(root, "ccm-package/dist/modules/collaboration/group-memory-context-part-05.js")).href);
const gateModule = await import(pathToFileURL(path.join(root, "ccm-package/dist/agents/final-dispatch-payload-gate.js")).href);
const { buildChildParentSessionContextProjection } = contextModule;
const { buildFinalWorkerDispatchPayloadGate } = gateModule;

let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks += 1;
};

const longSentinel = `FIRST_EXACT_SENTINEL:${"x".repeat(12_000)}:FIRST_EXACT_END`;
const messages = Array.from({ length: 24 }, (_, index) => ({
  id: `m${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  agent: index % 2 === 0 ? "user" : "main-agent",
  content: index === 0 ? longSentinel : `message-${index}:${"内容".repeat(300)}`,
  timestamp: `2026-07-19T00:${String(index).padStart(2, "0")}:00.000Z`,
}));
messages.splice(7, 0, { id: "forwarded", role: "assistant", content: "📤 → @worker\ninternal forwarding envelope" });

const precompact = buildChildParentSessionContextProjection(messages, {}, {
  groupId: "group-a",
  groupSessionId: "gcs_a",
});
check(precompact.mode === "precompact_full_raw", "precompact mode must deliver full raw transcript");
check(precompact.canonicalSummary === false, "precompact projection must not claim a canonical summary");
check(precompact.visibleMessageCount === 24, "forwarding envelopes must be excluded without dropping real messages");
check(precompact.rendered.includes(longSentinel), "the oldest exact raw message must not be truncated");
check(precompact.rendered.includes("FIRST_EXACT_END"), "the end of a long oldest message must remain visible");
check(!precompact.rendered.includes("internal forwarding envelope"), "internal forwarding envelopes must not reach the child model");
check(!precompact.rendered.includes("旧消息压缩摘要"), "precompact delivery must not contain the legacy local digest");

const localOnly = buildChildParentSessionContextProjection(messages, {
  conversationSummary: { summary: "LOCAL_SUMMARY_MUST_NOT_BE_CANONICAL" },
  compaction: { summarySource: "structured" },
}, { groupId: "group-a", groupSessionId: "gcs_a" });
check(localOnly.mode === "precompact_full_raw", "local structured summaries must remain non-canonical");
check(!localOnly.rendered.includes("LOCAL_SUMMARY_MUST_NOT_BE_CANONICAL"), "local summaries must not be injected into the child prompt");

const canonical = buildChildParentSessionContextProjection(messages, {
  conversationSummary: { summary: "MODEL_CANONICAL_S1", decisions: ["keep exact scope"] },
  compaction: {
    summarySource: "model",
    summaryChecksum: "summary-checksum",
    lastCompactedIndex: 11,
    lastCompactedMessageId: "m11",
    boundaryGeneration: 1,
  },
  compactBoundary: { summarizedThroughMessageId: "m11", generation: 1 },
  sessionMemory: { lastSummarizedMessageId: "m11" },
}, { groupId: "group-a", groupSessionId: "gcs_a" });
check(canonical.mode === "canonical_summary_recent_raw", "canonical summary must switch delivery mode");
check(canonical.rendered.includes("MODEL_CANONICAL_S1"), "verified model summary must be injected");
check(!canonical.rendered.includes("FIRST_EXACT_SENTINEL"), "messages before the committed compact boundary must not be re-injected");
check(canonical.rendered.includes("message-12"), "recent complete raw messages after the boundary must remain visible");
check(canonical.recentWindow.startIndex >= 12, "dynamic recent window must respect the compact boundary floor");

assert.throws(() => buildChildParentSessionContextProjection(messages, {}, {
  groupId: "group-a",
  groupSessionId: "legacy-default",
}), /exact_group_session_required/);
checks += 1;

const compactGate = buildFinalWorkerDispatchPayloadGate({
  renderedPrompt: "z".repeat(180_000),
  workerContextPacket: {
    packet_id: "packet-small-model",
    model_context_capacity: {
      contextWindow: 64_000,
      reservedOutputTokens: 20_000,
      autoCompactBufferTokens: 13_000,
      source: "verified_child_model",
    },
  },
  provider: "codex",
  model: "child-model",
  groupId: "group-a",
  groupSessionId: "gcs_a",
});
check(compactGate.status === "recompact_required", "final payload must use the child model capacity for compaction");
check(compactGate.provider_call_allowed === false, "oversized full parent context must fail closed before Provider call");

const source = fs.readFileSync(path.join(root, "backend/modules/collaboration/collaboration-cross-agents-part-01.ts"), "utf8");
const fallbackSource = fs.readFileSync(path.join(root, "backend/modules/collaboration/collaboration-cross-agents-part-02-part-02.ts"), "utf8");
const bundleSource = fs.readFileSync(path.join(root, "backend/modules/collaboration/group-memory-context-part-03-part-01.ts"), "utf8");
check(!source.includes("recentLimit: 15, olderLimit: 30, fullCount: 5"), "legacy fixed-count child context projection must be removed");
check(source.includes("runGroupMemoryAutoCompactionNow"), "child dispatch must invoke the formal group compaction transaction");
check(source.includes("formal_parent_compaction_not_committed"), "uncommitted formal compaction must fail closed");
check(source.indexOf("child_parent_session_formal_compact") < source.indexOf("worker_handoff_ready"), "final handoff evidence must be written after formal compaction");
check(fallbackSource.includes("child_agent_fallback_model_capacity"), "a smaller fallback model must trigger the same formal parent compaction");
check(fallbackSource.includes("contextBuildPass < 2"), "fallback dispatch must rebuild once from the committed compact head");
check(fallbackSource.includes("renderCurrentCrossAgentPrompt"), "fallback prompts must render from the rebuilt local dispatch state");
check(bundleSource.includes("suppress_local_digest: dedicatedParentSessionContext"), "dedicated parent continuity must suppress duplicate local digests only on child dispatch paths");

console.log(`child parent session CC context selftest passed (${checks} checks)`);
