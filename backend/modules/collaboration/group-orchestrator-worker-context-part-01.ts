// Behavior-freeze split from group-orchestrator-worker-context.ts (part 1/3).
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
  buildWorkerContextPreDispatchGateForCoordinator,
} from "./group-orchestrator-worker-context-part-02";

export function runWorkerContextPreDispatchGateSelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextPreDispatchGateSelfTest();
}

export function runWorkerContextCompactionRetrySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextCompactionRetrySelfTest();
}

export function runWorkerContextMemoryFirstCompactionRetrySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextMemoryFirstCompactionRetrySelfTest();
}

export function runWorkerContextPartialCompactionRetrySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextPartialCompactionRetrySelfTest();
}

export function runWorkerContextMetadataPartialCompactionRetrySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextMetadataPartialCompactionRetrySelfTest();
}

export function runWorkerContextMetadataPartialCompactPolicySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextMetadataPartialCompactPolicySelfTest();
}

export function runWorkerContextCompactOutcomeLedgerSelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextCompactOutcomeLedgerSelfTest();
}

export function runWorkerContextCompactStrategyMemorySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextCompactStrategyMemorySelfTest();
}

export function runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest();
}

export function runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest();
}

export function runWorkerContextPtlEmergencyDowngradeSelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextPtlEmergencyDowngradeSelfTest();
}

export function runWorkerContextCompletionMemoryCompactionPreservationSelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextCompletionMemoryCompactionPreservationSelfTest();
}

export function runWorkerContextIgnoreMemoryPolicySelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextIgnoreMemoryPolicySelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchGateSelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextPressureProvenanceProviderDispatchGateSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest();
}

export function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest();
}

export function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest();
}

export function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest() {
  return require("./group-orchestrator-memory-self-tests").runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest();
}

export function runWorkerContextProviderReliabilitySnapshotRankingSelfTest() {
  return require("./group-orchestrator-provider-self-tests").runWorkerContextProviderReliabilitySnapshotRankingSelfTest();
}

export function runWorkerContextProviderSwitchExecutionRankingSelfTest() {
  return require("./group-orchestrator-provider-self-tests").runWorkerContextProviderSwitchExecutionRankingSelfTest();
}

export function runWorkerContextProviderSwitchDecisionReceiptSelfTest() {
  return require("./group-orchestrator-provider-self-tests").runWorkerContextProviderSwitchDecisionReceiptSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest() {
  return require("./group-orchestrator-provider-self-tests").runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest() {
  return require("./group-orchestrator-provider-self-tests").runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest() {
  return require("./group-orchestrator-provider-self-tests").runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest();
}

export function getWorkerContextCompactHookLedgerFileForCoordinator(groupId: string, groupSessionId = "") {
  return getWorkerContextCompactScopedFileForCoordinator(GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR, groupId, groupSessionId);
}

export function getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId: string, groupSessionId = "") {
  return getWorkerContextCompactScopedFileForCoordinator(GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR, groupId, groupSessionId);
}

export function getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId: string, groupSessionId = "") {
  return getWorkerContextCompactScopedFileForCoordinator(GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR, groupId, groupSessionId);
}

export function getWorkerContextPtlEmergencyHintFileForCoordinator(groupId: string, groupSessionId = "") {
  return getWorkerContextCompactScopedFileForCoordinator(GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR, groupId, groupSessionId);
}

export function readWorkerContextCompactHookLedgerForCoordinator(groupId: string, groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  const file = getWorkerContextCompactHookLedgerFileForCoordinator(groupId, exactSessionId);
  const loaded = readJsonWithBackupForCoordinator(file, "ccm-worker-context-compact-hook-ledger-v1");
  if (loaded.value) {
    const entries = (Array.isArray(loaded.value.entries) ? loaded.value.entries.map(normalizeWorkerContextCompactHookEntryForCoordinator) : [])
      .filter((entry: any) => !exactSessionId || entry.group_id === groupId && entry.group_session_id === exactSessionId);
    return {
      ...loaded.value,
      groupId,
      groupSessionId: exactSessionId,
      scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
      file,
      recoveredFromBackup: loaded.recoveredFromBackup,
      entries,
      stats: buildWorkerContextCompactHookStatsForCoordinator(entries),
    };
  }
  return {
    schema: "ccm-worker-context-compact-hook-ledger-v1",
    version: 1,
    groupId,
    groupSessionId: exactSessionId,
    scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
    file,
    entries: [],
    stats: buildWorkerContextCompactHookStatsForCoordinator([]),
    updatedAt: "",
  };
}

export function readWorkerContextCompactStrategyMemoryForCoordinator(groupId: string, groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  const file = getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, exactSessionId);
  const loaded = readJsonWithBackupForCoordinator(file, "ccm-worker-context-compact-strategy-memory-v1");
  if (loaded.value) {
    const storedSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(loaded.value.groupSessionId || loaded.value.group_session_id || "");
    if (exactSessionId && storedSessionId !== exactSessionId) {
      loaded.value = null;
    }
  }
  if (loaded.value) {
    const normalized = normalizeWorkerContextCompactStrategyMemoryForCoordinator({ ...loaded.value, file }, groupId, exactSessionId);
    return { ...normalized, recoveredFromBackup: loaded.recoveredFromBackup };
  }
  const outcomeLedger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
  if (Array.isArray(outcomeLedger.entries) && outcomeLedger.entries.length) {
    return writeWorkerContextCompactStrategyMemoryForCoordinator(groupId, outcomeLedger.entries, {
      groupSessionId: exactSessionId,
      sourceLedgerFile: outcomeLedger.file,
      sourceLedgerUpdatedAt: outcomeLedger.updatedAt || outcomeLedger.stats?.latestAt || "",
    });
  }
  return normalizeWorkerContextCompactStrategyMemoryForCoordinator({
    groupId,
    groupSessionId: exactSessionId,
    file,
    source_ledger_file: getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, exactSessionId),
    sample_count: 0,
    categories: [],
  }, groupId, exactSessionId);
}

