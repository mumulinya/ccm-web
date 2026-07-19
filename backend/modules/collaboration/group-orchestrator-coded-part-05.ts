// Behavior-freeze split from group-orchestrator-coded.ts (part 5/5).
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
  WORKFLOW_DECISION_GUIDANCE,
  normalizeWorkflowDecision,
  type WorkflowDecision,
} from "../../agents/workflow-decision";
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
  BROAD_HINTS,
  GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR,
  analyzeRequirement,
  buildCoordinatorPlan,
  buildVisibleAssignmentLine,
  containsAny,
  formatRequirementUnderstanding,
  getCoordinatorMember,
  getRoutableMembers,
  inferCoordinatorStrategy,
  isExplicitExecutionRequest,
  isSimpleMessage,
  memberKind,
  normalizeGroupOrchestrator,
  routeMembers,
} from "./group-orchestrator-routing";
import {
  buildCodedCoordinatorNotificationRows,
  compactText,
} from "./group-orchestrator-prompts";

import {
  getReplayRepairDispatchBindingsFileForCoordinator,
  getReplayRepairWorkItemsFileForCoordinator,
  writeJsonAtomicForCoordinator,
} from "./group-orchestrator-coded-part-01";

import {
  providerSwitchBindingLedgerCountersForCoordinator,
  readReplayRepairDispatchBindingLedgerForCoordinator,
} from "./group-orchestrator-coded-part-03";

import {
  readyReplayRepairDispatchBriefsForCoordinator,
  replayRepairBriefMatchScore,
  replayRepairPriorityRankForCoordinator,
  replayRepairStatusForCoordinator,
} from "./group-orchestrator-coded-part-04";

export function findReplayRepairDispatchBriefForAssignment(groupId: string, assignment: any = {}) {
  if (!groupId) return null;
  const briefs = readyReplayRepairDispatchBriefsForCoordinator(groupId);
  let best: any = null;
  for (const brief of briefs) {
    const match = replayRepairBriefMatchScore(brief, assignment);
    if (Number(match.score || 0) < 45) continue;
    if (!best || Number(match.score || 0) > Number(best.match_score || 0)) {
      best = {
        brief,
        match_score: match.score,
        matched_by: match.matched || [],
      };
    }
  }
  return best;
}

export function normalizeReplayRepairPacketBriefForCoordinator(item: any = {}) {
  return {
    brief_id: item.brief_id || item.briefId || "",
    work_item_id: item.work_item_id || item.workItemId || "",
    source: item.source || "",
    component: item.component || "",
    target_project: item.target_project || item.targetProject || "",
    reinjection_gate_id: item.reinjection_gate_id || item.reinjectionGateId || "",
    post_compact_candidate_id: item.post_compact_candidate_id || item.postCompactCandidateId || "",
    post_compact_candidate_kind: item.post_compact_candidate_kind || item.postCompactCandidateKind || "",
    post_compact_candidate_value: item.post_compact_candidate_value || item.postCompactCandidateValue || "",
    post_compact_candidate_source_message_id: item.post_compact_candidate_source_message_id || item.postCompactCandidateSourceMessageId || "",
    original_worker_context_packet_id: item.original_worker_context_packet_id || item.originalWorkerContextPacketId || "",
    original_binding_id: item.original_binding_id || item.originalBindingId || "",
    original_task_agent_session_id: item.original_task_agent_session_id || item.originalTaskAgentSessionId || "",
    original_native_session_id: item.original_native_session_id || item.originalNativeSessionId || "",
    post_compact_receipt_memory_required_doc_rel_paths: item.post_compact_receipt_memory_required_doc_rel_paths || item.postCompactReceiptMemoryRequiredDocRelPaths || [],
    proof_entry_id: item.proof_entry_id || item.proofEntryId || "",
    request_patch_checksum: item.request_patch_checksum || item.requestPatchChecksum || "",
    provider_reproof_status: item.provider_reproof_status || item.providerReproofStatus || "",
    provider_reproof_reason: item.provider_reproof_reason || item.providerReproofReason || "",
    reproof_candidate_id: item.reproof_candidate_id || item.reproofCandidateId || "",
    timeline_binding_id: item.timeline_binding_id || item.timelineBindingId || "",
    original_work_item_id: item.original_work_item_id || item.originalWorkItemId || "",
    request_telemetry_session_status: item.request_telemetry_session_status || item.requestTelemetrySessionStatus || "",
    request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || item.requestTelemetryDispatchStatus || "",
    runner_request_id: item.runner_request_id || item.runnerRequestId || "",
    execution_id: item.execution_id || item.executionId || "",
    required_receipt_reference: item.required_receipt_reference !== false && item.requiredReceiptReference !== false,
    should_create_real_task: item.should_create_real_task === false || item.shouldCreateRealTask === false ? false : item.should_create_real_task,
  };
}

