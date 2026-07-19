// Behavior-freeze split from group-orchestrator-worker-context.ts (part 3/3).
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
  validateProviderSwitchDecisionReceiptForCoordinator,
} from "./group-orchestrator-worker-context-part-01";

export function recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  if (!groupId) return null;
  const at = String(options.at || input.at || new Date().toISOString());
  const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const index = findWorkerContextBindingIndexForCoordinator(entries, input);
  if (index < 0) return null;
  const entry = entries[index];
  const decisionReceipt = entry.worker_context_provider_switch_decision_receipt
    || entry.provider_switch_decision_receipt
    || input.provider_switch_decision_receipt
    || input.providerSwitchDecisionReceipt
    || {};
  if (decisionReceipt.schema !== "ccm-provider-switch-decision-receipt-v1") return null;
  const sessionBinding = entry.worker_context_provider_switch_session_binding
    || entry.provider_switch_session_binding
    || {};
  const finalReceipt = input.receipt || input.ccm_receipt || input.delivery_summary || {};
  const rawChildSwitchExecution = finalReceipt.providerSwitchExecution
    || finalReceipt.provider_switch_execution
    || finalReceipt.providerSwitchExecutionReceipt
    || finalReceipt.provider_switch_execution_receipt
    || null;
  const childSwitchExecution = Array.isArray(rawChildSwitchExecution)
    ? rawChildSwitchExecution[rawChildSwitchExecution.length - 1] || null
    : rawChildSwitchExecution;
  const expectedProvider = String(decisionReceipt.new_provider?.agent_type || decisionReceipt.newProvider?.agentType || "").trim();
  const actualProvider = String(input.executed_provider || input.executedProvider || input.agent_type || input.agentType || finalReceipt.agent_type || finalReceipt.agentType || "").trim();
  const taskAgentSessionId = String(input.task_agent_session_id || input.taskAgentSessionId || finalReceipt.task_agent_session_id || finalReceipt.taskAgentSessionId || "").trim();
  const nativeSessionId = String(input.native_session_id || input.nativeSessionId || finalReceipt.native_session_id || finalReceipt.nativeSessionId || "").trim();
  const executionId = String(input.execution_id || input.executionId || finalReceipt.execution_id || finalReceipt.executionId || "").trim();
  const receiptStatus = String(input.receipt_status || input.receiptStatus || finalReceipt.status || "").trim().toLowerCase();
  const childDecisionReceiptId = String(childSwitchExecution?.decisionReceiptId || childSwitchExecution?.decision_receipt_id || childSwitchExecution?.providerSwitchDecisionReceiptId || childSwitchExecution?.provider_switch_decision_receipt_id || "").trim();
  const childExpectedProvider = String(childSwitchExecution?.expectedProvider || childSwitchExecution?.expected_provider || childSwitchExecution?.approvedProvider || childSwitchExecution?.approved_provider || "").trim();
  const childExecutedProvider = String(childSwitchExecution?.executedProvider || childSwitchExecution?.executed_provider || childSwitchExecution?.actualProvider || childSwitchExecution?.actual_provider || "").trim();
  const childTaskAgentSessionId = String(childSwitchExecution?.taskAgentSessionId || childSwitchExecution?.task_agent_session_id || "").trim();
  const childNativeSessionId = String(childSwitchExecution?.nativeSessionId || childSwitchExecution?.native_session_id || "").trim();
  const childExecutionId = String(childSwitchExecution?.executionId || childSwitchExecution?.execution_id || "").trim();
  const childUsageState = String(childSwitchExecution?.usageState || childSwitchExecution?.usage_state || childSwitchExecution?.status || "").trim().toLowerCase();
  const actualMatchesExpected = actualProvider.toLowerCase() === expectedProvider.toLowerCase();
  const decisionValidation = validateProviderSwitchDecisionReceiptForCoordinator(decisionReceipt, {
    ...options,
    verifySnapshot: false,
    groupId,
    project: input.project || entry.project || "",
    assignmentId: input.assignment_id || input.assignmentId || entry.assignment_id || "",
    dispatchKey: input.dispatch_key || input.dispatchKey || entry.dispatch_key || "",
    nowMs: Date.parse(String(decisionReceipt.decided_at || "")) || Date.now(),
  });
  const gaps = [
    ...decisionValidation.gaps,
    sessionBinding.status !== "bound" ? "approved_switch_session_not_bound" : "",
    !finalReceipt || typeof finalReceipt !== "object" || Object.keys(finalReceipt).length === 0 ? "final_child_receipt_missing" : "",
    !childSwitchExecution || typeof childSwitchExecution !== "object" ? "provider_switch_execution_declaration_missing" : "",
    childSwitchExecution && childDecisionReceiptId !== String(decisionReceipt.receipt_id || "") ? "declared_decision_receipt_id_mismatch" : "",
    childSwitchExecution && childExpectedProvider.toLowerCase() !== expectedProvider.toLowerCase() ? "declared_expected_provider_mismatch" : "",
    childSwitchExecution && childExecutedProvider.toLowerCase() !== actualProvider.toLowerCase() ? "declared_executed_provider_mismatch" : "",
    childSwitchExecution && childTaskAgentSessionId !== taskAgentSessionId ? "declared_task_agent_session_id_mismatch" : "",
    childSwitchExecution && nativeSessionId && childNativeSessionId !== nativeSessionId ? "declared_native_session_id_mismatch" : "",
    childSwitchExecution && childExecutionId !== executionId ? "declared_execution_id_mismatch" : "",
    childSwitchExecution && childUsageState !== (actualMatchesExpected ? "executed" : "mismatch") ? "declared_usage_state_mismatch" : "",
    !actualMatchesExpected ? "executed_provider_mismatch" : "",
    !taskAgentSessionId ? "task_agent_session_id_missing" : "",
    sessionBinding.task_agent_session_id && sessionBinding.task_agent_session_id !== taskAgentSessionId ? "task_agent_session_id_mismatch" : "",
    sessionBinding.native_session_id && nativeSessionId && sessionBinding.native_session_id !== nativeSessionId ? "native_session_id_mismatch" : "",
    !executionId ? "execution_id_missing" : "",
  ].filter(Boolean);
  const executionReceipt = {
    schema: "ccm-provider-switch-execution-receipt-v1",
    execution_receipt_id: `provider-switch-execution:${hashCoordinator([
      decisionReceipt.receipt_id || "",
      taskAgentSessionId,
      executionId,
      actualProvider,
    ], 18)}`,
    provider_switch_decision_receipt_id: decisionReceipt.receipt_id || "",
    provider_switch_decision_receipt_checksum: decisionReceipt.receipt_checksum || "",
    groupId,
    project: decisionReceipt.project || entry.project || "",
    advised_alternative: decisionReceipt.advised_alternative === true,
    approved_switch: decisionReceipt.approved_switch === true && decisionValidation.valid,
    expected_provider: expectedProvider,
    actually_executed_provider: actualProvider,
    task_agent_session_id: taskAgentSessionId,
    native_session_id: nativeSessionId,
    execution_id: executionId,
    worker_context_packet_id: entry.worker_context_packet_id || "",
    receipt_status: receiptStatus,
    system_attested: true,
    child_declared: !!childSwitchExecution && typeof childSwitchExecution === "object",
    child_declaration: childSwitchExecution && typeof childSwitchExecution === "object" ? {
      decision_receipt_id: childDecisionReceiptId,
      expected_provider: childExpectedProvider,
      executed_provider: childExecutedProvider,
      task_agent_session_id: childTaskAgentSessionId,
      native_session_id: childNativeSessionId,
      execution_id: childExecutionId,
      usage_state: childUsageState,
    } : null,
    status: gaps.length ? "failed" : "passed",
    executed_as_approved: gaps.length === 0,
    gaps: uniqueCoordinatorStrings(gaps),
    final_child_receipt_present: !!finalReceipt && typeof finalReceipt === "object" && Object.keys(finalReceipt).length > 0,
    at,
  };
  entries[index] = {
    ...entry,
    worker_context_provider_switch_execution_receipt: executionReceipt,
    provider_switch_execution_receipt: executionReceipt,
    provider_switch_ledger_state: {
      advised_alternative: decisionReceipt.advised_alternative === true,
      approved_switch: decisionReceipt.approved_switch === true && decisionValidation.valid,
      actually_executed_provider: actualProvider,
    },
    worker_context_packet_receipt: finalReceipt,
    receipt_status: receiptStatus,
    task_agent_session_id: taskAgentSessionId || entry.task_agent_session_id || "",
    native_session_id: nativeSessionId || entry.native_session_id || "",
    execution_id: executionId || entry.execution_id || "",
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
  let typedMemoryDistillation: any = null;
  try {
    typedMemoryDistillation = distillProviderSwitchExecutionToTypedMemory(groupId, {
      rows: [entries[index]],
    }, {
      reason: "worker-context-provider-switch-execution-receipt",
      updatedAt: at,
      ...(options.providerSwitchExecutionDistillationOptions || options.provider_switch_execution_distillation_options || {}),
    });
  } catch (error: any) {
    typedMemoryDistillation = {
      schema: "ccm-provider-switch-execution-distillation-error-v1",
      status: "failed",
      reason: compactText(error?.message || String(error || ""), 500),
    };
  }
  return {
    ...executionReceipt,
    typed_memory_distillation: typedMemoryDistillation,
  };
}