export function readWorkerContextPtlEmergencyHintForCoordinator(groupId: string, groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  const file = getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, exactSessionId);
  const loaded = readJsonWithBackupForCoordinator(file, "ccm-worker-context-ptl-emergency-hint-v1");
  if (loaded.value) {
    const storedSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(loaded.value.groupSessionId || loaded.value.group_session_id || "");
    if (exactSessionId && storedSessionId !== exactSessionId) {
      loaded.value = null;
    }
  }
  if (loaded.value) {
    const normalized = normalizeWorkerContextPtlEmergencyHintForCoordinator({ ...loaded.value, file }, groupId, exactSessionId);
    return { ...normalized, recoveredFromBackup: loaded.recoveredFromBackup };
  }
  const outcomeLedger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
  const strategy = readWorkerContextCompactStrategyMemoryForCoordinator(groupId, exactSessionId);
  return writeWorkerContextPtlEmergencyHintForCoordinator(groupId, outcomeLedger.entries || [], strategy, {
    groupSessionId: exactSessionId,
    sourceLedgerFile: outcomeLedger.file,
    sourceStrategyFile: strategy.file,
    sourceLedgerUpdatedAt: outcomeLedger.updatedAt || outcomeLedger.stats?.latestAt || "",
  });
}

export function readWorkerContextCompactOutcomeLedgerForCoordinator(groupId: string, groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  const file = getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, exactSessionId);
  const loaded = readJsonWithBackupForCoordinator(file, "ccm-worker-context-compact-outcome-ledger-v1");
  if (loaded.value) {
    const entries = (Array.isArray(loaded.value.entries) ? loaded.value.entries.map(normalizeWorkerContextCompactOutcomeEntryForCoordinator) : [])
      .filter((entry: any) => !exactSessionId || entry.group_id === groupId && entry.group_session_id === exactSessionId);
    return {
      ...loaded.value,
      groupId,
      groupSessionId: exactSessionId,
      scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
      file,
      recoveredFromBackup: loaded.recoveredFromBackup,
      entries,
      stats: buildWorkerContextCompactOutcomeStatsForCoordinator(entries),
    };
  }
  return {
    schema: "ccm-worker-context-compact-outcome-ledger-v1",
    version: 1,
    groupId,
    groupSessionId: exactSessionId,
    scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
    file,
    entries: [],
    stats: buildWorkerContextCompactOutcomeStatsForCoordinator([]),
    updatedAt: "",
  };
}

export function compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupId: string, options: any = {}) {
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(options.groupSessionId || options.group_session_id || "");
  const ledger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, groupSessionId);
  const retained = retainWorkerContextCompactOutcomeEntriesForCoordinator(groupId, ledger.entries || [], {
    groupSessionId,
    at: options.at || options.generatedAt || options.generated_at || new Date().toISOString(),
    recentLimit: options.recentLimit || options.recent_limit,
  });
  const next = {
    ...ledger,
    schema: "ccm-worker-context-compact-outcome-ledger-v1",
    version: 1,
    groupId,
    groupSessionId,
    scopeId: workerContextCompactScopeIdForCoordinator(groupId, groupSessionId),
    entries: retained.entries,
    stats: buildWorkerContextCompactOutcomeStatsForCoordinator(retained.entries),
    retention: retained.retention,
    updatedAt: options.at || options.generatedAt || options.generated_at || new Date().toISOString(),
  };
  writeJsonAtomicForCoordinator(next.file || getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId), next);
  return next;
}

