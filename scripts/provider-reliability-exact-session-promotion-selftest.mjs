import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "provider-reliability-exact-session-promotion-selftest");
const home = path.join(scratch, "home");
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));
const memoryCenter = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const now = "2026-07-15T08:00:00.000Z";
const privateSentinel = "PHASE306_PRIVATE_PROJECT_AND_TASK_MUST_NOT_CROSS_GROUP_BOUNDARY";
const targetGroup = "phase306-target-group";
const targetSession = "gcs_phase306_target";
const sourceGroupA = "phase306-source-group-a";
const sourceSessionA1 = "gcs_phase306_a1";
const sourceSessionA2 = "gcs_phase306_a2";
const sourceGroupB = "phase306-source-group-b";
const sourceSessionB1 = "gcs_phase306_b1";

function validation(groupId, groupSessionId, id, status, at) {
  return {
    schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
    groupId,
    groupSessionId,
    project: privateSentinel,
    agent_type: "codex",
    validation_id: id,
    execution_id: `private-execution-${id}`,
    status,
    contract_satisfied: status === "passed",
    reason: `${privateSentinel}:${id}`,
    at,
  };
}

function writeSession(groupId, groupSessionId, prefix, count, at = now) {
  const scopeId = `${groupId}--${groupSessionId}`;
  return memory.distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(scopeId, {
    rows: Array.from({ length: count }, (_, index) => ({
      validation: validation(groupId, groupSessionId, `${prefix}-${index + 1}`, "failed", at),
    })),
  }, {
    sourceGroupId: groupId,
    groupSessionId,
    updatedAt: at,
    reason: "phase306-exact-session-provider-reliability-selftest",
  });
}

function signal(sourceGroups, generatedAt = now, extra = {}) {
  return memory.buildCrossGroupProviderDispatchReliabilitySignal(targetGroup, {
    crossGroupProviderReliabilityGroupIds: sourceGroups,
    agentType: "codex",
    generatedAt,
    ...extra,
  });
}

const writeA1 = writeSession(sourceGroupA, sourceSessionA1, "a1", 2);
const oneSession = signal([sourceGroupA]);
const writeA2 = writeSession(sourceGroupA, sourceSessionA2, "a2", 2);
const sameGroupTwoSessions = signal([sourceGroupA]);

writeSession(targetGroup, targetSession, "target-private", 8);
const targetExcluded = signal([sourceGroupA, targetGroup]);

const writeB1 = writeSession(sourceGroupB, sourceSessionB1, "b1", 2);
const independentGroups = signal([sourceGroupA, sourceGroupB, targetGroup]);
const balancedUnderSessionFlood = signal([sourceGroupA, sourceGroupB], now, { maxGroups: 2, maxLedgersPerGroup: 1 });
const decayed = signal([sourceGroupA, sourceGroupB], "2027-07-15T08:00:00.000Z", { halfLifeDays: 7 });

const runtimeGroup = "phase306-runtime-group";
const runtimeSession = "gcs_phase306_runtime";
const runtimeBinding = orchestrator.recordWorkerContextPacketAssignmentBindingForCoordinator(runtimeGroup, {
  project: "runtime-private-project",
  assignmentId: "phase306-runtime-assignment",
  dispatchKey: "phase306-runtime-dispatch",
  groupSessionId: runtimeSession,
  agentType: "codex",
  worker_context_packet: {
    packet_id: "phase306-runtime-packet",
    pressure_provenance_provider_dispatch_override_followup_receipt_contract: {
      schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1",
      active: true,
      rel_paths: ["private/runtime/path"],
    },
  },
}, { at: now });
const runtimeValidation = orchestrator.recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(runtimeGroup, {
  binding_id: runtimeBinding?.binding_id,
  execution_id: "phase306-runtime-execution",
  receipt_status: "failed",
  receipt: { status: "failed", memoryProvenanceUsage: [] },
}, { at: now });
const runtimeScope = `${runtimeGroup}--${runtimeSession}`;
const runtimeLedger = memory.readGroupTypedMemoryDistillationLedger(runtimeScope);
const runtimeLegacyLedger = memory.readGroupTypedMemoryDistillationLedger(runtimeGroup);

const dominanceGroupA = "phase306-dominance-a";
const dominanceGroupB = "phase306-dominance-b";
writeSession(dominanceGroupA, "gcs_phase306_dominance_a", "dominance-a", 10);
writeSession(dominanceGroupB, "gcs_phase306_dominance_b", "dominance-b", 1);
const dominated = signal([dominanceGroupA, dominanceGroupB]);

const global = memory.buildGlobalProviderDispatchReliabilitySignals({
  crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
  generatedAt: now,
});
const quality = memoryCenter.buildMemoryQualityReport({
  checkIds: ["worker_context_packet_cross_group_provider_reliability_guidance"],
  crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
  minSourceGroups: 2,
  generatedAt: now,
  refresh: true,
});
const qualityCheck = (quality.checks || []).find(check => check.id === "worker_context_packet_cross_group_provider_reliability_guidance") || {};
const scopeA1 = `${sourceGroupA}--${sourceSessionA1}`;
const scopeA2 = `${sourceGroupA}--${sourceSessionA2}`;
const ledgerA1 = memory.readGroupTypedMemoryDistillationLedger(scopeA1);
const ledgerA2 = memory.readGroupTypedMemoryDistillationLedger(scopeA2);
const docsA1 = memory.scanGroupTypedMemoryDocuments(scopeA1);
const legacyGroupLedger = memory.readGroupTypedMemoryDistillationLedger(sourceGroupA);
const publicPayload = JSON.stringify({ independentGroups, global });