export function recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  if (!groupId) return null;
  const at = String(options.at || input.at || new Date().toISOString());
  const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const bindingId = String(input.binding_id || input.bindingId || "").trim();
  const assignmentId = String(input.assignment_id || input.assignmentId || "").trim();
  const dispatchKey = String(input.dispatch_key || input.dispatchKey || "").trim();
  const packetId = String(input.worker_context_packet_id || input.workerContextPacketId || "").trim();
  const index = entries.findIndex((entry: any) => {
    if (bindingId && String(entry.binding_id || "") === bindingId) return true;
    if (assignmentId && String(entry.assignment_id || "") === assignmentId) return true;
    if (dispatchKey && String(entry.dispatch_key || "") === dispatchKey) return true;
    return !!packetId && String(entry.worker_context_packet_id || "") === packetId;
  });
  if (index < 0) return null;
  const entry = entries[index];
  const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
  if (decision.action !== "dispatch_with_provider_override") return null;
  const completion = buildProviderDispatchOverrideCompletionForCoordinator(entry, input, at);
  const closure = closeProviderDispatchOverrideFollowupRepairWorkItemForCoordinator(groupId, completion, at);
  const nextEntry = {
    ...entry,
    worker_context_provider_dispatch_override_completion: {
      ...completion,
      followup_repair_work_item_completion: closure,
    },
    provider_dispatch_override_completion: {
      ...completion,
      followup_repair_work_item_completion: closure,
    },
    provider_dispatch_override_completion_status: completion.status,
    provider_dispatch_override_completion_at: at,
    at,
  };
  entries[index] = nextEntry;
  const next = {
    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
    version: ledger.version || 1,
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
    entries: entries.slice(-160),
  };
  writeJsonAtomicForCoordinator(next.file, next);
  return nextEntry.worker_context_provider_dispatch_override_completion;
}