export function readWorkerContextCompactSessionArtifactsForCoordinator(groupId: string, groupSessionId: string) {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  if (!exactSessionId) {
    return {
      schema: "ccm-worker-context-compact-session-artifacts-v1",
      status: "exact_group_session_required",
      groupId,
      groupSessionId: "",
      scopeId: String(groupId || ""),
      hook: null,
      outcome: null,
      strategy: null,
      ptlEmergency: null,
    };
  }
  const hook = readWorkerContextCompactHookLedgerForCoordinator(groupId, exactSessionId);
  const outcome = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
  const strategy = readWorkerContextCompactStrategyMemoryForCoordinator(groupId, exactSessionId);
  const ptlEmergency = readWorkerContextPtlEmergencyHintForCoordinator(groupId, exactSessionId);
  return {
    schema: "ccm-worker-context-compact-session-artifacts-v1",
    status: "ok",
    groupId,
    groupSessionId: exactSessionId,
    scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
    hook: {
      file: hook.file,
      entries: Number(hook.stats?.total || hook.entries?.length || 0),
      recoveredFromBackup: hook.recoveredFromBackup === true,
    },
    outcome: {
      file: outcome.file,
      entries: Number(outcome.stats?.total || outcome.entries?.length || 0),
      recovered: Number(outcome.stats?.recovered || 0),
      blocked: Number(outcome.stats?.blocked || 0),
      recoveredFromBackup: outcome.recoveredFromBackup === true,
    },
    strategy: {
      file: strategy.file,
      sampleCount: Number(strategy.sample_count || 0),
      preferredCategories: strategy.preferred_categories || [],
      avoidCategories: strategy.avoid_categories || [],
      recoveredFromBackup: (strategy as any).recoveredFromBackup === true,
    },
    ptlEmergency: {
      file: ptlEmergency.file,
      engaged: ptlEmergency.engaged === true,
      emergencyLevel: ptlEmergency.emergency_level || "none",
      blockedOutcomeCount: Number(ptlEmergency.blocked_outcome_count || 0),
      recoveredFromBackup: (ptlEmergency as any).recoveredFromBackup === true,
    },
  };
}

export function deleteWorkerContextCompactSessionArtifactsForCoordinator(groupId: string, groupSessionId: string) {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  if (!exactSessionId) return { deleted: 0, status: "exact_group_session_required" };
  const files = [
    getWorkerContextCompactHookLedgerFileForCoordinator(groupId, exactSessionId),
    getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, exactSessionId),
    getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, exactSessionId),
    getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, exactSessionId),
    getReplayRepairDispatchPlansFileForCoordinator(groupId, exactSessionId),
  ];
  let deleted = 0;
  for (const file of files.flatMap(item => [item, `${item}.bak`])) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        deleted += 1;
      }
    } catch {}
  }
  return {
    schema: "ccm-worker-context-compact-session-artifact-delete-v1",
    status: "deleted",
    groupId,
    groupSessionId: exactSessionId,
    scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
    deleted,
  };
}