export function replayRepairPacketBriefMatchesForCoordinator(packetBrief: any = {}, brief: any = {}) {
  const packetBriefId = String(packetBrief.brief_id || "").trim();
  const briefId = String(brief.brief_id || "").trim();
  if (packetBriefId && briefId && packetBriefId === briefId) return true;
  const packetWorkItem = String(packetBrief.work_item_id || "").trim();
  const briefWorkItem = String(brief.work_item_id || "").trim();
  return !!packetWorkItem && !!briefWorkItem && packetWorkItem === briefWorkItem;
}

export function buildReplayRepairWorkerContextPacketProbeForCoordinator(assignment: any = {}, brief: any = {}) {
  const packet = assignment.worker_context_packet || assignment.workerContextPacket || {};
  const packetBriefs = (Array.isArray(packet.replay_repair_dispatch_briefs) ? packet.replay_repair_dispatch_briefs : [])
    .map(normalizeReplayRepairPacketBriefForCoordinator);
  const matchingBrief = packetBriefs.find((item: any) => replayRepairPacketBriefMatchesForCoordinator(item, brief)) || {};
  let rendered = "";
  try { rendered = renderWorkerContextPacket(packet); } catch {}
  const renderedIncludes = (value: any) => {
    const text = String(value || "").trim();
    return !text || rendered.includes(text);
  };
  return {
    packet_id: packet.packet_id || "",
    context_usage: packet.context_usage || packet.contextUsage || null,
    replay_repair_dispatch_brief_count: packetBriefs.length,
    matching_brief: matchingBrief,
    rendered_flags: {
      has_brief_id: renderedIncludes(brief.brief_id),
      has_work_item_id: renderedIncludes(brief.work_item_id),
      has_source: renderedIncludes(brief.source),
      has_component: renderedIncludes(brief.component),
      has_reinjection_gate_id: renderedIncludes(brief.reinjection_gate_id),
      has_post_compact_candidate_id: renderedIncludes(brief.post_compact_candidate_id),
      has_post_compact_candidate_kind: renderedIncludes(brief.post_compact_candidate_kind),
      has_post_compact_candidate_value: renderedIncludes(brief.post_compact_candidate_value),
      has_post_compact_candidate_source_message_id: renderedIncludes(brief.post_compact_candidate_source_message_id),
      has_proof_entry_id: renderedIncludes(brief.proof_entry_id),
      has_request_patch_checksum: renderedIncludes(brief.request_patch_checksum),
      has_provider_reproof_status: renderedIncludes(brief.provider_reproof_status),
      has_provider_reproof_reason: renderedIncludes(brief.provider_reproof_reason),
      has_reproof_candidate_id: renderedIncludes(brief.reproof_candidate_id),
      has_timeline_binding_id: renderedIncludes(brief.timeline_binding_id),
      has_original_work_item_id: renderedIncludes(brief.original_work_item_id),
      has_request_telemetry_session_status: renderedIncludes(brief.request_telemetry_session_status),
      has_request_telemetry_dispatch_status: renderedIncludes(brief.request_telemetry_dispatch_status),
      has_runner_request_id: renderedIncludes(brief.runner_request_id),
      has_execution_id: renderedIncludes(brief.execution_id),
      has_should_create_real_task_false: rendered.includes("shouldCreateRealTask=false"),
      has_context_usage_budget: rendered.includes("Context usage budget"),
      has_platform_memory: rendered.includes("平台记忆"),
      has_memory_reinjection_proof: rendered.includes("Memory reinjection proof"),
      has_memory_compaction_hash: !!(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash)
        && rendered.includes(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash || ""),
    },
    rendered_excerpt: compactText(rendered, 1200),
    briefs: packetBriefs,
  };
}

export function recordReplayRepairDispatchBriefAssignmentBinding(groupId: string, assignment: any = {}, match: any = {}, options: any = {}) {
  return require("./group-orchestrator-replay-repair").recordReplayRepairDispatchBriefAssignmentBinding(groupId, assignment, match, options);
}