export function recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  if (!groupId) return null;
  const at = String(options.at || input.at || new Date().toISOString());
  const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const bindingId = String(input.binding_id || input.bindingId || "").trim();
  const assignmentId = String(input.assignment_id || input.assignmentId || "").trim();
  const dispatchKey = String(input.dispatch_key || input.dispatchKey || "").trim();
  const packetId = String(input.worker_context_packet_id || input.workerContextPacketId || "").trim();
  const index = entries.findIndex((entry: any) => {
    if (bindingId && String(entry.binding_id || "") === bindingId) return true;
    if (assignmentId && String(entry.assignment_id || "") === assignmentId) return true;
    if (dispatchKey && String(entry.dispatch_key || "") === dispatchKey) return true;
    return !!packetId && String(entry.worker_context_packet_id || "") === packetId;
  });
  if (index < 0) return null;
  const entry = entries[index];
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(
    input.groupSessionId || input.group_session_id || entry.groupSessionId || entry.group_session_id || ""
  );
  const typedMemoryScopeId = groupSessionId ? `${groupId}--${groupSessionId}` : groupId;
  const validationBase = buildProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(entry, input, at);
  const repairWorkItem = syncProviderDispatchOverrideFollowupReceiptValidationRepairWorkItemForCoordinator(groupId, entry, validationBase, at);
  const validationDraft = {
    ...validationBase,
    repair_work_item: repairWorkItem,
    repair_work_item_id: repairWorkItem?.work_item_id || "",
    repair_work_item_status: repairWorkItem?.status || "",
  };
  let typedMemoryDistillation: any = null;
  let typedMemoryDistillationError = "";
  try {
    typedMemoryDistillation = distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(typedMemoryScopeId, {
      rows: [{
        entry: {
          ...entry,
          task_id: input.task_id || input.taskId || entry.task_id || "",
          worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || entry.worker_handoff_id || "",
          task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || entry.task_agent_session_id || "",
          native_session_id: input.native_session_id || input.nativeSessionId || entry.native_session_id || "",
          execution_id: input.execution_id || input.executionId || entry.execution_id || "",
          groupSessionId,
          group_session_id: groupSessionId,
          at,
        },
        validation: { ...validationDraft, groupId, groupSessionId, group_session_id: groupSessionId },
      }],
    }, {
      reason: "group-orchestrator-provider-dispatch-override-followup-receipt-validation",
      sourceGroupId: groupId,
      groupSessionId,
      updatedAt: at,
    });
  } catch (error: any) {
    typedMemoryDistillationError = String(error?.message || error || "provider override follow-up receipt validation distillation failed");
  }
  const validation = {
    ...validationDraft,
    typed_memory_distillation: typedMemoryDistillation ? {
      schema: typedMemoryDistillation.schema || "",
      archived_count: Number(typedMemoryDistillation.archivedCount || 0),
      attempt_count: Number(typedMemoryDistillation.attemptCount || 0),
      failed_count: Number(typedMemoryDistillation.failedCount || 0),
      passed_count: Number(typedMemoryDistillation.passedCount || 0),
      attribution_count: Number(typedMemoryDistillation.attributionCount || 0),
      write_count: Number(typedMemoryDistillation.writeCount || 0),
      ledger_file: typedMemoryDistillation.ledgerFile || "",
    } : null,
    typed_memory_distillation_error: typedMemoryDistillationError,
  };
  const nextEntry = {
    ...entry,
    groupSessionId,
    group_session_id: groupSessionId,
    worker_context_provider_dispatch_override_followup_receipt_contract_validation: validation,
    provider_dispatch_override_followup_receipt_contract_validation: validation,
    provider_dispatch_override_followup_receipt_contract_validation_status: validation.status,
    provider_dispatch_override_followup_receipt_contract_validation_at: at,
    worker_context_packet_receipt: input.receipt || input.ccm_receipt || input.delivery_summary || entry.worker_context_packet_receipt || null,
    receipt_status: validation.receipt_status || entry.receipt_status || "",
    task_id: input.task_id || input.taskId || entry.task_id || "",
    worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || entry.worker_handoff_id || "",
    task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || entry.task_agent_session_id || "",
    native_session_id: input.native_session_id || input.nativeSessionId || entry.native_session_id || "",
    execution_id: input.execution_id || input.executionId || entry.execution_id || "",
    at,
  };
  entries[index] = nextEntry;
  const next = {
    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
    version: ledger.version || 1,
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
    providerDispatchOverrideFollowupReceiptContractValidationCount: entries.filter((item: any) => item.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.schema === "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1").length,
    providerDispatchOverrideFollowupReceiptContractValidationPassedCount: entries.filter((item: any) => item.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.contract_satisfied === true).length,
    providerDispatchOverrideFollowupReceiptContractValidationFailedCount: entries.filter((item: any) => item.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.status === "failed").length,
    entries: entries.slice(-160),
  };
  writeJsonAtomicForCoordinator(next.file, next);
  return validation;
}