export function buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet: any = {}, options: any = {}) {
  const supported = new Set(["constraints_and_documents", "contract_injections", "dependencies"]);
  const usage = packet.context_usage || packet.contextUsage || {};
  const topCategories = Array.isArray(usage.top_categories || usage.topCategories)
    ? (usage.top_categories || usage.topCategories)
    : [];
  const maxCategories = Math.max(1, Number(options.maxCategories || options.max_categories || 3));
  const minTokens = Math.max(0, Number(options.minCategoryTokens || options.min_category_tokens || 1));
  const rawStrategy = options.compactOutcomeStrategyMemory
    || options.compact_outcome_strategy_memory
    || options.compactStrategyMemory
    || options.compact_strategy_memory
    || options.strategyMemory
    || options.strategy_memory
    || null;
  const compactStrategyMemory = rawStrategy?.schema === "ccm-worker-context-compact-strategy-memory-v1"
    && (Number(rawStrategy.sample_count || rawStrategy.sampleCount || 0) > 0 || (Array.isArray(rawStrategy.categories) && rawStrategy.categories.length > 0))
    ? normalizeWorkerContextCompactStrategyMemoryForCoordinator(rawStrategy)
    : null;
  const pressureRecallUsageSummary = workerContextPressureRecallUsageSummaryForCompactPolicy({
    ...options,
    project: options.project || packet.project || "",
  });
  const pressureRecallUsageBias = workerContextCompactStrategyPressureUsageBiasForCoordinator(pressureRecallUsageSummary);
  const strategyByCategory = new Map((compactStrategyMemory?.categories || []).map((item: any) => [String(item.category || ""), item]));
  const preferredStrategyCategories = new Set(compactStrategyMemory?.preferred_categories || []);
  const candidates = topCategories
    .map((item: any, index: number) => {
      const category = String(item.id || item.category_id || item.categoryId || "");
      const strategy = strategyByCategory.get(category) || {};
      const strategyScore = Number((strategy as any).strategy_score || 0);
      const pressureUsageAdjustment = pressureRecallUsageBias.active && preferredStrategyCategories.has(category)
        ? Math.min(Number(pressureRecallUsageBias.category_adjustment_cap || 0), Math.max(0, Math.round(strategyScore * 0.55)))
        : 0;
      const candidate: any = {
        category,
        tokens: Number(item.tokens || 0),
        chars: Number(item.chars || 0),
        rank: index + 1,
        selection_score: Number(item.tokens || 0) + pressureUsageAdjustment,
        pressure_recall_usage_adjustment: pressureUsageAdjustment,
      };
      if (compactStrategyMemory?.schema) {
        candidate.strategy_score = strategyScore;
        candidate.strategy_recovery_rate = Number((strategy as any).recovery_rate || 0);
        candidate.strategy_avg_free_token_delta = Number((strategy as any).avg_free_token_delta || 0);
        candidate.strategy_recommendation = String((strategy as any).recommendation || "");
        candidate.strategy_preferred = preferredStrategyCategories.has(category);
      }
      return candidate;
    })
    .filter((item: any) => supported.has(item.category) && item.tokens >= minTokens)
    .sort((a: any, b: any) =>
      Number(b.selection_score ?? b.tokens ?? 0) - Number(a.selection_score ?? a.tokens ?? 0)
      || Number(b.tokens || 0) - Number(a.tokens || 0)
      || Number(b.strategy_score || 0) - Number(a.strategy_score || 0)
      || Number(b.chars || 0) - Number(a.chars || 0)
    )
    .slice(0, maxCategories);
  const availableFallbackCategories = [
    (Array.isArray(packet.constraints) && packet.constraints.length) || (Array.isArray(packet.document_findings) && packet.document_findings.length) ? "constraints_and_documents" : "",
    Array.isArray(packet.contract_injections) && packet.contract_injections.length ? "contract_injections" : "",
    Array.isArray(packet.dependencies) && packet.dependencies.length ? "dependencies" : "",
  ].filter(Boolean);
  const strategyPreferredFallback = (compactStrategyMemory?.preferred_categories || [])
    .filter((category: string) => availableFallbackCategories.includes(category));
  const fallbackCategories = [...new Set([...strategyPreferredFallback, ...availableFallbackCategories])];
  const selectedCategories = candidates.length
    ? candidates.map((item: any) => item.category)
    : fallbackCategories.slice(0, maxCategories);
  const skippedCategories = fallbackCategories.filter((category: string) => !selectedCategories.includes(category));
  const compactStrategySummary = compactStrategyMemory?.schema ? {
    schema: compactStrategyMemory.schema,
    strategy_id: compactStrategyMemory.strategy_id || "",
    source_ledger_file: compactStrategyMemory.source_ledger_file || "",
    sample_count: Number(compactStrategyMemory.sample_count || 0),
    preferred_categories: compactStrategyMemory.preferred_categories || [],
    avoid_categories: compactStrategyMemory.avoid_categories || [],
  } : null;
  const pressureRecallUsageSummaryRef = pressureRecallUsageSummary?.schema && (pressureRecallUsageSummary.has_history === true || Number(pressureRecallUsageSummary.memory_count || 0) > 0) ? {
    schema: pressureRecallUsageSummary.schema,
    source: pressureRecallUsageSummary.source || "",
    ledger_file: pressureRecallUsageSummary.ledger_file || "",
    target_project: pressureRecallUsageSummary.target_project || "",
    source_group_count: Number(pressureRecallUsageSummary.source_group_count || 0),
    source_groups: Array.isArray(pressureRecallUsageSummary.source_groups)
      ? pressureRecallUsageSummary.source_groups.slice(0, 8).map((item: any) => ({
        groupId: item.groupId || item.group_id || "",
        entry_count: Number(item.entry_count || 0),
        updatedAt: item.updatedAt || item.updated_at || "",
      }))
      : undefined,
    weighted_totals: pressureRecallUsageSummary.weighted_totals || {},
    aging: pressureRecallUsageSummary.aging ? {
      stale_entry_count: pressureRecallUsageSummary.aging.stale_entry_count || 0,
      fresh_entry_count: pressureRecallUsageSummary.aging.fresh_entry_count || 0,
      stale_memory_count: pressureRecallUsageSummary.aging.stale_memory_count || 0,
    } : undefined,
  } : null;
  return {
    schema: "ccm-worker-context-partial-compact-policy-v1",
    method: pressureRecallUsageBias.active
      ? "usage_top_category_pressure_with_outcome_strategy_and_pressure_recall_usage"
      : compactStrategySummary ? "usage_top_category_pressure_with_outcome_strategy" : "usage_top_category_pressure",
    source: [
      "worker_context_usage.top_categories",
      compactStrategySummary ? "compact_outcome_strategy_memory" : "",
      pressureRecallUsageBias.active ? "pressure_recall_usage_weighted_feedback" : "",
    ].filter(Boolean).join("+"),
    supported_categories: [...supported],
    selected_categories: selectedCategories,
    skipped_categories: skippedCategories,
    selected_count: selectedCategories.length,
    max_categories: maxCategories,
    min_category_tokens: minTokens,
    candidates,
    compact_strategy_memory: compactStrategySummary || undefined,
    pressure_recall_usage_strategy_bias: pressureRecallUsageBias.active || pressureRecallUsageBias.suppressed || pressureRecallUsageBias.stale
      ? pressureRecallUsageBias
      : undefined,
    pressure_recall_usage_summary: pressureRecallUsageSummaryRef || undefined,
    fallback_used: candidates.length === 0 && selectedCategories.length > 0,
    reason: selectedCategories.length
      ? `Selected ${selectedCategories.join(",")} from WorkerContextPacket context_usage top categories before task compaction${compactStrategySummary ? " with compact outcome strategy memory" : ""}${pressureRecallUsageBias.active ? " and pressure recall usage feedback." : compactStrategySummary ? "." : "."}`
      : "No supported metadata category was present in WorkerContextPacket context_usage top categories.",
    generated_at: new Date().toISOString(),
  };
}

