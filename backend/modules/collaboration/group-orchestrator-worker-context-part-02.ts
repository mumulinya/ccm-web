// Behavior-freeze split from group-orchestrator-worker-context.ts (part 2/3).
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
  COORDINATOR_PROJECT,
  DEFAULT_GROUP_ORCHESTRATOR,
  CCM_DIR,
  loadOrchestratorConfig,
  buildGroupMainAgentBoundary,
} from "./group-orchestrator-config";

import {
  GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR,
  GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR,
  GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR,
  GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR,
  appendWorkerContextCompactHookEntriesForCoordinator,
  appendWorkerContextCompactOutcomeEntriesForCoordinator,
  buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator,
  buildPressureProvenanceProviderDispatchAdvisoryForCoordinator,
  buildProviderDispatchOverrideCompletionForCoordinator,
  buildProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator,
  buildProviderRankingProvenancePreservationForCoordinator,
  buildWorkerContextCompactHookStatsForCoordinator,
  buildWorkerContextCompactOutcomeStatsForCoordinator,
  closeProviderDispatchOverrideFollowupRepairWorkItemForCoordinator,
  combineWorkerContextPartialCompactionSummariesForCoordinator,
  compactReplayRepairDispatchBriefsForWorkerContextRetry,
  compactText,
  compactWorkerContextMetadataCategoriesForRetry,
  compactWorkerContextTaskForRetry,
  findWorkerContextBindingIndexForCoordinator,
  getReplayRepairDispatchBindingsFileForCoordinator,
  getReplayRepairDispatchPlansFileForCoordinator,
  getWorkerContextCompactScopedFileForCoordinator,
  hashCoordinator,
  isApiMicrocompactNativeProofRepairSourceForCoordinator,
  mergeWorkerContextRetryOptionsForCoordinator,
  normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator,
  normalizeProviderDispatchOverrideReceiptForCoordinator,
  normalizeProviderSwitchAuthorityForCoordinator,
  normalizeProviderSwitchRequestForCoordinator,
  normalizeWorkerContextCompactGroupSessionIdForCoordinator,
  normalizeWorkerContextCompactHookEntryForCoordinator,
  normalizeWorkerContextCompactOutcomeEntryForCoordinator,
  normalizeWorkerContextCompactStrategyMemoryForCoordinator,
  normalizeWorkerContextPtlEmergencyHintForCoordinator,
  providerSwitchBindingLedgerCountersForCoordinator,
  providerSwitchDecisionReceiptChecksumForCoordinator,
  rawProviderDispatchOverrideForCoordinator,
  readJsonWithBackupForCoordinator,
  readReplayRepairDispatchBindingLedgerForCoordinator,
  retainWorkerContextCompactOutcomeEntriesForCoordinator,
  summarizeWorkerContextPacketTypedMemoryPressureRecallForCoordinator,
  syncProviderDispatchOverrideFollowupReceiptValidationRepairWorkItemForCoordinator,
  syncProviderDispatchOverrideFollowupRepairWorkItemForCoordinator,
  uniqueCoordinatorStrings,
  workerContextCompactScopeIdForCoordinator,
  workerContextCompactStrategyPressureUsageBiasForCoordinator,
  workerContextPartialCompactMethodForCoordinator,
  workerContextPressureRecallUsageSummaryForCompactPolicy,
  workerContextUsagePressureStatusForCoordinator,
  workerContextUsageTopCategoriesForCoordinator,
  writeJsonAtomicForCoordinator,
  writeWorkerContextCompactStrategyMemoryForCoordinator,
  writeWorkerContextPtlEmergencyHintForCoordinator,
} from "./group-orchestrator";

import {
  buildWorkerContextPacketForAssignment,
  readWorkerContextCompactStrategyMemoryForCoordinator,
  readWorkerContextPtlEmergencyHintForCoordinator,
  validateProviderSwitchDecisionReceiptForCoordinator,
} from "./group-orchestrator-worker-context-part-01";