export function attachReplayRepairAssignmentReceiptForCoordinator(groupId: string, binding: any = {}, receipt: any = null, at = new Date().toISOString()) {
  if (!groupId || !receipt || typeof receipt !== "object") return null;
  const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const index = entries.findIndex((entry: any) => {
    if (binding.brief_id && String(entry.brief_id || "") !== String(binding.brief_id || "")) return false;
    if (binding.assignment_id && String(entry.assignment_id || "") === String(binding.assignment_id || "")) return true;
    if (binding.dispatch_key && String(entry.dispatch_key || "") === String(binding.dispatch_key || "")) return true;
    return !!binding.worker_context_packet_id
      && String(entry.worker_context_packet_id || "") === String(binding.worker_context_packet_id || "");
  });
  if (index < 0) return null;
  entries[index] = {
    ...entries[index],
    worker_context_packet_receipt: receipt,
    receipt_status: binding.receipt_status || receipt.status || entries[index].receipt_status || "",
    task_id: binding.task_id || entries[index].task_id || "",
    worker_handoff_id: binding.worker_handoff_id || entries[index].worker_handoff_id || "",
    task_agent_session_id: binding.task_agent_session_id || entries[index].task_agent_session_id || "",
    native_session_id: binding.native_session_id || entries[index].native_session_id || "",
    execution_id: binding.execution_id || entries[index].execution_id || "",
    receipt_attached_at: at,
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
    receiptAttachedCount: entries.filter((entry: any) => entry.worker_context_packet_receipt && typeof entry.worker_context_packet_receipt === "object").length,
    ...providerSwitchBindingLedgerCountersForCoordinator(entries),
    entries: entries.slice(-160),
  };
  writeJsonAtomicForCoordinator(next.file, next);
  return entries[index];
}

export function buildReplayRepairDispatchBriefForCoordinator(groupId: string, candidate: any = {}, index = 0, existing: any = {}, at = new Date().toISOString()) {
  return require("./group-orchestrator-replay-repair").buildReplayRepairDispatchBriefForCoordinator(groupId, candidate, index, existing, at);
}

export function syncReplayRepairDispatchPlansForCoordinator(groupId: string, summaryInput: any = null, options: any = {}) {
  return require("./group-orchestrator-replay-repair").syncReplayRepairDispatchPlansForCoordinator(groupId, summaryInput, options);
}