export function buildWorkerContextPacketForAssignment(baseAssignment: any, dependsOn: string, replayRepairDispatchBriefs: any[], options: any = {}) {
  const dependencies = Array.isArray(options.workerContextDependencies || options.worker_context_dependencies)
    ? (options.workerContextDependencies || options.worker_context_dependencies)
    : dependsOn ? [{ project: dependsOn, reason: "前置依赖" }] : [];
  const memory = options.memory || options.workerMemory || options.worker_memory || null;
  const memoryPolicy = options.memoryPolicy || options.memory_policy || (memory && typeof memory === "object" ? (memory.memory_policy || memory.memoryPolicy) : null) || null;
  const groupId = String(baseAssignment.scopeId || options.group?.id || options.groupId || options.group_id || "").trim();
  const groupSessionId = String(baseAssignment.groupSessionId || baseAssignment.group_session_id || options.groupSessionId || options.group_session_id || "").trim();
  const agentType = String(baseAssignment.agentType || baseAssignment.agent_type || options.agentType || options.agent_type || "unknown").trim() || "unknown";
  const model = String(baseAssignment.model || baseAssignment.model_id || options.model || options.modelId || options.model_id || "").trim();
  const configuredCapabilities = options.workerModelCapabilities || options.worker_model_capabilities || {};
  const providerCapability = options.providerCapability
    || options.provider_capability
    || configuredCapabilities[`${agentType}::${model}`]
    || configuredCapabilities[agentType]
    || null;
  const modelContextCapacity = resolveTrustedModelContextCapacity({
    provider: agentType,
    model,
    providerCapability,
    nativeExecutorReceipt: options.nativeModelCapabilityReceipt || options.native_model_capability_receipt,
    userSetting: options.workerModelContextWindow || options.worker_model_context_window
      ? {
          source: "user_setting",
          contextWindow: options.workerModelContextWindow || options.worker_model_context_window,
          maxOutputTokens: options.workerModelMaxOutputTokens || options.worker_model_max_output_tokens,
          checkedAt: options.workerModelCapacityCheckedAt || options.worker_model_capacity_checked_at,
        }
      : null,
  });
  const requestedContextUsageOptions = options.workerContextUsageOptions || options.worker_context_usage_options || {};
  const workerContextUsageOptions = {
    maxTokens: modelContextCapacity.effectiveContextWindow,
    reservedOutputTokens: modelContextCapacity.reservedOutputTokens,
    autoCompactBufferTokens: modelContextCapacity.autoCompactBufferTokens,
    capacityProvenance: modelContextCapacity,
    ...requestedContextUsageOptions,
  };
  const cleanupCommitRepairContext = groupId
    ? buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(
      groupId,
      "project-child-agent",
      {
        assignmentId: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
        project: baseAssignment.project || "",
        agentType,
        childSessionId: baseAssignment.childSessionId || baseAssignment.child_session_id || options.childSessionId || options.child_session_id || "",
      },
    )
    : null;
  const pressureProvenanceDispatchFeedbackPolicy = groupId ? buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
    targetProject: baseAssignment.project,
    agentType,
    pressureMemoryProvenanceReceiptDiscipline: memory?.pressure_memory_provenance_receipt_discipline
      || memory?.pressureMemoryProvenanceReceiptDiscipline
      || memory?.group_state?.typedMemory?.pressureProvenanceReceiptDiscipline
      || null,
    frequentThreshold: options.pressureProvenanceFeedbackFrequentThreshold || options.pressure_provenance_feedback_frequent_threshold,
    recoveryCreditPerCompliant: options.pressureProvenanceFeedbackRecoveryCreditPerCompliant || options.pressure_provenance_feedback_recovery_credit_per_compliant,
    providerOverrideFollowupReceiptValidationFailureThreshold: options.providerOverrideFollowupReceiptValidationFailureThreshold
      || options.provider_override_followup_receipt_validation_failure_threshold,
    crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds
      || options.cross_group_provider_reliability_group_ids,
    providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays
      || options.provider_reliability_half_life_days,
    minSourceGroups: options.crossGroupProviderReliabilityMinSourceGroups
      || options.cross_group_provider_reliability_min_source_groups,
    disableCrossGroupProviderReliability: options.disableCrossGroupProviderReliability
      || options.disable_cross_group_provider_reliability,
    disablePressureProvenanceFeedbackRecovery: options.disablePressureProvenanceFeedbackRecovery || options.disable_pressure_provenance_feedback_recovery,
    disabled: options.disablePressureProvenanceFeedbackDispatchPolicy || options.disable_pressure_provenance_feedback_dispatch_policy,
  }) : null;
  const pressureProvenanceProviderDispatchAdvisory = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(
    groupId,
    baseAssignment.project,
    agentType,
    pressureProvenanceDispatchFeedbackPolicy,
    options
  );
  return buildWorkerContextPacket({
    group: options.group || null,
    groupSessionId,
    group_session_id: groupSessionId,
    project: baseAssignment.project,
    task: baseAssignment.task,
    agentType,
    analysis: baseAssignment.analysis || options.analysis || null,
    dependencies,
    contractInjections: baseAssignment.contractInjections || baseAssignment.contract_injections || options.contractInjections || options.contract_injections || [],
    replayRepairDispatchBriefs,
    cleanupCommitRepairContext: cleanupCommitRepairContext?.brief_count > 0 ? cleanupCommitRepairContext : null,
    memory,
    memoryPolicy,
    pressureProvenanceDispatchFeedbackPolicy,
    pressureProvenanceProviderDispatchAdvisory,
    providerSwitchDecisionReceipt: options.providerSwitchDecisionReceipt || options.provider_switch_decision_receipt || null,
    modelContextCapacity,
    contextUsageOptions: workerContextUsageOptions,
  });
}

