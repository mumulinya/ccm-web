import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const client = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator-llm-client.js"));
const receipts = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "provider-native-compact-execution-receipt.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase296-native-receipt-${nonce}`;
const sessionA = `gcs_${nonce}_native_a`;
const sessionB = `gcs_${nonce}_native_b`;
const taskAgentSessionId = `tas_${nonce}`;
const nativeSessionId = `native_${nonce}`;
const executionId = `exec_${nonce}`;
const runnerRequestId = `adr_${nonce}`;
const snapshotId = `mcs_${nonce}`;
const snapshotChecksum = `mcs_checksum_${nonce}`;
const sentinel = `PHASE296_REQUEST_BODY_MUST_NOT_PERSIST_${nonce}`;

function stableJson(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function receiptChecksum(value) {
  const { receipt_checksum: _checksum, ...identity } = value;
  return crypto.createHash("sha256").update(stableJson(identity)).digest("hex");
}

const editPlan = compaction.buildGroupApiMicroCompactEditPlan([
  { id: "phase296-thinking", role: "assistant", content: [{ type: "thinking", thinking: "old reasoning" }] },
  { id: "phase296-tool", role: "assistant", content: [{ type: "tool_use", id: "read-1", name: "Read", input: { file_path: "src/native.ts" } }] },
  { id: "phase296-result", role: "user", content: [{ type: "tool_result", tool_use_id: "read-1", content: "old source result" }] },
], {
  groupId,
  targetProject: "api",
  activeTokens: 220000,
  force: true,
  now: "2026-07-15T10:00:00.000Z",
});

const nativePlan = compaction.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
  groupId,
  groupSessionId: sessionA,
  targetProject: "api",
  agentType: "anthropic-api",
  transport: "anthropic_api",
  provider: "anthropic",
  supportsApiContextManagement: true,
  nativeApiRequestLayer: true,
  betaHeaders: ["context-management-2025-06-27"],
  taskAgentSessionId,
  nativeSessionId,
  executionId,
  runnerRequestId,
  memoryContextSnapshotId: snapshotId,
  memoryContextSnapshotChecksum: snapshotChecksum,
  now: "2026-07-15T10:01:00.000Z",
});

