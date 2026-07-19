// Behavior-freeze split from group-orchestrator-provider-self-tests.ts (part 1/3).
// Extracted functional module. The original entry remains a compatibility facade.

import * as fs from "fs";

import * as path from "path";

import * as os from "os";

import * as crypto from "crypto";

import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

import { getConfigInfo, recordMetric } from "../../core/db";

import { isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";

import {
  buildWorkerContextPacket,
  compactWorkerContextMemoryForRetry,
  refreshWorkerContextPacketUsage,
  renderWorkerContextPacket,
} from "../../agents/runtime-kernel";

import {
  callAnthropicCompatibleChat,
  callAnthropicCompatibleJson,
  callOpenAiCompatibleChat,
  callOpenAiCompatibleJson,
  extractJsonObject,
  shouldUseAnthropic,
  type LlmTokenUsage,
} from "./group-orchestrator-llm-client";

import {
  getCollectedOutputAgent,
  parseTaskNotificationsFromText,
} from "./agent-notifications";

import {
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext,
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext,
  inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth,
  buildGroupTypedMemoryPressureRecallUsageProjectSummary,
  buildGroupTypedMemoryPressureRecallUsageSummary,
  buildPressureProvenancePreDispatchComplianceDispatchPolicy,
  distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory,
  distillPressureProvenancePreDispatchComplianceToTypedMemory,
  distillProviderDispatchOverrideFollowupToTypedMemory,
  distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory,
  distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory,
  distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory,
  distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory,
  distillProviderSwitchExecutionToTypedMemory,
  distillProviderReproofReceiptConsumptionToTypedMemory,
  getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
  readGlobalProviderDispatchReliabilitySnapshot,
  getGroupTypedMemoryDir,
  getGroupTypedMemoryPressureRecallUsageLedgerFile,
  recordGroupTypedMemoryPressureRecallUsageLedger,
} from "./group-memory-index";

import { resolveTrustedModelContextCapacity } from "./model-capability-cache";

import { buildRoleSkillPrompt } from "../../skills/role-skills";

import {
  claimGroupReactiveCompactRetry,
  completeGroupReactiveCompactRetry,
} from "./group-reactive-compact-retry-ownership";

import { recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";

import {
  CCM_DIR,
  COORDINATOR_USER_INTERNAL_TEXT_PATTERN,
  buildAssignment,
  buildCodedCoordinatorSummary,
  buildDocumentAwareAnalysis,
  buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator,
  buildPressureProvenanceProviderDispatchAdvisoryForCoordinator,
  buildProviderSwitchDecisionReceiptForCoordinator,
  buildReactiveCompactionContext,
  buildWorkerContextMetadataPartialCompactPolicyForCoordinator,
  buildWorkerContextPacketForAssignment,
  buildWorkerContextPreDispatchGateForCoordinator,
  buildWorkerContextProviderDispatchDecisionForCoordinator,
  getReplayRepairDispatchBindingsFileForCoordinator,
  getReplayRepairWorkItemsFileForCoordinator,
  getWorkerContextCompactHookLedgerFileForCoordinator,
  getWorkerContextCompactOutcomeLedgerFileForCoordinator,
  getWorkerContextCompactStrategyMemoryFileForCoordinator,
  getWorkerContextPtlEmergencyHintFileForCoordinator,
  isContextLimitError,
  isStructuredCoordinatorFallbackAllowed,
  maybeRetryWorkerContextPacketCompactionForCoordinator,
  normalizeCoordinatorFollowUpTask,
  normalizeGroupOrchestrator,
  normalizeLlmAnalysis,
  providerSwitchDecisionReceiptChecksumForCoordinator,
  readReplayRepairDispatchBindingLedgerForCoordinator,
  readReplayRepairWorkItemLedgerForCoordinator,
  readWorkerContextCompactHookLedgerForCoordinator,
  readWorkerContextCompactOutcomeLedgerForCoordinator,
  readWorkerContextCompactStrategyMemoryForCoordinator,
  readWorkerContextPtlEmergencyHintForCoordinator,
  recordWorkerContextPacketAssignmentBindingForCoordinator,
  recordWorkerContextProviderDispatchOverrideCompletionForCoordinator,
  recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator,
  recordWorkerContextProviderSwitchExecutionReceiptForCoordinator,
  recordWorkerContextProviderSwitchSessionBindingForCoordinator,
  replayRepairWorkItemOpenForCoordinator,
  replayRepairWorkItemStatusForCoordinator,
  runCodedGroupOrchestrator,
  sanitizeCoordinatorUserText,
  sanitizeLlmTargets,
  validateProviderSwitchDecisionReceiptForCoordinator,
  writeJsonAtomicForCoordinator,
} from "./group-orchestrator";

export function runWorkerContextProviderReliabilitySnapshotRankingSelfTest() {
  const sourceGroupA = `worker-context-provider-snapshot-source-a-${process.pid}-${Date.now()}`;
  const sourceGroupB = `worker-context-provider-snapshot-source-b-${process.pid}-${Date.now()}`;
  const targetGroup = `worker-context-provider-snapshot-target-${process.pid}-${Date.now()}`;
  const sourceTypedDirA = getGroupTypedMemoryDir(sourceGroupA);
  const sourceTypedDirB = getGroupTypedMemoryDir(sourceGroupB);
  const targetTypedDir = getGroupTypedMemoryDir(targetGroup);
  const snapshotFile = path.join(CCM_DIR, "global-provider-reliability", `phase156-selftest-${process.pid}-${Date.now()}.json`);
  const targetProject = "api";
  const nowAt = "2026-07-10T08:00:00.000Z";
  const nowMs = Date.parse(nowAt);
  try {
    const {
      distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory,
      getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
      readGlobalProviderDispatchReliabilitySnapshot,
      writeGlobalProviderDispatchReliabilitySnapshot,
    } = require("./group-memory-index");
    const validation = (groupId: string, project: string, agentType: string, id: string, status: "failed" | "passed", at: string) => ({
      schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
      validation_id: id,
      groupId,
      project,
      agent_type: agentType,
      binding_id: `binding-${id}`,
      execution_id: `execution-${id}`,
      receipt_status: "done",
      status,
      contract_satisfied: status === "passed",
      repair_work_item_id: `repair-${id}`,
      contract: {
        rel_paths: [`private-${project}-${agentType}.md`],
        followup_work_item_ids: [`private-followup-${id}`],
        override_ids: [`private-override-${id}`],
      },
      gaps: status === "failed" ? [{ code: "missing_private_evidence", reason: "private receipt detail" }] : [],
      receipt: { memoryProvenanceUsage: [{ reason: "private receipt detail", currentSourceVerified: status === "passed" }] },
      at,
    });
    const seedSource = (groupId: string, project: string, suffix: string, atOffsetMinutes: number) => {
      const rows = [
        { validation: validation(groupId, project, "codex", `${suffix}-codex-failed-1`, "failed", new Date(nowMs - (atOffsetMinutes + 2) * 60_000).toISOString()) },
        { validation: validation(groupId, project, "codex", `${suffix}-codex-failed-2`, "failed", new Date(nowMs - (atOffsetMinutes + 1) * 60_000).toISOString()) },
        { validation: validation(groupId, project, "cursor", `${suffix}-cursor-passed`, "passed", new Date(nowMs - atOffsetMinutes * 60_000).toISOString()) },
      ];
      distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, { rows }, {
        updatedAt: new Date(nowMs - atOffsetMinutes * 60_000).toISOString(),
      });
    };
    seedSource(sourceGroupA, "private-source-a", "source-a", 10);
    seedSource(sourceGroupB, "private-source-b", "source-b", 5);
    const snapshotOptions = {
      snapshotFile,
      ttlMs: 5 * 60_000,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      providerReliabilityHalfLifeDays: 14,
      nowMs,
      generatedAt: nowAt,
    };
    const written = writeGlobalProviderDispatchReliabilitySnapshot(snapshotOptions);
    const fresh = readGlobalProviderDispatchReliabilitySnapshot(snapshotOptions);
    const policy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(targetGroup, {
      targetProject,
      agentType: "codex",
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      providerReliabilityHalfLifeDays: 14,
      generatedAt: nowAt,
    });
    const advisory: any = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(targetGroup, targetProject, "codex", policy, {
      group: {
        id: targetGroup,
        members: [{
          project: targetProject,
          agent: "codex",
          providerCandidates: [
            { agent_type: "cursor", project: targetProject, configured: true },
            { agent_type: "claude-code", project: "web", configured: true },
          ],
        }],
      },
      providerCandidates: [
        { agent_type: "cursor", project: targetProject, configured: true },
        { agent_type: "unconfigured-runner", project: targetProject, configured: false },
      ],
      providerReliabilitySnapshotFile: snapshotFile,
      providerReliabilitySnapshotTtlMs: 5 * 60_000,
      providerReliabilitySnapshotNowMs: nowMs,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      crossGroupProviderReliabilityMinSourceGroups: 2,
      providerReliabilityHalfLifeDays: 14,
    }) || {};
    const packet = buildWorkerContextPacket({
      group: { id: targetGroup, members: [{ project: targetProject }] },
      project: targetProject,
      agentType: "codex",
      task: "Phase 156 snapshot-backed configured provider ranking selftest.",
      pressureProvenanceDispatchFeedbackPolicy: policy,
      pressureProvenanceProviderDispatchAdvisory: advisory,
      contextUsageOptions: { maxTokens: 50000, autoCompactBufferTokens: 120 },
    });
    const assignment = {
      scopeId: targetGroup,
      project: targetProject,
      agentType: "codex",
      assignmentId: "assignment-phase156-provider-ranking",
      dispatchKey: "dispatch-phase156-provider-ranking",
    };
    const gate = buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
    const decision = buildWorkerContextProviderDispatchDecisionForCoordinator(assignment, packet, gate, { at: nowAt });
    const expired = readGlobalProviderDispatchReliabilitySnapshot({
      ...snapshotOptions,
      nowMs: nowMs + 5 * 60_000 + 1,
      allowBackupRecovery: false,
    });
    const originalText = fs.readFileSync(snapshotFile, "utf-8");
    const tamperedPayload = JSON.parse(originalText);
    tamperedPayload.signals.signals[0].risk_score = 0;
    fs.writeFileSync(snapshotFile, JSON.stringify(tamperedPayload, null, 2), "utf-8");
    const tampered = readGlobalProviderDispatchReliabilitySnapshot({
      ...snapshotOptions,
      allowBackupRecovery: false,
    });
    fs.writeFileSync(snapshotFile, originalText, "utf-8");
    distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupB, {
      rows: [{
        validation: validation(sourceGroupB, "private-source-b", "cursor", "source-b-cursor-new-pass", "passed", "2026-07-10T07:59:00.000Z"),
      }],
    }, { updatedAt: "2026-07-10T07:59:00.000Z" });
    const staleGeneration = readGlobalProviderDispatchReliabilitySnapshot({
      ...snapshotOptions,
      allowBackupRecovery: false,
    });
    const refreshed = getOrRefreshGlobalProviderDispatchReliabilitySnapshot({
      ...snapshotOptions,
      allowBackupRecovery: false,
    });
    distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(targetGroup, {
      rows: [
        { validation: validation(targetGroup, targetProject, "codex", "target-codex-local-failed-1", "failed", "2026-07-10T07:58:00.000Z") },
        { validation: validation(targetGroup, targetProject, "codex", "target-codex-local-failed-2", "failed", "2026-07-10T07:59:00.000Z") },
      ],
    }, { updatedAt: "2026-07-10T07:59:00.000Z" });
    const localPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(targetGroup, {
      targetProject,
      agentType: "codex",
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      generatedAt: nowAt,
    });
    const localAdvisory: any = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(targetGroup, targetProject, "codex", localPolicy, {
      providerCandidates: [{ agent_type: "cursor", project: targetProject, configured: true }],
      providerReliabilitySnapshotFile: snapshotFile,
      providerReliabilitySnapshotNowMs: nowMs,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      crossGroupProviderReliabilityMinSourceGroups: 2,
    }) || {};
    const localPacket = buildWorkerContextPacket({
      group: { id: targetGroup, members: [{ project: targetProject }] },
      project: targetProject,
      agentType: "codex",
      task: "Phase 156 local hold remains authoritative even with safer alternatives.",
      pressureProvenanceDispatchFeedbackPolicy: localPolicy,
      pressureProvenanceProviderDispatchAdvisory: localAdvisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const localGate = buildWorkerContextPreDispatchGateForCoordinator({
      ...assignment,
      assignmentId: "assignment-phase156-local-hold",
      dispatchKey: "dispatch-phase156-local-hold",
    }, localPacket);
    const alternatives = advisory.safer_alternatives || [];
    const checks = {
      snapshotIsFreshAndChecksummed: fresh.usable === true
        && fresh.status === "fresh"
        && written.snapshot_checksum === fresh.snapshot?.snapshot_checksum
        && written.payload_checksum === fresh.snapshot?.payload_checksum
        && String(written.generation_id || "").startsWith("provider-reliability-generation:"),
      expiredSnapshotIsRejected: expired.usable === false
        && expired.status === "expired"
        && expired.validation?.gaps?.includes("expired"),
      tamperedSnapshotIsRejected: tampered.usable === false
        && tampered.status === "tampered"
        && (tampered.validation?.gaps || []).some((gap: string) => gap.includes("checksum")),
      sourceGenerationChangeInvalidatesSnapshot: staleGeneration.usable === false
        && staleGeneration.status === "stale_source_generation"
        && staleGeneration.validation?.source_generation_matches === false,
      staleSnapshotRefreshesToFreshGeneration: refreshed.usable === true
        && refreshed.status === "fresh"
        && refreshed.refreshed === true
        && refreshed.previous_status === "stale_source_generation",
      onlyExplicitSameProjectCandidateIsRanked: alternatives.length === 1
        && alternatives[0].agent_type === "cursor"
        && alternatives[0].project === targetProject
        && alternatives[0].safer_than_selected === true
        && !JSON.stringify(alternatives).includes("unconfigured-runner")
        && !JSON.stringify(alternatives).includes("claude-code"),
      rankingDoesNotAutoSwitchCurrentAssignment: advisory.selected_candidate?.agent_type === "codex"
        && decision.selected_provider?.agent_type === "codex"
        && decision.action === "dispatch_with_receipt_sampling"
        && gate.dispatch_ready === true,
      localHoldRemainsAuthoritativeWithAlternative: localPolicy.active === true
        && localAdvisory.selected_candidate?.agent_type === "codex"
        && localAdvisory.safer_alternative_count >= 1
        && localGate.dispatch_ready === false
        && localGate.provider_dispatch_hold === true,
      workerPacketRendersSnapshotAndAlternative: renderWorkerContextPacket(packet).includes("Safer alternatives")
        && renderWorkerContextPacket(packet).includes("snapshot"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      snapshot: {
        snapshot_id: fresh.snapshot?.snapshot_id || "",
        status: fresh.status,
        expires_at: fresh.snapshot?.expires_at || "",
        generation_id: fresh.snapshot?.generation_id || "",
      },
      ranking: {
        selected: advisory.selected_candidate?.agent_type || "",
        alternatives: alternatives.map((item: any) => ({
          agent_type: item.agent_type,
          local_health_status: item.local_health_status,
          global_risk_status: item.global_risk_status,
          composite_rank: item.composite_rank,
        })),
        dispatch_ready: gate.dispatch_ready,
      },
      local: {
        selected: localAdvisory.selected_candidate?.agent_type || "",
        alternative_count: localAdvisory.safer_alternative_count || 0,
        dispatch_ready: localGate.dispatch_ready,
      },
    };
  } finally {
    for (const dir of [sourceTypedDirA, sourceTypedDirB, targetTypedDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    for (const file of [snapshotFile, `${snapshotFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runWorkerContextProviderSwitchExecutionRankingSelfTest() {
  const groupId = `worker-context-provider-switch-execution-ranking-${process.pid}-${Date.now()}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const snapshotFile = path.join(CCM_DIR, "global-provider-reliability", `phase159-selftest-${process.pid}-${Date.now()}.json`);
  const compactHookFile = getWorkerContextCompactHookLedgerFileForCoordinator(groupId);
  const compactOutcomeFile = getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId);
  const project = "api";
  const nowAt = "2026-07-10T10:00:00.000Z";
  const nowMs = Date.parse(nowAt);
  const oldMismatchAt = "2026-06-26T10:00:00.000Z";
  const currentProvider = "codex";
  const saferProvider = "cursor";
  const riskyProvider = "windsurf";
  try {
    const { writeGlobalProviderDispatchReliabilitySnapshot } = require("./group-memory-index");
    writeGlobalProviderDispatchReliabilitySnapshot({
      snapshotFile,
      ttlMs: 5 * 60_000,
      crossGroupProviderReliabilityGroupIds: [groupId],
      minSourceGroups: 1,
      providerReliabilityHalfLifeDays: 14,
      nowMs,
      generatedAt: nowAt,
      allowBackupRecovery: false,
    });
    const execution = (expectedProvider: string, actualProvider: string, suffix: string, at: string) => ({
      schema: "ccm-provider-switch-execution-receipt-v1",
      groupId,
      project,
      expected_provider: expectedProvider,
      actually_executed_provider: actualProvider,
      provider_switch_decision_receipt_id: `provider-switch-decision:phase159-${suffix}`,
      provider_switch_decision_receipt_checksum: `phase159-checksum-${suffix}`,
      execution_receipt_id: `provider-switch-execution:phase159-${suffix}`,
      task_agent_session_id: `tas-phase159-${suffix}`,
      native_session_id: `native-phase159-${suffix}`,
      execution_id: `execution-phase159-${suffix}`,
      receipt_status: "done",
      approved_switch: true,
      system_attested: true,
      child_declared: true,
      final_child_receipt_present: true,
      status: "failed",
      executed_as_approved: false,
      gaps: ["executed_provider_mismatch"],
      reason: `Phase 159 ${expectedProvider} expected but ${actualProvider} executed.`,
      at,
    });
    distillProviderSwitchExecutionToTypedMemory(groupId, {
      rows: [
        execution(saferProvider, currentProvider, "candidate-old-mismatch", oldMismatchAt),
      ],
    }, {
      updatedAt: oldMismatchAt,
    });
    distillProviderSwitchExecutionToTypedMemory(groupId, {
      rows: [
        execution(currentProvider, saferProvider, "selected-recent-mismatch", nowAt),
        execution(riskyProvider, currentProvider, "candidate-recent-mismatch", nowAt),
      ],
    }, {
      updatedAt: nowAt,
    });
    const policy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
      targetProject: project,
      agentType: currentProvider,
      providerSwitchExecutionMismatchThreshold: 2,
      providerReliabilityHalfLifeDays: 14,
      generatedAt: nowAt,
      nowMs,
      disableCrossGroupProviderReliability: true,
    });
    const advisory: any = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(groupId, project, currentProvider, policy, {
      group: {
        id: groupId,
        members: [{
          project,
          agent: currentProvider,
          providerCandidates: [
            { agent_type: saferProvider, project, configured: true },
            { agent_type: riskyProvider, project, configured: true },
            { agent_type: "wrong-project-runner", project: "web", configured: true },
          ],
        }],
      },
      providerCandidates: [
        { agent_type: saferProvider, project, configured: true },
        { agent_type: riskyProvider, project, configured: true },
        { agent_type: "unconfigured-runner", project, configured: false },
      ],
      providerReliabilitySnapshotFile: snapshotFile,
      providerReliabilitySnapshotTtlMs: 5 * 60_000,
      providerReliabilitySnapshotNowMs: nowMs,
      crossGroupProviderReliabilityGroupIds: [groupId],
      crossGroupProviderReliabilityMinSourceGroups: 1,
      providerReliabilityHalfLifeDays: 14,
      providerSwitchExecutionMismatchThreshold: 2,
      generatedAt: nowAt,
    }) || {};
    const packet = buildWorkerContextPacket({
      group: { id: groupId, members: [{ project }] },
      project,
      agentType: currentProvider,
      task: "Phase 159 provider switch execution decayed ranking selftest.",
      pressureProvenanceDispatchFeedbackPolicy: policy,
      pressureProvenanceProviderDispatchAdvisory: advisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const assignment = {
      scopeId: groupId,
      project,
      agentType: currentProvider,
      assignmentId: "assignment-phase159-provider-switch-execution-ranking",
      dispatchKey: "dispatch-phase159-provider-switch-execution-ranking",
    };
    const gate = buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
    const decision = buildWorkerContextProviderDispatchDecisionForCoordinator(assignment, packet, gate, { at: nowAt });
    const selected = advisory.selected_candidate || {};
    const rankedCandidates = advisory.ranked_provider_candidates || [];
    const alternatives = advisory.safer_alternatives || [];
    const saferAlternative = alternatives.find((item: any) => item.agent_type === saferProvider) || {};
    const riskyAlternative = alternatives.find((item: any) => item.agent_type === riskyProvider) || {};
    const policyRow = (policy.policyRows || [])[0] || {};
    const rendered = renderWorkerContextPacket(packet);
    const switchReceipt = buildProviderSwitchDecisionReceiptForCoordinator(groupId, {
      ...assignment,
      worker_context_packet: packet,
    }, {
      requested_agent_type: saferProvider,
      compatibility_confirmed: true,
      compatibility_evidence: ["cursor remains explicitly configured for the api project and has lower decayed provider switch execution risk"],
      reason: "Phase 160 provider ranking provenance selftest",
      authority: {
        kind: "local_user",
        authority_id: "phase160-provider-ranking-provenance-authority",
        approved: true,
        local_policy_authority: true,
        allow_switch_away_from_held_provider: true,
      },
    }, {
      verifySnapshot: false,
      nowMs,
      at: nowAt,
    });
    const receiptPacket = buildWorkerContextPacket({
      group: { id: groupId, members: [{ project }] },
      project,
      agentType: saferProvider,
      task: "Phase 160 provider ranking provenance receipt rendering selftest.",
      pressureProvenanceProviderDispatchAdvisory: advisory,
      providerSwitchDecisionReceipt: switchReceipt,
      contextUsageOptions: { maxTokens: 50000, autoCompactBufferTokens: 120 },
    });
    const receiptRendered = renderWorkerContextPacket(receiptPacket);
    const compactAnalysis = {
      summary: "Phase 161 provider ranking provenance compact retry preservation selftest",
      constraints: Array.from({ length: 10 }, (_, index) =>
        `PROVIDER_RANKING_PROVENANCE_COMPACT_CONSTRAINT_${index}: ${"provider provenance ".repeat(180)}`
      ),
      documentFindings: Array.from({ length: 14 }, (_, index) =>
        `docs/provider-ranking-provenance-${index}.md: ${"compact proof ".repeat(180)}`
      ),
    };
    const compactAssignment = {
      ...assignment,
      agentType: saferProvider,
      agent_type: saferProvider,
      assignmentId: "assignment-phase161-provider-ranking-provenance-compact",
      dispatchKey: "dispatch-phase161-provider-ranking-provenance-compact",
      task: "Phase 161 provider ranking provenance compact retry selftest.",
    };
    const compactOptions = {
      group: { id: groupId, members: [{ project, agent: saferProvider }] },
      analysis: compactAnalysis,
      providerSwitchDecisionReceipt: switchReceipt,
      disableCrossGroupProviderReliability: true,
      providerReliabilityHalfLifeDays: 14,
      providerSwitchExecutionMismatchThreshold: 2,
      nowMs,
      generatedAt: nowAt,
      workerContextUsageOptions: { maxTokens: 9000, autoCompactBufferTokens: 120 },
      workerContextRetryOptions: {
        metadata: {
          maxCategories: 1,
          maxItems: 4,
          maxStringChars: 160,
        },
        maxTaskChars: 1800,
      },
    };
    const compactInitialPacket = buildWorkerContextPacketForAssignment(compactAssignment, "", [], compactOptions);
    const compactInitialGate = buildWorkerContextPreDispatchGateForCoordinator(compactAssignment, compactInitialPacket);
    const compactRetry = maybeRetryWorkerContextPacketCompactionForCoordinator(
      compactAssignment,
      "",
      [],
      compactInitialPacket,
      compactInitialGate,
      compactOptions
    );
    const compactRetryReceipt = compactRetry.packet?.provider_switch_decision_receipt || {};
    const compactRetryProvenancePreservation = compactRetry.retry?.provider_ranking_provenance_preservation
      || compactRetry.packet?.context_compaction_retry?.provider_ranking_provenance_preservation
      || {};
    const compactOutcomeLedger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId);
    const compactOutcome = (compactOutcomeLedger.entries || []).find((item: any) =>
      item.retry_id === (compactRetry.retry?.retry_id || compactRetry.packet?.context_compaction_retry?.retry_id || "")
      || item.hook_run_id === (compactRetry.retry?.compact_hook_run_id || compactRetry.packet?.context_compaction_retry?.compact_hook_run_id || "")
    ) || {};
    const compactRetryRendered = renderWorkerContextPacket(compactRetry.packet);
    const checks = {
      policyCarriesDecayedExecutionRisk: Number(policyRow.provider_switch_execution_weighted_risk_score || 0) > 0
        && Number(policyRow.provider_switch_execution_decayed_mismatch_score || 0) > 0
        && Number(policyRow.provider_switch_execution_half_life_days || 0) === 14,
      policyCarriesTypedMemoryProvenance: Array.isArray(policyRow.provider_switch_execution_row_ids)
        && policyRow.provider_switch_execution_row_ids.some((id: string) => String(id || "").startsWith("provider-switch-execution:"))
        && Array.isArray(policyRow.provider_switch_execution_memory_rel_paths)
        && policyRow.provider_switch_execution_memory_rel_paths.includes("provider-switch-execution-memory.md"),
      rankingUsesExecutionDecayForSaferAlternative: saferAlternative.agent_type === saferProvider
        && Number(saferAlternative.local_execution_rank_penalty || 0) < Number(selected.local_execution_rank_penalty || 0)
        && Number(saferAlternative.composite_rank || 0) < Number(selected.composite_rank || 0),
      advisoryCarriesCompactSafeRankingProvenance: selected.provider_ranking_provenance?.compact_safe === true
        && selected.provider_ranking_provenance?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md")
        && selected.provider_ranking_provenance?.typed_memory_row_ids?.some((id: string) => String(id || "").startsWith("provider-switch-execution:"))
        && saferAlternative.provider_ranking_provenance?.compact_safe === true
        && saferAlternative.provider_ranking_provenance?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md"),
      equallyRecentMismatchIsNotPreferred: !riskyAlternative.agent_type,
      rankingDoesNotAutoSwitchCurrentAssignment: selected.agent_type === currentProvider
        && decision.selected_provider?.agent_type === currentProvider
        && decision.action !== "switch_provider"
        && gate.provider_dispatch_hold !== true,
      renderedPacketShowsRankingProvenance: rendered.includes("Provider switch execution history")
        && rendered.includes("rank=")
        && rendered.includes("execPenalty=")
        && rendered.includes("Provider ranking provenance")
        && rendered.includes("provider-switch-execution-memory.md")
        && rendered.includes("Current assignment is unchanged"),
      switchReceiptPreservesRankingProvenance: switchReceipt.valid === true
        && switchReceipt.provider_ranking_provenance?.requested_candidate?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md")
        && switchReceipt.provider_ranking_provenance?.requested_candidate?.typed_memory_row_ids?.some((id: string) => String(id || "").startsWith("provider-switch-execution:"))
        && receiptRendered.includes("Ranking provenance")
        && receiptRendered.includes("provider-switch-execution-memory.md"),
      compactRetryPreservesProviderRankingProvenance: compactInitialGate.dispatch_ready === false
        && compactRetry.gate?.dispatch_ready !== false
        && compactRetry.retry?.schema === "ccm-worker-context-compaction-retry-v1"
        && compactRetryProvenancePreservation.required === true
        && compactRetryProvenancePreservation.preserved === true
        && compactRetryProvenancePreservation.before?.provider_switch_decision_receipt_id === switchReceipt.receipt_id
        && compactRetryProvenancePreservation.after?.provider_switch_decision_receipt_id === switchReceipt.receipt_id
        && compactRetryProvenancePreservation.after?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md")
        && compactRetryReceipt.receipt_id === switchReceipt.receipt_id
        && compactRetryReceipt.receipt_checksum === switchReceipt.receipt_checksum,
      compactOutcomeLedgerCarriesProviderRankingProvenance: compactOutcome.provider_ranking_provenance_preservation?.required === true
        && compactOutcome.provider_ranking_provenance_preservation?.preserved === true
        && compactOutcome.provider_ranking_provenance_preserved === true
        && Number(compactOutcomeLedger.stats?.providerRankingProvenanceRequired || 0) >= 1
        && Number(compactOutcomeLedger.stats?.providerRankingProvenancePreserved || 0) >= 1,
      compactRenderedPacketStillShowsRankingProvenance: compactRetryRendered.includes("Ranking provenance")
        && compactRetryRendered.includes("provider-switch-execution-memory.md")
        && compactRetryRendered.includes(switchReceipt.receipt_id),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      selected: {
        agent_type: selected.agent_type || "",
        composite_rank: selected.composite_rank || 0,
        local_execution_rank_penalty: selected.local_execution_rank_penalty || 0,
        weighted_risk_score: selected.provider_switch_execution_weighted_risk_score || 0,
      },
      alternatives: alternatives.map((item: any) => ({
        agent_type: item.agent_type,
        composite_rank: item.composite_rank,
        selected_composite_rank: item.selected_composite_rank,
        local_execution_rank_penalty: item.local_execution_rank_penalty,
        weighted_risk_score: item.provider_switch_execution_weighted_risk_score,
        provenance: item.provider_ranking_provenance,
      })),
      rankedCandidates: rankedCandidates.map((item: any) => ({
        agent_type: item.agent_type,
        local_health_status: item.local_health_status,
        local_dispatch_policy: item.local_dispatch_policy,
        composite_rank: item.composite_rank,
        selected_composite_rank: item.selected_composite_rank,
        safer_than_selected: item.safer_than_selected,
        local_execution_rank_penalty: item.local_execution_rank_penalty,
        weighted_risk_score: item.provider_switch_execution_weighted_risk_score,
      })),
      decision: {
        action: decision.action || "",
        selected_provider: decision.selected_provider?.agent_type || "",
        dispatch_ready: gate.dispatch_ready,
      },
      switchReceipt: {
        valid: switchReceipt.valid === true,
        status: switchReceipt.status || "",
        requested_provider: switchReceipt.new_provider?.agent_type || "",
        provenance: switchReceipt.provider_ranking_provenance?.requested_candidate || null,
      },
      compactRetry: {
        status: compactRetry.retry?.status || "",
        method: compactRetry.retry?.method || "",
        dispatch_ready: compactRetry.gate?.dispatch_ready !== false,
        gate_reason: compactRetry.gate?.reason || "",
        pressure_status: compactRetry.gate?.pressure_status || "",
        provider_dispatch_hold: compactRetry.gate?.provider_dispatch_hold === true,
        total_tokens: compactRetry.packet?.context_usage?.total_tokens || 0,
        max_tokens: compactRetry.packet?.context_usage?.max_tokens || 0,
        free_tokens: compactRetry.packet?.context_usage?.free_tokens || 0,
        provider_ranking_provenance_required: compactRetryProvenancePreservation.required === true,
        provider_ranking_provenance_preserved: compactRetryProvenancePreservation.preserved === true,
        outcome_provider_ranking_provenance_preserved: compactOutcome.provider_ranking_provenance_preserved === true,
      },
    };
  } finally {
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    for (const file of [snapshotFile, `${snapshotFile}.bak`, compactHookFile, `${compactHookFile}.bak`, compactOutcomeFile, `${compactOutcomeFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}