export function validateProviderSwitchDecisionReceiptForCoordinator(receipt: any = {}, options: any = {}) {
  const gaps: string[] = [];
  const oldProvider = receipt.old_provider || receipt.oldProvider || {};
  const newProvider = receipt.new_provider || receipt.newProvider || {};
  const snapshotRef = receipt.provider_reliability_snapshot || receipt.providerReliabilitySnapshot || {};
  const compatibility = receipt.task_compatibility || receipt.taskCompatibility || {};
  const authority = normalizeProviderSwitchAuthorityForCoordinator(receipt.authority || {});
  const receiptGroupId = String(receipt.groupId || receipt.group_id || "").trim();
  const expectedGroupId = String(options.groupId || options.group_id || options.expectedGroupId || options.expected_group_id || "").trim();
  const expectedProject = String(options.project || options.expectedProject || options.expected_project || "").trim();
  const expectedAssignmentId = String(options.assignmentId || options.assignment_id || options.expectedAssignmentId || options.expected_assignment_id || "").trim();
  const expectedDispatchKey = String(options.dispatchKey || options.dispatch_key || options.expectedDispatchKey || options.expected_dispatch_key || "").trim();
  const expectedChecksum = providerSwitchDecisionReceiptChecksumForCoordinator(receipt);
  if (receipt.schema !== "ccm-provider-switch-decision-receipt-v1") gaps.push("schema");
  if (!receipt.receipt_id) gaps.push("receipt_id");
  if (!receiptGroupId) gaps.push("group_id");
  if (!receipt.project) gaps.push("project");
  if (expectedGroupId && receiptGroupId !== expectedGroupId) gaps.push("group_id_mismatch");
  if (expectedProject && String(receipt.project || "").trim().toLowerCase() !== expectedProject.toLowerCase()) gaps.push("project_mismatch");
  if (expectedAssignmentId && String(receipt.assignment_id || receipt.assignmentId || "").trim() !== expectedAssignmentId) gaps.push("assignment_id_mismatch");
  if (expectedDispatchKey && String(receipt.dispatch_key || receipt.dispatchKey || "").trim() !== expectedDispatchKey) gaps.push("dispatch_key_mismatch");
  if (receipt.status !== "approved") gaps.push("status_not_approved");
  if (!receipt.receipt_checksum || receipt.receipt_checksum !== expectedChecksum) gaps.push("receipt_checksum");
  if (!oldProvider.agent_type || !newProvider.agent_type) gaps.push("provider_identity");
  if (String(oldProvider.agent_type || "").toLowerCase() === String(newProvider.agent_type || "").toLowerCase()) gaps.push("provider_unchanged");
  if (newProvider.configured !== true) gaps.push("candidate_not_configured");
  if (String(newProvider.project || "").trim().toLowerCase() !== String(receipt.project || "").trim().toLowerCase()) gaps.push("candidate_project_mismatch");
  if (newProvider.safer_than_selected !== true) gaps.push("candidate_not_ranked_safer");
  if (newProvider.local_hold === true || newProvider.local_dispatch_policy === "hold_until_repair") gaps.push("candidate_local_hold");
  if (compatibility.confirmed !== true) gaps.push("task_compatibility_not_confirmed");
  if (!Array.isArray(compatibility.evidence) || compatibility.evidence.length === 0) gaps.push("task_compatibility_evidence_missing");
  if (!authority.approved) gaps.push("authority_not_approved");
  if (!authority.local_policy_authority) gaps.push("local_policy_authority_missing");
  if (oldProvider.local_hold === true && authority.allow_switch_away_from_held_provider !== true) gaps.push("held_provider_switch_not_authorized");
  if (snapshotRef.status !== "fresh" || snapshotRef.usable !== true) gaps.push("snapshot_not_fresh");
  if (!snapshotRef.snapshot_id || !snapshotRef.snapshot_checksum || !snapshotRef.generation_id) gaps.push("snapshot_identity_missing");
  const expiresMs = Date.parse(String(snapshotRef.expires_at || ""));
  const nowMs = Number(options.nowMs || options.now_ms || Date.now());
  if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) gaps.push("snapshot_expired");
  let snapshotRead: any = null;
  if (options.verifySnapshot !== false && options.verify_snapshot !== false) {
    snapshotRead = readGlobalProviderDispatchReliabilitySnapshot({
      snapshotFile: options.snapshotFile || options.snapshot_file,
      crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids,
      minSourceGroups: options.minSourceGroups || options.min_source_groups,
      providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days,
      providerOverrideFollowupReceiptValidationFailureThreshold: options.providerOverrideFollowupReceiptValidationFailureThreshold
        || options.provider_override_followup_receipt_validation_failure_threshold,
      nowMs,
      allowBackupRecovery: options.allowBackupRecovery,
      verifySourceGeneration: options.verifySourceGeneration,
    });
    if (snapshotRead.usable !== true || snapshotRead.status !== "fresh") gaps.push(`snapshot_read_${snapshotRead.status || "invalid"}`);
    if (snapshotRead.snapshot?.snapshot_id !== snapshotRef.snapshot_id) gaps.push("snapshot_id_mismatch");
    if (snapshotRead.snapshot?.snapshot_checksum !== snapshotRef.snapshot_checksum) gaps.push("snapshot_checksum_mismatch");
    if (snapshotRead.snapshot?.generation_id !== snapshotRef.generation_id) gaps.push("snapshot_generation_mismatch");
  }
  const valid = gaps.length === 0;
  return {
    schema: "ccm-provider-switch-decision-receipt-validation-v1",
    valid,
    status: valid ? "approved" : "rejected",
    gaps: uniqueCoordinatorStrings(gaps),
    snapshot_status: snapshotRead?.status || snapshotRef.status || "missing",
    checked_at: new Date(nowMs).toISOString(),
  };
}