export function readReplayRepairDispatchCandidatesForCoordinator(groupId: string, limit = 8) {
  const file = getReplayRepairWorkItemsFileForCoordinator(groupId);
  try {
    const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (ledger?.schema !== "ccm-compact-boundary-replay-repair-work-items-v1") return null;
    const items = Array.isArray(ledger.items) ? ledger.items : [];
    const openItems = items.filter((item: any) => ["pending", "in_progress", "blocked"].includes(replayRepairStatusForCoordinator(item)));
    const candidates = openItems
      .filter((item: any) => {
        const status = replayRepairStatusForCoordinator(item);
        const priority = String(item.priority || "").toLowerCase();
        return !!String(item.dispatch_target || item.dispatchTarget || "").trim()
          || (status === "in_progress" && String(item.owner || "") === "group-main-agent")
          || (status === "pending" && ["critical", "high"].includes(priority));
      })
      .sort((a: any, b: any) => {
        const dispatchA = String(a.dispatch_target || a.dispatchTarget || "").trim() ? 0 : replayRepairStatusForCoordinator(a) === "in_progress" ? 1 : 2;
        const dispatchB = String(b.dispatch_target || b.dispatchTarget || "").trim() ? 0 : replayRepairStatusForCoordinator(b) === "in_progress" ? 1 : 2;
        if (dispatchA !== dispatchB) return dispatchA - dispatchB;
        const priority = replayRepairPriorityRankForCoordinator(a.priority) - replayRepairPriorityRankForCoordinator(b.priority);
        if (priority) return priority;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      })
      .slice(0, limit)
      .map((item: any, index: number) => {
        const status = replayRepairStatusForCoordinator(item);
        const dispatchTarget = compactText(item.dispatch_target || item.dispatchTarget || "", 120);
        const targetProject = compactText(dispatchTarget || item.target_project || item.target || item.repair_target || "", 120);
        const workItemId = String(item.work_item_id || item.id || `repair-${index}`);
        return {
          candidate_id: `replay-repair-dispatch:${workItemId.replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 80)}`,
          work_item_id: workItemId,
          status,
          priority: item.priority || "medium",
          component: item.component || "replay_renderer",
          source: item.source || "",
          subject: item.subject || item.title || "",
          targetProject,
          dispatch_target: dispatchTarget,
          repair_target: item.repair_target || "",
          reinjection_gate_id: item.reinjection_gate_id || "",
          post_compact_candidate_id: item.post_compact_candidate_id || "",
          post_compact_candidate_kind: item.post_compact_candidate_kind || "",
          post_compact_candidate_value: item.post_compact_candidate_value || "",
          post_compact_candidate_source_message_id: item.post_compact_candidate_source_message_id || "",
          proof_entry_id: item.proof_entry_id || "",
          plan_checksum: item.plan_checksum || "",
          apply_plan_checksum: item.apply_plan_checksum || "",
          request_patch_checksum: item.request_patch_checksum || "",
          worker_context_packet_id: item.worker_context_packet_id || item.packet_id || "",
          worker_context_packet_binding_id: item.worker_context_packet_binding_id || item.binding_id || "",
          worker_context_packet_memory_policy_reason: item.worker_context_packet_memory_policy_reason || "",
          binding_id: item.binding_id || item.worker_context_packet_binding_id || "",
          assignment_id: item.assignment_id || "",
          dispatch_key: item.dispatch_key || "",
          provider_override_followup_contract_validation_id: item.provider_override_followup_contract_validation_id || "",
          provider_override_followup_contract_rel_paths: item.provider_override_followup_contract_rel_paths || [],
          provider_override_followup_contract_work_item_ids: item.provider_override_followup_contract_work_item_ids || [],
          provider_override_followup_contract_override_ids: item.provider_override_followup_contract_override_ids || [],
          provider_override_followup_contract_gap_codes: item.provider_override_followup_contract_gap_codes || [],
          provider_switch_decision_receipt_id: item.provider_switch_decision_receipt_id || "",
          provider_switch_decision_receipt_checksum: item.provider_switch_decision_receipt_checksum || "",
          provider_ranking_provenance_gap_codes: item.provider_ranking_provenance_gap_codes || [],
          provider_ranking_provenance_rel_paths: item.provider_ranking_provenance_rel_paths || [],
          provider_ranking_provenance_row_ids: item.provider_ranking_provenance_row_ids || [],
          provider_ranking_provenance_missing_rel_paths: item.provider_ranking_provenance_missing_rel_paths || [],
          provider_ranking_provenance_missing_row_ids: item.provider_ranking_provenance_missing_row_ids || [],
          provider_ranking_memory_receipt_required_doc_rel_paths: item.provider_ranking_memory_receipt_required_doc_rel_paths || [],
          provider_ranking_memory_receipt_missing_doc_rel_paths: item.provider_ranking_memory_receipt_missing_doc_rel_paths || [],
          provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths: item.provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths || [],
          post_compact_receipt_memory_gap_codes: item.post_compact_receipt_memory_gap_codes || [],
          post_compact_receipt_memory_required_doc_rel_paths: item.post_compact_receipt_memory_required_doc_rel_paths || [],
          post_compact_receipt_memory_missing_doc_rel_paths: item.post_compact_receipt_memory_missing_doc_rel_paths || [],
          post_compact_receipt_memory_missing_current_source_verified_doc_rel_paths: item.post_compact_receipt_memory_missing_current_source_verified_doc_rel_paths || [],
          post_compact_receipt_memory_missing_ignored_reason_doc_rel_paths: item.post_compact_receipt_memory_missing_ignored_reason_doc_rel_paths || [],
          original_worker_context_packet_id: item.original_worker_context_packet_id || "",
          original_binding_id: item.original_binding_id || "",
          original_assignment_id: item.original_assignment_id || "",
          original_dispatch_key: item.original_dispatch_key || "",
          original_task_agent_session_id: item.original_task_agent_session_id || "",
          original_native_session_id: item.original_native_session_id || "",
          compact_outcome_id: item.compact_outcome_id || "",
          compact_retry_id: item.compact_retry_id || "",
          compact_hook_run_id: item.compact_hook_run_id || "",
          provider_reproof_status: item.provider_reproof_status || "",
          provider_reproof_reason: item.provider_reproof_reason || "",
          reproof_candidate_id: item.reproof_candidate_id || "",
          timeline_binding_id: item.timeline_binding_id || "",
          original_work_item_id: item.original_work_item_id || "",
          request_telemetry_entry_id: item.request_telemetry_entry_id || "",
          request_telemetry_status: item.request_telemetry_status || "",
          request_telemetry_source: item.request_telemetry_source || "",
          request_telemetry_session_status: item.request_telemetry_session_status || "",
          request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
          runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
          execution_id: item.execution_id || "",
          instruction: compactText(item.instruction || item.description || item.expected || item.subject || "", 360),
          expected: compactText(item.expected || "", 180),
          prompt_patch: compactText(item.prompt_patch || "", 900),
          recommendedAction: dispatchTarget
            ? "main_agent_review_and_dispatch_to_child_agent"
            : status === "in_progress"
            ? "main_agent_prepare_dispatch_brief"
            : "main_agent_claim_or_triage_before_next_child_dispatch",
        };
      });
    return {
      schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
      groupId,
      file,
      updatedAt: ledger.updatedAt || "",
      candidateCount: candidates.length,
      openItemCount: openItems.length,
      claimedCount: openItems.filter((item: any) => replayRepairStatusForCoordinator(item) === "in_progress" && String(item.owner || "") === "group-main-agent").length,
      dispatchMarkedCount: openItems.filter((item: any) => String(item.dispatch_target || item.dispatchTarget || "").trim()).length,
      readyCount: candidates.filter((candidate: any) => candidate.dispatch_target || candidate.status === "in_progress").length,
      shouldCreateRealTask: false,
      candidates,
    };
  } catch {
    return null;
  }
}