export function maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment: any, dependsOn: string, replayRepairDispatchBriefs: any[], initialPacket: any, initialGate: any, options: any = {}) {
  if (initialGate?.dispatch_ready === false && options.allowUnsafeLocalCompaction !== true && options.allow_unsafe_local_compaction !== true) {
    return {
      task: baseAssignment.task,
      packet: initialPacket,
      gate: {
        ...initialGate,
        auto_retry_status: "blocked",
        local_compaction_disabled: true,
        next_step: "compact_parent_session_or_rotate_provider_generation",
      },
      retry: null,
    };
  }
  const retryEnabled = options.autoWorkerContextCompactRetry !== false && options.auto_worker_context_compact_retry !== false;
  if (!retryEnabled || initialGate?.dispatch_ready !== false || (initialGate?.provider_dispatch_hold === true && initialGate?.pressure_status !== "over_budget")) {
    return {
      task: baseAssignment.task,
      packet: initialPacket,
      gate: initialGate,
      retry: null,
    };
  }
  const rawRetryOptions = options.workerContextRetryOptions || options.worker_context_retry_options || {};
  let activeReplayRepairDispatchBriefs = replayRepairDispatchBriefs;
  const partialCompactionSummaries: any[] = [];
  const originalMemory = options.memory || options.workerMemory || options.worker_memory || null;
  const groupId = String(baseAssignment.scopeId || options.group?.id || options.groupId || options.group_id || "conversation");
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(
    baseAssignment.groupSessionId
    || baseAssignment.group_session_id
    || initialPacket?.group_session_id
    || initialPacket?.groupSessionId
    || options.groupSessionId
    || options.group_session_id
    || ""
  );
  const originalPacketForProvenance = initialPacket;
  const strategyMemoryDisabled = rawRetryOptions.disableCompactStrategyMemory === true
    || rawRetryOptions.disable_compact_strategy_memory === true
    || options.disableCompactStrategyMemory === true
    || options.disable_compact_strategy_memory === true;
  const compactStrategyMemory = strategyMemoryDisabled ? null : readWorkerContextCompactStrategyMemoryForCoordinator(groupId, groupSessionId);
  const pressureRecallUsageStrategyDisabled = rawRetryOptions.disablePressureRecallUsageStrategy === true
    || rawRetryOptions.disable_pressure_recall_usage_strategy === true
    || options.disablePressureRecallUsageStrategy === true
    || options.disable_pressure_recall_usage_strategy === true;
  const pressureRecallUsageSummaryRaw = pressureRecallUsageStrategyDisabled ? null : buildGroupTypedMemoryPressureRecallUsageSummary(groupId, {
    targetProject: baseAssignment.project || "",
    nowMs: rawRetryOptions.nowMs || rawRetryOptions.now_ms || options.nowMs || options.now_ms,
    now: rawRetryOptions.now || options.now,
    generatedAt: rawRetryOptions.generatedAt || rawRetryOptions.generated_at || options.generatedAt || options.generated_at,
    usageHalfLifeDays: rawRetryOptions.usageHalfLifeDays || rawRetryOptions.usage_half_life_days || options.usageHalfLifeDays || options.usage_half_life_days,
    usageStaleAfterDays: rawRetryOptions.usageStaleAfterDays || rawRetryOptions.usage_stale_after_days || options.usageStaleAfterDays || options.usage_stale_after_days,
    disableUsageAging: rawRetryOptions.disableUsageAging || rawRetryOptions.disable_usage_aging || options.disableUsageAging || options.disable_usage_aging,
  });
  const pressureRecallUsageSummary = pressureRecallUsageSummaryRaw?.has_history === true || Number(pressureRecallUsageSummaryRaw?.memory_count || 0) > 0
    ? pressureRecallUsageSummaryRaw
    : pressureRecallUsageStrategyDisabled ? null : (() => {
      const crossGroupSummary = buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId, {
        targetProject: baseAssignment.project || "",
        nowMs: rawRetryOptions.nowMs || rawRetryOptions.now_ms || options.nowMs || options.now_ms,
        now: rawRetryOptions.now || options.now,
        generatedAt: rawRetryOptions.generatedAt || rawRetryOptions.generated_at || options.generatedAt || options.generated_at,
        usageHalfLifeDays: rawRetryOptions.usageHalfLifeDays || rawRetryOptions.usage_half_life_days || options.usageHalfLifeDays || options.usage_half_life_days,
        usageStaleAfterDays: rawRetryOptions.usageStaleAfterDays || rawRetryOptions.usage_stale_after_days || options.usageStaleAfterDays || options.usage_stale_after_days,
        disableUsageAging: rawRetryOptions.disableUsageAging || rawRetryOptions.disable_usage_aging || options.disableUsageAging || options.disable_usage_aging,
        groupIds: rawRetryOptions.crossGroupPressureRecallUsageGroupIds
          || rawRetryOptions.cross_group_pressure_recall_usage_group_ids
          || options.crossGroupPressureRecallUsageGroupIds
          || options.cross_group_pressure_recall_usage_group_ids
          || options.crossGroupIds
          || options.cross_group_ids,
        maxGroups: rawRetryOptions.maxCrossGroupPressureRecallUsageGroups || rawRetryOptions.max_cross_group_pressure_recall_usage_groups || options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups,
      });
      return crossGroupSummary?.has_history === true || Number(crossGroupSummary?.memory_count || 0) > 0 ? crossGroupSummary : null;
    })();
  const ptlEmergencyHint = readWorkerContextPtlEmergencyHintForCoordinator(groupId, groupSessionId);
  const retryOptions = ptlEmergencyHint.engaged
    ? mergeWorkerContextRetryOptionsForCoordinator(rawRetryOptions, ptlEmergencyHint.recommended_retry_options || {})
    : rawRetryOptions;
  const compactHookRunId = `wcch_${hashCoordinator([
    groupId,
    groupSessionId,
    baseAssignment.assignmentId || baseAssignment.assignment_id || "",
    initialPacket.packet_id || "",
    "worker-context-compact-retry",
  ], 16)}`;
  appendWorkerContextCompactHookEntriesForCoordinator(groupId, [{
    group_session_id: groupSessionId,
    hook_run_id: compactHookRunId,
    phase: "pre",
    assignment_id: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
    dispatch_key: baseAssignment.dispatchKey || baseAssignment.dispatch_key || "",
    project: baseAssignment.project || "",
    from_packet_id: initialPacket.packet_id || "",
    method: "worker_context_memory_first_retry",
    memory_first: true,
    initial_usage_status: initialPacket.context_usage?.status || "",
    dispatch_ready: false,
    result_summary: {
      over_budget: initialGate?.dispatch_ready === false,
      total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
      max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
      free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
      memory_present: !!originalMemory,
      task_chars: String(baseAssignment.task || "").length,
      ptl_emergency_engaged: ptlEmergencyHint.engaged === true,
      ptl_emergency_level: ptlEmergencyHint.engaged ? ptlEmergencyHint.emergency_level : "",
    },
    at: new Date().toISOString(),
  }], groupSessionId);
  const recordPostHook = (packet: any = initialPacket, gate: any = initialGate, retry: any = null, summary: any = {}) => {
    const at = new Date().toISOString();
    const providerRankingProvenancePreservation = retry?.provider_ranking_provenance_preservation
      || retry?.providerRankingProvenancePreservation
      || summary.provider_ranking_provenance_preservation
      || summary.providerRankingProvenancePreservation
      || buildProviderRankingProvenancePreservationForCoordinator(originalPacketForProvenance, packet, {
        retry_id: retry?.retry_id || retry?.retryId || "",
      });
    const completionMemoryPreservation = retry?.post_compact_receipt_memory_usage_repair_completion_preservation
      || retry?.postCompactReceiptMemoryUsageRepairCompletionPreservation
      || summary.post_compact_receipt_memory_usage_repair_completion_preservation
      || summary.postCompactReceiptMemoryUsageRepairCompletionPreservation
      || buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(originalPacketForProvenance, packet, {
        retry_id: retry?.retry_id || retry?.retryId || "",
      });
    const hookLedger = appendWorkerContextCompactHookEntriesForCoordinator(groupId, [{
      group_session_id: groupSessionId,
      hook_run_id: compactHookRunId,
      phase: "post",
      assignment_id: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
      dispatch_key: baseAssignment.dispatchKey || baseAssignment.dispatch_key || "",
      project: baseAssignment.project || "",
      from_packet_id: initialPacket.packet_id || "",
      retry_packet_id: packet?.packet_id || retry?.retry_packet_id || "",
      method: retry?.method || summary.method || "worker_context_memory_first_retry",
      memory_first: retry?.memory_first === true || summary.memory_first === true,
      initial_usage_status: initialPacket.context_usage?.status || "",
      final_usage_status: packet?.context_usage?.status || retry?.retry_usage_status || "",
      dispatch_ready: gate?.dispatch_ready !== false,
      ok: gate?.dispatch_ready !== false,
      status: gate?.dispatch_ready === false ? "blocked" : "ok",
      result_summary: {
        retry_status: retry?.status || summary.retry_status || "",
        auto_retry_status: gate?.auto_retry_status || retry?.status || "",
        total_tokens: Number(packet?.context_usage?.total_tokens || 0),
        max_tokens: Number(packet?.context_usage?.max_tokens || 0),
        free_tokens: Number(packet?.context_usage?.free_tokens || 0),
        memory_reinjection_status: packet?.memory_reinjection_proof?.status || "",
        memory_hash_matches_compaction: packet?.memory_reinjection_proof?.hash_matches_compaction === true,
        omitted_chars: Number(retry?.omitted_chars || 0),
        ptl_emergency_engaged: retry?.ptl_emergency_hint?.engaged === true || retry?.ptlEmergencyHint?.engaged === true,
        ptl_emergency_level: retry?.ptl_emergency_hint?.emergency_level || retry?.ptlEmergencyHint?.emergencyLevel || "",
        provider_ranking_provenance_preserved: providerRankingProvenancePreservation?.preserved === true,
        completion_memory_preservation_required: completionMemoryPreservation?.required === true,
        completion_memory_preserved: completionMemoryPreservation?.preserved === true,
        ...summary,
      },
      at,
    }], groupSessionId);
    const retryObj = retry || {};
    const partialCompaction = retryObj.partial_compaction || retryObj.partialCompaction || null;
    const partialItems = Array.isArray(retryObj.partial_compactions || retryObj.partialCompactions)
      ? (retryObj.partial_compactions || retryObj.partialCompactions)
      : partialCompaction?.schema === "ccm-worker-context-partial-compaction-set-v1" && Array.isArray(partialCompaction.items)
        ? partialCompaction.items
        : partialCompaction?.schema ? [partialCompaction] : [];
    const partialPolicy = retryObj.partial_compact_policy
      || retryObj.partialCompactPolicy
      || partialCompaction?.partial_compact_policy
      || partialCompaction?.partialCompactPolicy
      || partialItems.find((item: any) => item?.partial_compact_policy || item?.partialCompactPolicy)?.partial_compact_policy
      || partialItems.find((item: any) => item?.partial_compact_policy || item?.partialCompactPolicy)?.partialCompactPolicy
      || null;
    const partialCategories = partialItems.flatMap((item: any) => Array.isArray(item?.categories) ? item.categories : [item?.category]).map((item: any) => String(item || "")).filter(Boolean);
    const ptlHint = retryObj.ptl_emergency_hint || retryObj.ptlEmergencyHint || summary.ptl_emergency_hint || summary.ptlEmergencyHint || null;
    const fromTotalTokens = Number(retryObj.from_total_tokens || initialPacket.context_usage?.total_tokens || 0);
    const retryTotalTokens = Number(retryObj.retry_total_tokens || packet?.context_usage?.total_tokens || 0);
    const fromFreeTokens = Number(retryObj.from_free_tokens || initialPacket.context_usage?.free_tokens || 0);
    const retryFreeTokens = Number(retryObj.retry_free_tokens || packet?.context_usage?.free_tokens || 0);
    if (retryObj.schema || summary.retry_status) {
      appendWorkerContextCompactOutcomeEntriesForCoordinator(groupId, [{
        group_id: groupId,
        group_session_id: groupSessionId,
        assignment_id: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
        dispatch_key: baseAssignment.dispatchKey || baseAssignment.dispatch_key || "",
        project: baseAssignment.project || "",
        hook_run_id: compactHookRunId,
        retry_id: retryObj.retry_id || retryObj.retryId || "",
        method: retryObj.method || summary.method || "",
        status: retryObj.status || summary.retry_status || (gate?.dispatch_ready === false ? "blocked" : "recovered"),
        dispatch_ready: gate?.dispatch_ready !== false,
        from_packet_id: retryObj.from_packet_id || initialPacket.packet_id || "",
        retry_packet_id: retryObj.retry_packet_id || packet?.packet_id || "",
        initial_usage_status: initialPacket.context_usage?.status || retryObj.from_usage_status || "",
        final_usage_status: packet?.context_usage?.status || retryObj.retry_usage_status || "",
        from_total_tokens: fromTotalTokens,
        retry_total_tokens: retryTotalTokens,
        from_free_tokens: fromFreeTokens,
        retry_free_tokens: retryFreeTokens,
        token_delta: fromTotalTokens - retryTotalTokens,
        free_token_delta: retryFreeTokens - fromFreeTokens,
        memory_first: retryObj.memory_first === true || summary.memory_first === true,
        partial_compact: retryObj.partial_compact === true || summary.partial_compact === true,
        task_compacted: summary.task_compacted === true || (!!retryObj.original_task_hash && !!retryObj.compacted_task_hash && retryObj.original_task_hash !== retryObj.compacted_task_hash),
        task_hash_unchanged: !!retryObj.original_task_hash && retryObj.original_task_hash === retryObj.compacted_task_hash,
        partial_compaction_categories: partialCategories.length ? partialCategories : summary.partial_compaction_categories || [],
        partial_compact_policy: partialPolicy,
        ptl_emergency_hint: ptlHint,
        omitted_chars: Number(retryObj.omitted_chars || 0),
        memory_omitted_chars: Number(retryObj.memory_compaction?.omitted_chars || retryObj.memoryCompaction?.omitted_chars || 0),
        partial_omitted_chars: partialCompaction?.schema === "ccm-worker-context-partial-compaction-set-v1"
          ? Number(partialCompaction.omitted_chars || 0)
          : partialItems.reduce((sum: number, item: any) => sum + Number(item?.omitted_chars || 0), 0),
        original_task_hash: retryObj.original_task_hash || "",
        compacted_task_hash: retryObj.compacted_task_hash || "",
        provider_ranking_provenance_preservation: providerRankingProvenancePreservation,
        provider_ranking_provenance_preserved: providerRankingProvenancePreservation?.preserved === true,
        post_compact_receipt_memory_usage_repair_completion_preservation: completionMemoryPreservation,
        post_compact_receipt_memory_usage_repair_completion_preserved: completionMemoryPreservation?.preserved === true,
        at,
      }], groupSessionId);
    }
    return hookLedger;
  };
  const memoryCompact = compactWorkerContextMemoryForRetry(originalMemory, retryOptions.memory || retryOptions.memoryOptions || {});
  if (memoryCompact.compacted) {
    const memoryRetryOptions = { ...options, memory: memoryCompact.memory };
    const memoryRetryAssignment = { ...baseAssignment };
    const memoryRetryBasePacket = buildWorkerContextPacketForAssignment(memoryRetryAssignment, dependsOn, activeReplayRepairDispatchBriefs, memoryRetryOptions);
    const memoryRetryProvenancePreservation = buildProviderRankingProvenancePreservationForCoordinator(originalPacketForProvenance, memoryRetryBasePacket);
    const memoryRetryCompletionPreservation = buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(originalPacketForProvenance, memoryRetryBasePacket);
    const memoryRetryBase = {
      schema: "ccm-worker-context-compaction-retry-v1",
      retry_id: `worker-context-retry:${hashCoordinator([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, memoryRetryBasePacket.packet_id, "memory-first"], 14)}`,
      method: "memory_first_deterministic_context_compaction",
      status: "attempted",
      from_packet_id: initialPacket.packet_id || "",
      retry_packet_id: memoryRetryBasePacket.packet_id || "",
      from_usage_status: initialPacket.context_usage?.status || "",
      from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
      from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
      from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
      compact_hook_run_id: compactHookRunId,
      memory_first: true,
      memory_compaction: memoryCompact.summary,
      ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
      original_task_hash: hashCoordinator(baseAssignment.task || "", 24),
      compacted_task_hash: hashCoordinator(baseAssignment.task || "", 24),
      original_task_chars: String(baseAssignment.task || "").length,
      compacted_task_chars: String(baseAssignment.task || "").length,
      omitted_chars: Number(memoryCompact.summary?.omitted_chars || 0),
      critical_line_count: 0,
      preserved_receipt_contract: true,
      provider_ranking_provenance_preservation: memoryRetryProvenancePreservation,
      provider_ranking_provenance_preserved: memoryRetryProvenancePreservation.preserved === true,
      ...(memoryRetryCompletionPreservation.required ? {
        post_compact_receipt_memory_usage_repair_completion_preservation: memoryRetryCompletionPreservation,
        post_compact_receipt_memory_usage_repair_completion_preserved: memoryRetryCompletionPreservation.preserved === true,
      } : {}),
      generated_at: new Date().toISOString(),
    };
    let memoryRetryPacket = refreshWorkerContextPacketUsage({
      ...memoryRetryBasePacket,
      context_compaction_retry: memoryRetryBase,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    let memoryRetryGate = buildWorkerContextPreDispatchGateForCoordinator(memoryRetryAssignment, memoryRetryPacket);
    const memoryRetry = {
      ...memoryRetryBase,
      provider_ranking_provenance_preservation: {
        ...memoryRetryBase.provider_ranking_provenance_preservation,
        retry_id: memoryRetryBase.retry_id,
      },
      ...(memoryRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
        post_compact_receipt_memory_usage_repair_completion_preservation: {
          ...memoryRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
          retry_id: memoryRetryBase.retry_id,
        },
      } : {}),
      status: memoryRetryGate.dispatch_ready === false ? "blocked" : "recovered",
      retry_usage_status: memoryRetryPacket.context_usage?.status || "",
      retry_total_tokens: Number(memoryRetryPacket.context_usage?.total_tokens || 0),
      retry_max_tokens: Number(memoryRetryPacket.context_usage?.max_tokens || 0),
      retry_free_tokens: Number(memoryRetryPacket.context_usage?.free_tokens || 0),
      recovered_dispatch_ready: memoryRetryGate.dispatch_ready !== false,
    };
    memoryRetryPacket = refreshWorkerContextPacketUsage({
      ...memoryRetryPacket,
      context_compaction_retry: memoryRetry,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    memoryRetryGate = buildWorkerContextPreDispatchGateForCoordinator(memoryRetryAssignment, memoryRetryPacket);
    if (memoryRetryGate.dispatch_ready !== false) {
      recordPostHook(memoryRetryPacket, memoryRetryGate, memoryRetryPacket.context_compaction_retry || memoryRetry, {
        retry_status: "recovered",
        memory_first_recovered: true,
      });
      return {
        task: baseAssignment.task,
        packet: memoryRetryPacket,
        gate: {
          ...memoryRetryGate,
          context_compaction_retry: memoryRetryPacket.context_compaction_retry || memoryRetry,
          auto_retry_status: "recovered",
        },
        retry: memoryRetryPacket.context_compaction_retry || memoryRetry,
      };
    }
    initialPacket = memoryRetryPacket;
    initialGate = memoryRetryGate;
    options = memoryRetryOptions;
  }
  const replayBriefPartialCompact = compactReplayRepairDispatchBriefsForWorkerContextRetry(
    activeReplayRepairDispatchBriefs,
    retryOptions.replayRepairDispatchBriefs || retryOptions.replay_repair_dispatch_briefs || retryOptions.partialCompact || retryOptions.partial_compact || {}
  );
  if (replayBriefPartialCompact.compacted) {
    activeReplayRepairDispatchBriefs = replayBriefPartialCompact.briefs;
    partialCompactionSummaries.push(replayBriefPartialCompact.summary);
    const partialRetryAssignment = { ...baseAssignment };
    const partialRetryBasePacket = buildWorkerContextPacketForAssignment(partialRetryAssignment, dependsOn, activeReplayRepairDispatchBriefs, options);
    const partialRetryProvenancePreservation = buildProviderRankingProvenancePreservationForCoordinator(originalPacketForProvenance, partialRetryBasePacket);
    const partialRetryCompletionPreservation = buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(originalPacketForProvenance, partialRetryBasePacket);
    const partialRetryBase = {
      schema: "ccm-worker-context-compaction-retry-v1",
      retry_id: `worker-context-retry:${hashCoordinator([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, partialRetryBasePacket.packet_id, "replay-brief-partial"], 14)}`,
      method: workerContextPartialCompactMethodForCoordinator(memoryCompact.compacted === true, [replayBriefPartialCompact.summary], false),
      status: "attempted",
      from_packet_id: initialPacket.packet_id || "",
      retry_packet_id: partialRetryBasePacket.packet_id || "",
      from_usage_status: initialPacket.context_usage?.status || "",
      from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
      from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
      from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
      compact_hook_run_id: compactHookRunId,
      memory_first: memoryCompact.compacted === true,
      memory_compaction: memoryCompact.summary || null,
      partial_compact: true,
      partial_compaction: replayBriefPartialCompact.summary,
      partial_compactions: [replayBriefPartialCompact.summary],
      ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
      original_task_hash: hashCoordinator(baseAssignment.task || "", 24),
      compacted_task_hash: hashCoordinator(baseAssignment.task || "", 24),
      original_task_chars: String(baseAssignment.task || "").length,
      compacted_task_chars: String(baseAssignment.task || "").length,
      omitted_chars: Number(memoryCompact.summary?.omitted_chars || 0) + Number(replayBriefPartialCompact.summary?.omitted_chars || 0),
      critical_line_count: 0,
      preserved_receipt_contract: true,
      provider_ranking_provenance_preservation: partialRetryProvenancePreservation,
      provider_ranking_provenance_preserved: partialRetryProvenancePreservation.preserved === true,
      ...(partialRetryCompletionPreservation.required ? {
        post_compact_receipt_memory_usage_repair_completion_preservation: partialRetryCompletionPreservation,
        post_compact_receipt_memory_usage_repair_completion_preserved: partialRetryCompletionPreservation.preserved === true,
      } : {}),
      generated_at: new Date().toISOString(),
    };
    let partialRetryPacket = refreshWorkerContextPacketUsage({
      ...partialRetryBasePacket,
      context_compaction_retry: partialRetryBase,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    let partialRetryGate = buildWorkerContextPreDispatchGateForCoordinator(partialRetryAssignment, partialRetryPacket);
    const partialRetry = {
      ...partialRetryBase,
      provider_ranking_provenance_preservation: {
        ...partialRetryBase.provider_ranking_provenance_preservation,
        retry_id: partialRetryBase.retry_id,
      },
      ...(partialRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
        post_compact_receipt_memory_usage_repair_completion_preservation: {
          ...partialRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
          retry_id: partialRetryBase.retry_id,
        },
      } : {}),
      status: partialRetryGate.dispatch_ready === false ? "blocked" : "recovered",
      retry_usage_status: partialRetryPacket.context_usage?.status || "",
      retry_total_tokens: Number(partialRetryPacket.context_usage?.total_tokens || 0),
      retry_max_tokens: Number(partialRetryPacket.context_usage?.max_tokens || 0),
      retry_free_tokens: Number(partialRetryPacket.context_usage?.free_tokens || 0),
      recovered_dispatch_ready: partialRetryGate.dispatch_ready !== false,
    };
    partialRetryPacket = refreshWorkerContextPacketUsage({
      ...partialRetryPacket,
      context_compaction_retry: partialRetry,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    partialRetryGate = buildWorkerContextPreDispatchGateForCoordinator(partialRetryAssignment, partialRetryPacket);
    if (partialRetryGate.dispatch_ready !== false) {
      recordPostHook(partialRetryPacket, partialRetryGate, partialRetryPacket.context_compaction_retry || partialRetry, {
        retry_status: "recovered",
        partial_compact: true,
        partial_compaction_category: replayBriefPartialCompact.summary?.category || "",
      });
      return {
        task: baseAssignment.task,
        packet: partialRetryPacket,
        gate: {
          ...partialRetryGate,
          context_compaction_retry: partialRetryPacket.context_compaction_retry || partialRetry,
          auto_retry_status: "recovered",
        },
        retry: partialRetryPacket.context_compaction_retry || partialRetry,
      };
    }
    initialPacket = partialRetryPacket;
    initialGate = partialRetryGate;
  }
  const metadataPartialCompact = compactWorkerContextMetadataCategoriesForRetry(
    initialPacket,
    options,
    {
      ...(retryOptions.metadata || retryOptions.metadataPartialCompact || retryOptions.metadata_partial_compact || retryOptions.partialCompact || retryOptions.partial_compact || {}),
      compactOutcomeStrategyMemory: compactStrategyMemory,
      pressureRecallUsageSummary,
      groupId,
      targetProject: baseAssignment.project || "",
    }
  );
  if (metadataPartialCompact.compacted) {
    options = metadataPartialCompact.options;
    partialCompactionSummaries.push(metadataPartialCompact.summary);
    const metadataRetryAssignment = { ...baseAssignment };
    const metadataRetryBasePacket = buildWorkerContextPacketForAssignment(metadataRetryAssignment, dependsOn, activeReplayRepairDispatchBriefs, options);
    const metadataRetryProvenancePreservation = buildProviderRankingProvenancePreservationForCoordinator(originalPacketForProvenance, metadataRetryBasePacket);
    const metadataRetryCompletionPreservation = buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(originalPacketForProvenance, metadataRetryBasePacket);
    const partialCompaction = combineWorkerContextPartialCompactionSummariesForCoordinator(partialCompactionSummaries);
    const metadataRetryBase = {
      schema: "ccm-worker-context-compaction-retry-v1",
      retry_id: `worker-context-retry:${hashCoordinator([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, metadataRetryBasePacket.packet_id, "metadata-partial"], 14)}`,
      method: workerContextPartialCompactMethodForCoordinator(memoryCompact.compacted === true, partialCompactionSummaries, false),
      status: "attempted",
      from_packet_id: initialPacket.packet_id || "",
      retry_packet_id: metadataRetryBasePacket.packet_id || "",
      from_usage_status: initialPacket.context_usage?.status || "",
      from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
      from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
      from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
      compact_hook_run_id: compactHookRunId,
      memory_first: memoryCompact.compacted === true,
      memory_compaction: memoryCompact.summary || null,
      partial_compact: true,
      partial_compaction: partialCompaction,
      partial_compactions: [...partialCompactionSummaries],
      partial_compact_policy: metadataPartialCompact.policy || metadataPartialCompact.summary?.partial_compact_policy || null,
      compact_strategy_memory: metadataPartialCompact.policy?.compact_strategy_memory || undefined,
      ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
      original_task_hash: hashCoordinator(baseAssignment.task || "", 24),
      compacted_task_hash: hashCoordinator(baseAssignment.task || "", 24),
      original_task_chars: String(baseAssignment.task || "").length,
      compacted_task_chars: String(baseAssignment.task || "").length,
      omitted_chars: Number(memoryCompact.summary?.omitted_chars || 0)
        + partialCompactionSummaries.reduce((sum, item) => sum + Number(item?.omitted_chars || 0), 0),
      critical_line_count: 0,
      preserved_receipt_contract: true,
      provider_ranking_provenance_preservation: metadataRetryProvenancePreservation,
      provider_ranking_provenance_preserved: metadataRetryProvenancePreservation.preserved === true,
      ...(metadataRetryCompletionPreservation.required ? {
        post_compact_receipt_memory_usage_repair_completion_preservation: metadataRetryCompletionPreservation,
        post_compact_receipt_memory_usage_repair_completion_preserved: metadataRetryCompletionPreservation.preserved === true,
      } : {}),
      generated_at: new Date().toISOString(),
    };
    let metadataRetryPacket = refreshWorkerContextPacketUsage({
      ...metadataRetryBasePacket,
      context_compaction_retry: metadataRetryBase,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    let metadataRetryGate = buildWorkerContextPreDispatchGateForCoordinator(metadataRetryAssignment, metadataRetryPacket);
    const metadataRetry = {
      ...metadataRetryBase,
      provider_ranking_provenance_preservation: {
        ...metadataRetryBase.provider_ranking_provenance_preservation,
        retry_id: metadataRetryBase.retry_id,
      },
      ...(metadataRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
        post_compact_receipt_memory_usage_repair_completion_preservation: {
          ...metadataRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
          retry_id: metadataRetryBase.retry_id,
        },
      } : {}),
      status: metadataRetryGate.dispatch_ready === false ? "blocked" : "recovered",
      retry_usage_status: metadataRetryPacket.context_usage?.status || "",
      retry_total_tokens: Number(metadataRetryPacket.context_usage?.total_tokens || 0),
      retry_max_tokens: Number(metadataRetryPacket.context_usage?.max_tokens || 0),
      retry_free_tokens: Number(metadataRetryPacket.context_usage?.free_tokens || 0),
      recovered_dispatch_ready: metadataRetryGate.dispatch_ready !== false,
    };
    metadataRetryPacket = refreshWorkerContextPacketUsage({
      ...metadataRetryPacket,
      context_compaction_retry: metadataRetry,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    metadataRetryGate = buildWorkerContextPreDispatchGateForCoordinator(metadataRetryAssignment, metadataRetryPacket);
    if (metadataRetryGate.dispatch_ready !== false) {
      recordPostHook(metadataRetryPacket, metadataRetryGate, metadataRetryPacket.context_compaction_retry || metadataRetry, {
        retry_status: "recovered",
        partial_compact: true,
        partial_compaction_category: metadataPartialCompact.summary?.category || "",
        partial_compaction_categories: partialCompactionSummaries.flatMap((item: any) => item?.categories || [item?.category]).filter(Boolean),
        partial_compact_policy_selected: metadataPartialCompact.policy?.selected_categories || [],
        partial_compact_policy_skipped: metadataPartialCompact.policy?.skipped_categories || [],
        compact_strategy_preferred: metadataPartialCompact.policy?.compact_strategy_memory?.preferred_categories || [],
      });
      return {
        task: baseAssignment.task,
        packet: metadataRetryPacket,
        gate: {
          ...metadataRetryGate,
          context_compaction_retry: metadataRetryPacket.context_compaction_retry || metadataRetry,
          auto_retry_status: "recovered",
        },
        retry: metadataRetryPacket.context_compaction_retry || metadataRetry,
      };
    }
    initialPacket = metadataRetryPacket;
    initialGate = metadataRetryGate;
  }
  const compactedTask = compactWorkerContextTaskForRetry(baseAssignment.task, retryOptions);
  if (!compactedTask.compacted) {
    const partialSummaryForNoTask = combineWorkerContextPartialCompactionSummariesForCoordinator(partialCompactionSummaries);
    recordPostHook(initialPacket, initialGate, null, {
      retry_status: "blocked",
      method: partialSummaryForNoTask
        ? memoryCompact.compacted
          ? "memory_first_partial_no_task_compaction_available"
          : "partial_no_task_compaction_available"
        : memoryCompact.compacted ? "memory_first_no_task_compaction_available" : "no_compaction_available",
      memory_first: memoryCompact.compacted === true,
      partial_compact: !!partialSummaryForNoTask,
      partial_compaction_category: partialSummaryForNoTask?.category || "",
    });
    return {
      task: baseAssignment.task,
      packet: initialPacket,
      gate: initialGate,
      retry: null,
    };
  }
  const retryAssignment = { ...baseAssignment, task: compactedTask.text };
  const retryBasePacket = buildWorkerContextPacketForAssignment(retryAssignment, dependsOn, activeReplayRepairDispatchBriefs, options);
  const retryProvenancePreservation = buildProviderRankingProvenancePreservationForCoordinator(originalPacketForProvenance, retryBasePacket);
  const retryCompletionPreservation = buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(originalPacketForProvenance, retryBasePacket);
  const taskPartialCompaction = combineWorkerContextPartialCompactionSummariesForCoordinator(partialCompactionSummaries);
  const taskRetryMethod = workerContextPartialCompactMethodForCoordinator(memoryCompact.compacted === true, partialCompactionSummaries, true);
  const retryBase = {
    schema: "ccm-worker-context-compaction-retry-v1",
    retry_id: `worker-context-retry:${hashCoordinator([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, retryBasePacket.packet_id], 14)}`,
    method: taskRetryMethod,
    status: "attempted",
    from_packet_id: initialPacket.packet_id || "",
    retry_packet_id: retryBasePacket.packet_id || "",
    from_usage_status: initialPacket.context_usage?.status || "",
    from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
    from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
    from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
    compact_hook_run_id: compactHookRunId,
    memory_first: memoryCompact.compacted === true,
    memory_compaction: memoryCompact.summary || null,
    partial_compact: !!taskPartialCompaction,
    partial_compaction: taskPartialCompaction,
    partial_compactions: [...partialCompactionSummaries],
    partial_compact_policy: taskPartialCompaction?.partial_compact_policy
      || (Array.isArray(taskPartialCompaction?.items) ? taskPartialCompaction.items.find((item: any) => item?.partial_compact_policy)?.partial_compact_policy : null)
      || null,
    ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
    original_task_hash: hashCoordinator(baseAssignment.task || "", 24),
    compacted_task_hash: hashCoordinator(compactedTask.text || "", 24),
    original_task_chars: compactedTask.originalChars,
    compacted_task_chars: compactedTask.compactedChars,
    omitted_chars: compactedTask.omittedChars
      + Number(memoryCompact.summary?.omitted_chars || 0)
      + partialCompactionSummaries.reduce((sum, item) => sum + Number(item?.omitted_chars || 0), 0),
    critical_line_count: compactedTask.criticalLines.length,
    preserved_receipt_contract: true,
    provider_ranking_provenance_preservation: retryProvenancePreservation,
    provider_ranking_provenance_preserved: retryProvenancePreservation.preserved === true,
    ...(retryCompletionPreservation.required ? {
      post_compact_receipt_memory_usage_repair_completion_preservation: retryCompletionPreservation,
      post_compact_receipt_memory_usage_repair_completion_preserved: retryCompletionPreservation.preserved === true,
    } : {}),
    generated_at: new Date().toISOString(),
  };
  let retryPacket = refreshWorkerContextPacketUsage({
    ...retryBasePacket,
    context_compaction_retry: retryBase,
  }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
  let retryGate = buildWorkerContextPreDispatchGateForCoordinator(retryAssignment, retryPacket);
  const retry = {
    ...retryBase,
    provider_ranking_provenance_preservation: {
      ...retryBase.provider_ranking_provenance_preservation,
      retry_id: retryBase.retry_id,
    },
    ...(retryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
      post_compact_receipt_memory_usage_repair_completion_preservation: {
        ...retryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
        retry_id: retryBase.retry_id,
      },
    } : {}),
    status: retryGate.dispatch_ready === false ? "blocked" : "recovered",
    retry_usage_status: retryPacket.context_usage?.status || "",
    retry_total_tokens: Number(retryPacket.context_usage?.total_tokens || 0),
    retry_max_tokens: Number(retryPacket.context_usage?.max_tokens || 0),
    retry_free_tokens: Number(retryPacket.context_usage?.free_tokens || 0),
    recovered_dispatch_ready: retryGate.dispatch_ready !== false,
  };
  retryPacket = refreshWorkerContextPacketUsage({
    ...retryPacket,
    context_compaction_retry: retry,
  }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
  retryGate = buildWorkerContextPreDispatchGateForCoordinator(retryAssignment, retryPacket);
  recordPostHook(retryPacket, retryGate, retryPacket.context_compaction_retry || retry, {
    retry_status: retryGate.dispatch_ready === false ? "blocked" : "recovered",
    task_compacted: true,
    partial_compact: !!taskPartialCompaction,
    partial_compaction_category: taskPartialCompaction?.category || "",
    partial_compaction_categories: partialCompactionSummaries.flatMap((item: any) => item?.categories || [item?.category]).filter(Boolean),
  });
  return {
    task: compactedTask.text,
    packet: retryPacket,
    gate: {
      ...retryGate,
      context_compaction_retry: retryPacket.context_compaction_retry || retry,
      auto_retry_status: retryGate.dispatch_ready === false ? "blocked" : "recovered",
    },
    retry: retryPacket.context_compaction_retry || retry,
  };
}

export function buildWorkerContextPreDispatchGateForCoordinator(assignment: any = {}, packet: any = {}) {
  const usage = packet.context_usage || packet.contextUsage || {};
  const retry = packet.context_compaction_retry || packet.contextCompactionRetry || null;
  const providerAdvisory = packet.pressure_provenance_provider_dispatch_advisory
    || packet.pressureProvenanceProviderDispatchAdvisory
    || null;
  const selectedProvider = providerAdvisory?.selected_candidate
    || providerAdvisory?.selectedCandidate
    || {};
  const pressureStatus = workerContextUsagePressureStatusForCoordinator(usage);
  const overBudget = pressureStatus === "over_budget";
  const completionMemoryPreservation = normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(
    retry?.post_compact_receipt_memory_usage_repair_completion_preservation
      || retry?.postCompactReceiptMemoryUsageRepairCompletionPreservation
      || null
  );
  const completionMemoryPreservationBlocked = completionMemoryPreservation?.required === true
    && completionMemoryPreservation?.preserved !== true;
  const providerHold = providerAdvisory?.should_hold_dispatch === true
    || providerAdvisory?.shouldHoldDispatch === true
    || selectedProvider?.should_hold_dispatch === true
    || selectedProvider?.shouldHoldDispatch === true
    || String(selectedProvider?.dispatch_policy || selectedProvider?.dispatchPolicy || providerAdvisory?.dispatch_policy || providerAdvisory?.dispatchPolicy || "") === "hold_until_repair";
  const providerOverrideReceipt = normalizeProviderDispatchOverrideReceiptForCoordinator(
    rawProviderDispatchOverrideForCoordinator(assignment, packet),
    {
      groupId: assignment.scopeId || assignment.scope_id || providerAdvisory?.groupId || providerAdvisory?.group_id || "",
      project: assignment.project || packet.project || providerAdvisory?.project || selectedProvider.project || "",
      agentType: assignment.agentType || assignment.agent_type || packet.agent_type || packet.agentType || selectedProvider.agent_type || selectedProvider.agentType || providerAdvisory?.agent_type || providerAdvisory?.agentType || "",
      healthStatus: selectedProvider?.health_status || selectedProvider?.healthStatus || providerAdvisory?.health_status || providerAdvisory?.healthStatus || "",
      dispatchPolicy: selectedProvider?.dispatch_policy || selectedProvider?.dispatchPolicy || providerAdvisory?.dispatch_policy || providerAdvisory?.dispatchPolicy || "",
    }
  );
  const providerHoldOverridden = providerHold && providerOverrideReceipt?.valid === true;
  const providerHoldBlocked = providerHold && !providerHoldOverridden;
  const blocked = overBudget || providerHoldBlocked || completionMemoryPreservationBlocked;
  const compactRecommended = !!pressureStatus;
  const topCategories = workerContextUsageTopCategoriesForCoordinator(usage);
  const suggestedReductions = Array.isArray(usage.suggested_reductions || usage.suggestedReductions)
    ? (usage.suggested_reductions || usage.suggestedReductions).slice(0, 8)
    : [];
  const packetId = String(packet.packet_id || "").trim();
  const gateId = `worker-context-pre-dispatch:${hashCoordinator([
    assignment.scopeId || assignment.scope_id || "",
    assignment.assignmentId || assignment.assignment_id || "",
    assignment.dispatchKey || assignment.dispatch_key || "",
    packetId,
  ], 14)}`;
  return {
    schema: "ccm-worker-context-pre-dispatch-gate-v1",
    gate_id: gateId,
    gateId,
    assignment_id: assignment.assignmentId || assignment.assignment_id || "",
    dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
    project: assignment.project || "",
    worker_context_packet_id: packetId,
    usage_status: usage.status || "",
    pressure_status: pressureStatus || usage.status || "ok",
    dispatch_ready: !blocked,
    dispatchReady: !blocked,
    blocked,
    compact_recommended: compactRecommended,
    must_repair_before_dispatch: blocked,
    completion_memory_preservation_blocked: completionMemoryPreservationBlocked,
    completion_memory_preservation: completionMemoryPreservation,
    provider_dispatch_hold: providerHold,
    provider_dispatch_hold_blocked: providerHoldBlocked,
    provider_dispatch_hold_overridden: providerHoldOverridden,
    provider_dispatch_override_receipt: providerOverrideReceipt,
    provider_dispatch_override_required_followup_repair: providerHoldOverridden,
    provider_dispatch_override_followup_history: selectedProvider?.provider_override_followup_repaired === true ? {
      repaired: true,
      repaired_count: Number(selectedProvider.provider_override_followup_repaired_count || 0),
      last_completed_at: selectedProvider.provider_override_followup_last_completed_at || "",
      fresh_after_last_violation: selectedProvider.provider_override_followup_fresh_after_last_violation === true,
      rel_paths: Array.isArray(selectedProvider.provider_override_followup_rel_paths) ? selectedProvider.provider_override_followup_rel_paths.slice(0, 8) : [],
      followup_work_item_ids: Array.isArray(selectedProvider.provider_override_followup_work_item_ids) ? selectedProvider.provider_override_followup_work_item_ids.slice(0, 8) : [],
      override_ids: Array.isArray(selectedProvider.provider_override_followup_override_ids) ? selectedProvider.provider_override_followup_override_ids.slice(0, 8) : [],
    } : null,
    provider_dispatch_override_followup_receipt_validation_history: Number(selectedProvider?.provider_override_followup_receipt_validation_attempt_count || 0) > 0 ? {
      attempt_count: Number(selectedProvider.provider_override_followup_receipt_validation_attempt_count || 0),
      failed_count: Number(selectedProvider.provider_override_followup_receipt_validation_failed_count || 0),
      passed_count: Number(selectedProvider.provider_override_followup_receipt_validation_passed_count || 0),
      consecutive_failure_count: Number(selectedProvider.provider_override_followup_receipt_validation_consecutive_failure_count || 0),
      latest_status: selectedProvider.provider_override_followup_receipt_validation_latest_status || "",
      escalated: selectedProvider.provider_override_followup_receipt_validation_escalated === true,
      repair_verified: selectedProvider.provider_override_followup_receipt_validation_repair_verified === true,
      last_failed_at: selectedProvider.provider_override_followup_receipt_validation_last_failed_at || "",
      last_passed_at: selectedProvider.provider_override_followup_receipt_validation_last_passed_at || "",
      validation_ids: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_ids) ? selectedProvider.provider_override_followup_receipt_validation_ids.slice(0, 8) : [],
      repair_work_item_ids: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_repair_work_item_ids) ? selectedProvider.provider_override_followup_receipt_validation_repair_work_item_ids.slice(0, 8) : [],
      gap_codes: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_gap_codes) ? selectedProvider.provider_override_followup_receipt_validation_gap_codes.slice(0, 8) : [],
    } : null,
    cross_group_provider_reliability_guidance: selectedProvider?.cross_group_provider_reliability_actionable === true ? {
      schema: "ccm-cross-group-provider-dispatch-reliability-gate-guidance-v1",
      agent_type: selectedProvider.agent_type || selectedProvider.agentType || packet.agent_type || packet.agentType || "unknown",
      risk_status: selectedProvider.cross_group_provider_reliability_risk_status || "empty",
      risk_score: Number(selectedProvider.cross_group_provider_reliability_risk_score || 0),
      confidence: Number(selectedProvider.cross_group_provider_reliability_confidence || 0),
      source_group_count: Number(selectedProvider.cross_group_provider_reliability_source_group_count || 0),
      guidance_only: true,
      local_policy_override_allowed: false,
      contains_private_memory: false,
    } : null,
    pressure_provenance_provider_dispatch_advisory: providerAdvisory,
    reason: providerHoldBlocked
      ? `Pressure provenance provider dispatch hold: agentType=${selectedProvider.agent_type || selectedProvider.agentType || packet.agent_type || "unknown"} project=${assignment.project || packet.project || "unknown"} health=${selectedProvider.health_status || selectedProvider.healthStatus || providerAdvisory?.health_status || "critical"}; repair/recovery required before child dispatch.`
      : providerHoldOverridden
      ? `Pressure provenance provider dispatch hold overridden by approved receipt ${providerOverrideReceipt?.override_id || ""}; follow-up repair/recovery remains required.`
      : overBudget
      ? `WorkerContextPacket over budget before child dispatch: ${Number(usage.total_tokens || 0)}/${Number(usage.max_tokens || 0)} tokens, free=${Number(usage.free_tokens || 0)}.`
      : compactRecommended
        ? `WorkerContextPacket ${pressureStatus}; compact recommended before this packet grows further.`
        : "WorkerContextPacket context usage is within pre-dispatch budget.",
    repair_source: providerHoldBlocked ? "worker_context_pressure_provenance_feedback_provider_dispatch_advisory" : overBudget ? "worker_context_packet_context_usage_repair" : "",
    context_compaction_retry: retry,
    auto_retry_status: retry?.status || "",
    next_step: providerHoldBlocked
      ? "repair_pressure_provenance_provider_before_child_dispatch"
      : providerHoldOverridden
      ? "dispatch_child_agent_with_provider_override_receipt"
      : overBudget
      ? "compact_worker_context_packet_before_child_dispatch"
      : compactRecommended
        ? "prefer_compact_before_large_followup"
        : "dispatch_child_agent",
    total_tokens: Number(usage.total_tokens || 0),
    max_tokens: Number(usage.max_tokens || 0),
    free_tokens: Number(usage.free_tokens || 0),
    pressure: Number(usage.pressure || 0),
    autocompact_buffer_tokens: Number(usage.autocompact_buffer_tokens || 0),
    top_categories: topCategories,
    suggested_reductions: suggestedReductions,
    generated_at: new Date().toISOString(),
  };
}

export function buildWorkerContextProviderDispatchDecisionForCoordinator(assignment: any = {}, packet: any = {}, gate: any = {}, options: any = {}) {
  const providerAdvisory = gate.pressure_provenance_provider_dispatch_advisory
    || gate.pressureProvenanceProviderDispatchAdvisory
    || packet.pressure_provenance_provider_dispatch_advisory
    || packet.pressureProvenanceProviderDispatchAdvisory
    || null;
  const selectedProvider = providerAdvisory?.selected_candidate
    || providerAdvisory?.selectedCandidate
    || {};
  const providerSwitchDecisionReceipt = assignment.provider_switch_decision_receipt
    || assignment.providerSwitchDecisionReceipt
    || packet.provider_switch_decision_receipt
    || packet.providerSwitchDecisionReceipt
    || null;
  const advisedAlternative = Number(providerAdvisory?.safer_alternative_count || providerAdvisory?.saferAlternativeCount || 0) > 0
    || (Array.isArray(providerAdvisory?.safer_alternatives || providerAdvisory?.saferAlternatives)
      && (providerAdvisory?.safer_alternatives || providerAdvisory?.saferAlternatives).length > 0)
    || providerSwitchDecisionReceipt?.advised_alternative === true;
  const approvedProviderSwitch = providerSwitchDecisionReceipt?.schema === "ccm-provider-switch-decision-receipt-v1"
    && providerSwitchDecisionReceipt.valid === true
    && providerSwitchDecisionReceipt.status === "approved";
  const project = String(assignment.project || packet.project || providerAdvisory?.project || selectedProvider.project || "unknown").trim() || "unknown";
  const agentType = String(
    assignment.agentType
    || assignment.agent_type
    || assignment.executor
    || assignment.runner
    || packet.agent_type
    || packet.agentType
    || selectedProvider.agent_type
    || selectedProvider.agentType
    || providerAdvisory?.agent_type
    || providerAdvisory?.agentType
    || "unknown"
  ).trim() || "unknown";
  const dispatchPolicy = String(
    selectedProvider.dispatch_policy
    || selectedProvider.dispatchPolicy
    || providerAdvisory?.dispatch_policy
    || providerAdvisory?.dispatchPolicy
    || (gate.provider_dispatch_hold === true ? "hold_until_repair" : "normal_dispatch")
  ).trim() || "normal_dispatch";
  const healthStatus = String(
    selectedProvider.health_status
    || selectedProvider.healthStatus
    || providerAdvisory?.health_status
    || providerAdvisory?.healthStatus
    || ""
  ).trim();
  const providerHold = gate.provider_dispatch_hold === true
    || providerAdvisory?.should_hold_dispatch === true
    || providerAdvisory?.shouldHoldDispatch === true
    || selectedProvider.should_hold_dispatch === true
    || selectedProvider.shouldHoldDispatch === true
    || dispatchPolicy === "hold_until_repair";
  const providerHoldOverridden = gate.provider_dispatch_hold_overridden === true
    || gate.providerDispatchHoldOverridden === true;
  const providerHoldBlocked = providerHold && !providerHoldOverridden;
  const dispatchReady = gate.dispatch_ready !== false && !providerHoldBlocked;
  const overrideReceipt = gate.provider_dispatch_override_receipt
    || gate.providerDispatchOverrideReceipt
    || normalizeProviderDispatchOverrideReceiptForCoordinator(rawProviderDispatchOverrideForCoordinator(assignment, packet), {
      groupId: assignment.scopeId || assignment.scope_id || providerAdvisory?.groupId || providerAdvisory?.group_id || options.groupId || options.group_id || "",
      project,
      agentType,
      healthStatus,
      dispatchPolicy,
    });
  const action = approvedProviderSwitch && dispatchReady
    ? "dispatch_with_provider_switch"
    : providerHoldOverridden && dispatchReady
    ? "dispatch_with_provider_override"
    : providerHoldBlocked
    ? "hold_until_repair"
    : gate.dispatch_ready === false
      ? "hold_for_context_repair"
      : dispatchPolicy === "allow_with_receipt_sampling"
        ? "dispatch_with_receipt_sampling"
        : dispatchPolicy === "strict_review_before_dispatch"
          ? "strict_review_before_dispatch"
          : dispatchPolicy === "allow_with_monitoring"
            ? "dispatch_with_monitoring"
            : "dispatch";
  const groupId = String(assignment.scopeId || assignment.scope_id || providerAdvisory?.groupId || providerAdvisory?.group_id || options.groupId || options.group_id || "").trim();
  const at = String(options.at || new Date().toISOString());
  const decisionId = `provider-dispatch-decision:${hashCoordinator([
    groupId,
    assignment.assignmentId || assignment.assignment_id || "",
    assignment.dispatchKey || assignment.dispatch_key || "",
    packet.packet_id || "",
    agentType,
    project,
    providerSwitchDecisionReceipt?.receipt_id || "",
  ], 14)}`;
  const openRepairItemIds = Array.isArray(selectedProvider.current_open_repair_item_ids || selectedProvider.currentOpenRepairItemIds)
    ? (selectedProvider.current_open_repair_item_ids || selectedProvider.currentOpenRepairItemIds).slice(0, 8)
    : [];
  return {
    schema: "ccm-worker-context-provider-dispatch-decision-v1",
    version: 1,
    decision_id: decisionId,
    groupId,
    source: "group_main_agent_pre_dispatch_provider_decision",
    project,
    agent_type: agentType,
    selected_provider: {
      project,
      agent_type: agentType,
      health_status: healthStatus,
      dispatch_policy: dispatchPolicy,
      configured: true,
      provider_override_followup_repaired: selectedProvider.provider_override_followup_repaired === true,
      provider_override_followup_repaired_count: Number(selectedProvider.provider_override_followup_repaired_count || 0),
      provider_override_followup_last_completed_at: selectedProvider.provider_override_followup_last_completed_at || "",
      provider_override_followup_receipt_validation_attempt_count: Number(selectedProvider.provider_override_followup_receipt_validation_attempt_count || 0),
      provider_override_followup_receipt_validation_consecutive_failure_count: Number(selectedProvider.provider_override_followup_receipt_validation_consecutive_failure_count || 0),
      provider_override_followup_receipt_validation_escalated: selectedProvider.provider_override_followup_receipt_validation_escalated === true,
      provider_override_followup_receipt_validation_repair_verified: selectedProvider.provider_override_followup_receipt_validation_repair_verified === true,
      cross_group_provider_reliability_actionable: selectedProvider.cross_group_provider_reliability_actionable === true,
      cross_group_provider_reliability_risk_status: selectedProvider.cross_group_provider_reliability_risk_status || "empty",
      cross_group_provider_reliability_risk_score: Number(selectedProvider.cross_group_provider_reliability_risk_score || 0),
      cross_group_provider_reliability_confidence: Number(selectedProvider.cross_group_provider_reliability_confidence || 0),
      cross_group_provider_reliability_source_group_count: Number(selectedProvider.cross_group_provider_reliability_source_group_count || 0),
      provider_reliability_snapshot_id: selectedProvider.provider_reliability_snapshot_id || "",
      provider_reliability_snapshot_checksum: selectedProvider.provider_reliability_snapshot_checksum || "",
      provider_reliability_snapshot_status: selectedProvider.provider_reliability_snapshot_status || "",
    },
    assignment_id: assignment.assignmentId || assignment.assignment_id || "",
    dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
    worker_context_packet_id: packet.packet_id || "",
    pre_dispatch_gate_id: gate.gate_id || gate.gateId || "",
    advisory_present: !!providerAdvisory?.schema,
    pressure_provenance_provider_dispatch_advisory: providerAdvisory?.schema ? providerAdvisory : null,
    health_status: healthStatus,
    dispatch_policy: dispatchPolicy,
    action,
    decision: action,
    dispatch_ready: dispatchReady,
    dispatchReady,
    should_create_real_task: dispatchReady,
    provider_dispatch_hold: providerHold,
    provider_dispatch_hold_blocked: providerHoldBlocked,
    provider_dispatch_hold_overridden: providerHoldOverridden,
    requires_repair_before_dispatch: providerHoldBlocked || (gate.dispatch_ready === false && !!gate.repair_source),
    requires_repair_followup: providerHoldOverridden,
    requires_receipt_sampling: dispatchPolicy === "allow_with_receipt_sampling",
    safer_alternative_count: Number(providerAdvisory?.safer_alternative_count || 0),
    safer_alternatives: Array.isArray(providerAdvisory?.safer_alternatives) ? providerAdvisory.safer_alternatives.slice(0, 6) : [],
    provider_reliability_snapshot: providerAdvisory?.provider_reliability_snapshot || null,
    auto_switch_provider_allowed: false,
    provider_switch_decision_receipt: providerSwitchDecisionReceipt,
    advised_alternative: advisedAlternative,
    approved_switch: approvedProviderSwitch,
    actually_executed_provider: "",
    repair_source: gate.repair_source || (providerHoldBlocked ? "worker_context_pressure_provenance_feedback_provider_dispatch_advisory" : ""),
    next_step: approvedProviderSwitch
      ? "dispatch_child_agent_with_provider_switch_receipt"
      : gate.next_step || (providerHold ? "repair_pressure_provenance_provider_before_child_dispatch" : "dispatch_child_agent"),
    reason: approvedProviderSwitch
      ? `Approved provider switch ${providerSwitchDecisionReceipt.old_provider?.agent_type || "unknown"} -> ${providerSwitchDecisionReceipt.new_provider?.agent_type || agentType} using fresh snapshot ${providerSwitchDecisionReceipt.provider_reliability_snapshot?.snapshot_id || "unknown"}.`
      : gate.reason || providerAdvisory?.recommendation || "",
    evidence: {
      advisory_schema: providerAdvisory?.schema || "",
      source_policy_action: providerAdvisory?.source_policy_action || providerAdvisory?.sourcePolicyAction || "",
      source_policy_severity: providerAdvisory?.source_policy_severity || providerAdvisory?.sourcePolicySeverity || "",
      open_repair_item_ids: openRepairItemIds,
      provider_override_followup_repaired: selectedProvider.provider_override_followup_repaired === true,
      provider_override_followup_repaired_count: Number(selectedProvider.provider_override_followup_repaired_count || 0),
      provider_override_followup_last_completed_at: selectedProvider.provider_override_followup_last_completed_at || "",
      provider_override_followup_fresh_after_last_violation: selectedProvider.provider_override_followup_fresh_after_last_violation === true,
      provider_override_followup_work_item_ids: Array.isArray(selectedProvider.provider_override_followup_work_item_ids) ? selectedProvider.provider_override_followup_work_item_ids.slice(0, 8) : [],
      provider_override_followup_receipt_validation_attempt_count: Number(selectedProvider.provider_override_followup_receipt_validation_attempt_count || 0),
      provider_override_followup_receipt_validation_failed_count: Number(selectedProvider.provider_override_followup_receipt_validation_failed_count || 0),
      provider_override_followup_receipt_validation_passed_count: Number(selectedProvider.provider_override_followup_receipt_validation_passed_count || 0),
      provider_override_followup_receipt_validation_consecutive_failure_count: Number(selectedProvider.provider_override_followup_receipt_validation_consecutive_failure_count || 0),
      provider_override_followup_receipt_validation_escalated: selectedProvider.provider_override_followup_receipt_validation_escalated === true,
      provider_override_followup_receipt_validation_repair_verified: selectedProvider.provider_override_followup_receipt_validation_repair_verified === true,
      provider_override_followup_receipt_validation_ids: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_ids) ? selectedProvider.provider_override_followup_receipt_validation_ids.slice(0, 8) : [],
      cross_group_provider_reliability_actionable: selectedProvider.cross_group_provider_reliability_actionable === true,
      cross_group_provider_reliability_risk_status: selectedProvider.cross_group_provider_reliability_risk_status || "empty",
      cross_group_provider_reliability_risk_score: Number(selectedProvider.cross_group_provider_reliability_risk_score || 0),
      cross_group_provider_reliability_confidence: Number(selectedProvider.cross_group_provider_reliability_confidence || 0),
      cross_group_provider_reliability_source_group_count: Number(selectedProvider.cross_group_provider_reliability_source_group_count || 0),
      cross_group_provider_reliability_guidance_only: selectedProvider.cross_group_provider_reliability_guidance?.guidance_only === true,
      cross_group_provider_reliability_local_policy_override_allowed: selectedProvider.cross_group_provider_reliability_guidance?.local_policy_override_allowed === true,
      provider_reliability_snapshot_id: selectedProvider.provider_reliability_snapshot_id || "",
      provider_reliability_snapshot_checksum: selectedProvider.provider_reliability_snapshot_checksum || "",
      provider_reliability_snapshot_status: selectedProvider.provider_reliability_snapshot_status || "",
      provider_reliability_snapshot_generation_id: selectedProvider.provider_reliability_snapshot_generation_id || "",
      safer_alternative_count: Number(providerAdvisory?.safer_alternative_count || 0),
      safer_alternative_agent_types: Array.isArray(providerAdvisory?.safer_alternatives)
        ? providerAdvisory.safer_alternatives.map((candidate: any) => candidate.agent_type || "").filter(Boolean).slice(0, 6)
        : [],
      auto_switch_provider_allowed: false,
      provider_switch_decision_receipt_id: providerSwitchDecisionReceipt?.receipt_id || "",
      provider_switch_decision_receipt_checksum: providerSwitchDecisionReceipt?.receipt_checksum || "",
      advised_alternative: advisedAlternative,
      approved_switch: approvedProviderSwitch,
      actually_executed_provider: "",
      pre_dispatch_gate_dispatch_ready: gate.dispatch_ready !== false,
      pre_dispatch_gate_repair_source: gate.repair_source || "",
    },
    provider_dispatch_override_receipt: overrideReceipt,
    override: overrideReceipt || options.override || assignment.provider_dispatch_override || assignment.providerDispatchOverride || null,
    generated_at: at,
  };
}

export function recordWorkerContextPacketAssignmentBindingForCoordinator(groupId: string, assignment: any = {}, options: any = {}) {
  const packet = assignment.worker_context_packet || assignment.workerContextPacket || {};
  if (!groupId || !assignment?.project || !packet?.packet_id) return null;
  const at = String(options.at || new Date().toISOString());
  const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const gate = assignment.worker_context_pre_dispatch_gate
    || assignment.workerContextPreDispatchGate
    || buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
  const providerDispatchDecision = assignment.worker_context_provider_dispatch_decision
    || assignment.workerContextProviderDispatchDecision
    || assignment.provider_dispatch_decision
    || assignment.providerDispatchDecision
    || buildWorkerContextProviderDispatchDecisionForCoordinator(assignment, packet, gate, { at });
  let rendered = "";
  try { rendered = renderWorkerContextPacket(packet); } catch {}
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(
    assignment.groupSessionId
    || assignment.group_session_id
    || packet.groupSessionId
    || packet.group_session_id
    || packet.memory?.session_binding?.group_session_id
    || packet.memory?.sessionBinding?.groupSessionId
    || ""
  );
  const bindingId = `worker-context-packet-assignment:${hashCoordinator([
    groupId,
    groupSessionId,
    assignment.assignmentId || assignment.assignment_id || "",
    assignment.dispatchKey || assignment.dispatch_key || "",
    packet.packet_id || "",
  ], 14)}`;
  let entry: any = {
    schema: "ccm-worker-context-packet-assignment-binding-v1",
    binding_id: bindingId,
    groupId,
    groupSessionId,
    group_session_id: groupSessionId,
    source: "worker_context_packet_pre_dispatch_gate",
    project: assignment.project || "",
    agent_type: assignment.agentType || assignment.agent_type || assignment.executor || assignment.runner || packet.agent_type || packet.agentType || packet.memory?.session_binding?.agent_type || packet.memory?.sessionBinding?.agentType || "unknown",
    assignment_id: assignment.assignmentId || assignment.assignment_id || "",
    dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
    task_fingerprint: assignment.taskFingerprint || assignment.task_fingerprint || "",
    worker_context_packet_id: packet.packet_id || "",
    worker_context_packet_context_usage: packet.context_usage || packet.contextUsage || null,
    worker_context_packet_memory_policy: packet.memory_policy || packet.memoryPolicy || null,
    worker_context_packet_acceptance: packet.acceptance || null,
    worker_context_packet_pressure_memory_provenance_receipt_discipline: packet.pressure_memory_provenance_receipt_discipline || packet.pressureMemoryProvenanceReceiptDiscipline || null,
    worker_context_packet_pressure_provenance_dispatch_feedback_policy: packet.pressure_provenance_dispatch_feedback_policy || packet.pressureProvenanceDispatchFeedbackPolicy || null,
    worker_context_packet_pressure_provenance_provider_dispatch_advisory: packet.pressure_provenance_provider_dispatch_advisory || packet.pressureProvenanceProviderDispatchAdvisory || null,
    worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract: packet.pressure_provenance_provider_dispatch_override_followup_receipt_contract || packet.pressureProvenanceProviderDispatchOverrideFollowupReceiptContract || null,
    worker_context_provider_dispatch_decision: providerDispatchDecision,
    provider_dispatch_decision: providerDispatchDecision,
    worker_context_provider_switch_decision_receipt: assignment.provider_switch_decision_receipt
      || assignment.providerSwitchDecisionReceipt
      || packet.provider_switch_decision_receipt
      || packet.providerSwitchDecisionReceipt
      || providerDispatchDecision?.provider_switch_decision_receipt
      || null,
    provider_switch_decision_receipt: assignment.provider_switch_decision_receipt
      || assignment.providerSwitchDecisionReceipt
      || packet.provider_switch_decision_receipt
      || packet.providerSwitchDecisionReceipt
      || providerDispatchDecision?.provider_switch_decision_receipt
      || null,
    provider_switch_ledger_state: {
      advised_alternative: providerDispatchDecision?.advised_alternative === true,
      approved_switch: providerDispatchDecision?.approved_switch === true,
      actually_executed_provider: "",
    },
    worker_context_provider_dispatch_override_receipt: providerDispatchDecision?.provider_dispatch_override_receipt || providerDispatchDecision?.override || null,
    worker_context_packet_compaction_retry: packet.context_compaction_retry || packet.contextCompactionRetry || null,
    worker_context_packet_partial_compaction: (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partial_compaction
      || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partialCompaction
      || null,
    worker_context_packet_partial_compact_policy: (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partial_compact_policy
      || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partialCompactPolicy
      || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partial_compaction?.partial_compact_policy
      || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partialCompaction?.partialCompactPolicy
      || null,
    worker_context_packet_compact_hook_run_id: (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.compact_hook_run_id || "",
    worker_context_packet_memory_reinjection_proof: packet.memory_reinjection_proof || packet.memoryReinjectionProof || null,
    worker_context_packet_typed_memory_pressure_recall: summarizeWorkerContextPacketTypedMemoryPressureRecallForCoordinator(packet),
    worker_context_pre_dispatch_gate: gate,
    dispatch_ready: gate.dispatch_ready !== false,
    dispatchReady: gate.dispatch_ready !== false,
    worker_context_packet_render_probe: {
      packet_id: packet.packet_id || "",
      rendered_flags: {
        has_context_usage_budget: rendered.includes("Context usage budget"),
        has_worker_context_packet: rendered.includes("WorkerContextPacket"),
        has_platform_memory: rendered.includes("平台记忆"),
        has_memory_policy: rendered.includes("Memory policy"),
        has_memory_ignored_policy: rendered.includes("Memory policy：ignored") || rendered.includes("memoryIgnored"),
        has_memory_reinjection_proof: rendered.includes("Memory reinjection proof"),
        has_pressure_memory_provenance_receipt_discipline: rendered.includes("Pressure memory provenance receipt discipline"),
        has_pressure_provenance_dispatch_feedback_policy: rendered.includes("Pressure provenance dispatch feedback policy"),
        has_pressure_provenance_provider_dispatch_advisory: rendered.includes("Pressure provenance provider dispatch advisory"),
        has_provider_switch_decision_receipt: rendered.includes("Provider switch decision receipt"),
        has_pressure_provenance_provider_dispatch_override_followup_receipt_contract: rendered.includes("Provider dispatch override follow-up receipt contract"),
        has_memory_provenance_usage_example: rendered.includes("memoryProvenanceUsage"),
        has_memory_compaction_hash: !!(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash)
          && rendered.includes(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash || ""),
        has_memory_context_compact_marker: rendered.includes("memory-context-compact"),
        has_partial_compaction: rendered.includes("partial_compaction="),
      },
      rendered_excerpt: compactText(rendered, 1200),
    },
    should_create_real_task: gate.dispatch_ready !== false,
    at,
  };
  const overrideFollowup = syncProviderDispatchOverrideFollowupRepairWorkItemForCoordinator(groupId, entry, at);
  if (overrideFollowup) {
    entry = {
      ...entry,
      worker_context_provider_dispatch_override_followup_repair: overrideFollowup,
      provider_dispatch_override_followup_repair_work_item: overrideFollowup,
    };
  }
  const existingIndex = entries.findIndex((item: any) => item.binding_id === bindingId);
  if (existingIndex >= 0) entries[existingIndex] = { ...entries[existingIndex], ...entry, first_seen_at: entries[existingIndex].first_seen_at || entries[existingIndex].at || at, at };
  else entries.push({ ...entry, first_seen_at: at });
  const next = {
    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
    version: 1,
    groupId,
    file: ledger.file || getReplayRepairDispatchBindingsFileForCoordinator(groupId),
    updatedAt: at,
    bindingCount: entries.length,
    nativeBindingCount: entries.filter((item: any) => isApiMicrocompactNativeProofRepairSourceForCoordinator(item.source)).length,
    workerContextPacketBindingCount: entries.filter((item: any) => item.worker_context_packet_id).length,
    preDispatchGateCount: entries.filter((item: any) => item.worker_context_pre_dispatch_gate?.schema === "ccm-worker-context-pre-dispatch-gate-v1").length,
    blockedPreDispatchGateCount: entries.filter((item: any) => item.worker_context_pre_dispatch_gate?.dispatch_ready === false).length,
    providerDispatchDecisionCount: entries.filter((item: any) => item.worker_context_provider_dispatch_decision?.schema === "ccm-worker-context-provider-dispatch-decision-v1").length,
    providerDispatchHoldDecisionCount: entries.filter((item: any) => item.worker_context_provider_dispatch_decision?.action === "hold_until_repair").length,
    providerDispatchReadyDecisionCount: entries.filter((item: any) => item.worker_context_provider_dispatch_decision?.dispatch_ready === true).length,
    providerDispatchOverrideDecisionCount: entries.filter((item: any) => item.worker_context_provider_dispatch_decision?.action === "dispatch_with_provider_override").length,
    providerDispatchOverrideFollowupRepairCount: entries.filter((item: any) => item.worker_context_provider_dispatch_override_followup_repair?.work_item_id).length,
    providerDispatchOverrideCompletionCount: entries.filter((item: any) => item.worker_context_provider_dispatch_override_completion?.completion_ok === true).length,
    providerDispatchOverrideFollowupReceiptContractCount: entries.filter((item: any) => item.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract?.active === true).length,
    ...providerSwitchBindingLedgerCountersForCoordinator(entries),
    entries: entries.slice(-160),
  };
  writeJsonAtomicForCoordinator(next.file, next);
  return entry;
}

export function recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  if (!groupId) return null;
  const at = String(options.at || input.at || new Date().toISOString());
  const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const index = findWorkerContextBindingIndexForCoordinator(entries, input);
  if (index < 0) return null;
  const entry = entries[index];
  const receipt = input.provider_switch_decision_receipt
    || input.providerSwitchDecisionReceipt
    || entry.worker_context_provider_switch_decision_receipt
    || entry.provider_switch_decision_receipt
    || {};
  if (receipt.schema !== "ccm-provider-switch-decision-receipt-v1") return null;
  const expectedProvider = String(receipt.new_provider?.agent_type || receipt.newProvider?.agentType || "").trim();
  const actualProvider = String(input.agent_type || input.agentType || input.provider || input.runner || "").trim();
  const taskAgentSessionId = String(input.task_agent_session_id || input.taskAgentSessionId || "").trim();
  const nativeSessionId = String(input.native_session_id || input.nativeSessionId || "").trim();
  const validation = validateProviderSwitchDecisionReceiptForCoordinator(receipt, {
    ...options,
    groupId,
    project: input.project || entry.project || "",
    assignmentId: input.assignment_id || input.assignmentId || entry.assignment_id || "",
    dispatchKey: input.dispatch_key || input.dispatchKey || entry.dispatch_key || "",
    nowMs: options.nowMs || options.now_ms || Date.parse(at) || Date.now(),
  });
  const gaps = [
    ...validation.gaps,
    !taskAgentSessionId ? "task_agent_session_id_missing" : "",
    actualProvider.toLowerCase() !== expectedProvider.toLowerCase() ? "session_provider_mismatch" : "",
    String(input.project || entry.project || "").trim().toLowerCase() !== String(receipt.project || "").trim().toLowerCase() ? "session_project_mismatch" : "",
  ].filter(Boolean);
  const binding = {
    schema: "ccm-provider-switch-child-session-binding-v1",
    binding_id: `provider-switch-session:${hashCoordinator([
      receipt.receipt_id || "",
      taskAgentSessionId,
      nativeSessionId,
      input.execution_id || input.executionId || "",
    ], 16)}`,
    provider_switch_decision_receipt_id: receipt.receipt_id || "",
    provider_switch_decision_receipt_checksum: receipt.receipt_checksum || "",
    groupId,
    project: receipt.project || entry.project || "",
    expected_provider: expectedProvider,
    session_provider: actualProvider,
    task_agent_session_id: taskAgentSessionId,
    native_session_id: nativeSessionId,
    execution_id: input.execution_id || input.executionId || "",
    worker_context_packet_id: entry.worker_context_packet_id || input.worker_context_packet_id || input.workerContextPacketId || "",
    status: gaps.length ? "rejected" : "bound",
    valid: gaps.length === 0,
    gaps: uniqueCoordinatorStrings(gaps),
    validation,
    bound_at: at,
  };
  entries[index] = {
    ...entry,
    worker_context_provider_switch_session_binding: binding,
    provider_switch_session_binding: binding,
    task_agent_session_id: taskAgentSessionId || entry.task_agent_session_id || "",
    native_session_id: nativeSessionId || entry.native_session_id || "",
    execution_id: input.execution_id || input.executionId || entry.execution_id || "",
    at,
  };
  const next = {
    ...ledger,
    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
    version: ledger.version || 1,
    groupId,
    file: ledger.file || getReplayRepairDispatchBindingsFileForCoordinator(groupId),
    updatedAt: at,
    bindingCount: entries.length,
    ...providerSwitchBindingLedgerCountersForCoordinator(entries),
    entries: entries.slice(-160),
  };
  writeJsonAtomicForCoordinator(next.file, next);
  return binding;
}