export function buildProviderSwitchDecisionReceiptForCoordinator(groupId: string, assignment: any = {}, requestValue: any = {}, options: any = {}) {
  const packet = assignment.worker_context_packet || assignment.workerContextPacket || {};
  const gate = assignment.worker_context_pre_dispatch_gate
    || assignment.workerContextPreDispatchGate
    || buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
  const advisory = packet.pressure_provenance_provider_dispatch_advisory
    || packet.pressureProvenanceProviderDispatchAdvisory
    || gate.pressure_provenance_provider_dispatch_advisory
    || gate.pressureProvenanceProviderDispatchAdvisory
    || {};
  const request = normalizeProviderSwitchRequestForCoordinator(requestValue);
  const selected = advisory.selected_candidate || advisory.selectedCandidate || {};
  const alternatives = Array.isArray(advisory.safer_alternatives || advisory.saferAlternatives)
    ? (advisory.safer_alternatives || advisory.saferAlternatives)
    : [];
  const rankedCandidates = Array.isArray(advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
    ? (advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
    : [];
  const candidate = alternatives.find((item: any) =>
    String(item.agent_type || item.agentType || "").trim().toLowerCase() === request.requested_agent_type.toLowerCase()
  ) || {};
  const snapshot = advisory.provider_reliability_snapshot || advisory.providerReliabilitySnapshot || {};
  const project = String(assignment.project || packet.project || advisory.project || candidate.project || "").trim();
  const oldAgentType = String(
    assignment.original_agent_type
    || assignment.originalAgentType
    || assignment.agentType
    || assignment.agent_type
    || packet.agent_type
    || selected.agent_type
    || selected.agentType
    || ""
  ).trim();
  const decidedAt = String(options.at || options.generatedAt || options.generated_at || new Date().toISOString());
  const receiptBase: any = {
    schema: "ccm-provider-switch-decision-receipt-v1",
    version: 1,
    receipt_id: `provider-switch-decision:${hashCoordinator([
      groupId,
      assignment.assignmentId || assignment.assignment_id || "",
      assignment.dispatchKey || assignment.dispatch_key || "",
      packet.packet_id || "",
      oldAgentType,
      request.requested_agent_type,
      snapshot.snapshot_id || "",
    ], 18)}`,
    groupId,
    project,
    source: "group_main_agent_ranked_provider_switch_approval",
    status: "approved",
    assignment_id: assignment.assignmentId || assignment.assignment_id || "",
    dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
    task_id: packet.task_id || assignment.taskId || assignment.task_id || "",
    task_fingerprint: assignment.taskFingerprint || assignment.task_fingerprint || hashCoordinator(String(assignment.task || packet.task || ""), 24),
    advisory_worker_context_packet_id: packet.packet_id || "",
    old_provider: {
      agent_type: oldAgentType,
      project,
      local_hold: gate.provider_dispatch_hold === true || selected.should_hold_dispatch === true || selected.dispatch_policy === "hold_until_repair",
      local_health_status: selected.health_status || selected.healthStatus || advisory.health_status || "",
      local_dispatch_policy: selected.dispatch_policy || selected.dispatchPolicy || advisory.dispatch_policy || "",
      local_execution_rank_penalty: Number(selected.local_execution_rank_penalty || selected.localExecutionRankPenalty || 0),
      composite_rank: Number(selected.composite_rank || selected.compositeRank || 0),
      provider_ranking_provenance: selected.provider_ranking_provenance || selected.providerRankingProvenance || null,
    },
    new_provider: {
      agent_type: request.requested_agent_type,
      project: candidate.project || project,
      configured: candidate.configured === true,
      safer_than_selected: candidate.safer_than_selected === true,
      local_hold: candidate.local_dispatch_policy === "hold_until_repair"
        || ["critical", "warning"].includes(String(candidate.local_health_status || "")),
      local_health_status: candidate.local_health_status || "",
      local_dispatch_policy: candidate.local_dispatch_policy || "",
      global_risk_status: candidate.global_risk_status || "",
      global_risk_score: Number(candidate.global_risk_score || 0),
      local_execution_rank_penalty: Number(candidate.local_execution_rank_penalty || candidate.localExecutionRankPenalty || 0),
      provider_switch_execution_risk_score: Number(candidate.provider_switch_execution_risk_score || candidate.providerSwitchExecutionRiskScore || 0),
      provider_switch_execution_risk_confidence: Number(candidate.provider_switch_execution_risk_confidence || candidate.providerSwitchExecutionRiskConfidence || 0),
      composite_rank: Number(candidate.composite_rank || 0),
      selected_composite_rank: Number(candidate.selected_composite_rank || 0),
      provider_ranking_provenance: candidate.provider_ranking_provenance || candidate.providerRankingProvenance || null,
    },
    provider_ranking_provenance: {
      schema: "ccm-provider-switch-decision-ranking-provenance-v1",
      source: "worker_context_packet_provider_dispatch_advisory",
      compact_safe: true,
      selected: selected.provider_ranking_provenance || selected.providerRankingProvenance || null,
      requested_candidate: candidate.provider_ranking_provenance || candidate.providerRankingProvenance || null,
      ranked_provider_candidate_count: rankedCandidates.length,
      ranked_provider_candidates: rankedCandidates.slice(0, 8).map((item: any) => ({
        agent_type: item.agent_type || item.agentType || "",
        project: item.project || "",
        composite_rank: Number(item.composite_rank || item.compositeRank || 0),
        selected_composite_rank: Number(item.selected_composite_rank || item.selectedCompositeRank || 0),
        local_execution_rank_penalty: Number(item.local_execution_rank_penalty || item.localExecutionRankPenalty || 0),
        provider_switch_execution_weighted_risk_score: Number(item.provider_switch_execution_weighted_risk_score || item.providerSwitchExecutionWeightedRiskScore || 0),
        typed_memory_rel_paths: Array.isArray(item.provider_ranking_provenance?.typed_memory_rel_paths || item.providerRankingProvenance?.typedMemoryRelPaths)
          ? (item.provider_ranking_provenance?.typed_memory_rel_paths || item.providerRankingProvenance?.typedMemoryRelPaths).slice(0, 6)
          : [],
        typed_memory_row_ids: Array.isArray(item.provider_ranking_provenance?.typed_memory_row_ids || item.providerRankingProvenance?.typedMemoryRowIds)
          ? (item.provider_ranking_provenance?.typed_memory_row_ids || item.providerRankingProvenance?.typedMemoryRowIds).slice(0, 8)
          : [],
      })),
      boundary: "ranking evidence only; requires explicit fresh provider switch receipt for execution",
    },
    provider_reliability_snapshot: {
      schema: "ccm-provider-switch-snapshot-ref-v1",
      snapshot_id: snapshot.snapshot_id || candidate.snapshot_id || "",
      snapshot_checksum: snapshot.snapshot_checksum || candidate.snapshot_checksum || "",
      generation_id: snapshot.generation_id || "",
      status: snapshot.status || candidate.snapshot_status || "",
      usable: snapshot.usable === true,
      generated_at: snapshot.generated_at || "",
      expires_at: snapshot.expires_at || "",
      source_generation_checksum: snapshot.source_generation_checksum || "",
    },
    task_compatibility: {
      confirmed: request.compatibility_confirmed,
      evidence: request.compatibility_evidence,
      project_match: String(candidate.project || "").trim().toLowerCase() === project.toLowerCase(),
      task_fingerprint: assignment.taskFingerprint || assignment.task_fingerprint || hashCoordinator(String(assignment.task || packet.task || ""), 24),
    },
    authority: request.authority,
    switch_reason: request.reason,
    advised_alternative: !!candidate.agent_type,
    approved_switch: true,
    actual_execution_expected: request.requested_agent_type,
    decided_at: decidedAt,
  };
  receiptBase.receipt_checksum = providerSwitchDecisionReceiptChecksumForCoordinator(receiptBase);
  const validation = validateProviderSwitchDecisionReceiptForCoordinator(receiptBase, {
    ...options,
    groupId,
    project,
    assignmentId: assignment.assignmentId || assignment.assignment_id || "",
    dispatchKey: assignment.dispatchKey || assignment.dispatch_key || "",
    nowMs: options.nowMs || options.now_ms || Date.parse(decidedAt) || Date.now(),
  });
  if (validation.valid) {
    return {
      ...receiptBase,
      valid: true,
      gaps: [],
      validation,
    };
  }
  const rejected: any = {
    ...receiptBase,
    status: "rejected",
    approved_switch: false,
  };
  rejected.receipt_checksum = providerSwitchDecisionReceiptChecksumForCoordinator(rejected);
  return {
    ...rejected,
    valid: false,
    gaps: validation.gaps,
    validation: {
      ...validation,
      valid: false,
      status: "rejected",
    },
  };
}