const checks = {
  oneExactSessionDoesNotPromote: oneSession.actionable === false
    && oneSession.source_group_count === 1
    && oneSession.source_session_count === 1
    && oneSession.promotion_contract?.status === "insufficient_independent_group_diversity",
  sameGroupSessionsDoNotFakeGroupDiversity: sameGroupTwoSessions.actionable === false
    && sameGroupTwoSessions.source_group_count === 1
    && sameGroupTwoSessions.source_session_count === 2
    && sameGroupTwoSessions.source_ledger_count === 2
    && sameGroupTwoSessions.promotion_contract?.same_group_sessions_count_as_one_group === true,
  targetGroupSessionsAreExcluded: targetExcluded.source_group_count === 1
    && targetExcluded.source_session_count === 2
    && targetExcluded.attempt_count === 4,
  independentGroupsPromoteGuidance: independentGroups.actionable === true
    && independentGroups.source_group_count === 2
    && independentGroups.source_session_count === 3
    && independentGroups.source_ledger_count === 3
    && independentGroups.promotion_contract?.status === "eligible_guidance"
    && independentGroups.guidance_only === true
    && independentGroups.local_policy_override_allowed === false,
  oneGroupCannotCrowdSourceScan: balancedUnderSessionFlood.actionable === true
    && balancedUnderSessionFlood.source_group_count === 2
    && balancedUnderSessionFlood.source_session_count === 2
    && balancedUnderSessionFlood.source_ledger_count === 2,
  timeDecayRevokesPromotion: decayed.actionable === false
    && decayed.fresh_source_group_count === 0
    && decayed.promotion_contract?.status === "insufficient_fresh_group_diversity",
  singleGroupDominanceFailsClosed: dominated.actionable === false
    && dominated.source_group_count === 2
    && dominated.promotion_contract?.status === "single_group_evidence_dominance"
    && dominated.promotion_contract?.observed_maximum_single_group_evidence_share > 0.8,
  exactSessionLedgersRemainSeparate: writeA1.groupId === scopeA1
    && writeA1.sourceGroupId === sourceGroupA
    && writeA1.groupSessionId === sourceSessionA1
    && writeA2.groupId === scopeA2
    && ledgerA1.groupSessionId === sourceSessionA1
    && ledgerA2.groupSessionId === sourceSessionA2
    && ledgerA1.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.rows?.every(row => row.groupSessionId === sourceSessionA1)
    && ledgerA2.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.rows?.every(row => row.groupSessionId === sourceSessionA2),
  exactSessionMemoryDocumentExists: docsA1.some(doc => doc.relPath === "provider-dispatch-override-followup-receipt-validation-history.md"
    && doc.body.includes(`Exact group-chat session: ${sourceSessionA1}.`)),
  runtimeValidationUsesExactSessionScope: runtimeBinding?.groupSessionId === runtimeSession
    && runtimeValidation?.typed_memory_distillation?.attempt_count === 1
    && String(runtimeValidation?.typed_memory_distillation?.ledger_file || "").includes(runtimeScope)
    && runtimeLedger.groupSessionId === runtimeSession
    && runtimeLedger.sourceGroupId === runtimeGroup
    && runtimeLedger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.rows?.[0]?.groupSessionId === runtimeSession
    && !(runtimeLegacyLedger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.rows || []).length,
  noLegacyGroupPollution: !(legacyGroupLedger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.rows || []).length,
  provenanceUsesRedactedDiversity: global.source_provenance?.source_group_count === 2
    && global.source_provenance?.source_session_count === 3
    && global.source_provenance?.source_ledger_count === 3
    && global.source_provenance?.exact_session_ledger_count === 3
    && global.source_provenance?.source_keys_hashed === true
    && global.source_provenance?.group_ids_included === false,
  memoryCenterEnforcesPromotionContract: qualityCheck.status === "ok"
    && qualityCheck.report?.overall?.promotionGapCount === 0
    && qualityCheck.report?.signals?.[0]?.promotionSafe === true
    && qualityCheck.report?.signals?.[0]?.promotion_status === "eligible_guidance"
    && qualityCheck.report?.signals?.[0]?.source_group_count === 2
    && qualityCheck.report?.signals?.[0]?.source_session_count === 3,
  privateContentDoesNotCrossBoundary: !publicPayload.includes(privateSentinel)
    && !publicPayload.includes(sourceGroupA)
    && !publicPayload.includes(sourceSessionA1)
    && independentGroups.contains_private_memory === false,
};

const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
const summary = {
  schema: "ccm-provider-reliability-exact-session-promotion-selftest-v1",
  pass: failed.length === 0,
  checks,
  failed,
  observations: {
    oneSession: {
      source_group_count: oneSession.source_group_count,
      source_session_count: oneSession.source_session_count,
      promotion_status: oneSession.promotion_contract?.status,
    },
    sameGroupTwoSessions: {
      source_group_count: sameGroupTwoSessions.source_group_count,
      source_session_count: sameGroupTwoSessions.source_session_count,
      promotion_status: sameGroupTwoSessions.promotion_contract?.status,
    },
    independentGroups: {
      source_group_count: independentGroups.source_group_count,
      source_session_count: independentGroups.source_session_count,
      promotion_status: independentGroups.promotion_contract?.status,
      risk_status: independentGroups.risk_status,
    },
    decayed: {
      fresh_source_group_count: decayed.fresh_source_group_count,
      promotion_status: decayed.promotion_contract?.status,
    },
  },
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;
