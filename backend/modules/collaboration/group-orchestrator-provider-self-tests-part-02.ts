// Behavior-freeze split from group-orchestrator-provider-self-tests.ts (part 2/3).
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

export function runWorkerContextProviderSwitchDecisionReceiptSelfTest() {
  const sourceGroup = `worker-context-provider-switch-source-${process.pid}-${Date.now()}`;
  const targetGroup = `worker-context-provider-switch-target-${process.pid}-${Date.now()}`;
  const sourceTypedDir = getGroupTypedMemoryDir(sourceGroup);
  const targetTypedDir = getGroupTypedMemoryDir(targetGroup);
  const bindingFile = getReplayRepairDispatchBindingsFileForCoordinator(targetGroup);
  const snapshotFile = path.join(CCM_DIR, "global-provider-reliability", `phase157-selftest-${process.pid}-${Date.now()}.json`);
  const project = "api";
  const oldProvider = "codex";
  const newProvider = "cursor";
  const nowAt = "2026-07-10T09:00:00.000Z";
  const nowMs = Date.parse(nowAt);
  const snapshotOptions = {
    snapshotFile,
    ttlMs: 5 * 60_000,
    crossGroupProviderReliabilityGroupIds: [sourceGroup],
    minSourceGroups: 1,
    nowMs,
    generatedAt: nowAt,
    allowBackupRecovery: false,
  };
  try {
    const {
      buildGroupTypedMemoryRecall,
      distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory,
      readGroupTypedMemoryDistillationLedger,
      writeGlobalProviderDispatchReliabilitySnapshot,
    } = require("./group-memory-index");
    const snapshot = writeGlobalProviderDispatchReliabilitySnapshot(snapshotOptions);
    const snapshotRef = {
      schema: "ccm-provider-dispatch-reliability-snapshot-ref-v1",
      snapshot_id: snapshot.snapshot_id,
      generation_id: snapshot.generation_id,
      snapshot_checksum: snapshot.snapshot_checksum,
      payload_checksum: snapshot.payload_checksum,
      status: "fresh",
      usable: true,
      generated_at: snapshot.generated_at,
      expires_at: snapshot.expires_at,
      source_generation_checksum: snapshot.source_provenance?.generation_checksum || "",
      guidance_only: true,
      local_policy_override_allowed: false,
      contains_private_memory: false,
    };
    const advisory = {
      schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
      version: 1,
      groupId: targetGroup,
      project,
      agent_type: oldProvider,
      health_status: "monitor",
      dispatch_policy: "allow_with_receipt_sampling",
      should_hold_dispatch: false,
      selected_candidate: {
        project,
        agent_type: oldProvider,
        health_status: "monitor",
        dispatch_policy: "allow_with_receipt_sampling",
        should_hold_dispatch: false,
      },
      provider_reliability_snapshot: snapshotRef,
      safer_alternative_count: 1,
      safer_alternatives: [{
        schema: "ccm-provider-dispatch-safer-alternative-v1",
        agent_type: newProvider,
        project,
        configured: true,
        local_health_status: "healthy",
        local_dispatch_policy: "preferred",
        global_risk_status: "low",
        global_risk_score: 0,
        composite_rank: 8,
        selected_composite_rank: 20,
        safer_than_selected: true,
        snapshot_id: snapshot.snapshot_id,
        snapshot_checksum: snapshot.snapshot_checksum,
        snapshot_status: "fresh",
      }],
    };
    const packet = buildWorkerContextPacket({
      group: { id: targetGroup, members: [{ project }] },
      project,
      agentType: oldProvider,
      task: "Phase 157 provider switch decision receipt selftest.",
      pressureProvenanceProviderDispatchAdvisory: advisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const baseAssignment: any = {
      scopeId: targetGroup,
      project,
      agentType: oldProvider,
      agent_type: oldProvider,
      assignmentId: "assignment-phase157-provider-switch-match",
      dispatchKey: "dispatch-phase157-provider-switch-match",
      taskFingerprint: "phase157 provider switch match",
      task: "Phase 157 provider switch decision receipt selftest.",
      worker_context_packet: packet,
    };
    const gate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, packet);
    baseAssignment.worker_context_pre_dispatch_gate = gate;
    const request = {
      requested_agent_type: newProvider,
      compatibility_confirmed: true,
      compatibility_evidence: ["cursor supports this repository task and required toolchain"],
      reason: "use the ranked safer provider for this task",
      authority: {
        kind: "task_runtime_override",
        authority_id: "task-runtime-override-phase157",
        approved: true,
        local_policy_authority: true,
        allow_switch_away_from_held_provider: true,
        reason: "explicit local task authority",
      },
    };
    const receipt = buildProviderSwitchDecisionReceiptForCoordinator(targetGroup, baseAssignment, request, {
      ...snapshotOptions,
      at: nowAt,
    });
    const rehash = (value: any) => {
      const next = JSON.parse(JSON.stringify(value));
      next.receipt_checksum = providerSwitchDecisionReceiptChecksumForCoordinator(next);
      return next;
    };
    const expiredValidation = validateProviderSwitchDecisionReceiptForCoordinator(receipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
      nowMs: Date.parse(snapshot.expires_at) + 1,
    });
    const tamperedReceipt = JSON.parse(JSON.stringify(receipt));
    tamperedReceipt.new_provider.agent_type = "claude-code";
    const tamperedValidation = validateProviderSwitchDecisionReceiptForCoordinator(tamperedReceipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });
    const projectMismatchReceipt = rehash({
      ...receipt,
      new_provider: { ...receipt.new_provider, project: "web" },
      task_compatibility: { ...receipt.task_compatibility, project_match: false },
    });
    const projectMismatchValidation = validateProviderSwitchDecisionReceiptForCoordinator(projectMismatchReceipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });
    const unconfiguredReceipt = rehash({
      ...receipt,
      new_provider: { ...receipt.new_provider, configured: false },
    });
    const unconfiguredValidation = validateProviderSwitchDecisionReceiptForCoordinator(unconfiguredReceipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });
    const missingCompatibilityReceipt = rehash({
      ...receipt,
      task_compatibility: { ...receipt.task_compatibility, confirmed: false, evidence: [] },
    });
    const missingCompatibilityValidation = validateProviderSwitchDecisionReceiptForCoordinator(missingCompatibilityReceipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });
    const missingAuthorityReceipt = rehash({
      ...receipt,
      authority: {
        ...receipt.authority,
        kind: "cross_group_reliability_guidance",
        approved: false,
        local_policy_authority: false,
      },
    });
    const missingAuthorityValidation = validateProviderSwitchDecisionReceiptForCoordinator(missingAuthorityReceipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });
    const heldWithoutPermissionReceipt = rehash({
      ...receipt,
      old_provider: { ...receipt.old_provider, local_hold: true, local_dispatch_policy: "hold_until_repair" },
      authority: { ...receipt.authority, allow_switch_away_from_held_provider: false },
    });
    const heldWithoutPermissionValidation = validateProviderSwitchDecisionReceiptForCoordinator(heldWithoutPermissionReceipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });
    const crossGroupValidation = validateProviderSwitchDecisionReceiptForCoordinator(receipt, {
      ...snapshotOptions,
      groupId: `${targetGroup}-wrong`,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });

    const switchedPacket = buildWorkerContextPacket({
      group: { id: targetGroup, members: [{ project }] },
      project,
      agentType: newProvider,
      task: baseAssignment.task,
      pressureProvenanceProviderDispatchAdvisory: advisory,
      providerSwitchDecisionReceipt: receipt,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const switchedAssignment: any = {
      ...baseAssignment,
      original_agent_type: oldProvider,
      agentType: newProvider,
      agent_type: newProvider,
      provider_switch_decision_receipt: receipt,
      worker_context_packet: switchedPacket,
    };
    switchedAssignment.worker_context_pre_dispatch_gate = buildWorkerContextPreDispatchGateForCoordinator(switchedAssignment, switchedPacket);
    switchedAssignment.worker_context_provider_dispatch_decision = buildWorkerContextProviderDispatchDecisionForCoordinator(
      switchedAssignment,
      switchedPacket,
      switchedAssignment.worker_context_pre_dispatch_gate,
      { at: nowAt }
    );
    recordWorkerContextPacketAssignmentBindingForCoordinator(targetGroup, switchedAssignment, { at: nowAt });
    const rejectedProjectBinding = recordWorkerContextProviderSwitchSessionBindingForCoordinator(targetGroup, {
      assignment_id: switchedAssignment.assignmentId,
      dispatch_key: switchedAssignment.dispatchKey,
      provider_switch_decision_receipt: receipt,
      project: "web",
      agent_type: newProvider,
      task_agent_session_id: "tas-phase157-match",
      native_session_id: "native-phase157-match",
      execution_id: "execution-phase157-match",
    }, snapshotOptions);
    const matchedSessionBinding = recordWorkerContextProviderSwitchSessionBindingForCoordinator(targetGroup, {
      assignment_id: switchedAssignment.assignmentId,
      dispatch_key: switchedAssignment.dispatchKey,
      provider_switch_decision_receipt: receipt,
      project,
      agent_type: newProvider,
      task_agent_session_id: "tas-phase157-match",
      native_session_id: "native-phase157-match",
      execution_id: "execution-phase157-match",
    }, snapshotOptions);
    const matchedExecution = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(targetGroup, {
      assignment_id: switchedAssignment.assignmentId,
      dispatch_key: switchedAssignment.dispatchKey,
      project,
      executed_provider: newProvider,
      task_agent_session_id: "tas-phase157-match",
      native_session_id: "native-phase157-match",
      execution_id: "execution-phase157-match",
      receipt_status: "done",
      receipt: {
        status: "done",
        providerSwitchExecution: {
          decisionReceiptId: receipt.receipt_id,
          expectedProvider: newProvider,
          executedProvider: newProvider,
          taskAgentSessionId: "tas-phase157-match",
          nativeSessionId: "native-phase157-match",
          executionId: "execution-phase157-match",
          usageState: "executed",
          reason: "executed with the approved provider",
        },
      },
    }, snapshotOptions);

    const mismatchAssignmentBase: any = {
      ...baseAssignment,
      assignmentId: "assignment-phase157-provider-switch-mismatch",
      dispatchKey: "dispatch-phase157-provider-switch-mismatch",
      taskFingerprint: "phase157 provider switch mismatch",
    };
    const mismatchReceipt = buildProviderSwitchDecisionReceiptForCoordinator(targetGroup, mismatchAssignmentBase, request, {
      ...snapshotOptions,
      at: nowAt,
    });
    const mismatchPacket = buildWorkerContextPacket({
      group: { id: targetGroup, members: [{ project }] },
      project,
      agentType: newProvider,
      task: mismatchAssignmentBase.task,
      pressureProvenanceProviderDispatchAdvisory: advisory,
      providerSwitchDecisionReceipt: mismatchReceipt,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const mismatchAssignment: any = {
      ...mismatchAssignmentBase,
      original_agent_type: oldProvider,
      agentType: newProvider,
      agent_type: newProvider,
      provider_switch_decision_receipt: mismatchReceipt,
      worker_context_packet: mismatchPacket,
    };
    mismatchAssignment.worker_context_pre_dispatch_gate = buildWorkerContextPreDispatchGateForCoordinator(mismatchAssignment, mismatchPacket);
    mismatchAssignment.worker_context_provider_dispatch_decision = buildWorkerContextProviderDispatchDecisionForCoordinator(
      mismatchAssignment,
      mismatchPacket,
      mismatchAssignment.worker_context_pre_dispatch_gate,
      { at: nowAt }
    );
    recordWorkerContextPacketAssignmentBindingForCoordinator(targetGroup, mismatchAssignment, { at: nowAt });
    recordWorkerContextProviderSwitchSessionBindingForCoordinator(targetGroup, {
      assignment_id: mismatchAssignment.assignmentId,
      dispatch_key: mismatchAssignment.dispatchKey,
      provider_switch_decision_receipt: mismatchReceipt,
      project,
      agent_type: newProvider,
      task_agent_session_id: "tas-phase157-mismatch",
      native_session_id: "native-phase157-mismatch",
      execution_id: "execution-phase157-mismatch",
    }, snapshotOptions);
    const mismatchedExecution = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(targetGroup, {
      assignment_id: mismatchAssignment.assignmentId,
      dispatch_key: mismatchAssignment.dispatchKey,
      project,
      executed_provider: oldProvider,
      task_agent_session_id: "tas-phase157-mismatch",
      native_session_id: "native-phase157-mismatch",
      execution_id: "execution-phase157-mismatch",
      receipt_status: "done",
      receipt: {
        status: "done",
        providerSwitchExecution: {
          decisionReceiptId: mismatchReceipt.receipt_id,
          expectedProvider: newProvider,
          executedProvider: oldProvider,
          taskAgentSessionId: "tas-phase157-mismatch",
          nativeSessionId: "native-phase157-mismatch",
          executionId: "execution-phase157-mismatch",
          usageState: "mismatch",
          reason: "runtime fallback executed with the original provider",
        },
      },
    }, snapshotOptions);

    const advisedOnlyAssignment: any = {
      ...baseAssignment,
      assignmentId: "assignment-phase157-provider-advised-only",
      dispatchKey: "dispatch-phase157-provider-advised-only",
      taskFingerprint: "phase157 provider advised only",
    };
    advisedOnlyAssignment.worker_context_pre_dispatch_gate = buildWorkerContextPreDispatchGateForCoordinator(advisedOnlyAssignment, packet);
    advisedOnlyAssignment.worker_context_provider_dispatch_decision = buildWorkerContextProviderDispatchDecisionForCoordinator(
      advisedOnlyAssignment,
      packet,
      advisedOnlyAssignment.worker_context_pre_dispatch_gate,
      { at: nowAt }
    );
    recordWorkerContextPacketAssignmentBindingForCoordinator(targetGroup, advisedOnlyAssignment, { at: nowAt });

    const largeTask = [
      "Phase 157 provider switch receipt compact retry preservation.",
      "PROVIDER_SWITCH_COMPACT_BLOCK ".repeat(1600),
      "The approved provider switch receipt must remain in the final WorkerContextPacket.",
    ].join("\n");
    const largeAssignment: any = {
      ...switchedAssignment,
      assignmentId: "assignment-phase157-provider-switch-compact",
      dispatchKey: "dispatch-phase157-provider-switch-compact",
      task: largeTask,
    };
    const largePacket = buildWorkerContextPacketForAssignment(largeAssignment, "", [], {
      group: { id: targetGroup, members: [{ project, agent: newProvider }] },
      providerSwitchDecisionReceipt: receipt,
      workerContextUsageOptions: { maxTokens: 2200, autoCompactBufferTokens: 120 },
    });
    const largeGate = buildWorkerContextPreDispatchGateForCoordinator(largeAssignment, largePacket);
    const compactRetry = maybeRetryWorkerContextPacketCompactionForCoordinator(
      largeAssignment,
      "",
      [],
      largePacket,
      largeGate,
      {
        group: { id: targetGroup, members: [{ project, agent: newProvider }] },
        providerSwitchDecisionReceipt: receipt,
        workerContextUsageOptions: { maxTokens: 2200, autoCompactBufferTokens: 120 },
        workerContextRetryOptions: { maxTaskChars: 1400 },
      }
    );
    const compactRetryDecision = buildWorkerContextProviderDispatchDecisionForCoordinator(
      largeAssignment,
      compactRetry.packet,
      compactRetry.gate,
      { at: nowAt }
    );

    distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroup, {
      rows: [{
        validation: {
          schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
          validation_id: "phase157-source-generation-change",
          groupId: sourceGroup,
          project: "private-source-project",
          agent_type: newProvider,
          binding_id: "binding-phase157-source-generation-change",
          execution_id: "execution-phase157-source-generation-change",
          receipt_status: "done",
          status: "passed",
          contract_satisfied: true,
          contract: { rel_paths: ["private-source-evidence.md"] },
          gaps: [],
          at: "2026-07-10T09:01:00.000Z",
        },
      }],
    }, { updatedAt: "2026-07-10T09:01:00.000Z" });
    const staleValidation = validateProviderSwitchDecisionReceiptForCoordinator(receipt, {
      ...snapshotOptions,
      groupId: targetGroup,
      project,
      assignmentId: baseAssignment.assignmentId,
      dispatchKey: baseAssignment.dispatchKey,
    });
    const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(targetGroup);
    const typedLedger = readGroupTypedMemoryDistillationLedger(targetGroup);
    const providerSwitchExecutionArchive = typedLedger.providerSwitchExecutionArchive || {};
    const providerSwitchExecutionRecall = buildGroupTypedMemoryRecall(targetGroup, [
      "Phase 158 provider switch execution typed memory",
      "execution-phase157-mismatch",
      "runtime fallback executed with the original provider",
      "provider switch execution mismatch history",
    ].join("\n"), {
      disableLedger: true,
      forceMemory: true,
      max: 8,
      snippetChars: 320,
    });
    const providerSwitchExecutionPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(targetGroup, {
      targetProject: project,
      agentType: newProvider,
      providerSwitchExecutionMismatchThreshold: 1,
      generatedAt: nowAt,
      disableCrossGroupProviderReliability: true,
    });
    const matchedEntry = (ledger.entries || []).find((entry: any) => entry.assignment_id === switchedAssignment.assignmentId) || {};
    const mismatchEntry = (ledger.entries || []).find((entry: any) => entry.assignment_id === mismatchAssignment.assignmentId) || {};
    const advisedEntry = (ledger.entries || []).find((entry: any) => entry.assignment_id === advisedOnlyAssignment.assignmentId) || {};
    const checks = {
      validSwitchIsApprovedAndChecksummed: receipt.valid === true
        && receipt.status === "approved"
        && receipt.old_provider?.agent_type === oldProvider
        && receipt.new_provider?.agent_type === newProvider
        && receipt.validation?.snapshot_status === "fresh",
      expiredSnapshotRejectsReceipt: expiredValidation.valid === false
        && expiredValidation.gaps.some((gap: string) => gap === "snapshot_expired" || gap.includes("snapshot_read_expired")),
      tamperedReceiptIsRejected: tamperedValidation.valid === false
        && tamperedValidation.gaps.includes("receipt_checksum"),
      staleSourceGenerationRejectsReceipt: staleValidation.valid === false
        && staleValidation.gaps.some((gap: string) => gap.includes("stale_source_generation")),
      projectAndGroupMismatchAreRejected: projectMismatchValidation.gaps.includes("candidate_project_mismatch")
        && crossGroupValidation.gaps.includes("group_id_mismatch"),
      unconfiguredCandidateIsRejected: unconfiguredValidation.gaps.includes("candidate_not_configured"),
      compatibilityEvidenceIsRequired: missingCompatibilityValidation.gaps.includes("task_compatibility_not_confirmed")
        && missingCompatibilityValidation.gaps.includes("task_compatibility_evidence_missing"),
      localAuthorityIsRequired: missingAuthorityValidation.gaps.includes("authority_not_approved")
        && missingAuthorityValidation.gaps.includes("local_policy_authority_missing"),
      heldProviderNeedsExplicitSwitchPermission: heldWithoutPermissionValidation.gaps.includes("held_provider_switch_not_authorized"),
      sessionBindingRejectsWrongProjectThenBindsActualSession: rejectedProjectBinding?.status === "rejected"
        && rejectedProjectBinding?.gaps?.includes("project_mismatch")
        && matchedSessionBinding?.status === "bound"
        && matchedSessionBinding?.task_agent_session_id === "tas-phase157-match",
      matchedExecutionIsSystemAttested: matchedExecution?.status === "passed"
        && matchedExecution?.executed_as_approved === true
        && matchedExecution?.system_attested === true
        && matchedExecution?.child_declared === true,
      runtimeFallbackMismatchIsNotDisguisedAsApprovedExecution: mismatchedExecution?.status === "failed"
        && mismatchedExecution?.executed_as_approved === false
        && mismatchedExecution?.gaps?.includes("executed_provider_mismatch")
        && mismatchedExecution?.actually_executed_provider === oldProvider,
      ledgerSeparatesAdvisedApprovedAndExecutedStates: advisedEntry.provider_switch_ledger_state?.advised_alternative === true
        && advisedEntry.provider_switch_ledger_state?.approved_switch === false
        && !advisedEntry.provider_switch_ledger_state?.actually_executed_provider
        && matchedEntry.provider_switch_ledger_state?.approved_switch === true
        && matchedEntry.provider_switch_ledger_state?.actually_executed_provider === newProvider
        && mismatchEntry.provider_switch_ledger_state?.approved_switch === true
        && mismatchEntry.provider_switch_ledger_state?.actually_executed_provider === oldProvider
        && Number(ledger.providerSwitchAdvisedCount || 0) === 3
        && Number(ledger.providerSwitchApprovedCount || 0) === 2
        && Number(ledger.providerSwitchSessionBoundCount || 0) === 2
        && Number(ledger.providerSwitchExecutedCount || 0) === 2
        && Number(ledger.providerSwitchExecutionPassedCount || 0) === 1
        && Number(ledger.providerSwitchExecutionFailedCount || 0) === 1,
      compactRetryPreservesDecisionReceipt: largeGate.dispatch_ready === false
        && compactRetry.packet?.provider_switch_decision_receipt?.receipt_id === receipt.receipt_id
        && compactRetry.packet?.provider_switch_decision_receipt?.receipt_checksum === receipt.receipt_checksum
        && renderWorkerContextPacket(compactRetry.packet || {}).includes(receipt.receipt_id)
        && compactRetryDecision.advised_alternative === true
        && compactRetryDecision.approved_switch === true,
      providerSwitchExecutionDistillsToTypedMemory: providerSwitchExecutionArchive.schema === "ccm-provider-switch-execution-distillation-v1"
        && Number(providerSwitchExecutionArchive.executed_count || 0) === 2
        && Number(providerSwitchExecutionArchive.passed_count || 0) === 1
        && Number(providerSwitchExecutionArchive.failed_count || 0) === 1
        && Number(providerSwitchExecutionArchive.mismatch_count || 0) === 1
        && (matchedExecution as any)?.typed_memory_distillation?.writeCount >= 1
        && (mismatchedExecution as any)?.typed_memory_distillation?.writeCount >= 1,
      providerSwitchExecutionTypedMemoryIsRecallable: JSON.stringify(providerSwitchExecutionRecall.recalled || []).includes("provider-switch-execution-memory.md")
        && JSON.stringify(providerSwitchExecutionRecall.recalled || []).includes("Provider switch execution"),
      providerSwitchExecutionPolicySeesMismatchHistory: providerSwitchExecutionPolicy.action === "hold_provider_after_repeated_provider_switch_execution_mismatches"
        && providerSwitchExecutionPolicy.active === true
        && Number(providerSwitchExecutionPolicy.providerSwitchExecutionMismatchCount || 0) === 1
        && providerSwitchExecutionPolicy.policyRows?.[0]?.provider_switch_execution_mismatch_escalated === true,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      receipt: {
        receipt_id: receipt.receipt_id || "",
        status: receipt.status || "",
        snapshot_id: receipt.provider_reliability_snapshot?.snapshot_id || "",
        old_provider: receipt.old_provider?.agent_type || "",
        new_provider: receipt.new_provider?.agent_type || "",
      },
      sessionBinding: matchedSessionBinding,
      matchedExecution,
      mismatchedExecution,
      ledger: {
        providerSwitchAdvisedCount: ledger.providerSwitchAdvisedCount || 0,
        providerSwitchApprovedCount: ledger.providerSwitchApprovedCount || 0,
        providerSwitchSessionBoundCount: ledger.providerSwitchSessionBoundCount || 0,
        providerSwitchExecutedCount: ledger.providerSwitchExecutedCount || 0,
        providerSwitchExecutionPassedCount: ledger.providerSwitchExecutionPassedCount || 0,
        providerSwitchExecutionFailedCount: ledger.providerSwitchExecutionFailedCount || 0,
      },
      typedMemory: {
        archiveSchema: providerSwitchExecutionArchive.schema || "",
        executedCount: providerSwitchExecutionArchive.executed_count || 0,
        passedCount: providerSwitchExecutionArchive.passed_count || 0,
        failedCount: providerSwitchExecutionArchive.failed_count || 0,
        mismatchCount: providerSwitchExecutionArchive.mismatch_count || 0,
        recallCount: Array.isArray(providerSwitchExecutionRecall.recalled) ? providerSwitchExecutionRecall.recalled.length : 0,
        policyAction: providerSwitchExecutionPolicy.action || "",
      },
      compactRetry: {
        status: compactRetry.retry?.status || "",
        receipt_id: compactRetry.packet?.provider_switch_decision_receipt?.receipt_id || "",
        usage_status: compactRetry.packet?.context_usage?.status || "",
      },
    };
  } finally {
    for (const dir of [sourceTypedDir, targetTypedDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    for (const file of [snapshotFile, `${snapshotFile}.bak`, bindingFile, `${bindingFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest() {
  const groupId = `worker-context-pressure-provenance-provider-dispatch-decision-selftest-${process.pid}-${Date.now()}`;
  const bindingFile = getReplayRepairDispatchBindingsFileForCoordinator(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const targetProject = "api";
  const agentType = "codex";
  const relPath = "pressure-provider-dispatch-decision.md";
  try {
    const group = normalizeGroupOrchestrator({
      id: groupId,
      members: [
        { project: "coordinator", role: "coordinator" },
        { project: targetProject, agent: agentType },
      ],
    });
    distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
      packets: [
        {
          groupId,
          packet_id: "wcp-phase146-initial-missing-usage",
          binding_id: "binding-phase146-initial-missing-usage",
          project: targetProject,
          agent_type: agentType,
          status: "non_compliant",
          pre_dispatch_prompted: true,
          required_doc_count: 1,
          missing_memory_provenance_usage: true,
          gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
          rel_paths: [relPath],
        },
        {
          groupId,
          packet_id: "wcp-phase146-initial-current-source-gap",
          binding_id: "binding-phase146-initial-current-source-gap",
          project: targetProject,
          agent_type: agentType,
          status: "non_compliant",
          pre_dispatch_prompted: true,
          required_doc_count: 1,
          current_source_verified_gap: true,
          gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
          rel_paths: [relPath],
        },
      ],
    }, {
      frequentThreshold: 2,
      updatedAt: "2026-07-10T03:20:00.000Z",
    });
    distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
      packets: [
        {
          groupId,
          packet_id: "wcp-phase146-recovery-1",
          binding_id: "binding-phase146-recovery-1",
          project: targetProject,
          agent_type: agentType,
          status: "compliant",
          pre_dispatch_prompted: true,
          required_doc_count: 1,
          receipt_row_count: 1,
          compliant_doc_count: 1,
          current_source_verified_count: 1,
          rel_paths: [relPath],
        },
        {
          groupId,
          packet_id: "wcp-phase146-recovery-2",
          binding_id: "binding-phase146-recovery-2",
          project: targetProject,
          agent_type: agentType,
          status: "compliant",
          pre_dispatch_prompted: true,
          required_doc_count: 1,
          receipt_row_count: 1,
          compliant_doc_count: 1,
          current_source_verified_count: 1,
          rel_paths: [relPath],
        },
      ],
    }, {
      updatedAt: "2026-07-10T03:20:01.000Z",
    });
    distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
      packets: [
        {
          groupId,
          packet_id: "wcp-phase146-relapse-missing-usage",
          binding_id: "binding-phase146-relapse-missing-usage",
          project: targetProject,
          agent_type: agentType,
          status: "non_compliant",
          pre_dispatch_prompted: true,
          required_doc_count: 1,
          missing_memory_provenance_usage: true,
          gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
          rel_paths: [relPath],
        },
      ],
    }, {
      frequentThreshold: 2,
      updatedAt: "2026-07-10T03:20:02.000Z",
    });
    const activeAssignment = buildAssignment(
      { project: targetProject, agent: agentType },
      "验证 pressure provenance provider dispatch decision ledger 会记录 hold 决策。",
      "selftest pressure provenance provider dispatch decision",
      "",
      { group, workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 } }
    );
    distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
      packets: [
        {
          groupId,
          packet_id: "wcp-phase146-post-relapse-recovery",
          binding_id: "binding-phase146-post-relapse-recovery",
          project: targetProject,
          agent_type: agentType,
          status: "compliant",
          pre_dispatch_prompted: true,
          required_doc_count: 1,
          receipt_row_count: 1,
          compliant_doc_count: 1,
          current_source_verified_count: 1,
          rel_paths: [relPath],
        },
      ],
    }, {
      updatedAt: "2026-07-10T03:20:03.000Z",
    });
    const recoveredAssignment = buildAssignment(
      { project: targetProject, agent: agentType },
      "验证 pressure provenance provider dispatch decision ledger 会记录恢复后的 sampling 放行决策。",
      "selftest pressure provenance provider dispatch decision recovered",
      "",
      { group, workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 } }
    );
    const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
    const activeBinding = (ledger.entries || []).find((entry: any) => entry.assignment_id === activeAssignment.assignmentId) || {};
    const recoveredBinding = (ledger.entries || []).find((entry: any) => entry.assignment_id === recoveredAssignment.assignmentId) || {};
    const activeDecision = activeBinding.worker_context_provider_dispatch_decision || {};
    const recoveredDecision = recoveredBinding.worker_context_provider_dispatch_decision || {};
    const checks = {
      activeAssignmentStoresDecision: activeAssignment.worker_context_provider_dispatch_decision?.schema === "ccm-worker-context-provider-dispatch-decision-v1"
        && activeAssignment.worker_context_provider_dispatch_decision?.action === "hold_until_repair",
      activeDecisionHoldsCriticalProvider: activeDecision.action === "hold_until_repair"
        && activeDecision.provider_dispatch_hold === true
        && activeDecision.dispatch_ready === false
        && activeDecision.should_create_real_task === false
        && activeDecision.health_status === "critical",
      activeNeedsPressureRepair: Array.isArray(activeAssignment.needs)
        && activeAssignment.needs.some((item: any) => String(item || "").includes("pressure provenance provider repair/recovery")),
      bindingLedgerPersistsDecision: activeBinding.worker_context_provider_dispatch_decision?.decision_id
        && activeBinding.worker_context_packet_pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === true,
      recoveredDecisionAllowsReceiptSampling: recoveredDecision.action === "dispatch_with_receipt_sampling"
        && recoveredDecision.dispatch_ready === true
        && recoveredDecision.requires_receipt_sampling === true
        && recoveredDecision.health_status === "monitor",
      ledgerCountersTrackProviderDecisions: Number(ledger.providerDispatchDecisionCount || 0) >= 2
        && Number(ledger.providerDispatchHoldDecisionCount || 0) >= 1
        && Number(ledger.providerDispatchReadyDecisionCount || 0) >= 1,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      active: {
        action: activeDecision.action || "",
        dispatch_ready: activeDecision.dispatch_ready,
        provider_dispatch_hold: activeDecision.provider_dispatch_hold,
        health_status: activeDecision.health_status || "",
        reason: activeDecision.reason || "",
      },
      recovered: {
        action: recoveredDecision.action || "",
        dispatch_ready: recoveredDecision.dispatch_ready,
        requires_receipt_sampling: recoveredDecision.requires_receipt_sampling === true,
        health_status: recoveredDecision.health_status || "",
      },
      ledger: {
        providerDispatchDecisionCount: ledger.providerDispatchDecisionCount || 0,
        providerDispatchHoldDecisionCount: ledger.providerDispatchHoldDecisionCount || 0,
        providerDispatchReadyDecisionCount: ledger.providerDispatchReadyDecisionCount || 0,
      },
    };
  } finally {
    for (const file of [bindingFile, `${bindingFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}
