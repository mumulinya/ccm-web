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

export function runWorkerContextPtlEmergencyDowngradeSelfTest() {
  const groupId = `worker-context-ptl-emergency-downgrade-selftest-${process.pid}-${Date.now()}`;
  const outcomeFile = getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId);
  const strategyFile = getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId);
  const ptlFile = getWorkerContextPtlEmergencyHintFileForCoordinator(groupId);
  const hookFile = getWorkerContextCompactHookLedgerFileForCoordinator(groupId);
  try {
    const policy = {
      schema: "ccm-worker-context-partial-compact-policy-v1",
      method: "usage_top_category_pressure",
      selected_categories: ["constraints_and_documents"],
      skipped_categories: ["dependencies"],
      max_categories: 1,
      fallback_used: false,
    };
    writeJsonAtomicForCoordinator(outcomeFile, {
      schema: "ccm-worker-context-compact-outcome-ledger-v1",
      version: 1,
      groupId,
      file: outcomeFile,
      updatedAt: "2026-07-09T16:00:03.000Z",
      entries: [0, 1, 2].map((index: number) => ({
        schema: "ccm-worker-context-compact-outcome-entry-v1",
        outcome_id: `wcco-ptl-blocked-${index}`,
        group_id: groupId,
        assignment_id: `assignment-ptl-blocked-${index}`,
        method: "metadata_partial_compact_then_deterministic_head_tail_critical_lines",
        status: "blocked",
        dispatch_ready: false,
        from_total_tokens: 9800 + index,
        retry_total_tokens: 7600 + index,
        from_free_tokens: -6400,
        retry_free_tokens: -4200,
        token_delta: 2200,
        free_token_delta: 2200,
        partial_compact: true,
        task_compacted: index === 2,
        task_hash_unchanged: index !== 2,
        partial_compaction_categories: ["constraints_and_documents"],
        partial_compact_policy: policy,
        partial_omitted_chars: 4000,
        distillation_candidate: true,
        at: `2026-07-09T16:00:0${index}.000Z`,
      })),
    });
    const ptlHint = readWorkerContextPtlEmergencyHintForCoordinator(groupId);
    const group = normalizeGroupOrchestrator({
      id: groupId,
      members: [
        { project: "coordinator", role: "coordinator" },
        { project: "frontend", agent: "cursor" },
      ],
    });
    const task = `请处理 PTL_EMERGENCY_SENTINEL。\n${"需要保留验收和回执契约，但任务正文很长。".repeat(900)}`;
    const baseAssignment: any = {
      project: "frontend",
      task,
      reason: "selftest ptl emergency downgrade",
      dependsOn: "",
      taskFingerprint: "ptl-emergency-downgrade-selftest",
      dispatchKey: `${groupId}|coordinator|frontend|ptl-emergency-downgrade-selftest`,
      assignmentId: `frontend::${groupId}|coordinator|frontend|ptl-emergency-downgrade-selftest::initial::1`,
      attempt: 1,
      sourceProject: "coordinator",
      scopeId: groupId,
    };
    const options = {
      group,
      analysis: { summary: "验证 WorkerContextPacket PTL emergency downgrade", constraints: [], documentFindings: [] },
      workerContextUsageOptions: {
        maxTokens: 5200,
        autoCompactBufferTokens: 120,
      },
      workerContextRetryOptions: {
        maxTaskChars: 7000,
      },
    };
    const initialPacket = buildWorkerContextPacketForAssignment(baseAssignment, "", [], options);
    const initialGate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, initialPacket);
    const result = maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment, "", [], initialPacket, initialGate, options);
    const retry = result.retry || result.packet?.context_compaction_retry || {};
    const rendered = renderWorkerContextPacket(result.packet);
    const outcomeLedger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId);
    const latestOutcome = (outcomeLedger.entries || []).slice(-1)[0] || {};
    const checks = {
      ptlHintEngaged: ptlHint.schema === "ccm-worker-context-ptl-emergency-hint-v1"
        && ptlHint.engaged === true
        && ptlHint.emergency_level === "critical"
        && Number(ptlHint.blocked_outcome_count || 0) === 3,
      retryUsesPtlHint: retry.ptl_emergency_hint?.engaged === true
        && retry.ptl_emergency_hint?.emergency_level === "critical",
      taskCompactedWithEmergencyBudget: retry.status === "recovered"
        && Number(retry.compacted_task_chars || 0) > 0
        && Number(retry.compacted_task_chars || 0) <= 2400
        && Number(retry.original_task_chars || 0) > Number(retry.compacted_task_chars || 0),
      renderedExposesPtlDowngrade: rendered.includes("ptl_emergency_downgrade=critical"),
      outcomeCarriesPtlHint: latestOutcome.ptl_emergency_hint?.engaged === true
        && latestOutcome.ptl_emergency_hint?.emergency_level === "critical",
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      ptlHint: {
        engaged: ptlHint.engaged,
        emergency_level: ptlHint.emergency_level,
        blocked_outcome_count: ptlHint.blocked_outcome_count,
        repeated_failed_categories: ptlHint.repeated_failed_categories || [],
      },
      retry: {
        status: retry.status || "",
        method: retry.method || "",
        original_task_chars: retry.original_task_chars || 0,
        compacted_task_chars: retry.compacted_task_chars || 0,
        ptl_emergency_level: retry.ptl_emergency_hint?.emergency_level || "",
      },
    };
  } finally {
    for (const file of [outcomeFile, `${outcomeFile}.bak`, strategyFile, `${strategyFile}.bak`, ptlFile, `${ptlFile}.bak`, hookFile, `${hookFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runWorkerContextCompletionMemoryCompactionPreservationSelfTest() {
  const suffix = `${process.pid}-${Date.now()}`;
  const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
  const preservationClosureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
  const conflictResolutionDoc = "post-compact-completion-memory-preservation-closure-conflict-resolutions.md";
  const sourceDoc = "post-compact-reinjection-repair-receipt-memory.md";
  const workItemId = "post-compact-receipt-memory-usage-repair:PHASE184_SENTINEL";
  const timelineId = "replay-repair-brief-timeline:PHASE184_SENTINEL";
  const currentTaskSession = "task-agent-session-phase184-current";
  const currentNativeSession = "native-session-phase184-current";
  const historicalTaskSessions = ["task-agent-session-phase184-original", "task-agent-session-phase184-repair"];
  const historicalNativeSessions = ["native-session-phase184-original", "native-session-phase184-repair"];
  const resolutionTaskSession = "task-agent-session-phase192-resolution";
  const resolutionNativeSession = "native-session-phase192-resolution";
  const resolutionEntryId = "pccmpu_PHASE192_RESOLUTION_SENTINEL";
  const groups = ["memory", "replay", "metadata", "ptl"].map(kind => `worker-context-completion-memory-${kind}-${suffix}`);
  const cleanupFiles = groups.flatMap(groupId => [
    getWorkerContextCompactHookLedgerFileForCoordinator(groupId),
    getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId),
    getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId),
    getWorkerContextPtlEmergencyHintFileForCoordinator(groupId),
  ]).flatMap(file => [file, `${file}.bak`]);
  const memoryFor = (groupId: string, padding = "") => {
    const reopened = /metadata|ptl/.test(groupId);
    const resolution = {
      schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-resolution-v1",
      active: !reopened,
      reopened,
      state: reopened ? "reopened_by_later_reliable_opposition" : "resolved_used_or_verified_reverify_future_session",
      resolution_entry_id: resolutionEntryId,
      resolution_usage_state: "verified",
      task_agent_session_id: resolutionTaskSession,
      native_session_id: resolutionNativeSession,
      current_source_verified: true,
      parent_conflict_fingerprint: "phase192-parent-conflict-fingerprint",
      resolved_at: "2026-07-12T18:00:00.000Z",
      later_opposing_entry_ids: reopened ? ["phase192-later-opposition"] : [],
      later_opposing_weight: reopened ? 0.9 : 0,
      reversible: true,
      historical_branches_preserved: true,
      historical_majority_authorization_allowed: false,
    };
    return ({
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    target_project: "api",
    session_binding: {
      schema: "ccm-child-agent-session-binding-v1",
      binding_id: `binding-phase184-${groupId}`,
      task_agent_session_id: currentTaskSession,
      native_session_id: currentNativeSession,
    },
    post_compact_reinjection_repair_receipt_recall: {
      schema: "ccm-post-compact-reinjection-repair-receipt-worker-context-recall-v1",
      version: 1,
      active: true,
      recalledThisTurn: true,
      archivedCount: 3,
      completionArchivedCount: 1,
      preservationClosureArchivedCount: 1,
      docRelPaths: [completionDoc, preservationClosureDoc, conflictResolutionDoc],
      surfacedRelPaths: [completionDoc, preservationClosureDoc, conflictResolutionDoc],
      repeatableRelPaths: [completionDoc, preservationClosureDoc, conflictResolutionDoc],
      completionDocRelPaths: [completionDoc, preservationClosureDoc, conflictResolutionDoc],
      completionWorkItemIds: [workItemId, "post-compact-completion-preservation-repair:PHASE186_SENTINEL"],
      completionTimelineBindingIds: [timelineId],
      preservationFailedRetryIds: ["failed-retry-PHASE186_SENTINEL"],
      preservationFailedOutcomeIds: ["failed-outcome-PHASE186_SENTINEL"],
      preservationCorrectedRetryIds: ["corrected-retry-PHASE186_SENTINEL"],
      preservationCorrectedOutcomeIds: ["corrected-outcome-PHASE186_SENTINEL"],
      originalTaskAgentSessionIds: [historicalTaskSessions[0]],
      originalNativeSessionIds: [historicalNativeSessions[0]],
      repairTaskAgentSessionIds: [historicalTaskSessions[1]],
      repairNativeSessionIds: [historicalNativeSessions[1]],
      taskAgentSessionIds: [...historicalTaskSessions, resolutionTaskSession],
      nativeSessionIds: [...historicalNativeSessions, resolutionNativeSession],
      preservationClosureUsageFeedback: {
        schema: "ccm-post-compact-completion-memory-preservation-closure-usage-summary-v1",
        recommendation: reopened ? "surface_conflict_reverify_current_session" : "resolved_conflict_promote_but_reverify_future_session",
        taskFamily: { key: "task-family-phase192", tokens: ["phase192", "resolution"] },
        feedbackConflict: {
          schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-v1",
          active: reopened,
          arbitration_state: reopened ? "contradictory_reverify_current_session" : resolution.state,
          conflict_ratio: 0.5,
          positive: { weighted_evidence: 1.8 },
          ignored: { weighted_evidence: 0.9 },
          current_session_verification_required: reopened,
          historical_majority_authorization_allowed: false,
          resolution,
        },
        feedbackConflictResolution: resolution,
      },
      preservationClosureFeedbackConflict: {
        schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-v1",
        active: reopened,
        arbitration_state: reopened ? "contradictory_reverify_current_session" : resolution.state,
        conflict_ratio: 0.5,
        positive: { weighted_evidence: 1.8 },
        ignored: { weighted_evidence: 0.9 },
        current_session_verification_required: reopened,
        historical_majority_authorization_allowed: false,
        resolution,
      },
      preservationClosureConflictResolution: resolution,
      rows: [{
        row_kind: "receipt_memory_usage_repair_completion",
        row_id: "post-compact-receipt-memory-usage-repair-completion:PHASE184_SENTINEL",
        work_item_id: workItemId,
        timeline_binding_id: timelineId,
        original_worker_context_packet_id: "worker-context-packet-phase184-original",
        required_doc_rel_paths: [sourceDoc],
        coverage_rows: [{ rel_path: sourceDoc, usage_state: "verified", current_source_verified: true, compliant: true }],
        historical_task_agent_session_id: historicalTaskSessions[0],
        historical_native_session_id: historicalNativeSessions[0],
        repair_task_agent_session_id: historicalTaskSessions[1],
        repair_native_session_id: historicalNativeSessions[1],
        completion_source: "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption",
        resolution_reason: "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified",
      }, {
        row_kind: "completion_memory_preservation_repair_closure",
        row_id: "post-compact-completion-memory-preservation-repair-closure:PHASE186_SENTINEL",
        work_item_id: "post-compact-completion-preservation-repair:PHASE186_SENTINEL",
        failed_retry_id: "failed-retry-PHASE186_SENTINEL",
        failed_outcome_id: "failed-outcome-PHASE186_SENTINEL",
        corrected_retry_id: "corrected-retry-PHASE186_SENTINEL",
        corrected_outcome_id: "corrected-outcome-PHASE186_SENTINEL",
        completion_doc_rel_paths: [completionDoc, preservationClosureDoc],
        required_doc_rel_paths: [sourceDoc],
        completion_work_item_ids: [workItemId],
        completion_timeline_binding_ids: [timelineId],
        historical_task_agent_session_ids: historicalTaskSessions,
        historical_native_session_ids: historicalNativeSessions,
        historical_task_agent_session_id: historicalTaskSessions[1],
        historical_native_session_id: historicalNativeSessions[1],
        exact_identity_restored: true,
        current_session_boundary_restored: true,
        historical_sessions_remain_evidence_only: true,
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolution_reason: "completion_memory_compaction_preservation_corrected_retry_verified",
      }, {
        row_kind: "completion_memory_preservation_closure_conflict_resolution",
        row_id: "post-compact-closure-conflict-resolution:PHASE192_SENTINEL",
        resolution_entry_id: resolutionEntryId,
        task_family_key: "task-family-phase192",
        resolution_usage_state: "verified",
        current_source_verified: true,
        historical_task_agent_session_id: resolutionTaskSession,
        historical_native_session_id: resolutionNativeSession,
        parent_conflict_fingerprint: "phase192-parent-conflict-fingerprint",
        reversible: true,
        historical_branches_preserved: true,
        historical_majority_authorization_allowed: false,
      }],
    },
    rendered_text: `PHASE184_COMPLETION_MEMORY_SENTINEL ${padding}`,
    });
  };
  const baseAssignmentFor = (groupId: string, kind: string, task: string) => ({
    project: "api",
    task,
    reason: `phase184 ${kind} completion-memory preservation`,
    dependsOn: "",
    taskFingerprint: `phase184-${kind}`,
    dispatchKey: `${groupId}|coordinator|api|phase184-${kind}`,
    assignmentId: `api::${groupId}|coordinator|api|phase184-${kind}::initial::1`,
    attempt: 1,
    sourceProject: "coordinator",
    scopeId: groupId,
  });
  const runScenario = (kind: string, groupId: string) => {
    const group = normalizeGroupOrchestrator({
      id: groupId,
      members: [{ project: "coordinator", role: "coordinator" }, { project: "api", agent: "claude-code" }],
    });
    const memoryPadding = kind === "memory" ? `${"important completion memory context ".repeat(2200)}` : "compact completion memory context";
    const task = kind === "ptl"
      ? `PHASE184_PTL_SENTINEL ${"long task body requiring emergency downgrade ".repeat(1000)}`
      : `PHASE184_${kind.toUpperCase()}_SENTINEL preserve corrected-receipt completion memory contract.`;
    const baseAssignment: any = baseAssignmentFor(groupId, kind, task);
    const options: any = {
      group,
      memory: memoryFor(groupId, memoryPadding),
      analysis: { summary: `Phase 184 ${kind}`, constraints: [], documentFindings: [] },
      workerContextUsageOptions: {
        maxTokens: kind === "memory" ? 1200 : kind === "metadata" ? 10400 : kind === "replay" ? 8400 : 6800,
        autoCompactBufferTokens: 120,
      },
      workerContextRetryOptions: {
        memory: { maxRenderedChars: 900, maxJsonChars: 700, maxRecallItems: 4 },
        metadata: { maxItems: 4, maxStringChars: 180, maxContractItems: 4, maxContractSummaryChars: 180, maxDependencyReasonChars: 180 },
        replayRepairDispatchBriefs: { maxBriefs: 4, maxStringChars: 220, maxIdChars: 180 },
        maxTaskChars: kind === "ptl" ? 7200 : 2600,
      },
    };
    let replayBriefs: any[] = [];
    if (kind === "replay") {
      replayBriefs = [{
        brief_id: "brief-phase184-replay",
        work_item_id: "work-item-phase184-replay",
        source: "provider_reproof_repair",
        target_project: "api",
        proof_entry_id: "proof-phase184-replay",
        request_patch_checksum: "checksum-phase184-replay",
        provider_reproof_status: "needs_reproof",
        provider_reproof_reason: `PHASE184_REPLAY_SENTINEL ${"replay repair narrative ".repeat(2800)}`,
        runner_request_id: "runner-phase184-replay",
        execution_id: "execution-phase184-replay",
      }];
    }
    if (kind === "metadata") {
      options.analysis = {
        summary: "Phase 184 metadata",
        constraints: Array.from({ length: 12 }, (_, index) => `PHASE184_METADATA constraint ${index} ${"receipt contract boundary ".repeat(90)}`),
        documentFindings: Array.from({ length: 14 }, (_, index) => `docs/phase184-${index}.md ${"completion evidence ".repeat(120)}`),
      };
      options.contractInjections = Array.from({ length: 7 }, (_, index) => ({
        injection_id: `phase184-contract-${index}`,
        source_agent: "backend",
        target_agent: "api",
        endpoint: `POST /phase184/${index}`,
        summary: `${"contract narrative ".repeat(420)}`,
      }));
      options.workerContextDependencies = Array.from({ length: 7 }, (_, index) => ({
        project: `phase184-dependency-${index}`,
        dependency_id: `phase184-dep-${index}`,
        reason: `${"dependency narrative ".repeat(420)}`,
      }));
    }
    if (kind === "ptl") {
      const outcomeFile = getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId);
      writeJsonAtomicForCoordinator(outcomeFile, {
        schema: "ccm-worker-context-compact-outcome-ledger-v1",
        version: 1,
        groupId,
        file: outcomeFile,
        entries: [0, 1, 2].map((index: number) => ({
          schema: "ccm-worker-context-compact-outcome-entry-v1",
          outcome_id: `phase184-ptl-blocked-${index}`,
          group_id: groupId,
          assignment_id: `phase184-ptl-assignment-${index}`,
          method: "metadata_partial_compact_then_deterministic_head_tail_critical_lines",
          status: "blocked",
          dispatch_ready: false,
          partial_compact: true,
          task_compacted: index === 2,
          partial_compaction_categories: ["constraints_and_documents"],
          at: `2026-07-11T01:00:0${index}.000Z`,
        })),
      });
    }
    const initialPacket = buildWorkerContextPacketForAssignment(baseAssignment, "", replayBriefs, options);
    const initialGate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, initialPacket);
    const result = maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment, "", replayBriefs, initialPacket, initialGate, options);
    const retry = result.retry || result.packet?.context_compaction_retry || {};
    const preservation = retry.post_compact_receipt_memory_usage_repair_completion_preservation || {};
    const outcomeLedger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId);
    const outcome = (outcomeLedger.entries || []).slice(-1)[0] || {};
    return {
      kind,
      groupId,
      initialPacket,
      initialGate,
      result,
      retry,
      preservation,
      outcome,
      rendered: renderWorkerContextPacket(result.packet),
    };
  };
  try {
    const scenarios = groups.map((groupId, index) => runScenario(["memory", "replay", "metadata", "ptl"][index], groupId));
    const memoryScenario = scenarios.find(row => row.kind === "memory") || {} as any;
    const replayScenario = scenarios.find(row => row.kind === "replay") || {} as any;
    const metadataScenario = scenarios.find(row => row.kind === "metadata") || {} as any;
    const ptlScenario = scenarios.find(row => row.kind === "ptl") || {} as any;
    const validPacket = memoryScenario.result?.packet || memoryScenario.initialPacket || {};
    const validContract = validPacket.post_compact_reinjection_repair_receipt_memory_contract || {};
    const tamperedContract = {
      ...validContract,
      corrected_receipt_completion_doc_rel_paths: [],
      corrected_receipt_completion_work_item_ids: [],
      corrected_receipt_completion_timeline_binding_ids: [],
      memory_receipt_required_doc_rel_paths: (validContract.memory_receipt_required_doc_rel_paths || []).filter((relPath: string) => relPath !== conflictResolutionDoc),
      closure_conflict_resolution_active: false,
      closure_conflict_resolution_reopened: false,
      closure_conflict_resolution_state: "",
      closure_conflict_resolution_entry_id: "",
      closure_conflict_resolution_usage_state: "",
      closure_conflict_resolution_task_agent_session_id: "",
      closure_conflict_resolution_native_session_id: "",
      closure_conflict_resolution_reversible: false,
      closure_conflict_resolution_historical_branches_preserved: false,
      current_task_agent_session_id: historicalTaskSessions[0],
      current_native_session_id: historicalNativeSessions[0],
    };
    const tamperedPacketBase = {
      ...validPacket,
      post_compact_reinjection_repair_receipt_memory_contract: tamperedContract,
      context_usage: { ...(validPacket.context_usage || {}), status: "ok", pressure_status: "ok" },
    };
    const rejectedPreservation = buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(memoryScenario.initialPacket, tamperedPacketBase, { retry_id: "phase184-tampered" });
    const tamperedPacket = {
      ...tamperedPacketBase,
      context_compaction_retry: {
        schema: "ccm-worker-context-compaction-retry-v1",
        retry_id: "phase184-tampered",
        post_compact_receipt_memory_usage_repair_completion_preservation: rejectedPreservation,
      },
    };
    const tamperedGate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignmentFor(groups[0], "tampered", "phase184 tampered"), tamperedPacket);
    const preservationRows = scenarios.map(row => row.preservation);
    const checks = {
      allStrategiesCarryVerifiedPreservation: preservationRows.length === 4
        && preservationRows.every(row => row.schema === "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1" && row.required === true && row.preserved === true && (row.gaps || []).length === 0),
      exactCompletionIdentitySurvivesAllStrategies: preservationRows.every(row => (row.after?.completion_doc_rel_paths || []).includes(completionDoc)
        && (row.after?.completion_doc_rel_paths || []).includes(preservationClosureDoc)
        && (row.after?.work_item_ids || []).includes(workItemId)
        && (row.after?.timeline_binding_ids || []).includes(timelineId)),
      exactConflictResolutionIdentitySurvivesAllStrategies: preservationRows.every(row => row.after?.conflict_resolution_present === true
        && (row.after?.conflict_resolution_doc_rel_paths || []).includes(conflictResolutionDoc)
        && row.after?.conflict_resolution_entry_id === resolutionEntryId
        && row.after?.conflict_resolution_usage_state === "verified"
        && row.after?.conflict_resolution_task_agent_session_id === resolutionTaskSession
        && row.after?.conflict_resolution_native_session_id === resolutionNativeSession
        && row.after?.conflict_resolution_reversible === true
        && row.after?.conflict_resolution_historical_branches_preserved === true),
      resolvedAndReopenedStatesSurviveCorrectStrategies: [memoryScenario, replayScenario].every(row => row.preservation?.after?.conflict_resolution_active === true
        && row.preservation?.after?.conflict_resolution_reopened === false
        && row.preservation?.after?.conflict_resolution_reverification_acceptance_required === true)
        && [metadataScenario, ptlScenario].every(row => row.preservation?.after?.conflict_resolution_active === false
          && row.preservation?.after?.conflict_resolution_reopened === true
          && row.preservation?.after?.conflict_verification_acceptance_required === true),
      currentAndHistoricalSessionBoundarySurvives: preservationRows.every(row => row.after?.current_task_agent_session_id === currentTaskSession
        && row.after?.current_native_session_id === currentNativeSession
        && row.after?.authority_boundary_valid === true
        && historicalTaskSessions.every(id => (row.after?.historical_task_agent_session_ids || []).includes(id))
        && historicalNativeSessions.every(id => (row.after?.historical_native_session_ids || []).includes(id))),
      memoryFirstReinjectsCompactedMemoryWithContract: memoryScenario.retry?.memory_first === true
        && memoryScenario.result?.packet?.memory_reinjection_proof?.status === "compacted_reinjected"
        && memoryScenario.result?.packet?.memory_reinjection_proof?.hash_matches_compaction === true
        && memoryScenario.rendered?.includes("completion_memory_preservation=true"),
      replayAndMetadataPartialCompactPreserveContract: replayScenario.retry?.partial_compact === true
        && /replay_brief_partial_compact/.test(String(replayScenario.retry?.method || ""))
        && replayScenario.retry?.status === "recovered"
        && replayScenario.result?.gate?.dispatch_ready !== false
        && metadataScenario.retry?.partial_compact === true
        && /metadata_partial_compact/.test(String(metadataScenario.retry?.method || ""))
        && metadataScenario.retry?.status === "recovered"
        && metadataScenario.result?.gate?.dispatch_ready !== false,
      ptlEmergencyPreservesContract: ptlScenario.retry?.ptl_emergency_hint?.engaged === true
        && ptlScenario.retry?.ptl_emergency_hint?.emergency_level === "critical"
        && ptlScenario.rendered?.includes("ptl_emergency_downgrade=critical")
        && ptlScenario.rendered?.includes("Closure feedback conflict"),
      compactOutcomeLedgerCarriesProof: scenarios.every(row => row.outcome?.post_compact_receipt_memory_usage_repair_completion_preservation?.required === true
        && row.outcome?.post_compact_receipt_memory_usage_repair_completion_preservation?.preserved === true),
      tamperedCompactPacketIsRejected: rejectedPreservation.required === true
        && rejectedPreservation.preserved === false
        && rejectedPreservation.gaps.includes("completion_doc_rel_paths_missing_after_compact")
        && rejectedPreservation.gaps.includes("completion_work_item_ids_missing_after_compact")
        && rejectedPreservation.gaps.includes("conflict_resolution_contract_missing_after_compact")
        && rejectedPreservation.gaps.includes("conflict_resolution_doc_rel_paths_missing_after_compact")
        && rejectedPreservation.gaps.includes("conflict_resolution_entry_id_changed_after_compact")
        && rejectedPreservation.gaps.includes("historical_session_promoted_to_current_authority")
        && tamperedGate.dispatch_ready === false
        && tamperedGate.completion_memory_preservation_blocked === true,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      scenarios: scenarios.map(row => ({
        kind: row.kind,
        retry_status: row.retry?.status || "",
        retry_method: row.retry?.method || "",
        dispatch_ready: row.result?.gate?.dispatch_ready !== false,
        initial_total_tokens: row.initialPacket?.context_usage?.total_tokens || 0,
        retry_total_tokens: row.result?.packet?.context_usage?.total_tokens || 0,
        max_tokens: row.result?.packet?.context_usage?.max_tokens || 0,
        retry_free_tokens: row.result?.packet?.context_usage?.free_tokens || 0,
        preservation_required: row.preservation?.required === true,
        preservation_preserved: row.preservation?.preserved === true,
        conflict_resolution_present: row.preservation?.after?.conflict_resolution_present === true,
        conflict_resolution_active: row.preservation?.after?.conflict_resolution_active === true,
        conflict_resolution_reopened: row.preservation?.after?.conflict_resolution_reopened === true,
        conflict_resolution_entry_id: row.preservation?.after?.conflict_resolution_entry_id || "",
        conflict_resolution_state: row.preservation?.after?.conflict_resolution_state || "",
        conflict_resolution_usage_state: row.preservation?.after?.conflict_resolution_usage_state || "",
        conflict_resolution_doc_rel_paths: row.preservation?.after?.conflict_resolution_doc_rel_paths || [],
        conflict_resolution_task_agent_session_id: row.preservation?.after?.conflict_resolution_task_agent_session_id || "",
        conflict_resolution_native_session_id: row.preservation?.after?.conflict_resolution_native_session_id || "",
        conflict_resolution_reversible: row.preservation?.after?.conflict_resolution_reversible === true,
        conflict_resolution_historical_branches_preserved: row.preservation?.after?.conflict_resolution_historical_branches_preserved === true,
        conflict_resolution_reverification_acceptance_required: row.preservation?.after?.conflict_resolution_reverification_acceptance_required === true,
        conflict_resolution_reversible_acceptance_required: row.preservation?.after?.conflict_resolution_reversible_acceptance_required === true,
        conflict_verification_acceptance_required: row.preservation?.after?.conflict_verification_acceptance_required === true,
        ptl_emergency_engaged: row.retry?.ptl_emergency_hint?.engaged === true,
        outcome_preserved: row.outcome?.post_compact_receipt_memory_usage_repair_completion_preserved === true,
      })),
      tampered: { gaps: rejectedPreservation.gaps || [], dispatch_ready: tamperedGate.dispatch_ready },
    };
  } finally {
    for (const file of cleanupFiles) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runWorkerContextIgnoreMemoryPolicySelfTest() {
  const groupId = `worker-context-ignore-memory-policy-selftest-${process.pid}-${Date.now()}`;
  const bindingFile = getReplayRepairDispatchBindingsFileForCoordinator(groupId);
  try {
    const group = normalizeGroupOrchestrator({
      id: groupId,
      members: [
        { project: "coordinator", role: "coordinator" },
        { project: "frontend", agent: "cursor" },
      ],
    });
    const memory = {
      schema: "ccm-group-memory-context-v1",
      group_id: groupId,
      target_project: "frontend",
      memory_policy: {
        ignored: true,
        ignore_reason: "user_requested_ignore_memory",
        priority: "user_ignore_memory_request_over_platform_memory",
        use: "must_not_use_group_memory",
        boundary: "current_worker_context_packet",
      },
      rendered_text: "子 Agent 受控记忆包（平台生成，本轮用户要求忽略记忆）：不要引用任何历史内容。",
    };
    const baseAssignment: any = {
      project: "frontend",
      task: "忽略记忆，只根据当前文件状态处理 IGNORE_MEMORY_SENTINEL。",
      reason: "selftest ignore memory policy",
      dependsOn: "",
      taskFingerprint: "ignore-memory-policy-selftest",
      dispatchKey: `${groupId}|coordinator|frontend|ignore-memory-policy-selftest`,
      assignmentId: `frontend::${groupId}|coordinator|frontend|ignore-memory-policy-selftest::initial::1`,
      attempt: 1,
      sourceProject: "coordinator",
      scopeId: groupId,
    };
    const packet = buildWorkerContextPacketForAssignment(baseAssignment, "", [], {
      group,
      memory,
      workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const gate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, packet);
    const assignment = {
      ...baseAssignment,
      worker_context_packet: packet,
      worker_context_pre_dispatch_gate: gate,
      dispatch_ready: gate.dispatch_ready !== false,
      dispatchReady: gate.dispatch_ready !== false,
    };
    const binding: any = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment) || {};
    const rendered = renderWorkerContextPacket(packet);
    const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
    const persisted = (ledger.entries || []).find((item: any) => item.assignment_id === baseAssignment.assignmentId) || {};
    const categories = new Map((packet.context_usage?.categories || []).map((item: any) => [item.id, item]));
    const checks = {
      packetCarriesIgnorePolicy: packet.memory_policy?.schema === "ccm-worker-context-memory-policy-v1"
        && packet.memory_policy?.ignored === true
        && packet.acceptance?.memory_ignored_receipt_required === true,
      proofMarksIgnoredByPolicy: packet.memory_reinjection_proof?.status === "ignored_by_policy"
        && packet.memory_reinjection_proof?.memory_ignored === true,
      usageCategorizesPolicy: Number((categories.get("memory_policy") as any)?.tokens || 0) > 0,
      renderedRequiresMemoryIgnoredReceipt: rendered.includes("Memory policy：ignored")
        && rendered.includes("memoryIgnored")
        && rendered.includes("must_not_use_group_memory"),
      bindingPersistsIgnorePolicy: persisted.worker_context_packet_memory_policy?.ignored === true
        && persisted.worker_context_packet_render_probe?.rendered_flags?.has_memory_ignored_policy === true
        && binding.worker_context_packet_memory_policy?.ignored === true,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      memoryPolicy: packet.memory_policy,
      proof: {
        status: packet.memory_reinjection_proof?.status || "",
        memory_ignored: packet.memory_reinjection_proof?.memory_ignored === true,
      },
      binding: {
        memory_policy_ignored: persisted.worker_context_packet_memory_policy?.ignored === true,
        render_probe_ignored: persisted.worker_context_packet_render_probe?.rendered_flags?.has_memory_ignored_policy === true,
      },
    };
  } finally {
    for (const file of [bindingFile, `${bindingFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runWorkerContextPressureProvenanceProviderDispatchGateSelfTest() {
  const groupId = `worker-context-pressure-provenance-provider-dispatch-gate-selftest-${process.pid}-${Date.now()}`;
  const bindingFile = getReplayRepairDispatchBindingsFileForCoordinator(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const targetProject = "api";
  const agentType = "codex";
  const relPath = "pressure-provider-dispatch-gate.md";
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
          packet_id: "wcp-phase145-initial-missing-usage",
          binding_id: "binding-phase145-initial-missing-usage",
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
          packet_id: "wcp-phase145-initial-current-source-gap",
          binding_id: "binding-phase145-initial-current-source-gap",
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
      updatedAt: "2026-07-10T03:00:00.000Z",
    });
    distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
      packets: [
        {
          groupId,
          packet_id: "wcp-phase145-recovery-1",
          binding_id: "binding-phase145-recovery-1",
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
          packet_id: "wcp-phase145-recovery-2",
          binding_id: "binding-phase145-recovery-2",
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
      updatedAt: "2026-07-10T03:00:01.000Z",
    });
    distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
      packets: [
        {
          groupId,
          packet_id: "wcp-phase145-relapse-missing-usage",
          binding_id: "binding-phase145-relapse-missing-usage",
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
      updatedAt: "2026-07-10T03:00:02.000Z",
    });
    const baseAssignment: any = {
      project: targetProject,
      agentType,
      task: "验证 pressure provenance provider dispatch gate 会阻断复发 runner。",
      reason: "selftest pressure provenance provider dispatch gate",
      dependsOn: "",
      taskFingerprint: "pressure-provider-dispatch-gate-selftest",
      dispatchKey: `${groupId}|coordinator|${targetProject}|pressure-provider-dispatch-gate-selftest`,
      assignmentId: `${targetProject}::${groupId}|coordinator|${targetProject}|pressure-provider-dispatch-gate-selftest::initial::1`,
      attempt: 1,
      sourceProject: "coordinator",
      scopeId: groupId,
    };
    const packet = buildWorkerContextPacketForAssignment(baseAssignment, "", [], {
      group,
      workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const gate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, packet);
    const rendered = renderWorkerContextPacket(packet);
    const categories = new Map((packet.context_usage?.categories || []).map((item: any) => [item.id, item]));
    const assignment = {
      ...baseAssignment,
      worker_context_packet: packet,
      worker_context_pre_dispatch_gate: gate,
      dispatch_ready: gate.dispatch_ready !== false,
      dispatchReady: gate.dispatch_ready !== false,
    };
    const binding: any = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment) || {};
    distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
      packets: [
        {
          groupId,
          packet_id: "wcp-phase145-post-relapse-recovery",
          binding_id: "binding-phase145-post-relapse-recovery",
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
      updatedAt: "2026-07-10T03:00:03.000Z",
    });
    const recoveredPacket = buildWorkerContextPacketForAssignment(baseAssignment, "", [], {
      group,
      workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const recoveredGate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, recoveredPacket);
    const checks = {
      packetCarriesProviderAdvisory: packet.pressure_provenance_provider_dispatch_advisory?.schema === "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1"
        && packet.pressure_provenance_provider_dispatch_advisory?.selected_candidate?.health_status === "critical"
        && packet.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === true
        && packet.acceptance?.pressure_provenance_provider_dispatch_hold_required === true,
      usageCategorizesProviderAdvisory: Number((categories.get("pressure_provenance_provider_dispatch_advisory") as any)?.tokens || 0) > 0,
      gateBlocksProviderHold: gate.dispatch_ready === false
        && gate.provider_dispatch_hold === true
        && gate.repair_source === "worker_context_pressure_provenance_feedback_provider_dispatch_advisory"
        && gate.next_step === "repair_pressure_provenance_provider_before_child_dispatch",
      renderedShowsProviderAdvisory: rendered.includes("Pressure provenance provider dispatch advisory")
        && rendered.includes("hold_until_repair")
        && rendered.includes("Pre-dispatch hold"),
      bindingPersistsProviderAdvisory: binding.worker_context_packet_pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === true
        && binding.worker_context_packet_render_probe?.rendered_flags?.has_pressure_provenance_provider_dispatch_advisory === true
        && binding.dispatch_ready === false,
      recoveryDisarmsProviderHold: recoveredPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate?.health_status === "monitor"
        && recoveredPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate?.dispatch_policy === "allow_with_receipt_sampling"
        && recoveredGate.dispatch_ready === true
        && recoveredGate.provider_dispatch_hold === false,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      gate: {
        dispatch_ready: gate.dispatch_ready,
        provider_dispatch_hold: gate.provider_dispatch_hold,
        repair_source: gate.repair_source,
        reason: gate.reason,
      },
      advisory: {
        health_status: packet.pressure_provenance_provider_dispatch_advisory?.selected_candidate?.health_status || "",
        dispatch_policy: packet.pressure_provenance_provider_dispatch_advisory?.selected_candidate?.dispatch_policy || "",
        should_hold_dispatch: packet.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === true,
      },
      recovered: {
        dispatch_ready: recoveredGate.dispatch_ready,
        provider_dispatch_hold: recoveredGate.provider_dispatch_hold,
        health_status: recoveredPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate?.health_status || "",
        dispatch_policy: recoveredPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate?.dispatch_policy || "",
      },
    };
  } finally {
    for (const file of [bindingFile, `${bindingFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest() {
  const groupId = `worker-context-pressure-provider-override-followup-pre-dispatch-memory-selftest-${process.pid}-${Date.now()}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const targetProject = "api";
  const agentType = "codex";
  const relPath = "pressure-provider-dispatch-override-followup-pre-dispatch-memory.md";
  try {
    const group = normalizeGroupOrchestrator({
      id: groupId,
      members: [
        { project: "coordinator", role: "coordinator" },
        { project: targetProject, agent: agentType },
      ],
    });
    distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
      packets: [{
        groupId,
        packet_id: "wcp-phase150-initial-missing-usage",
        binding_id: "binding-phase150-initial-missing-usage",
        project: targetProject,
        agent_type: agentType,
        status: "non_compliant",
        pre_dispatch_prompted: true,
        required_doc_count: 1,
        missing_memory_provenance_usage: true,
        gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "initial missing memoryProvenanceUsage" }],
        rel_paths: [relPath],
      }],
    }, {
      frequentThreshold: 2,
      updatedAt: "2026-07-10T04:30:00.000Z",
    });
    distillProviderDispatchOverrideFollowupToTypedMemory(groupId, {
      rows: [{
        groupId,
        project: targetProject,
        agent_type: agentType,
        binding_id: "binding-phase150-provider-override-followup",
        assignment_id: "assignment-phase150-provider-override-followup",
        dispatch_key: "dispatch-phase150-provider-override-followup",
        worker_context_packet_id: "wcp-phase150-provider-override-followup",
        worker_context_provider_dispatch_decision: {
          schema: "ccm-worker-context-provider-dispatch-decision-v1",
          action: "dispatch_with_provider_override",
          decision_id: "decision-phase150-provider-override-followup",
          project: targetProject,
          agent_type: agentType,
        },
        worker_context_provider_dispatch_override_receipt: {
          schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
          override_id: "provider-dispatch-override:phase150-pre-dispatch-memory",
          valid: true,
          approved: true,
          approved_by: "local-user",
          risk_accepted: true,
          acknowledges_repair_required: true,
          reason: "Phase 150 pre-dispatch memory repaired history selftest.",
        },
        worker_context_provider_dispatch_override_followup_repair: {
          work_item_id: "work-phase150-provider-override-followup",
        },
        worker_context_provider_dispatch_override_completion: {
          schema: "ccm-worker-context-provider-dispatch-override-completion-v1",
          completion_id: "completion-phase150-provider-override-followup",
          status: "completed",
          completion_ok: true,
          project: targetProject,
          agent_type: agentType,
          binding_id: "binding-phase150-provider-override-followup",
          assignment_id: "assignment-phase150-provider-override-followup",
          dispatch_key: "dispatch-phase150-provider-override-followup",
          worker_context_packet_id: "wcp-phase150-provider-override-followup",
          decision_id: "decision-phase150-provider-override-followup",
          override_id: "provider-dispatch-override:phase150-pre-dispatch-memory",
          followup_work_item_id: "work-phase150-provider-override-followup",
          task_id: "task-phase150-provider-override-followup",
          task_agent_session_id: "tas-phase150-provider-override-followup",
          execution_id: "execution-phase150-provider-override-followup",
          receipt_status: "done",
          memory_provenance_usage_count: 1,
          current_source_verified_count: 1,
          receipt: {
            status: "done",
            memoryProvenanceUsage: [{
              relPath,
              usageState: "verified",
              repairStatus: "completed",
              repairGapType: "provider_dispatch_override_followup",
              currentSourceVerified: true,
              reason: "PROVIDER_OVERRIDE_FOLLOWUP_PRE_DISPATCH_MEMORY_SENTINEL repaired provider override history.",
            }],
          },
          reason: "override child-agent completion receipt supplied verified memoryProvenanceUsage follow-up evidence",
          at: "2026-07-10T04:31:00.000Z",
        },
      }],
    }, {
      reason: "phase150-pre-dispatch-provider-override-followup-memory",
      updatedAt: "2026-07-10T04:31:00.000Z",
    });
    const baseAssignment: any = {
      project: targetProject,
      agentType,
      task: "验证 provider override follow-up typed memory 会参与 pre-dispatch provider selection。",
      reason: "selftest provider override follow-up pre-dispatch memory",
      dependsOn: "",
      taskFingerprint: "provider-override-followup-pre-dispatch-memory-selftest",
      dispatchKey: `${groupId}|coordinator|${targetProject}|provider-override-followup-pre-dispatch-memory-selftest`,
      assignmentId: `${targetProject}::${groupId}|coordinator|${targetProject}|provider-override-followup-pre-dispatch-memory-selftest::initial::1`,
      attempt: 1,
      sourceProject: "coordinator",
      scopeId: groupId,
    };
    const repairedPacket = buildWorkerContextPacketForAssignment(baseAssignment, "", [], {
      group,
      workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const repairedGate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, repairedPacket);
    const repairedDecision = buildWorkerContextProviderDispatchDecisionForCoordinator(baseAssignment, repairedPacket, repairedGate, {
      at: "2026-07-10T04:31:30.000Z",
    });
    distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
      packets: [{
        groupId,
        packet_id: "wcp-phase150-post-override-compliant-recovery",
        binding_id: "binding-phase150-post-override-compliant-recovery",
        project: targetProject,
        agent_type: agentType,
        status: "compliant",
        pre_dispatch_prompted: true,
        required_doc_count: 1,
        receipt_row_count: 1,
        compliant_doc_count: 1,
        current_source_verified_count: 1,
        rel_paths: [relPath],
      }],
    }, {
      updatedAt: "2026-07-10T04:32:00.000Z",
    });
    distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
      packets: [{
        groupId,
        packet_id: "wcp-phase150-post-repair-relapse",
        binding_id: "binding-phase150-post-repair-relapse",
        project: targetProject,
        agent_type: agentType,
        status: "non_compliant",
        pre_dispatch_prompted: true,
        required_doc_count: 1,
        missing_memory_provenance_usage: true,
        gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "post-repair relapse missing memoryProvenanceUsage" }],
        rel_paths: [relPath],
      }],
    }, {
      frequentThreshold: 2,
      updatedAt: "2026-07-10T04:33:00.000Z",
    });
    const relapsedPacket = buildWorkerContextPacketForAssignment(baseAssignment, "", [], {
      group,
      workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const relapsedGate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, relapsedPacket);
    const relapsedDecision = buildWorkerContextProviderDispatchDecisionForCoordinator(baseAssignment, relapsedPacket, relapsedGate, {
      at: "2026-07-10T04:33:30.000Z",
    });
    const repairedCandidate = repairedPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate || {};
    const relapsedCandidate = relapsedPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate || {};
    const checks = {
      repairedHistoryFeedsProviderAdvisory: repairedCandidate.provider_override_followup_repaired === true
        && Number(repairedCandidate.provider_override_followup_repaired_count || 0) === 1
        && repairedCandidate.provider_override_followup_last_completed_at === "2026-07-10T04:31:00.000Z",
      repairedHistoryAllowsSamplingNotHold: repairedCandidate.health_status === "monitor"
        && repairedCandidate.dispatch_policy === "allow_with_receipt_sampling"
        && repairedPacket.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === false
        && repairedGate.dispatch_ready === true
        && repairedGate.provider_dispatch_hold === false
        && repairedDecision.action === "dispatch_with_receipt_sampling"
        && repairedDecision.requires_receipt_sampling === true,
      preDispatchGateCarriesRepairedHistory: repairedGate.provider_dispatch_override_followup_history?.repaired === true
        && repairedGate.provider_dispatch_override_followup_history?.followup_work_item_ids?.includes("work-phase150-provider-override-followup"),
      activeRelapseStillWinsOverHistory: relapsedCandidate.provider_override_followup_repaired === true
        && relapsedCandidate.provider_override_followup_fresh_after_last_violation === false
        && relapsedCandidate.health_status === "critical"
        && relapsedCandidate.dispatch_policy === "hold_until_repair"
        && relapsedPacket.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === true
        && relapsedGate.dispatch_ready === false
        && relapsedGate.provider_dispatch_hold_blocked === true
        && relapsedDecision.action === "hold_until_repair",
      holdDecisionStillRequiresRepair: relapsedDecision.requires_repair_before_dispatch === true
        && relapsedDecision.dispatch_ready === false
        && relapsedDecision.evidence?.provider_override_followup_repaired === true,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      repaired: {
        health_status: repairedCandidate.health_status || "",
        dispatch_policy: repairedCandidate.dispatch_policy || "",
        provider_override_followup_repaired: repairedCandidate.provider_override_followup_repaired === true,
        action: repairedDecision.action || "",
        dispatch_ready: repairedGate.dispatch_ready,
      },
      relapsed: {
        health_status: relapsedCandidate.health_status || "",
        dispatch_policy: relapsedCandidate.dispatch_policy || "",
        provider_override_followup_repaired: relapsedCandidate.provider_override_followup_repaired === true,
        provider_override_followup_fresh_after_last_violation: relapsedCandidate.provider_override_followup_fresh_after_last_violation === true,
        action: relapsedDecision.action || "",
        dispatch_ready: relapsedGate.dispatch_ready,
      },
    };
  } finally {
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest() {
  const groupId = `worker-context-provider-override-followup-receipt-contract-validation-selftest-${process.pid}-${Date.now()}`;
  const bindingFile = getReplayRepairDispatchBindingsFileForCoordinator(groupId);
  const workItemsFile = getReplayRepairWorkItemsFileForCoordinator(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const targetProject = "api";
  const agentType = "codex";
  const relPath = "pressure-provider-dispatch-override-followup-validation.md";
  const followupWorkItemId = "work-phase152-provider-override-followup";
  const overrideId = "provider-dispatch-override:phase152-validation";
  try {
    const advisory = {
      schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
      groupId,
      project: targetProject,
      agent_type: agentType,
      health_status: "monitor",
      dispatch_policy: "allow_with_receipt_sampling",
      should_hold_dispatch: false,
      selected_candidate: {
        schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
        groupId,
        project: targetProject,
        agent_type: agentType,
        health_status: "monitor",
        dispatch_policy: "allow_with_receipt_sampling",
        should_hold_dispatch: false,
        provider_override_followup_repaired: true,
        provider_override_followup_repaired_count: 1,
        provider_override_followup_memory_provenance_usage_count: 1,
        provider_override_followup_current_source_verified_count: 1,
        provider_override_followup_last_completed_at: "2026-07-10T05:00:00.000Z",
        provider_override_followup_fresh_after_last_violation: true,
        provider_override_followup_rel_paths: [relPath],
        provider_override_followup_work_item_ids: [followupWorkItemId],
        provider_override_followup_override_ids: [overrideId],
      },
    };
    const packet = buildWorkerContextPacket({
      group: { id: groupId, members: [{ project: targetProject }] },
      project: targetProject,
      agentType,
      task: "Phase 152 provider override follow-up receipt contract validation selftest.",
      pressureProvenanceProviderDispatchAdvisory: advisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const assignment: any = {
      scopeId: groupId,
      project: targetProject,
      agentType,
      assignmentId: "assignment-phase152-provider-override-followup-validation",
      dispatchKey: "dispatch-phase152-provider-override-followup-validation",
      taskFingerprint: "phase152 provider override followup receipt contract validation",
      worker_context_packet: packet,
      dispatch_ready: true,
    };
    const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment, { at: "2026-07-10T05:00:01.000Z" }) || {};
    const invalidValidation = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
      binding_id: binding.binding_id,
      assignment_id: assignment.assignmentId,
      worker_context_packet_id: packet.packet_id,
      task_id: "task-phase152-provider-override-followup-validation",
      task_agent_session_id: "tas-phase152-provider-override-followup-validation",
      execution_id: "execution-phase152-provider-override-followup-validation-invalid",
      receipt_status: "done",
      receipt: {
        status: "done",
        memoryProvenanceUsage: [{
          relPath,
          usageState: "used",
          repairStatus: "completed",
          repairGapType: "provider_dispatch_override_followup",
          currentSourceVerified: true,
          reason: "missing providerDispatchOverrideFollowupHistoryReverified and override id",
        }],
      },
    }, { at: "2026-07-10T05:00:02.000Z" });
    const validValidation = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
      binding_id: binding.binding_id,
      assignment_id: assignment.assignmentId,
      worker_context_packet_id: packet.packet_id,
      task_id: "task-phase152-provider-override-followup-validation",
      task_agent_session_id: "tas-phase152-provider-override-followup-validation",
      execution_id: "execution-phase152-provider-override-followup-validation-valid",
      receipt_status: "done",
      receipt: {
        status: "done",
        memoryProvenanceUsage: [{
          relPath,
          usageState: "verified",
          repairStatus: "completed",
          repairGapType: "provider_dispatch_override_followup",
          repairWorkItemId: followupWorkItemId,
          providerDispatchOverrideId: overrideId,
          currentSourceVerified: true,
          providerDispatchOverrideFollowupHistoryReverified: true,
          reason: "Phase 152 selftest reverified current source for provider override follow-up repaired history.",
        }],
      },
    }, { at: "2026-07-10T05:00:03.000Z" });
    const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
    const finalBinding = (ledger.entries || []).find((entry: any) => entry.binding_id === binding.binding_id) || {};
    const checks = {
      invalidReceiptFailsContract: invalidValidation?.status === "failed"
        && invalidValidation?.contract_satisfied === false
        && (invalidValidation?.gaps || []).some((gap: any) => gap.code === "missing_override_id_coverage" || gap.code === "missing_provider_override_followup_reverified_rows"),
      validReceiptPassesContract: validValidation?.status === "passed"
        && validValidation?.contract_satisfied === true
        && validValidation?.covered_rel_path_count === 1
        && validValidation?.covered_followup_work_item_count === 1
        && validValidation?.covered_override_id_count === 1,
      ledgerPersistsFinalValidation: finalBinding.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.contract_satisfied === true
        && finalBinding.provider_dispatch_override_followup_receipt_contract_validation_status === "passed"
        && finalBinding.execution_id === "execution-phase152-provider-override-followup-validation-valid",
      ledgerCountersTrackValidation: Number(ledger.providerDispatchOverrideFollowupReceiptContractValidationCount || 0) >= 1
        && Number(ledger.providerDispatchOverrideFollowupReceiptContractValidationPassedCount || 0) >= 1
        && Number(ledger.providerDispatchOverrideFollowupReceiptContractValidationFailedCount || 0) === 0,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      invalid: {
        status: invalidValidation?.status || "",
        gaps: (invalidValidation?.gaps || []).map((gap: any) => gap.code || gap.reason),
      },
      valid: {
        status: validValidation?.status || "",
        contract_satisfied: validValidation?.contract_satisfied === true,
        covered_rel_path_count: validValidation?.covered_rel_path_count || 0,
        covered_followup_work_item_count: validValidation?.covered_followup_work_item_count || 0,
        covered_override_id_count: validValidation?.covered_override_id_count || 0,
      },
    };
  } finally {
    for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest() {
  const groupId = `worker-context-provider-override-followup-receipt-validation-policy-selftest-${process.pid}-${Date.now()}`;
  const bindingFile = getReplayRepairDispatchBindingsFileForCoordinator(groupId);
  const workItemsFile = getReplayRepairWorkItemsFileForCoordinator(groupId);
  const typedDir = getGroupTypedMemoryDir(groupId);
  const targetProject = "api";
  const agentType = "codex";
  const relPath = "pressure-provider-dispatch-override-followup-receipt-validation-policy.md";
  const followupWorkItemId = "work-phase154-provider-override-followup";
  const overrideId = "provider-dispatch-override:phase154-validation-policy";
  try {
    const initialAdvisory = {
      schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
      groupId,
      project: targetProject,
      agent_type: agentType,
      health_status: "monitor",
      dispatch_policy: "allow_with_receipt_sampling",
      should_hold_dispatch: false,
      selected_candidate: {
        groupId,
        project: targetProject,
        agent_type: agentType,
        health_status: "monitor",
        dispatch_policy: "allow_with_receipt_sampling",
        should_hold_dispatch: false,
        provider_override_followup_repaired: true,
        provider_override_followup_repaired_count: 1,
        provider_override_followup_last_completed_at: "2026-07-10T06:00:00.000Z",
        provider_override_followup_fresh_after_last_violation: true,
        provider_override_followup_rel_paths: [relPath],
        provider_override_followup_work_item_ids: [followupWorkItemId],
        provider_override_followup_override_ids: [overrideId],
      },
    };
    const initialPacket = buildWorkerContextPacket({
      group: { id: groupId, members: [{ project: targetProject }] },
      project: targetProject,
      agentType,
      task: "Phase 154 corrected receipt validation policy selftest.",
      pressureProvenanceProviderDispatchAdvisory: initialAdvisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const assignment: any = {
      scopeId: groupId,
      project: targetProject,
      agentType,
      assignmentId: "assignment-phase154-provider-override-followup-validation-policy",
      dispatchKey: "dispatch-phase154-provider-override-followup-validation-policy",
      taskFingerprint: "phase154 provider override followup receipt validation policy",
      worker_context_packet: initialPacket,
      dispatch_ready: true,
    };
    const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment, { at: "2026-07-10T06:00:01.000Z" }) || {};
    const recordFailedAttempt = (executionId: string, at: string) => recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
      binding_id: binding.binding_id,
      assignment_id: assignment.assignmentId,
      worker_context_packet_id: initialPacket.packet_id,
      task_id: "task-phase154-provider-override-followup-validation-policy",
      task_agent_session_id: `tas-${executionId}`,
      execution_id: executionId,
      receipt_status: "done",
      receipt: {
        status: "done",
        memoryProvenanceUsage: [{
          relPath,
          usageState: "used",
          repairStatus: "completed",
          repairGapType: "provider_dispatch_override_followup",
          currentSourceVerified: true,
          reason: "corrected receipt still misses work-item, override-id, and reverified history evidence",
        }],
      },
    }, { at });
    const failedOne = recordFailedAttempt("execution-phase154-validation-failed-1", "2026-07-10T06:00:02.000Z");
    const failedTwo = recordFailedAttempt("execution-phase154-validation-failed-2", "2026-07-10T06:00:03.000Z");
    const escalatedPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
      targetProject,
      agentType,
      providerOverrideFollowupReceiptValidationFailureThreshold: 2,
      generatedAt: "2026-07-10T06:00:04.000Z",
    });
    const escalatedAdvisory: any = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(groupId, targetProject, agentType, escalatedPolicy) || {};
    const escalatedPacket = buildWorkerContextPacket({
      group: { id: groupId, members: [{ project: targetProject }] },
      project: targetProject,
      agentType,
      task: "Phase 154 dispatch must hold after repeated corrected receipt failures.",
      pressureProvenanceDispatchFeedbackPolicy: escalatedPolicy,
      pressureProvenanceProviderDispatchAdvisory: escalatedAdvisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const escalatedAssignment = {
      scopeId: groupId,
      project: targetProject,
      agentType,
      assignmentId: "assignment-phase154-escalated-provider",
      dispatchKey: "dispatch-phase154-escalated-provider",
    };
    const escalatedGate = buildWorkerContextPreDispatchGateForCoordinator(escalatedAssignment, escalatedPacket);
    const escalatedDecision = buildWorkerContextProviderDispatchDecisionForCoordinator(escalatedAssignment, escalatedPacket, escalatedGate, { at: "2026-07-10T06:00:04.000Z" });
    const passed = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
      binding_id: binding.binding_id,
      assignment_id: assignment.assignmentId,
      worker_context_packet_id: initialPacket.packet_id,
      task_id: "task-phase154-provider-override-followup-validation-policy",
      task_agent_session_id: "tas-execution-phase154-validation-passed",
      execution_id: "execution-phase154-validation-passed",
      receipt_status: "done",
      receipt: {
        status: "done",
        memoryProvenanceUsage: [{
          relPath,
          usageState: "verified",
          repairStatus: "completed",
          repairGapType: "provider_dispatch_override_followup",
          repairWorkItemId: followupWorkItemId,
          providerDispatchOverrideId: overrideId,
          currentSourceVerified: true,
          providerDispatchOverrideFollowupHistoryReverified: true,
          reason: "Phase 154 corrected receipt satisfies the complete provider override follow-up contract.",
        }],
      },
    }, { at: "2026-07-10T06:00:05.000Z" });
    const repairedPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
      targetProject,
      agentType,
      providerOverrideFollowupReceiptValidationFailureThreshold: 2,
      generatedAt: "2026-07-10T06:00:06.000Z",
    });
    const repairedAdvisory: any = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(groupId, targetProject, agentType, repairedPolicy) || {};
    const repairedPacket = buildWorkerContextPacket({
      group: { id: groupId, members: [{ project: targetProject }] },
      project: targetProject,
      agentType,
      task: "Phase 154 dispatch returns to monitored receipt sampling after verified repair.",
      pressureProvenanceDispatchFeedbackPolicy: repairedPolicy,
      pressureProvenanceProviderDispatchAdvisory: repairedAdvisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const repairedAssignment = {
      scopeId: groupId,
      project: targetProject,
      agentType,
      assignmentId: "assignment-phase154-repaired-provider",
      dispatchKey: "dispatch-phase154-repaired-provider",
    };
    const repairedGate = buildWorkerContextPreDispatchGateForCoordinator(repairedAssignment, repairedPacket);
    const repairedDecision = buildWorkerContextProviderDispatchDecisionForCoordinator(repairedAssignment, repairedPacket, repairedGate, { at: "2026-07-10T06:00:06.000Z" });
    const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments } = require("./group-memory-index");
    const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
    const archive = typedLedger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
    const attribution = archive.attributions?.[0] || {};
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const escalatedCandidate = escalatedAdvisory.selected_candidate || {};
    const repairedCandidate = repairedAdvisory.selected_candidate || {};
    const checks = {
      everyAttemptIsArchived: failedOne?.status === "failed"
        && failedTwo?.status === "failed"
        && passed?.status === "passed"
        && Number(archive.attempt_count || 0) === 3
        && Number(archive.failed_count || 0) === 2
        && Number(archive.passed_count || 0) === 1,
      typedFeedbackDocumentWritten: docs.some((doc: any) => doc.relPath === "provider-dispatch-override-followup-receipt-validation-history.md" && doc.type === "feedback"),
      repeatedFailuresEscalatePolicy: escalatedPolicy.active === true
        && escalatedPolicy.action === "hold_provider_after_repeated_override_followup_receipt_validation_failures"
        && Number(escalatedCandidate.provider_override_followup_receipt_validation_consecutive_failure_count || 0) === 2
        && escalatedCandidate.provider_override_followup_receipt_validation_escalated === true,
      repeatedFailuresBlockDispatch: escalatedAdvisory.health_status === "critical"
        && escalatedAdvisory.dispatch_policy === "hold_until_repair"
        && escalatedGate.dispatch_ready === false
        && escalatedGate.provider_dispatch_hold === true
        && escalatedDecision.action === "hold_until_repair",
      verifiedRepairClearsOnlyActiveStreak: attribution.attempt_count === 3
        && attribution.failed_count === 2
        && attribution.passed_count === 1
        && attribution.consecutive_failure_count === 0
        && attribution.repair_verified === true,
      repairedProviderReturnsToSampling: repairedPolicy.active === false
        && repairedPolicy.action === "monitor_repaired_provider_override_followup_receipt_validation"
        && repairedCandidate.provider_override_followup_receipt_validation_repair_verified === true
        && repairedAdvisory.health_status === "monitor"
        && repairedAdvisory.dispatch_policy === "allow_with_receipt_sampling"
        && repairedGate.dispatch_ready === true
        && repairedDecision.action === "dispatch_with_receipt_sampling",
      repairedPacketCarriesSamplingContract: repairedPacket.pressure_provenance_provider_dispatch_override_followup_receipt_contract?.active === true
        && repairedPacket.pressure_provenance_provider_dispatch_override_followup_receipt_contract?.rel_paths?.includes(relPath)
        && renderWorkerContextPacket(repairedPacket).includes("Corrected receipt validation history"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      archive: {
        attempt_count: archive.attempt_count || 0,
        failed_count: archive.failed_count || 0,
        passed_count: archive.passed_count || 0,
        consecutive_failure_count: attribution.consecutive_failure_count || 0,
        repair_verified: attribution.repair_verified === true,
      },
      escalated: {
        action: escalatedPolicy.action || "",
        health_status: escalatedAdvisory.health_status || "",
        dispatch_policy: escalatedAdvisory.dispatch_policy || "",
        dispatch_ready: escalatedGate.dispatch_ready,
      },
      repaired: {
        action: repairedPolicy.action || "",
        health_status: repairedAdvisory.health_status || "",
        dispatch_policy: repairedAdvisory.dispatch_policy || "",
        dispatch_ready: repairedGate.dispatch_ready,
      },
    };
  } finally {
    for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest() {
  const sourceGroupA = `worker-context-provider-reliability-source-a-${process.pid}-${Date.now()}`;
  const sourceGroupB = `worker-context-provider-reliability-source-b-${process.pid}-${Date.now()}`;
  const targetGroup = `worker-context-provider-reliability-target-${process.pid}-${Date.now()}`;
  const sourceTypedDirA = getGroupTypedMemoryDir(sourceGroupA);
  const sourceTypedDirB = getGroupTypedMemoryDir(sourceGroupB);
  const targetTypedDir = getGroupTypedMemoryDir(targetGroup);
  const agentType = "codex";
  const targetProject = "api";
  const nowAt = "2026-07-10T07:00:00.000Z";
  try {
    const {
      buildCrossGroupProviderDispatchReliabilitySignal,
      buildGlobalProviderDispatchReliabilitySignals,
      distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory,
    } = require("./group-memory-index");
    const validation = (groupId: string, project: string, id: string, status: "failed" | "passed", at: string) => ({
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
      repair_work_item_status: status === "passed" ? "completed" : "pending",
      contract: {
        rel_paths: [`private-${project}-evidence.md`],
        followup_work_item_ids: [`private-${project}-followup`],
        override_ids: [`private-${project}-override`],
      },
      gaps: status === "failed" ? [{ code: "private_missing_override", reason: `private ${project} receipt evidence missing` }] : [],
      receipt: {
        status: "done",
        memoryProvenanceUsage: [{ reason: `private ${project} receipt detail`, currentSourceVerified: status === "passed" }],
      },
      at,
    });
    distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupA, {
      rows: [
        { validation: validation(sourceGroupA, "private-alpha-project", "source-a-old-failed-1", "failed", "2026-01-10T07:00:00.000Z") },
        { validation: validation(sourceGroupA, "private-alpha-project", "source-a-old-failed-2", "failed", "2026-01-11T07:00:00.000Z") },
        { validation: validation(sourceGroupA, "private-alpha-project", "source-a-recent-passed", "passed", "2026-07-10T06:50:00.000Z") },
      ],
    }, { updatedAt: "2026-07-10T06:50:00.000Z" });
    distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupB, {
      rows: [
        { validation: validation(sourceGroupB, "private-beta-project", "source-b-recent-failed-1", "failed", "2026-07-10T06:40:00.000Z") },
        { validation: validation(sourceGroupB, "private-beta-project", "source-b-recent-failed-2", "failed", "2026-07-10T06:45:00.000Z") },
      ],
    }, { updatedAt: "2026-07-10T06:45:00.000Z" });
    const oldRepairedSignal = buildCrossGroupProviderDispatchReliabilitySignal(targetGroup, {
      agentType,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA],
      minSourceGroups: 1,
      halfLifeDays: 14,
      generatedAt: nowAt,
    });
    const recentFailureSignal = buildCrossGroupProviderDispatchReliabilitySignal(targetGroup, {
      agentType,
      crossGroupProviderReliabilityGroupIds: [sourceGroupB],
      minSourceGroups: 1,
      halfLifeDays: 14,
      generatedAt: nowAt,
    });
    const crossSignal = buildCrossGroupProviderDispatchReliabilitySignal(targetGroup, {
      agentType,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      halfLifeDays: 14,
      generatedAt: nowAt,
    });
    const globalSignals = buildGlobalProviderDispatchReliabilitySignals({
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      halfLifeDays: 14,
      generatedAt: nowAt,
    });
    const crossPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(targetGroup, {
      targetProject,
      agentType,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      providerReliabilityHalfLifeDays: 14,
      generatedAt: nowAt,
    });
    const disabledCrossPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(targetGroup, {
      targetProject,
      agentType,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      providerReliabilityHalfLifeDays: 14,
      disablePressureProvenanceFeedbackDispatchPolicy: true,
      generatedAt: nowAt,
    });
    const disabledCrossAdvisory = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(targetGroup, targetProject, agentType, disabledCrossPolicy);
    const crossAdvisory: any = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(targetGroup, targetProject, agentType, crossPolicy) || {};
    const crossPacket = buildWorkerContextPacket({
      group: { id: targetGroup, members: [{ project: targetProject }] },
      project: targetProject,
      agentType,
      task: "Phase 155 privacy-redacted cross-group provider reliability guidance selftest.",
      pressureProvenanceDispatchFeedbackPolicy: crossPolicy,
      pressureProvenanceProviderDispatchAdvisory: crossAdvisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const crossAssignment = {
      scopeId: targetGroup,
      project: targetProject,
      agentType,
      assignmentId: "assignment-phase155-cross-provider-guidance",
      dispatchKey: "dispatch-phase155-cross-provider-guidance",
    };
    const crossGate = buildWorkerContextPreDispatchGateForCoordinator(crossAssignment, crossPacket);
    const crossDecision = buildWorkerContextProviderDispatchDecisionForCoordinator(crossAssignment, crossPacket, crossGate, { at: nowAt });
    distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(targetGroup, {
      rows: [
        { validation: validation(targetGroup, targetProject, "target-local-failed-1", "failed", "2026-07-10T06:55:00.000Z") },
        { validation: validation(targetGroup, targetProject, "target-local-failed-2", "failed", "2026-07-10T06:56:00.000Z") },
      ],
    }, { updatedAt: "2026-07-10T06:56:00.000Z" });
    const localPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(targetGroup, {
      targetProject,
      agentType,
      crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
      minSourceGroups: 2,
      providerReliabilityHalfLifeDays: 14,
      generatedAt: nowAt,
    });
    const localAdvisory: any = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(targetGroup, targetProject, agentType, localPolicy) || {};
    const localPacket = buildWorkerContextPacket({
      group: { id: targetGroup, members: [{ project: targetProject }] },
      project: targetProject,
      agentType,
      task: "Phase 155 local provider failure must remain authoritative.",
      pressureProvenanceDispatchFeedbackPolicy: localPolicy,
      pressureProvenanceProviderDispatchAdvisory: localAdvisory,
      contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const localGate = buildWorkerContextPreDispatchGateForCoordinator({
      ...crossAssignment,
      assignmentId: "assignment-phase155-local-provider-hold",
      dispatchKey: "dispatch-phase155-local-provider-hold",
    }, localPacket);
    const serializedSignals = JSON.stringify({ crossSignal, globalSignals });
    const checks = {
      recentEvidenceOutweighsOldRepairedHistory: Number(recentFailureSignal.risk_score || 0) > Number(oldRepairedSignal.risk_score || 0)
        && Number(recentFailureSignal.weighted_failure_score || 0) > Number(oldRepairedSignal.weighted_failure_score || 0)
        && oldRepairedSignal.risk_status === "low",
      crossGroupSignalIsActionableAndDecayed: crossSignal.actionable === true
        && Number(crossSignal.source_group_count || 0) === 2
        && Number(crossSignal.half_life_days || 0) === 14
        && ["high", "medium"].includes(crossSignal.risk_status),
      privacyBoundaryRemovesGroupContent: crossSignal.guidance_only === true
        && crossSignal.local_policy_override_allowed === false
        && crossSignal.contains_private_memory === false
        && globalSignals.contains_private_memory === false
        && !serializedSignals.includes(sourceGroupA)
        && !serializedSignals.includes(sourceGroupB)
        && !serializedSignals.includes("private-alpha-project")
        && !serializedSignals.includes("private-beta-project")
        && !serializedSignals.includes("private-alpha-project-evidence.md")
        && !serializedSignals.includes("source-b-recent-failed-2"),
      crossGroupGuidanceOnlyAddsSampling: crossPolicy.active === false
        && crossPolicy.action === "monitor_cross_group_provider_reliability_guidance"
        && crossAdvisory.health_status === "monitor"
        && crossAdvisory.dispatch_policy === "allow_with_receipt_sampling"
        && crossAdvisory.should_hold_dispatch === false
        && crossGate.dispatch_ready === true
        && crossGate.provider_dispatch_hold !== true
        && crossDecision.action === "dispatch_with_receipt_sampling"
        && crossPacket.acceptance?.cross_group_provider_reliability_sampling_required === true,
      explicitPolicyDisableSuppressesCrossGuidance: disabledCrossPolicy.disabled === true
        && disabledCrossPolicy.crossGroupProviderReliabilityEnabled === false
        && disabledCrossPolicy.crossGroupProviderReliabilityActionable === false
        && disabledCrossAdvisory === null,
      workerPacketCarriesOnlySanitizedGuidance: crossGate.cross_group_provider_reliability_guidance?.guidance_only === true
        && crossGate.cross_group_provider_reliability_guidance?.local_policy_override_allowed === false
        && !renderWorkerContextPacket(crossPacket).includes("private-alpha-project")
        && renderWorkerContextPacket(crossPacket).includes("Cross-group provider reliability guidance"),
      localPolicyRemainsAuthoritative: localPolicy.active === true
        && localPolicy.action === "hold_provider_after_repeated_override_followup_receipt_validation_failures"
        && localAdvisory.health_status === "critical"
        && localAdvisory.dispatch_policy === "hold_until_repair"
        && localGate.dispatch_ready === false
        && localGate.provider_dispatch_hold === true,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      oldRepaired: {
        risk_status: oldRepairedSignal.risk_status,
        risk_score: oldRepairedSignal.risk_score,
        weighted_failure_score: oldRepairedSignal.weighted_failure_score,
      },
      recentFailure: {
        risk_status: recentFailureSignal.risk_status,
        risk_score: recentFailureSignal.risk_score,
        weighted_failure_score: recentFailureSignal.weighted_failure_score,
      },
      cross: {
        risk_status: crossSignal.risk_status,
        source_group_count: crossSignal.source_group_count,
        action: crossPolicy.action,
        dispatch_policy: crossAdvisory.dispatch_policy,
        dispatch_ready: crossGate.dispatch_ready,
      },
      local: {
        action: localPolicy.action,
        dispatch_policy: localAdvisory.dispatch_policy,
        dispatch_ready: localGate.dispatch_ready,
      },
    };
  } finally {
    for (const dir of [sourceTypedDirA, sourceTypedDirB, targetTypedDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}