import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const typed = require("../ccm-package/dist/modules/collaboration/group-memory-index.js");
const runtime = require("../ccm-package/dist/agents/runtime-kernel.js");
const worker = require("../ccm-package/dist/agents/worker-handoff.js");
const globalAgent = require("../ccm-package/dist/modules/global/global-agent.js");

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase241-recall-freshness-${nonce}`;
const scopeA = `${groupId}--gcs_phase241_a`;
const scopeB = `${groupId}--gcs_phase241_b`;
const nowMs = Date.parse("2026-07-13T12:00:00.000Z");

const cleanup = scopeId => {
  try {
    fs.rmSync(typed.getGroupTypedMemoryDir(scopeId), { recursive: true, force: true });
  } catch {}
};

try {
  const staleWrite = typed.upsertGroupTypedMemoryDocument(scopeA, {
    type: "project",
    slug: "phase241-stale-code-claim",
    name: "Phase 241 stale code claim",
    description: "PHASE241_RECALL_SENTINEL says src/legacy-route.ts and LEGACY_ROUTE_FLAG are current.",
    source: "phase241-selftest",
    body: "PHASE241_RECALL_SENTINEL: recommend src/legacy-route.ts and LEGACY_ROUTE_FLAG to the user.",
  });
  const freshWrite = typed.upsertGroupTypedMemoryDocument(scopeA, {
    type: "feedback",
    slug: "phase241-fresh-rule",
    name: "Phase 241 fresh rule",
    description: "PHASE241_RECALL_SENTINEL requires current source verification before action.",
    source: "phase241-selftest",
    body: "PHASE241_RECALL_SENTINEL: verify current source before applying this rule.",
  });
  fs.utimesSync(staleWrite.file, new Date(nowMs - 5.2 * 86_400_000), new Date(nowMs - 5.2 * 86_400_000));
  fs.utimesSync(freshWrite.file, new Date(nowMs - 0.2 * 86_400_000), new Date(nowMs - 0.2 * 86_400_000));

  const recall = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE241_RECALL_SENTINEL legacy route current source", {
    nowMs,
    max: 8,
  });
  const renderedRecall = typed.renderGroupTypedMemoryRecall(recall);
  const staleDoc = recall.recalled.find(row => row.relPath === "phase241-stale-code-claim.md");
  const freshDoc = recall.recalled.find(row => row.relPath === "phase241-fresh-rule.md");
  const memory = {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: "gcs_phase241_a",
    target_project: "api",
    rendered_text: renderedRecall,
    typed_memory_recall: recall,
  };
  const packet = runtime.buildWorkerContextPacket({
    group: { id: groupId, members: [{ project: "api" }] },
    project: "api",
    task: "Use PHASE241_RECALL_SENTINEL only after checking current source.",
    memory,
    contextUsageOptions: { maxTokens: 20_000, autoCompactBufferTokens: 400 },
  });
  const renderedPacket = runtime.renderWorkerContextPacket(packet);
  const contract = packet.memory_recall_trust_contract || {};
  const renderedReceipt = worker.renderReceiptSchemaForWorker({
    receipt_schema: { required_fields: ["typedMemoryUsage"] },
    worker_context_packet: packet,
  });
  const compacted = runtime.compactWorkerContextMemoryForRetry(memory, { maxRenderedChars: 900, maxRecallItems: 8 });
  const compactedPacket = runtime.buildWorkerContextPacket({
    project: "api",
    task: "Recheck PHASE241_RECALL_SENTINEL after memory-first compact.",
    memory: compacted.memory,
  });
  const scopeBRecall = typed.buildGroupTypedMemoryRecall(scopeB, "PHASE241_RECALL_SENTINEL", { nowMs, max: 8 });
  const ignoredRecall = typed.buildGroupTypedMemoryRecall(scopeA, "Ignore memory about PHASE241_RECALL_SENTINEL and inspect current code only", { nowMs, max: 8 });
  const ignoredPacket = runtime.buildWorkerContextPacket({
    project: "api",
    task: "Ignore memory about PHASE241_RECALL_SENTINEL.",
    memory: {
      schema: "ccm-group-memory-context-v1",
      group_id: groupId,
      group_session_id: "gcs_phase241_a",
      memory_policy: { ignored: true, use: "must_not_use_group_memory", reason: "user_requested_ignore_memory" },
      typed_memory_recall: ignoredRecall,
    },
  });
  const ignoredRendered = runtime.renderWorkerContextPacket(ignoredPacket);
  const globalContext = globalAgent.buildAgenticContext("Route PHASE241_RECALL_SENTINEL to the owning group", `phase241-global-${nonce}`, {
    groups: [{ id: groupId, name: "Phase 241 group", members: [{ project: "api", agent: "codex" }] }],
    recordDelivery: false,
    recordMemoryMetric: false,
  });
  const serializedGlobalContext = JSON.stringify(globalContext);

  const checks = {
    staleMemoryGetsHumanAgeWarning: staleDoc?.freshness?.stale === true
      && staleDoc.freshness.age_days === 5
      && /This memory is 5 days old/.test(staleDoc.freshness.warning || ""),
    freshMemoryAvoidsNoiseWarning: freshDoc?.freshness?.stale === false
      && freshDoc.freshness.age_days === 0
      && freshDoc.freshness.warning === "",
    recallSummaryCountsFreshAndStale: recall.memoryFreshness?.recalled_count === 2
      && recall.memoryFreshness?.stale_count === 1
      && recall.memoryFreshness?.fresh_count === 1
      && recall.memoryFreshness?.stale_rel_paths?.includes("phase241-stale-code-claim.md"),
    recallRendersPerMemoryWarning: renderedRecall.includes("记忆新鲜度警告 phase241-stale-code-claim.md")
      && renderedRecall.includes("STALE 5 days old")
      && renderedRecall.includes("saved today"),
    packetCarriesExactSessionTrustContract: contract.schema === "ccm-worker-memory-recall-trust-contract-v1"
      && contract.scope_id === `${groupId}--gcs_phase241_a`
      && contract.recalled_count === 2
      && contract.stale_count === 1,
    trustContractContainsMetadataOnly: JSON.stringify(contract).includes("phase241-stale-code-claim.md")
      && !JSON.stringify(contract).includes("recommend src/legacy-route.ts"),
    trustInstructionPrecedesMemoryBody: renderedPacket.indexOf("## Before recommending from memory") >= 0
      && renderedPacket.indexOf("## Before recommending from memory") < renderedPacket.indexOf("平台记忆："),
    acceptanceRequiresTypedUsageAndVerification: packet.acceptance?.typed_memory_usage_receipt_required === true
      && packet.acceptance?.typed_memory_current_source_verification_required === true
      && packet.acceptance?.typed_memory_stale_recall_present === true
      && packet.acceptance?.typed_memory_required_rel_paths?.length === 2,
    contextBudgetCountsTrustContract: packet.context_usage?.categories?.some(row => row.id === "memory_recall_trust_contract" && row.required === true && Number(row.tokens || 0) > 0),
    workerReceiptRequiresPerRelPathProof: renderedReceipt.includes("typedMemoryUsage")
      && renderedReceipt.includes("phase241-stale-code-claim.md")
      && renderedReceipt.includes("currentSourceEvidence")
      && renderedReceipt.includes("CCM 会重新读取并复算"),
    memoryFirstCompactPreservesTrustContract: compactedPacket.memory_recall_trust_contract?.contract_checksum === contract.contract_checksum
      && compactedPacket.memory_recall_trust_contract?.stale_count === 1,
    otherSessionCannotRecallSessionA: scopeBRecall.recalled.length === 0 && !JSON.stringify(scopeBRecall).includes("phase241-stale-code-claim.md"),
    globalAgentGetsRoutingOnlyNotGroupSessionMemory: globalContext.memory_context_boundary?.group_session_context_included === false
      && !serializedGlobalContext.includes("phase241-stale-code-claim.md")
      && !serializedGlobalContext.includes("recommend src/legacy-route.ts"),
    ignoreMemorySuppressesTrustAndBodies: ignoredRecall.ignored === true
      && ignoredPacket.memory_recall_trust_contract === null
      && ignoredPacket.acceptance?.typed_memory_usage_receipt_required === false
      && !ignoredRendered.includes("phase241-stale-code-claim.md")
      && !ignoredRendered.includes("Before recommending from memory"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, recall, contract, packet: packet.acceptance }, null, 2));
  console.log(JSON.stringify({
    pass: true,
    checks: Object.keys(checks).length,
    recalled: recall.recalled.length,
    stale: recall.memoryFreshness.stale_count,
    fresh: recall.memoryFreshness.fresh_count,
    trustScope: contract.scope_id,
    crossSessionIsolated: true,
    ignoreMemoryIsolated: true,
  }, null, 2));
} finally {
  cleanup(scopeA);
  cleanup(scopeB);
}