const originalFetch = globalThis.fetch;
let captured = null;
let responseMode = "applied";
try {
  globalThis.fetch = async (url, init = {}) => {
    captured = {
      url: String(url || ""),
      headers: init.headers || {},
      body: JSON.parse(String(init.body || "{}")),
    };
    return {
      ok: true,
      status: 200,
      headers: { get: name => String(name || "").toLowerCase().includes("request-id") ? `req_${responseMode}_${nonce}` : "" },
      async text() {
        if (responseMode === "accepted_only") return JSON.stringify({ content: [{ type: "text", text: "phase296 accepted only" }] });
        return JSON.stringify({
          content: [{ type: "text", text: "phase296 native adapter ok" }],
          context_management: {
            applied_edits: [
              { type: "clear_thinking_20251015", cleared_thinking_turns: 2, cleared_input_tokens: 12000 },
              { type: "clear_tool_uses_20250919", cleared_tool_uses: 7, cleared_input_tokens: 36000 },
            ],
          },
        });
      },
    };
  };

  const output = await client.callAnthropicCompatibleChat({
    apiUrl: "https://api.anthropic.com/v1",
    apiKey: "phase296-selftest-key",
    model: "claude-phase296-selftest",
  }, {
    messages: [{ role: "user", content: sentinel }],
    apiMicrocompactNativeApplyPlan: nativePlan,
    apiMicrocompactNativeApplyTelemetry: {
      groupId,
      groupSessionId: sessionA,
      targetProject: "api",
      taskId: `task_${nonce}`,
      taskAgentSessionId,
      nativeSessionId,
      executionId,
      runnerRequestId,
      memoryContextSnapshotId: snapshotId,
      memoryContextSnapshotChecksum: snapshotChecksum,
    },
  });

  const ledger = receipts.readProviderNativeCompactExecutionReceiptLedger(groupId, sessionA);
  const receipt = ledger.entries.at(-1);
  const telemetryA = memory.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, sessionA);
  const telemetryDefault = memory.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, "default");
  const proof = memory.buildGroupApiMicrocompactNativeApplyProofSummary(groupId, {
    groupSessionId: sessionA,
    targetProject: "api",
    planChecksums: [editPlan.planChecksum],
  });
  const storedMemory = memory.createEmptyGroupMemory(groupId, sessionA);
  storedMemory.compaction = { ...(storedMemory.compaction || {}), apiMicroCompactEditPlan: editPlan };
  memory.saveGroupMemory(groupId, storedMemory, sessionA);
  const centerDetail = center.getMemoryCenterScope("group", `${groupId}::${sessionA}`);
  const centerProof = centerDetail.postCompactUsage?.apiMicrocompactNativeApplyProof || {};
  const wrongSessionReceipt = receipts.buildProviderNativeCompactExecutionReceipt({
    apiMicrocompactNativeApplyPlan: nativePlan,
    groupId,
    groupSessionId: sessionB,
    taskAgentSessionId,
    nativeSessionId,
    executionId,
    runnerRequestId,
    memoryContextSnapshotId: snapshotId,
    memoryContextSnapshotChecksum: snapshotChecksum,
    requestBody: captured.body,
    headers: captured.headers,
    provider: "anthropic",
    transport: "anthropic_api",
    model: "claude-phase296-selftest",
    endpoint: captured.url,
    responseStatus: 200,
    requestId: `wrong-session-${nonce}`,
    ok: true,
  });
  const tampered = { ...receipt, runner_request_id: `tampered_${nonce}` };
  const tamperedPlan = JSON.parse(JSON.stringify(nativePlan));
  tamperedPlan.requestPatch.body.context_management.edits.push({ type: "forged_context_edit" });
  const tamperedPlanVerification = compaction.verifyGroupApiMicrocompactNativeApplyPlan(tamperedPlan);
  const duplicate = receipts.recordProviderNativeCompactExecutionReceipt(receipt);
  const cliPlans = ["claudecode", "cursor", "codex"].map(agentType => compaction.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId,
    groupSessionId: sessionA,
    targetProject: "api",
    agentType,
    transport: "cli",
    provider: agentType === "claudecode" ? "anthropic" : agentType,
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    betaHeaders: ["context-management-2025-06-27"],
  }));
  const openAiPlan = compaction.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId,
    groupSessionId: sessionA,
    targetProject: "api",
    agentType: "anthropic-api",
    transport: "provider_api",
    provider: "openai",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    betaHeaders: ["context-management-2025-06-27"],
  });
  const failedReceipt = receipts.buildProviderNativeCompactExecutionReceipt({
    apiMicrocompactNativeApplyPlan: nativePlan,
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    executionId,
    runnerRequestId,
    memoryContextSnapshotId: snapshotId,
    memoryContextSnapshotChecksum: snapshotChecksum,
    requestBody: captured.body,
    headers: captured.headers,
    provider: "anthropic",
    transport: "anthropic_api",
    model: "claude-phase296-selftest",
    endpoint: captured.url,
    responseStatus: 503,
    requestId: `failed-${nonce}`,
    ok: false,
    error: "provider unavailable",
  });
  const acceptedOnlyReceipt = receipts.buildProviderNativeCompactExecutionReceipt({
    apiMicrocompactNativeApplyPlan: nativePlan,
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    executionId,
    runnerRequestId,
    memoryContextSnapshotId: snapshotId,
    memoryContextSnapshotChecksum: snapshotChecksum,
    requestBody: captured.body,
    headers: captured.headers,
    provider: "anthropic",
    transport: "anthropic_api",
    model: "claude-phase296-selftest",
    endpoint: captured.url,
    responseStatus: 200,
    requestId: `accepted-only-${nonce}`,
    ok: true,
  });
  const noEditsReceipt = receipts.buildProviderNativeCompactExecutionReceipt({
    apiMicrocompactNativeApplyPlan: nativePlan,
    groupId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    nativeSessionId,
    executionId,
    runnerRequestId,
    memoryContextSnapshotId: snapshotId,
    memoryContextSnapshotChecksum: snapshotChecksum,
    requestBody: captured.body,
    headers: captured.headers,
    provider: "anthropic",
    transport: "anthropic_api",
    model: "claude-phase296-selftest",
    endpoint: captured.url,
    responseStatus: 200,
    requestId: `no-edits-${nonce}`,
    responseBody: { context_management: { applied_edits: [] } },
    ok: true,
  });
  responseMode = "accepted_only";
  const acceptedOnlyOutput = await client.callAnthropicCompatibleChat({
    apiUrl: "https://api.anthropic.com/v1",
    apiKey: "phase296-selftest-key",
    model: "claude-phase296-selftest",
  }, {
    messages: [{ role: "user", content: `${sentinel}_ACCEPTED_ONLY` }],
    apiMicrocompactNativeApplyPlan: nativePlan,
    apiMicrocompactNativeApplyTelemetry: {
      groupId,
      groupSessionId: sessionA,
      targetProject: "api",
      taskId: `task_${nonce}`,
      taskAgentSessionId,
      nativeSessionId,
      executionId,
      runnerRequestId,
      memoryContextSnapshotId: snapshotId,
      memoryContextSnapshotChecksum: snapshotChecksum,
    },
  });
  const acceptedAdapterLedger = receipts.readProviderNativeCompactExecutionReceiptLedger(groupId, sessionA);
  const acceptedAdapterReceipt = acceptedAdapterLedger.entries.find(entry => entry.provider_request_id === `req_accepted_only_${nonce}`);
  const centerAfterAccepted = center.getMemoryCenterScope("group", `${groupId}::${sessionA}`);
  const centerProofAfterAccepted = centerAfterAccepted.postCompactUsage?.apiMicrocompactNativeApplyProof || {};
  const legacyReceipt = {
    ...receipt,
    schema: "ccm-provider-native-compact-execution-receipt-v1",
    version: 1,
    receipt_id: `pncer_legacy_${nonce}`,
    group_session_id: sessionB,
    receipt_checksum: "",
  };
  legacyReceipt.receipt_checksum = receiptChecksum(legacyReceipt);
  const legacyRecord = receipts.recordProviderNativeCompactExecutionReceipt(legacyReceipt);
  const legacySummary = receipts.buildProviderNativeCompactExecutionReceiptSummary(groupId, { groupSessionId: sessionB });
  const receiptFileText = fs.readFileSync(ledger.file, "utf-8");

  const checks = {
    nativeRequestReturnsNormally: output === "phase296 native adapter ok",
    adapterMergedContextManagement: captured?.body?.context_management?.edits?.length === editPlan.editCount,
    adapterSentRequiredBeta: String(captured?.headers?.["anthropic-beta"] || captured?.headers?.["Anthropic-Beta"] || "").includes("context-management-2025-06-27"),
    platformReceiptIsStrongAndChecksummed: receipt?.status === "native_applied"
      && receipt?.strong_proof === true
      && receipt?.provider_outcome_verified === true
      && receipt?.applied_edit_count === 2
      && receipt?.cleared_input_tokens === 48000
      && receipts.verifyProviderNativeCompactExecutionReceipt(receipt, {
        groupId,
        groupSessionId: sessionA,
        taskAgentSessionId,
        nativeSessionId,
        executionId,
        runnerRequestId,
        memoryContextSnapshotId: snapshotId,
        memoryContextSnapshotChecksum: snapshotChecksum,
        planChecksum: editPlan.planChecksum,
        applyPlanChecksum: nativePlan.applyPlanChecksum,
        requestPatchChecksum: nativePlan.requestPatchChecksum,
      }).valid === true,
    receiptBindsExactExecutionAndSession: receipt?.group_session_id === sessionA
      && receipt?.task_agent_session_id === taskAgentSessionId
      && receipt?.native_session_id === nativeSessionId
      && receipt?.execution_id === executionId
      && receipt?.runner_request_id === runnerRequestId
      && receipt?.memory_context_snapshot_id === snapshotId,
    receiptLedgerIsBodyFree: !receiptFileText.includes(sentinel) && !receiptFileText.includes("phase296-selftest-key") && !receiptFileText.includes("old reasoning"),
    legacyTelemetryIsSessionScoped: telemetryA.entries?.some(entry => entry.runner_request_id === runnerRequestId && entry.telemetry_source === "native_request_adapter")
      && telemetryDefault.entries?.every(entry => entry.runner_request_id !== runnerRequestId),
    proofSummaryPrioritizesPlatformReceipt: proof.platform_execution_receipts?.totals?.native_applied === 1
      && proof.verified_entries?.some(entry => entry.proof_source === "platform_execution_receipt" && entry.request_telemetry_strong === true),
    memoryCenterConsumesPlatformReceipt: centerProof.platformExecutionNativeAppliedCount === 1
      && centerProof.requestTelemetryStrongCount === 1
      && centerProof.platformExecutionFailedCount === 0,
    crossSessionBindingFailsClosed: wrongSessionReceipt.status === "unverified"
      && wrongSessionReceipt.validation?.gaps?.includes("group_session_id_mismatch"),
    tamperedReceiptFailsChecksum: receipts.verifyProviderNativeCompactExecutionReceipt(tampered).valid === false,
    tamperedApplyPlanFailsBeforeRequestMerge: tamperedPlanVerification.valid === false
      && tamperedPlanVerification.issues?.includes("request_patch_checksum"),
    duplicateReceiptIsIdempotent: duplicate.updated === true && duplicate.totals?.native_applied === 1,
    cliProvidersRemainAdvisoryOnly: cliPlans.every(plan => plan.nativeApplyReady === false && plan.advisoryOnly === true && plan.requestPatch === null),
    unsupportedProviderCannotApplyAnthropicPatch: openAiPlan.nativeApplyReady === false
      && openAiPlan.failedChecks?.includes("provider_context_management_supported"),
    providerFailureDowngradesWithoutFalseNativeApply: failedReceipt.status === "request_failed"
      && failedReceipt.strong_proof === false
      && failedReceipt.validation?.gaps?.includes("provider_request_not_accepted"),
    acceptedRequestWithoutOutcomeIsNotNativeApplied: acceptedOnlyReceipt.status === "request_accepted"
      && acceptedOnlyReceipt.strong_proof === false
      && acceptedOnlyReceipt.provider_outcome_verified === false,
    explicitEmptyAppliedEditsIsAdvisory: noEditsReceipt.status === "no_edits_applied"
      && noEditsReceipt.strong_proof === false
      && noEditsReceipt.provider_response_applied_edits_declared === true,
    actualAdapterAcceptedOnlyResponseDowngrades: acceptedOnlyOutput === "phase296 accepted only"
      && acceptedAdapterReceipt?.status === "request_accepted"
      && acceptedAdapterReceipt?.strong_proof === false
      && acceptedAdapterReceipt?.provider_outcome_verified === false,
    memoryCenterSeparatesAcceptedFromApplied: centerProofAfterAccepted.platformExecutionNativeAppliedCount === 1
      && centerProofAfterAccepted.platformExecutionRequestAcceptedCount === 1
      && centerProofAfterAccepted.requestTelemetryStrongCount === 1,
    legacyV1AcceptedProofIsDowngraded: legacyRecord.recorded === true
      && legacySummary.totals?.native_applied === 0
      && legacySummary.totals?.request_accepted === 1
      && legacySummary.entries?.[0]?.legacy_request_accepted_only === true
      && legacySummary.entries?.[0]?.strong_proof === false,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, receipt, wrongSessionReceipt, proof }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks, receipt: { status: receipt.status, receiptId: receipt.receipt_id, checksum: receipt.receipt_checksum }, proof: { status: proof.status, strong: proof.request_telemetry?.strong_verified_count, platform: proof.platform_execution_receipts?.totals } }, null, 2)}\n`);
} finally {
  globalThis.fetch = originalFetch;
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
  for (const file of [
    receipts.getProviderNativeCompactExecutionReceiptLedgerFile(groupId, "default"),
    memory.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, "default"),
  ]) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
}
