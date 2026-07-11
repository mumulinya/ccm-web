import * as crypto from "crypto";
import {
  DEFAULT_AUTO_COMPACT_BUFFER_TOKENS,
  DEFAULT_RESERVED_OUTPUT_TOKENS,
  buildContextBudget,
  estimateTextTokens,
} from "../system/context-budget";
import { appendTraceEvent, getTrace, listTraces } from "../system/reliability-ledger";

export type AgentRuntimeScope = "global" | "group" | "worker";
export type AgentRuntimeRisk = "read" | "write" | "high" | "agent";
export type AgentRuntimeDecision = "allow" | "ask" | "deny";

export interface AgentRuntimeLifecycleInput {
  scope: AgentRuntimeScope;
  traceId?: string;
  taskId?: string;
  groupId?: string;
  runId?: string;
  agent?: string;
  action: string;
  phase?: string;
  risk?: AgentRuntimeRisk;
  target?: string;
  status?: "planned" | "running" | "ok" | "blocked" | "error" | "skipped";
  message?: string;
  data?: any;
}

export interface AgentRuntimeLifecycleRecord {
  id: string;
  type: "agent_runtime.lifecycle";
  scope: AgentRuntimeScope;
  action: string;
  phase: string;
  risk: AgentRuntimeRisk;
  target: string;
  status: string;
  permission: ReturnType<typeof evaluateAgentRuntimePermission>;
  context_budget: ReturnType<typeof buildContextBudget>;
  artifact_budget: {
    chars: number;
    max_chars: number;
    truncated: boolean;
    artifact_hash: string;
  };
  data: any;
}

export interface AgentPermissionRule {
  id: string;
  scope: AgentRuntimeScope | "all";
  action: string;
  target?: string;
  risk?: AgentRuntimeRisk | "all";
  decision: AgentRuntimeDecision;
  reason: string;
}

const DEFAULT_PERMISSION_RULES: AgentPermissionRule[] = [
  { id: "read-auto", scope: "all", action: "*", risk: "read", decision: "allow", reason: "只读动作默认允许" },
  { id: "worker-dispatch-ask", scope: "group", action: "dispatch_worker", risk: "agent", decision: "ask", reason: "子 Agent 派发需要当前用户消息授权或任务上下文" },
  { id: "high-risk-ask", scope: "all", action: "*", risk: "high", decision: "ask", reason: "高风险动作必须确认" },
];

function compact(value: any, max = 1200) {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return text.length <= max ? text : `${text.slice(0, Math.ceil(max * 0.65))}\n...[truncated ${text.length - max} chars]...\n${text.slice(-Math.floor(max * 0.25))}`;
}

function hash(value: any, len = 12) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, len);
}

function uniqueRuntimeStrings(values: any[] = [], limit = 24) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values.flatMap((value: any) => Array.isArray(value) ? value : [value])) {
    const value = String(raw || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function renderWorkerPacketMemory(memory: any) {
  if (!memory) return "";
  const compactMemory = (value: any, max = 5000) => {
    const text = typeof value === "string" ? value : JSON.stringify(value || {});
    return text.length <= max ? text : `${text.slice(0, Math.ceil(max * 0.68))}\n...[memory truncated ${text.length - max} chars]...\n${text.slice(-Math.floor(max * 0.2))}`;
  };
  if (typeof memory === "string") return compactMemory(memory);
  const schema = String(memory.schema || "ccm-memory-context");
  const rendered = memory.rendered_text || memory.renderedText || memory.summary || "";
  if (rendered) {
    return [
      `平台记忆：${schema}`,
      memory.group_id ? `group_id: ${memory.group_id}` : "",
      memory.target_project ? `target_project: ${memory.target_project}` : "",
      compactMemory(rendered),
    ].filter(Boolean).join("\n");
  }
  if (memory.group_memory) {
    return [
      `平台记忆：${schema}`,
      renderWorkerPacketMemory(memory.group_memory),
      memory.global_mission_memory ? compactMemory(memory.global_mission_memory, 1800) : "",
    ].filter(Boolean).join("\n");
  }
  return [`平台记忆：${schema}`, compactMemory(memory)].join("\n");
}

function extractPressureMemoryProvenanceReceiptDiscipline(memory: any = {}, fallback: any = null) {
  const candidate = fallback
    || memory?.pressure_memory_provenance_receipt_discipline
    || memory?.pressureMemoryProvenanceReceiptDiscipline
    || memory?.group_state?.typedMemory?.pressureProvenanceReceiptDiscipline
    || memory?.group_state?.typed_memory?.pressure_provenance_receipt_discipline
    || memory?.typedMemory?.pressureProvenanceReceiptDiscipline
    || null;
  if (!candidate?.schema) return null;
  const rows = Array.isArray(candidate.rows) ? candidate.rows : [];
  const exampleRows = Array.isArray(candidate.exampleRows || candidate.example_rows) ? (candidate.exampleRows || candidate.example_rows) : [];
  return {
    ...candidate,
    active: candidate.active === true || rows.length > 0,
    rows,
    exampleRows,
  };
}

function renderPressureMemoryProvenanceReceiptDiscipline(discipline: any = {}) {
  if (!discipline?.schema || discipline.active === false) return "";
  const rows = Array.isArray(discipline.rows) ? discipline.rows.slice(0, 6) : [];
  const examples = Array.isArray(discipline.exampleRows || discipline.example_rows)
    ? (discipline.exampleRows || discipline.example_rows).slice(0, 3)
    : [];
  return [
    `Pressure memory provenance receipt discipline：docs=${discipline.docCount || rows.length || 0}；source=${discipline.source || "typed_memory_pressure_repair_provenance"}`,
    "- CCM_AGENT_RECEIPT.memoryProvenanceUsage is required for every surfaced pressure repair MEMORY.md row.",
    "- Required fields: relPath, usageState, provenanceStatus, repairWorkItemId, repairStatus, repairGapType, currentSourceVerified.",
    "- If usageState is used/verified for disputed_under_repair or stale_evidence_under_repair memory, reread or verify the current source first and set currentSourceVerified=true.",
    ...rows.map((row: any) => [
      `- relPath=${row.relPath || row.rel_path || row.name || "unknown"}`,
      `provenanceStatus=${row.provenanceStatus || row.provenance_status || "under_repair"}`,
      `repairWorkItemId=${row.repairWorkItemId || row.repair_work_item_id || "unknown"}`,
      `repairStatus=${row.repairStatus || row.repair_status || "pending"}`,
      `repairGapType=${row.repairGapType || row.repair_gap_type || "pressure_repair_provenance"}`,
    ].join("；")),
    examples.length ? `- Example CCM_AGENT_RECEIPT.memoryProvenanceUsage=${JSON.stringify(examples)}` : "",
  ].filter(Boolean).join("\n");
}

function extractPressureProvenanceDispatchFeedbackPolicy(memory: any = {}, fallback: any = null) {
  const candidate = fallback
    || memory?.pressure_provenance_dispatch_feedback_policy
    || memory?.pressureProvenanceDispatchFeedbackPolicy
    || memory?.group_state?.typedMemory?.pressureProvenanceDispatchFeedbackPolicy
    || memory?.group_state?.typed_memory?.pressure_provenance_dispatch_feedback_policy
    || memory?.typedMemory?.pressureProvenanceDispatchFeedbackPolicy
    || null;
  if (!candidate?.schema) return null;
  const policyRows = Array.isArray(candidate.policyRows || candidate.policy_rows)
    ? (candidate.policyRows || candidate.policy_rows)
    : [];
  const active = candidate.active === true
    ? true
    : candidate.active === false
      ? false
      : policyRows.length > 0 && candidate.disabled !== true;
  return {
    ...candidate,
    active,
    policyRows,
  };
}

function renderPressureProvenanceDispatchFeedbackPolicy(policy: any = {}) {
  if (!policy?.schema || policy.active === false) return "";
  const rows = Array.isArray(policy.policyRows || policy.policy_rows)
    ? (policy.policyRows || policy.policy_rows).slice(0, 4)
    : [];
  const fields = Array.isArray(policy.requiredReceiptFields || policy.required_receipt_fields)
    ? (policy.requiredReceiptFields || policy.required_receipt_fields)
    : [];
  return [
    `Pressure provenance dispatch feedback policy：agentType=${policy.agentType || policy.agent_type || "unknown"}；project=${policy.targetProject || policy.target_project || "unknown"}；severity=${policy.severity || "medium"}；action=${policy.action || "strengthen_pressure_memory_provenance_receipt_contract"}`,
    "- This executor/project has historical post-dispatch pressure provenance receipt violations; ACK must acknowledge memoryProvenanceUsage and final receipts must be reviewed before closing.",
    fields.length ? `- Required receipt fields: ${fields.join(", ")}.` : "",
    policy.closeGate ? `- Close gate: ${policy.closeGate || policy.close_gate}.` : "",
    ...rows.map((row: any) => [
      `- historical agentType=${row.agent_type || row.agentType || "unknown"}`,
      `project=${row.project || "unknown"}`,
      `violations=${row.violation_count || row.violationCount || 0}`,
      Number(row.recovery_credit || row.recoveryCredit || 0) > 0 ? `recoveryCredit=${row.recovery_credit || row.recoveryCredit || 0}` : "",
      (row.effective_violation_count ?? row.effectiveViolationCount) !== undefined ? `effectiveViolations=${row.effective_violation_count ?? row.effectiveViolationCount}` : "",
      row.relapsed === true ? `relapsed=true` : "",
      Number(row.post_recovery_violation_count || row.postRecoveryViolationCount || 0) > 0 ? `postRecoveryViolations=${row.post_recovery_violation_count || row.postRecoveryViolationCount || 0}` : "",
      `missingMemoryProvenanceUsage=${row.missing_memory_provenance_usage_count || row.missingMemoryProvenanceUsageCount || 0}`,
      `currentSourceVerifiedGap=${row.current_source_verified_gap_count || row.currentSourceVerifiedGapCount || 0}`,
    ].filter(Boolean).join("；")),
  ].filter(Boolean).join("\n");
}

function extractPressureProvenanceProviderDispatchAdvisory(memory: any = {}, fallback: any = null) {
  const candidate = fallback
    || memory?.pressure_provenance_provider_dispatch_advisory
    || memory?.pressureProvenanceProviderDispatchAdvisory
    || memory?.pressure_provenance_feedback_provider_dispatch_advisory
    || memory?.pressureProvenanceFeedbackProviderDispatchAdvisory
    || memory?.group_state?.typedMemory?.pressureProvenanceProviderDispatchAdvisory
    || memory?.group_state?.typed_memory?.pressure_provenance_provider_dispatch_advisory
    || memory?.typedMemory?.pressureProvenanceProviderDispatchAdvisory
    || null;
  if (!candidate?.schema) return null;
  const selected = candidate.selected_candidate || candidate.selectedCandidate || candidate.current_candidate || candidate.currentCandidate || candidate;
  const dispatchPolicy = String(selected.dispatch_policy || selected.dispatchPolicy || candidate.dispatch_policy || candidate.dispatchPolicy || "");
  return {
    ...candidate,
    selected_candidate: selected,
    dispatch_policy: dispatchPolicy || "normal_dispatch",
    should_hold_dispatch: candidate.should_hold_dispatch === true
      || candidate.shouldHoldDispatch === true
      || selected.should_hold_dispatch === true
      || selected.shouldHoldDispatch === true
      || dispatchPolicy === "hold_until_repair",
  };
}

function renderPressureProvenanceProviderDispatchAdvisory(advisory: any = {}) {
  if (!advisory?.schema) return "";
  const selected = advisory.selected_candidate || advisory.selectedCandidate || advisory.current_candidate || advisory.currentCandidate || advisory;
  const alternatives = Array.isArray(advisory.safer_alternatives || advisory.saferAlternatives)
    ? (advisory.safer_alternatives || advisory.saferAlternatives).slice(0, 4)
    : [];
  const openRepairIds = Array.isArray(selected.current_open_repair_item_ids || selected.currentOpenRepairItemIds)
    ? (selected.current_open_repair_item_ids || selected.currentOpenRepairItemIds).slice(0, 6)
    : [];
  const reliabilitySnapshot = advisory.provider_reliability_snapshot || advisory.providerReliabilitySnapshot || null;
  const selectedRankingProvenance = selected.provider_ranking_provenance || selected.providerRankingProvenance || {};
  const selectedTypedMemoryRelPaths = Array.isArray(selectedRankingProvenance.typed_memory_rel_paths || selectedRankingProvenance.typedMemoryRelPaths)
    ? (selectedRankingProvenance.typed_memory_rel_paths || selectedRankingProvenance.typedMemoryRelPaths).slice(0, 4)
    : [];
  const selectedTypedMemoryRowIds = Array.isArray(selectedRankingProvenance.typed_memory_row_ids || selectedRankingProvenance.typedMemoryRowIds)
    ? (selectedRankingProvenance.typed_memory_row_ids || selectedRankingProvenance.typedMemoryRowIds).slice(0, 4)
    : [];
  return [
    `Pressure provenance provider dispatch advisory：agentType=${selected.agent_type || selected.agentType || advisory.agent_type || advisory.agentType || "unknown"}；project=${selected.project || advisory.project || "unknown"}；health=${selected.health_status || selected.healthStatus || advisory.health_status || advisory.healthStatus || "unknown"}；policy=${selected.dispatch_policy || selected.dispatchPolicy || advisory.dispatch_policy || advisory.dispatchPolicy || "normal_dispatch"}`,
    advisory.should_hold_dispatch === true || advisory.shouldHoldDispatch === true || selected.dispatch_policy === "hold_until_repair" || selected.dispatchPolicy === "hold_until_repair"
      ? "- Pre-dispatch hold: do not launch this child-agent runner until pressure provenance repair/recovery closes the critical state."
      : "",
    selected.dispatch_recommendation || selected.dispatchRecommendation ? `- Recommendation: ${selected.dispatch_recommendation || selected.dispatchRecommendation}.` : "",
    Number(selected.effective_violation_count || selected.effectiveViolationCount || 0) > 0 ? `- effectiveViolations=${selected.effective_violation_count || selected.effectiveViolationCount || 0}; recoveryCredit=${selected.recovery_credit || selected.recoveryCredit || 0}; relapsed=${selected.relapsed === true}.` : "",
    Number(selected.provider_override_followup_receipt_validation_attempt_count || selected.providerOverrideFollowupReceiptValidationAttemptCount || 0) > 0
      ? `- Corrected receipt validation history: attempts=${selected.provider_override_followup_receipt_validation_attempt_count || selected.providerOverrideFollowupReceiptValidationAttemptCount || 0}; failed=${selected.provider_override_followup_receipt_validation_failed_count || selected.providerOverrideFollowupReceiptValidationFailedCount || 0}; passed=${selected.provider_override_followup_receipt_validation_passed_count || selected.providerOverrideFollowupReceiptValidationPassedCount || 0}; consecutiveFailures=${selected.provider_override_followup_receipt_validation_consecutive_failure_count || selected.providerOverrideFollowupReceiptValidationConsecutiveFailureCount || 0}; escalated=${selected.provider_override_followup_receipt_validation_escalated === true || selected.providerOverrideFollowupReceiptValidationEscalated === true}; repairVerified=${selected.provider_override_followup_receipt_validation_repair_verified === true || selected.providerOverrideFollowupReceiptValidationRepairVerified === true}.`
      : "",
    Number(selected.provider_switch_execution_executed_count || selected.providerSwitchExecutionExecutedCount || 0) > 0
      ? `- Provider switch execution history: executed=${selected.provider_switch_execution_executed_count || selected.providerSwitchExecutionExecutedCount || 0}; passed=${selected.provider_switch_execution_passed_count || selected.providerSwitchExecutionPassedCount || 0}; failed=${selected.provider_switch_execution_failed_count || selected.providerSwitchExecutionFailedCount || 0}; mismatch=${selected.provider_switch_execution_mismatch_count || selected.providerSwitchExecutionMismatchCount || 0}; escalated=${selected.provider_switch_execution_mismatch_escalated === true || selected.providerSwitchExecutionMismatchEscalated === true}; decayedRisk=${selected.provider_switch_execution_weighted_risk_score || selected.providerSwitchExecutionWeightedRiskScore || 0}; riskScore=${selected.provider_switch_execution_risk_score || selected.providerSwitchExecutionRiskScore || 0}; rankPenalty=${selected.local_execution_rank_penalty || selected.localExecutionRankPenalty || 0}; actualProviders=${(selected.provider_switch_execution_actual_providers || selected.providerSwitchExecutionActualProviders || []).slice(0, 6).join(",") || "unknown"}. Passed history is not future switch authorization.`
      : "",
    selectedTypedMemoryRelPaths.length || selectedTypedMemoryRowIds.length
      ? `- Provider ranking provenance: memory=${selectedTypedMemoryRelPaths.join(",") || "unknown"}; rows=${selectedTypedMemoryRowIds.join(",") || "unknown"}; compactSafe=true.`
      : "",
    selected.cross_group_provider_reliability_actionable === true || selected.crossGroupProviderReliabilityActionable === true
      ? `- Cross-group provider reliability guidance: risk=${selected.cross_group_provider_reliability_risk_status || selected.crossGroupProviderReliabilityRiskStatus || "unknown"}; score=${selected.cross_group_provider_reliability_risk_score || selected.crossGroupProviderReliabilityRiskScore || 0}; confidence=${selected.cross_group_provider_reliability_confidence || selected.crossGroupProviderReliabilityConfidence || 0}; sourceGroups=${selected.cross_group_provider_reliability_source_group_count || selected.crossGroupProviderReliabilitySourceGroupCount || 0}; guidanceOnly=true; localPolicyOverrideAllowed=false; no private group memory is included.`
      : "",
    reliabilitySnapshot?.snapshot_id
      ? `- Provider reliability snapshot: id=${reliabilitySnapshot.snapshot_id}; generation=${reliabilitySnapshot.generation_id || "unknown"}; status=${reliabilitySnapshot.status || "unknown"}; expires=${reliabilitySnapshot.expires_at || "unknown"}; checksum=${reliabilitySnapshot.snapshot_checksum || "missing"}.`
      : "",
    openRepairIds.length ? `- Open repair work items: ${openRepairIds.join(", ")}.` : "",
    alternatives.length ? `- Safer alternatives: ${alternatives.map((item: any) => {
      const provenance = item.provider_ranking_provenance || item.providerRankingProvenance || {};
      const relPaths = Array.isArray(provenance.typed_memory_rel_paths || provenance.typedMemoryRelPaths) ? (provenance.typed_memory_rel_paths || provenance.typedMemoryRelPaths).slice(0, 2).join(",") : "";
      const rowIds = Array.isArray(provenance.typed_memory_row_ids || provenance.typedMemoryRowIds) ? (provenance.typed_memory_row_ids || provenance.typedMemoryRowIds).slice(0, 2).join(",") : "";
      return `${item.agent_type || item.agentType || "unknown"}(${item.local_health_status || item.localHealthStatus || item.health_status || item.healthStatus || "healthy"}; risk=${item.global_risk_status || item.globalRiskStatus || "empty"}; rank=${item.composite_rank || item.compositeRank || 0}<${item.selected_composite_rank || item.selectedCompositeRank || 0}; execPenalty=${item.local_execution_rank_penalty || item.localExecutionRankPenalty || 0}; execRisk=${item.provider_switch_execution_weighted_risk_score || item.providerSwitchExecutionWeightedRiskScore || 0}; mem=${relPaths || "none"}; rows=${rowIds || "none"}; configured=${item.configured === true})`;
    }).join(", ")}. Current assignment is unchanged.` : "",
  ].filter(Boolean).join("\n");
}

function renderProviderSwitchDecisionReceipt(receipt: any = {}) {
  if (receipt?.schema !== "ccm-provider-switch-decision-receipt-v1") return "";
  const oldProvider = receipt.old_provider || receipt.oldProvider || {};
  const newProvider = receipt.new_provider || receipt.newProvider || {};
  const snapshot = receipt.provider_reliability_snapshot || receipt.providerReliabilitySnapshot || {};
  const authority = receipt.authority || {};
  const compatibility = receipt.task_compatibility || receipt.taskCompatibility || {};
  const rankingProvenance = receipt.provider_ranking_provenance || receipt.providerRankingProvenance || {};
  const requestedProvenance = rankingProvenance.requested_candidate || rankingProvenance.requestedCandidate || newProvider.provider_ranking_provenance || newProvider.providerRankingProvenance || {};
  const rankingRelPaths = Array.isArray(requestedProvenance.typed_memory_rel_paths || requestedProvenance.typedMemoryRelPaths)
    ? (requestedProvenance.typed_memory_rel_paths || requestedProvenance.typedMemoryRelPaths).slice(0, 4)
    : [];
  const rankingRowIds = Array.isArray(requestedProvenance.typed_memory_row_ids || requestedProvenance.typedMemoryRowIds)
    ? (requestedProvenance.typed_memory_row_ids || requestedProvenance.typedMemoryRowIds).slice(0, 4)
    : [];
  return [
    `Provider switch decision receipt: id=${receipt.receipt_id || receipt.receiptId || ""}; status=${receipt.status || "unknown"}; old=${oldProvider.agent_type || oldProvider.agentType || "unknown"}; new=${newProvider.agent_type || newProvider.agentType || "unknown"}; project=${receipt.project || newProvider.project || "unknown"}.`,
    `- Snapshot: id=${snapshot.snapshot_id || snapshot.snapshotId || "missing"}; generation=${snapshot.generation_id || snapshot.generationId || "missing"}; status=${snapshot.status || "missing"}; checksum=${snapshot.snapshot_checksum || snapshot.snapshotChecksum || "missing"}; expires=${snapshot.expires_at || snapshot.expiresAt || "missing"}.`,
    `- Task compatibility: confirmed=${compatibility.confirmed === true}; evidence=${Array.isArray(compatibility.evidence) ? compatibility.evidence.slice(0, 4).join("; ") : "missing"}.`,
    `- Authority: kind=${authority.kind || "missing"}; approved=${authority.approved === true}; localPolicyAuthority=${authority.local_policy_authority === true || authority.localPolicyAuthority === true}.`,
    rankingRelPaths.length || rankingRowIds.length
      ? `- Ranking provenance: memory=${rankingRelPaths.join(",") || "unknown"}; rows=${rankingRowIds.join(",") || "unknown"}; candidateRank=${newProvider.composite_rank || newProvider.compositeRank || 0}; selectedRank=${newProvider.selected_composite_rank || newProvider.selectedCompositeRank || 0}; compactSafe=${rankingProvenance.compact_safe === true || rankingProvenance.compactSafe === true}.`
      : "",
    receipt.valid === true && receipt.status === "approved"
      ? "- This is an approved explicit provider switch. The child session must bind this receipt, and the final CCM_AGENT_RECEIPT must preserve the system-attested executed provider."
      : "- This provider switch is not valid. Do not execute the proposed alternative as an approved switch.",
  ].filter(Boolean).join("\n");
}

function extractProviderRankingCompactRepairReceiptMemoryContract(memory: any = {}, fallback: any = null) {
  const candidate = fallback
    || memory?.provider_ranking_compact_repair_receipt_memory_contract
    || memory?.providerRankingCompactRepairReceiptMemoryContract
    || memory?.provider_ranking_compact_repair_receipt_recall
    || memory?.providerRankingCompactRepairReceiptRecall
    || memory?.group_state?.typedMemory?.providerRankingCompactRepairReceiptRecall
    || memory?.group_state?.typed_memory?.provider_ranking_compact_repair_receipt_recall
    || memory?.typedMemory?.providerRankingCompactRepairReceiptRecall
    || null;
  if (!candidate?.schema && !candidate?.docRelPath && !candidate?.doc_rel_path) return null;
  const active = candidate.active === true
    || candidate.recalledThisTurn === true
    || candidate.recalled_this_turn === true
    || Number(candidate.archivedCount || candidate.archived_count || 0) > 0;
  const docRelPath = String(candidate.docRelPath || candidate.doc_rel_path || "provider-ranking-provenance-compact-repair-receipt-memory.md").trim();
  const typedMemoryRelPaths = Array.isArray(candidate.typedMemoryRelPaths || candidate.typed_memory_rel_paths)
    ? (candidate.typedMemoryRelPaths || candidate.typed_memory_rel_paths).map((item: any) => String(item || "").trim()).filter(Boolean).slice(0, 12)
    : [];
  const typedMemoryRowIds = Array.isArray(candidate.typedMemoryRowIds || candidate.typed_memory_row_ids)
    ? (candidate.typedMemoryRowIds || candidate.typed_memory_row_ids).map((item: any) => String(item || "").trim()).filter(Boolean).slice(0, 12)
    : [];
  const receiptIds = Array.isArray(candidate.receiptIds || candidate.receipt_ids)
    ? (candidate.receiptIds || candidate.receipt_ids).map((item: any) => String(item || "").trim()).filter(Boolean).slice(0, 8)
    : [];
  const receiptChecksums = Array.isArray(candidate.receiptChecksums || candidate.receipt_checksums)
    ? (candidate.receiptChecksums || candidate.receipt_checksums).map((item: any) => String(item || "").trim()).filter(Boolean).slice(0, 8)
    : [];
  const targetPaths = uniqueRuntimeStrings([
    candidate.targetPaths,
    candidate.target_paths,
    candidate.repeatableRelPaths,
    candidate.repeatable_rel_paths,
  ], 24);
  const memoryUsageReceiptDocRelPaths = uniqueRuntimeStrings([
    candidate.memoryUsageReceiptDocRelPaths,
    candidate.memory_usage_receipt_doc_rel_paths,
  ], 12);
  const memoryUsageReceiptDisciplineRelPaths = uniqueRuntimeStrings([
    candidate.memoryUsageReceiptDisciplineRelPaths,
    candidate.memory_usage_receipt_discipline_rel_paths,
    targetPaths.filter((item: string) => item === "provider-ranking-memory-usage-receipt-discipline.md"),
  ], 8);
  if (!active || !docRelPath) return null;
  return {
    schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
    version: 1,
    active: true,
    source_schema: candidate.schema || "",
    doc_rel_path: docRelPath,
    archived_count: Number(candidate.archivedCount || candidate.archived_count || 0),
    recalled_this_turn: candidate.recalledThisTurn === true || candidate.recalled_this_turn === true,
    required_receipt_fields: ["memoryUsed", "memoryIgnored"],
    allowed_usage_states: ["used", "verified", "ignored", "background"],
    typed_memory_rel_paths: typedMemoryRelPaths,
    typed_memory_row_ids: typedMemoryRowIds,
    receipt_ids: receiptIds,
    receipt_checksums: receiptChecksums,
    memory_usage_receipt_doc_rel_paths: memoryUsageReceiptDocRelPaths,
    memory_usage_receipt_discipline_rel_paths: memoryUsageReceiptDisciplineRelPaths,
    memory_usage_receipt_discipline_required: memoryUsageReceiptDisciplineRelPaths.length > 0,
    memory_receipt_required_doc_rel_paths: uniqueRuntimeStrings([docRelPath, ...memoryUsageReceiptDisciplineRelPaths], 10),
    authorization_boundary: "provider switch execution history is ranking evidence only, not authorization; every explicit provider switch still requires a fresh valid provider switch decision receipt/checksum/local authority/task compatibility proof",
    memory_used_template: `${docRelPath}; usageState=verified|background; ranking evidence only, not authorization; fresh valid provider switch decision receipt required for any explicit switch`,
    memory_ignored_template: `${docRelPath}; usageState=ignored; reason=<why this recalled memory was not used>; ranking evidence only, not authorization`,
  };
}

function renderProviderRankingCompactRepairReceiptMemoryContract(contract: any = {}) {
  if (!contract?.schema || contract.active === false) return "";
  const relPaths = Array.isArray(contract.typed_memory_rel_paths || contract.typedMemoryRelPaths)
    ? (contract.typed_memory_rel_paths || contract.typedMemoryRelPaths).slice(0, 6)
    : [];
  const rowIds = Array.isArray(contract.typed_memory_row_ids || contract.typedMemoryRowIds)
    ? (contract.typed_memory_row_ids || contract.typedMemoryRowIds).slice(0, 6)
    : [];
  const disciplineRelPaths = uniqueRuntimeStrings([
    contract.memory_usage_receipt_discipline_rel_paths,
    contract.memoryUsageReceiptDisciplineRelPaths,
  ], 6);
  const requiredReceiptDocRelPaths = uniqueRuntimeStrings([
    contract.memory_receipt_required_doc_rel_paths,
    contract.memoryReceiptRequiredDocRelPaths,
    contract.doc_rel_path || contract.docRelPath || "provider-ranking-provenance-compact-repair-receipt-memory.md",
  ], 10);
  return [
    `Provider ranking compact repair receipt memory usage contract：doc=${contract.doc_rel_path || contract.docRelPath || "provider-ranking-provenance-compact-repair-receipt-memory.md"}；archived=${contract.archived_count || contract.archivedCount || 0}；recalled=${contract.recalled_this_turn === true || contract.recalledThisTurn === true}.`,
    "- Final CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored must cite this doc relPath and declare used/verified/ignored/background.",
    disciplineRelPaths.length ? `- Receipt discipline typed MEMORY.md surfaced: ${disciplineRelPaths.join(", ")}. Final CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored must also cite surfaced receipt discipline docs with usageState.` : "",
    requiredReceiptDocRelPaths.length ? `- Required receipt doc relPaths: ${requiredReceiptDocRelPaths.join(", ")}.` : "",
    "- Boundary: provider switch execution history is ranking evidence only, not authorization; any explicit provider switch still requires a fresh valid provider switch decision receipt/checksum/local authority/task compatibility proof.",
    relPaths.length || rowIds.length ? `- Compact-safe provenance anchors: relPaths=${relPaths.join(",") || "none"}; rowIds=${rowIds.join(",") || "none"}.` : "",
    contract.memory_used_template ? `- memoryUsed template: ${contract.memory_used_template}` : "",
    contract.memory_ignored_template ? `- memoryIgnored template: ${contract.memory_ignored_template}` : "",
  ].filter(Boolean).join("\n");
}

function extractPostCompactReinjectionRepairReceiptMemoryContract(memory: any = {}, fallback: any = null) {
  const candidate = fallback
    || memory?.post_compact_reinjection_repair_receipt_memory_contract
    || memory?.postCompactReinjectionRepairReceiptMemoryContract
    || memory?.post_compact_reinjection_repair_receipt_recall
    || memory?.postCompactReinjectionRepairReceiptRecall
    || memory?.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall
    || memory?.group_state?.typed_memory?.post_compact_reinjection_repair_receipt_recall
    || memory?.typedMemory?.postCompactReinjectionRepairReceiptRecall
    || null;
  if (!candidate?.schema && !candidate?.docRelPaths && !candidate?.doc_rel_paths) return null;
  const sourceSchema = String(candidate.schema || "");
  const recallSource = sourceSchema === "ccm-post-compact-reinjection-repair-receipt-worker-context-recall-v1";
  const recalledThisTurn = candidate.recalledThisTurn === true || candidate.recalled_this_turn === true;
  const active = candidate.active === true && (!recallSource || recalledThisTurn);
  const docRelPaths = uniqueRuntimeStrings([
    candidate.surfacedRelPaths,
    candidate.surfaced_rel_paths,
    candidate.docRelPaths,
    candidate.doc_rel_paths,
    candidate.docRelPath,
    candidate.doc_rel_path,
  ], 8);
  if (!active || !docRelPaths.length) return null;
  const rows = Array.isArray(candidate.rows) ? candidate.rows.slice(-12) : [];
  const sessionBinding = memory?.session_binding || memory?.sessionBinding || {};
  const gateIds = uniqueRuntimeStrings([
    candidate.gateIds,
    candidate.gate_ids,
    rows.map((row: any) => row.reinjection_gate_id || row.reinjectionGateId),
  ], 16);
  const candidateIds = uniqueRuntimeStrings([
    candidate.candidateIds,
    candidate.candidate_ids,
    rows.map((row: any) => row.post_compact_candidate_id || row.postCompactCandidateId),
  ], 16);
  const candidateValues = uniqueRuntimeStrings([
    candidate.candidateValues,
    candidate.candidate_values,
    rows.map((row: any) => row.post_compact_candidate_value || row.postCompactCandidateValue),
  ], 16);
  const completionDocRelPaths = uniqueRuntimeStrings([
    candidate.completionDocRelPaths,
    candidate.completion_doc_rel_paths,
    rows.filter((row: any) => row.row_kind === "receipt_memory_usage_repair_completion").flatMap((row: any) => row.required_doc_rel_paths || []),
  ], 12);
  const completionWorkItemIds = uniqueRuntimeStrings([
    candidate.completionWorkItemIds,
    candidate.completion_work_item_ids,
    rows.filter((row: any) => row.row_kind === "receipt_memory_usage_repair_completion").map((row: any) => row.work_item_id),
  ], 16);
  const completionTimelineBindingIds = uniqueRuntimeStrings([
    candidate.completionTimelineBindingIds,
    candidate.completion_timeline_binding_ids,
    rows.filter((row: any) => row.row_kind === "receipt_memory_usage_repair_completion").map((row: any) => row.timeline_binding_id),
  ], 16);
  const historicalTaskAgentSessionIds = uniqueRuntimeStrings([
    candidate.taskAgentSessionIds,
    candidate.task_agent_session_ids,
    candidate.originalTaskAgentSessionIds,
    candidate.original_task_agent_session_ids,
    candidate.repairTaskAgentSessionIds,
    candidate.repair_task_agent_session_ids,
    rows.map((row: any) => row.historical_task_agent_session_id || row.task_agent_session_id),
  ], 16);
  const historicalNativeSessionIds = uniqueRuntimeStrings([
    candidate.nativeSessionIds,
    candidate.native_session_ids,
    candidate.originalNativeSessionIds,
    candidate.original_native_session_ids,
    candidate.repairNativeSessionIds,
    candidate.repair_native_session_ids,
    rows.map((row: any) => row.historical_native_session_id || row.native_session_id),
  ], 16);
  return {
    schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1",
    version: 1,
    active: true,
    source_schema: sourceSchema,
    recalled_this_turn: recalledThisTurn,
    archived_count: Number(candidate.archivedCount || candidate.archived_count || rows.length || 0),
    doc_rel_paths: docRelPaths,
    memory_receipt_required_doc_rel_paths: docRelPaths,
    required_receipt_fields: ["memoryUsed", "memoryIgnored"],
    allowed_usage_states: ["used", "verified", "ignored"],
    used_current_source_verified_required: true,
    ignored_reason_required: true,
    freshness_boundary: "historical repair completion is recovery evidence, not permanent repository truth; future use must reverify the current source",
    current_session_binding_id: String(sessionBinding.binding_id || sessionBinding.bindingId || ""),
    current_task_agent_session_id: String(sessionBinding.task_agent_session_id || sessionBinding.taskAgentSessionId || ""),
    current_native_session_id: String(sessionBinding.native_session_id || sessionBinding.nativeSessionId || ""),
    reinjection_gate_ids: gateIds,
    post_compact_candidate_ids: candidateIds,
    post_compact_candidate_values: candidateValues,
    corrected_receipt_completion_memory_active: completionWorkItemIds.length > 0,
    corrected_receipt_completion_doc_rel_paths: completionDocRelPaths,
    corrected_receipt_completion_work_item_ids: completionWorkItemIds,
    corrected_receipt_completion_timeline_binding_ids: completionTimelineBindingIds,
    historical_task_agent_session_ids: historicalTaskAgentSessionIds,
    historical_native_session_ids: historicalNativeSessionIds,
    rows: rows.map((row: any) => ({
      row_id: row.row_id || "",
      row_kind: row.row_kind || "",
      reinjection_gate_id: row.reinjection_gate_id || "",
      post_compact_candidate_id: row.post_compact_candidate_id || "",
      post_compact_candidate_kind: row.post_compact_candidate_kind || "",
      post_compact_candidate_value: row.post_compact_candidate_value || "",
      usage_state: row.usage_state || "",
      work_item_id: row.work_item_id || "",
      timeline_binding_id: row.timeline_binding_id || "",
      original_worker_context_packet_id: row.original_worker_context_packet_id || "",
      required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
      coverage_rows: Array.isArray(row.coverage_rows) ? row.coverage_rows.slice(0, 8) : [],
      historical_task_agent_session_id: row.historical_task_agent_session_id || "",
      historical_native_session_id: row.historical_native_session_id || "",
      repair_task_agent_session_id: row.repair_task_agent_session_id || "",
      repair_native_session_id: row.repair_native_session_id || "",
      completion_source: row.completion_source || "",
      resolution_reason: row.resolution_reason || "",
    })),
    memory_used_templates: docRelPaths.map((relPath: string) =>
      `${relPath}; usageState=verified|used; currentSourceVerified=true; historical repair completion is recovery evidence, not permanent repository truth`
    ),
    memory_ignored_templates: docRelPaths.map((relPath: string) =>
      `${relPath}; usageState=ignored; reason=<why this recalled repair memory was not used>`
    ),
  };
}

function renderPostCompactReinjectionRepairReceiptMemoryContract(contract: any = {}) {
  if (!contract?.schema || contract.active === false) return "";
  const docRelPaths = uniqueRuntimeStrings([
    contract.doc_rel_paths,
    contract.docRelPaths,
    contract.memory_receipt_required_doc_rel_paths,
    contract.memoryReceiptRequiredDocRelPaths,
  ], 8);
  const gateIds = uniqueRuntimeStrings([contract.reinjection_gate_ids, contract.reinjectionGateIds], 8);
  const candidateIds = uniqueRuntimeStrings([contract.post_compact_candidate_ids, contract.postCompactCandidateIds], 8);
  const completionWorkItemIds = uniqueRuntimeStrings([contract.corrected_receipt_completion_work_item_ids, contract.correctedReceiptCompletionWorkItemIds], 8);
  const completionTimelineBindingIds = uniqueRuntimeStrings([contract.corrected_receipt_completion_timeline_binding_ids, contract.correctedReceiptCompletionTimelineBindingIds], 8);
  const historicalTaskSessions = uniqueRuntimeStrings([contract.historical_task_agent_session_ids, contract.historicalTaskAgentSessionIds], 6);
  const historicalNativeSessions = uniqueRuntimeStrings([contract.historical_native_session_ids, contract.historicalNativeSessionIds], 6);
  return [
    `Post-compact reinjection repair receipt memory usage contract：docs=${docRelPaths.join(",") || "none"}；archived=${contract.archived_count || contract.archivedCount || 0}；recalled=${contract.recalled_this_turn === true || contract.recalledThisTurn === true}.`,
    "- Final CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored must cite every surfaced receipt MEMORY.md.",
    "- memoryUsed with usageState=used/verified requires currentSourceVerified=true in this new child Agent session.",
    "- memoryIgnored with usageState=ignored requires an explicit reason.",
    "- Freshness boundary: historical repair completion is recovery evidence, not permanent repository truth; future use must reverify the current source.",
    contract.current_session_binding_id ? `- Current child session binding: ${contract.current_session_binding_id}; task_agent_session=${contract.current_task_agent_session_id || ""}; native_session=${contract.current_native_session_id || ""}.` : "",
    gateIds.length || candidateIds.length ? `- Historical repair identities: gates=${gateIds.join(",") || "none"}; candidates=${candidateIds.join(",") || "none"}.` : "",
    completionWorkItemIds.length || completionTimelineBindingIds.length ? `- Corrected-receipt completion identities: work_items=${completionWorkItemIds.join(",") || "none"}; timelines=${completionTimelineBindingIds.join(",") || "none"}.` : "",
    historicalTaskSessions.length || historicalNativeSessions.length ? `- Historical sessions are evidence only: task_agent_sessions=${historicalTaskSessions.join(",") || "none"}; native_sessions=${historicalNativeSessions.join(",") || "none"}.` : "",
    contract.corrected_receipt_completion_memory_active === true ? "- Historical original/repair sessions never authorize this child Agent session; bind the new memoryUsed/memoryIgnored decision to the current task/native session." : "",
    ...(Array.isArray(contract.memory_used_templates) ? contract.memory_used_templates.slice(0, 4).map((item: any) => `- memoryUsed template: ${item}`) : []),
    ...(Array.isArray(contract.memory_ignored_templates) ? contract.memory_ignored_templates.slice(0, 4).map((item: any) => `- memoryIgnored template: ${item}`) : []),
  ].filter(Boolean).join("\n");
}

function providerOverrideFollowupStringList(value: any, limit = 8) {
  const raw = Array.isArray(value)
    ? value
    : value === undefined || value === null || value === "" ? [] : [value];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const text = String(item || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function extractPressureProvenanceProviderDispatchOverrideFollowupReceiptContract(memory: any = {}, fallback: any = null, advisoryInput: any = null) {
  const direct = fallback
    || memory?.pressure_provenance_provider_dispatch_override_followup_receipt_contract
    || memory?.pressureProvenanceProviderDispatchOverrideFollowupReceiptContract
    || memory?.group_state?.typedMemory?.pressureProvenanceProviderDispatchOverrideFollowupReceiptContract
    || memory?.group_state?.typed_memory?.pressure_provenance_provider_dispatch_override_followup_receipt_contract
    || null;
  const advisory = extractPressureProvenanceProviderDispatchAdvisory(memory, advisoryInput);
  const selected = advisory?.selected_candidate || advisory?.selectedCandidate || advisory || {};
  const dispatchPolicy = String(
    selected.dispatch_policy
    || selected.dispatchPolicy
    || advisory?.dispatch_policy
    || advisory?.dispatchPolicy
    || direct?.dispatch_policy
    || direct?.dispatchPolicy
    || ""
  ).trim();
  const repaired = direct?.active === true
    || direct?.provider_override_followup_repaired === true
    || direct?.providerOverrideFollowupRepaired === true
    || selected.provider_override_followup_repaired === true
    || selected.providerOverrideFollowupRepaired === true;
  const shouldHold = advisory?.should_hold_dispatch === true
    || advisory?.shouldHoldDispatch === true
    || selected.should_hold_dispatch === true
    || selected.shouldHoldDispatch === true
    || dispatchPolicy === "hold_until_repair";
  const samplingPolicy = dispatchPolicy === "allow_with_receipt_sampling"
    || direct?.sampling_required === true
    || direct?.samplingRequired === true;
  const active = repaired && !shouldHold && samplingPolicy;
  if (!active && !direct?.schema) return null;
  const relPaths = providerOverrideFollowupStringList(
    direct?.rel_paths || direct?.relPaths || selected.provider_override_followup_rel_paths || selected.providerOverrideFollowupRelPaths,
    12
  );
  const workItemIds = providerOverrideFollowupStringList(
    direct?.followup_work_item_ids || direct?.followupWorkItemIds || selected.provider_override_followup_work_item_ids || selected.providerOverrideFollowupWorkItemIds,
    12
  );
  const overrideIds = providerOverrideFollowupStringList(
    direct?.override_ids || direct?.overrideIds || selected.provider_override_followup_override_ids || selected.providerOverrideFollowupOverrideIds,
    12
  );
  const exampleRows = relPaths.slice(0, 3).map((relPath, index) => ({
    relPath,
    usageState: "verified",
    repairStatus: "completed",
    repairGapType: "provider_dispatch_override_followup",
    repairWorkItemId: workItemIds[index] || workItemIds[0] || "",
    currentSourceVerified: true,
    providerDispatchOverrideFollowupHistoryReverified: true,
    providerDispatchOverrideId: overrideIds[index] || overrideIds[0] || "",
  }));
  return {
    schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1",
    version: 1,
    active,
    source: direct?.source || "typed-feedback:provider-dispatch-override-followup-repaired-history",
    agent_type: direct?.agent_type || direct?.agentType || selected.agent_type || selected.agentType || advisory?.agent_type || advisory?.agentType || "unknown",
    project: direct?.project || selected.project || advisory?.project || "unknown",
    health_status: direct?.health_status || direct?.healthStatus || selected.health_status || selected.healthStatus || advisory?.health_status || advisory?.healthStatus || "",
    dispatch_policy: dispatchPolicy || "allow_with_receipt_sampling",
    sampling_required: active,
    receipt_required: active,
    memory_provenance_usage_required: active,
    current_source_verification_required: active,
    provider_override_followup_repaired: repaired,
    provider_override_followup_repaired_count: Number(direct?.provider_override_followup_repaired_count || direct?.providerOverrideFollowupRepairedCount || selected.provider_override_followup_repaired_count || selected.providerOverrideFollowupRepairedCount || 0),
    provider_override_followup_memory_provenance_usage_count: Number(direct?.provider_override_followup_memory_provenance_usage_count || direct?.providerOverrideFollowupMemoryProvenanceUsageCount || selected.provider_override_followup_memory_provenance_usage_count || selected.providerOverrideFollowupMemoryProvenanceUsageCount || 0),
    provider_override_followup_current_source_verified_count: Number(direct?.provider_override_followup_current_source_verified_count || direct?.providerOverrideFollowupCurrentSourceVerifiedCount || selected.provider_override_followup_current_source_verified_count || selected.providerOverrideFollowupCurrentSourceVerifiedCount || 0),
    provider_override_followup_last_completed_at: direct?.provider_override_followup_last_completed_at || direct?.providerOverrideFollowupLastCompletedAt || selected.provider_override_followup_last_completed_at || selected.providerOverrideFollowupLastCompletedAt || "",
    provider_override_followup_fresh_after_last_violation: direct?.provider_override_followup_fresh_after_last_violation === true
      || direct?.providerOverrideFollowupFreshAfterLastViolation === true
      || selected.provider_override_followup_fresh_after_last_violation === true
      || selected.providerOverrideFollowupFreshAfterLastViolation === true,
    rel_paths: relPaths,
    followup_work_item_ids: workItemIds,
    override_ids: overrideIds,
    required_receipt_fields: [
      "memoryProvenanceUsage",
      "relPath",
      "usageState",
      "repairStatus",
      "repairGapType",
      "currentSourceVerified",
      "providerDispatchOverrideFollowupHistoryReverified",
      "providerDispatchOverrideId",
    ],
    exampleRows,
  };
}

function renderPressureProvenanceProviderDispatchOverrideFollowupReceiptContract(contract: any = {}) {
  if (!contract?.schema || contract.active === false) return "";
  const relPaths = providerOverrideFollowupStringList(contract.rel_paths || contract.relPaths, 8);
  const workItemIds = providerOverrideFollowupStringList(contract.followup_work_item_ids || contract.followupWorkItemIds, 8);
  const overrideIds = providerOverrideFollowupStringList(contract.override_ids || contract.overrideIds, 8);
  const fields = providerOverrideFollowupStringList(contract.required_receipt_fields || contract.requiredReceiptFields, 12);
  const examples = Array.isArray(contract.exampleRows || contract.example_rows)
    ? (contract.exampleRows || contract.example_rows).slice(0, 3)
    : [];
  return [
    `Provider dispatch override follow-up receipt contract：agentType=${contract.agent_type || contract.agentType || "unknown"}；project=${contract.project || "unknown"}；policy=${contract.dispatch_policy || contract.dispatchPolicy || "allow_with_receipt_sampling"}；repaired=${contract.provider_override_followup_repaired_count || contract.providerOverrideFollowupRepairedCount || 0}`,
    "- This child-agent dispatch is allowed with receipt sampling because previous provider override follow-up repair was verified. Recheck current source evidence before relying on that repaired history.",
    "- Final CCM_AGENT_RECEIPT must include memoryProvenanceUsage rows for the repaired-history evidence it uses, with currentSourceVerified=true.",
    "- Set providerDispatchOverrideFollowupHistoryReverified=true on each relevant memoryProvenanceUsage row.",
    fields.length ? `- Required receipt fields: ${fields.join(", ")}.` : "",
    relPaths.length ? `- Reverify relPath: ${relPaths.join(", ")}.` : "",
    workItemIds.length ? `- Follow-up work items: ${workItemIds.join(", ")}.` : "",
    overrideIds.length ? `- Override ids: ${overrideIds.join(", ")}.` : "",
    examples.length ? `- Example CCM_AGENT_RECEIPT.memoryProvenanceUsage=${JSON.stringify(examples)}` : "",
  ].filter(Boolean).join("\n");
}

function normalizeWorkerMemoryPolicy(input: any = {}, memory: any = null) {
  const raw = input.memoryPolicy || input.memory_policy || (memory && typeof memory === "object" ? (memory.memory_policy || memory.memoryPolicy) : null) || {};
  const ignored = raw.ignored === true || raw.ignore === true || raw.use === "must_not_use_group_memory";
  if (!ignored && !raw.use && !raw.ignore_reason && !raw.ignoreReason) {
    return {
      schema: "ccm-worker-context-memory-policy-v1",
      ignored: false,
      use: memory ? "use_injected_memory" : "no_memory_available",
      reason: memory ? "memory_context_injected" : "no_memory_context",
      receipt_required: false,
    };
  }
  return {
    schema: "ccm-worker-context-memory-policy-v1",
    ignored,
    use: String(raw.use || (ignored ? "must_not_use_group_memory" : "use_injected_memory")),
    reason: String(raw.ignore_reason || raw.ignoreReason || raw.reason || (ignored ? "user_requested_ignore_memory" : "memory_context_injected")),
    priority: String(raw.priority || (ignored ? "user_ignore_memory_request_over_platform_memory" : "")),
    boundary: String(raw.boundary || "current_worker_context_packet"),
    receipt_required: ignored || raw.receipt_required === true || raw.receiptRequired === true,
  };
}

function renderWorkerMemoryPolicy(policy: any = {}) {
  if (!policy?.schema) return "";
  if (policy.ignored === true) {
    return [
      `Memory policy：ignored；reason=${policy.reason || "user_requested_ignore_memory"}；use=${policy.use || "must_not_use_group_memory"}`,
      "- 本轮必须把平台记忆、typed MEMORY.md recall、全局记忆当作空；只能使用当前任务文本、用户本轮显式内容和实时检查证据。",
      "- 回执 CCM_AGENT_RECEIPT.memoryIgnored 必须声明该 reason；不得引用任何历史 memory id、摘要或旧会话结论。",
    ].join("\n");
  }
  return `Memory policy：${policy.use || "use_injected_memory"}；reason=${policy.reason || "memory_context_injected"}`;
}

function compactWorkerMemoryText(value: any, max = 2400) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, Math.ceil(max * 0.58)).trimEnd()}\n...[memory-context-compact omitted ${Math.max(0, text.length - max)} chars]...\n${text.slice(-Math.floor(max * 0.25)).trimStart()}`;
}

function compactWorkerMemoryObject(value: any, options: any = {}) {
  if (!value || typeof value !== "object") return value;
  const maxRenderedChars = Math.max(600, Number(options.maxRenderedChars || options.max_rendered_chars || 2400));
  const maxJsonChars = Math.max(500, Number(options.maxJsonChars || options.max_json_chars || 1600));
  const maxRecallItems = Math.max(1, Number(options.maxRecallItems || options.max_recall_items || 8));
  const clone: any = Array.isArray(value) ? value.slice(0, maxRecallItems) : { ...value };
  const compactField = (key: string, max = maxRenderedChars) => {
    if (typeof clone[key] === "string") clone[key] = compactWorkerMemoryText(clone[key], max);
  };
  compactField("rendered_text");
  compactField("renderedText");
  compactField("summary", Math.max(500, Math.floor(maxRenderedChars * 0.55)));
  compactField("global_mission_memory", Math.max(500, Math.floor(maxRenderedChars * 0.45)));
  compactField("globalMissionMemory", Math.max(500, Math.floor(maxRenderedChars * 0.45)));
  for (const key of ["typed_memory_recall", "typedMemoryRecall", "typed_memory", "typedMemory", "global_memory", "globalMemory", "global_agent_memory_recall", "globalAgentMemoryRecall"]) {
    const current = clone[key];
    if (Array.isArray(current)) clone[key] = current.slice(0, maxRecallItems);
    else if (typeof current === "string") clone[key] = compactWorkerMemoryText(current, maxJsonChars);
    else if (current && typeof current === "object") {
      const nested = { ...current };
      for (const nestedKey of Object.keys(nested)) {
        if (Array.isArray(nested[nestedKey])) nested[nestedKey] = nested[nestedKey].slice(0, maxRecallItems);
        else if (typeof nested[nestedKey] === "string") nested[nestedKey] = compactWorkerMemoryText(nested[nestedKey], maxJsonChars);
      }
      clone[key] = nested;
    }
  }
  if (clone.group_memory || clone.groupMemory) {
    const key = clone.group_memory ? "group_memory" : "groupMemory";
    clone[key] = compactWorkerMemoryObject(clone[key], {
      ...options,
      maxRenderedChars: Math.max(500, Math.floor(maxRenderedChars * 0.7)),
      maxJsonChars: Math.max(400, Math.floor(maxJsonChars * 0.7)),
    });
  }
  return clone;
}

export function compactWorkerContextMemoryForRetry(memory: any, options: any = {}) {
  if (!memory) return { compacted: false, memory, summary: null };
  const beforeText = typeof memory === "string" ? memory : JSON.stringify(memory || {});
  const maxRenderedChars = Math.max(600, Number(options.maxRenderedChars || options.max_rendered_chars || 2400));
  const compactedMemory = typeof memory === "string"
    ? compactWorkerMemoryText(memory, maxRenderedChars)
    : compactWorkerMemoryObject(memory, options);
  const afterText = typeof compactedMemory === "string" ? compactedMemory : JSON.stringify(compactedMemory || {});
  const compacted = afterText.length < beforeText.length;
  const summary = compacted ? {
    schema: "ccm-worker-context-memory-first-compaction-v1",
    method: "memory_fields_head_tail_and_recall_limit",
    status: "compacted",
    original_memory_hash: hash(beforeText, 24),
    compacted_memory_hash: hash(afterText, 24),
    original_memory_chars: beforeText.length,
    compacted_memory_chars: afterText.length,
    omitted_chars: Math.max(0, beforeText.length - afterText.length),
    max_rendered_chars: maxRenderedChars,
    max_recall_items: Math.max(1, Number(options.maxRecallItems || options.max_recall_items || 8)),
    preserves_schema: typeof memory === "object" && !!memory?.schema,
  } : null;
  return { compacted, memory: compactedMemory, summary };
}

export function buildWorkerContextMemoryReinjectionProof(packet: any = {}) {
  const memory = packet?.memory || null;
  const memoryPolicy = packet?.memory_policy || packet?.memoryPolicy || normalizeWorkerMemoryPolicy({}, memory);
  const retry = packet?.context_compaction_retry || packet?.contextCompactionRetry || null;
  const memoryCompaction = retry?.memory_compaction || retry?.memoryCompaction || null;
  const memoryText = renderWorkerPacketMemory(memory);
  const memoryRawText = memory == null ? "" : (typeof memory === "string" ? memory : JSON.stringify(memory || {}));
  const packetMemoryHash = memoryRawText ? hash(memoryRawText, 24) : "";
  const expectedCompactedMemoryHash = String(memoryCompaction?.compacted_memory_hash || memoryCompaction?.compactedMemoryHash || "");
  const memoryFirst = retry?.memory_first === true || retry?.memoryFirst === true || String(retry?.method || "").startsWith("memory_first");
  const hashMatchesCompaction = !!expectedCompactedMemoryHash && !!packetMemoryHash
    ? expectedCompactedMemoryHash === packetMemoryHash
    : !expectedCompactedMemoryHash;
  const status = memoryPolicy.ignored === true
    ? "ignored_by_policy"
    : !memory
    ? "no_memory"
    : memoryFirst
      ? hashMatchesCompaction ? "compacted_reinjected" : "compaction_hash_mismatch"
      : "injected";
  return {
    schema: "ccm-worker-context-memory-reinjection-proof-v1",
    packet_id: packet?.packet_id || "",
    project: packet?.project || "",
    memory_present: !!memory,
    memory_ignored: memoryPolicy.ignored === true,
    memory_policy_reason: memoryPolicy.reason || "",
    rendered_memory_present: !!memoryText,
    source_schema: typeof memory === "object" && memory ? String(memory.schema || "") : "",
    group_id: typeof memory === "object" && memory ? String(memory.group_id || memory.groupId || "") : "",
    target_project: typeof memory === "object" && memory ? String(memory.target_project || memory.targetProject || packet?.project || "") : String(packet?.project || ""),
    packet_memory_hash: packetMemoryHash,
    packet_memory_chars: memoryRawText.length,
    rendered_memory_hash: memoryText ? hash(memoryText, 24) : "",
    rendered_memory_chars: memoryText.length,
    memory_first: memoryFirst,
    compaction_retry_id: retry?.retry_id || retry?.retryId || "",
    memory_compaction_schema: memoryCompaction?.schema || "",
    expected_compacted_memory_hash: expectedCompactedMemoryHash,
    hash_matches_compaction: hashMatchesCompaction,
    status,
  };
}

function workerContextUsageText(value: any) {
  if (value == null) return "";
  return typeof value === "string" ? value : JSON.stringify(value || {});
}

function workerContextUsageCategory(id: string, name: string, value: any, extra: any = {}) {
  const text = workerContextUsageText(value);
  return {
    id,
    name,
    tokens: text ? estimateTextTokens(text) : 0,
    chars: text.length,
    item_count: Array.isArray(value) ? value.length : Number(extra.item_count || extra.itemCount || 0),
    source: String(extra.source || ""),
    required: extra.required === true,
    included: !!text || Number(extra.item_count || extra.itemCount || 0) > 0,
  };
}

function workerContextUsageStatus(pressure: number, freeTokens: number) {
  if (pressure >= 100 || freeTokens < 0) return "over_budget";
  if (pressure >= 90) return "critical";
  if (pressure >= 82) return "compact_recommended";
  if (pressure >= 70) return "warn";
  return "ok";
}

function workerContextUsageReductionHint(category: any = {}) {
  const id = String(category.id || "");
  if (id === "group_memory_rendered") return "Prefer a freshly compacted group memory summary, typed MEMORY.md references, or read-plan pointers over full rendered memory.";
  if (id === "typed_memory_recall") return "Deduplicate typed MEMORY.md recall and keep only task-relevant reference/caution entries.";
  if (id === "global_memory") return "Suppress cross-group/global recall unless it is directly required by this assignment.";
  if (id === "replay_repair_dispatch_briefs") return "Keep required repair ids and proof fields, but remove duplicate narrative from replay repair briefs.";
  if (id === "constraints_and_documents") return "Collapse document findings to acceptance-critical paths and checks.";
  if (id === "dependencies") return "Keep only active dependency blockers and contract ids.";
  return "Compress this category before dispatch while preserving required receipt/proof identifiers.";
}

export function buildWorkerContextUsage(packet: any = {}, options: any = {}) {
  const maxTokens = Math.max(1, Number(options.maxTokens || options.max_tokens || packet?.context_budget?.max_tokens || 90_000));
  const reservedOutputTokens = Math.max(0, Number(options.reservedOutputTokens || options.reserved_output_tokens || DEFAULT_RESERVED_OUTPUT_TOKENS));
  const autocompactBufferTokens = Math.max(0, Number(options.autoCompactBufferTokens || options.auto_compact_buffer_tokens || DEFAULT_AUTO_COMPACT_BUFFER_TOKENS));
  const memory = packet?.memory || null;
  const memoryPolicy = packet?.memory_policy || packet?.memoryPolicy || normalizeWorkerMemoryPolicy({}, memory);
  const memoryRendered = renderWorkerPacketMemory(memory);
  const pressureMemoryProvenanceReceiptDiscipline = extractPressureMemoryProvenanceReceiptDiscipline(
    memory,
    packet?.pressure_memory_provenance_receipt_discipline || packet?.pressureMemoryProvenanceReceiptDiscipline || null
  );
  const pressureProvenanceDispatchFeedbackPolicy = extractPressureProvenanceDispatchFeedbackPolicy(
    memory,
    packet?.pressure_provenance_dispatch_feedback_policy || packet?.pressureProvenanceDispatchFeedbackPolicy || null
  );
  const pressureProvenanceProviderDispatchAdvisory = extractPressureProvenanceProviderDispatchAdvisory(
    memory,
    packet?.pressure_provenance_provider_dispatch_advisory || packet?.pressureProvenanceProviderDispatchAdvisory || null
  );
  const pressureProvenanceProviderDispatchOverrideFollowupReceiptContract = extractPressureProvenanceProviderDispatchOverrideFollowupReceiptContract(
    memory,
    packet?.pressure_provenance_provider_dispatch_override_followup_receipt_contract || packet?.pressureProvenanceProviderDispatchOverrideFollowupReceiptContract || null,
    pressureProvenanceProviderDispatchAdvisory
  );
  const providerRankingCompactRepairReceiptMemoryContract = extractProviderRankingCompactRepairReceiptMemoryContract(
    memory,
    packet?.provider_ranking_compact_repair_receipt_memory_contract || packet?.providerRankingCompactRepairReceiptMemoryContract || null
  );
  const postCompactReinjectionRepairReceiptMemoryContract = extractPostCompactReinjectionRepairReceiptMemoryContract(
    memory,
    packet?.post_compact_reinjection_repair_receipt_memory_contract || packet?.postCompactReinjectionRepairReceiptMemoryContract || null
  );
  const providerSwitchDecisionReceipt = packet?.provider_switch_decision_receipt
    || packet?.providerSwitchDecisionReceipt
    || null;
  const categories = [
    workerContextUsageCategory("worker_packet_envelope", "Worker packet envelope", {
      packet_id: packet?.packet_id || "",
      trace_id: packet?.trace_id || "",
      task_id: packet?.task_id || "",
      project: packet?.project || "",
      group: packet?.group || {},
    }, { source: "runtime-kernel" }),
    workerContextUsageCategory("task_goal", "Task and goal", [packet?.goal || "", packet?.task || ""].filter(Boolean).join("\n"), { required: true, source: "assignment" }),
    workerContextUsageCategory("constraints_and_documents", "Constraints and document findings", [
      ...(Array.isArray(packet?.constraints) ? packet.constraints : []),
      ...(Array.isArray(packet?.document_findings) ? packet.document_findings : []),
    ], { source: "coordinator-analysis" }),
    workerContextUsageCategory("memory_policy", "Memory policy", memoryPolicy, { source: "memory-policy", required: memoryPolicy.ignored === true }),
    workerContextUsageCategory("group_memory_rendered", "Group memory rendered context", memoryRendered, { source: memory?.schema || "memory-context", required: !!memory }),
    workerContextUsageCategory("typed_memory_recall", "Typed MEMORY.md recall", memory?.typedMemoryRecall || memory?.typed_memory_recall || memory?.typed_memory || memory?.typedMemory || "", { source: "typed-memory" }),
    workerContextUsageCategory("pressure_memory_provenance_receipt_discipline", "Pressure memory provenance receipt discipline", pressureMemoryProvenanceReceiptDiscipline || "", { source: "typed-memory-pressure-provenance", required: pressureMemoryProvenanceReceiptDiscipline?.active === true }),
    workerContextUsageCategory("pressure_provenance_dispatch_feedback_policy", "Pressure provenance dispatch feedback policy", pressureProvenanceDispatchFeedbackPolicy || "", { source: "typed-feedback-memory", required: pressureProvenanceDispatchFeedbackPolicy?.active === true }),
    workerContextUsageCategory("pressure_provenance_provider_dispatch_advisory", "Pressure provenance provider dispatch advisory", pressureProvenanceProviderDispatchAdvisory || "", { source: "typed-feedback-memory", required: pressureProvenanceProviderDispatchAdvisory?.should_hold_dispatch === true }),
    workerContextUsageCategory("pressure_provenance_provider_dispatch_override_followup_receipt_contract", "Provider dispatch override follow-up receipt contract", pressureProvenanceProviderDispatchOverrideFollowupReceiptContract || "", { source: "typed-feedback-memory", required: pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active === true }),
    workerContextUsageCategory("provider_ranking_compact_repair_receipt_memory_contract", "Provider ranking compact repair receipt memory contract", providerRankingCompactRepairReceiptMemoryContract || "", { source: "typed-provider-ranking-memory", required: providerRankingCompactRepairReceiptMemoryContract?.active === true }),
    workerContextUsageCategory("post_compact_reinjection_repair_receipt_memory_contract", "Post-compact reinjection repair receipt memory contract", postCompactReinjectionRepairReceiptMemoryContract || "", { source: "typed-post-compact-repair-memory", required: postCompactReinjectionRepairReceiptMemoryContract?.active === true }),
    workerContextUsageCategory("provider_switch_decision_receipt", "Provider switch decision receipt", providerSwitchDecisionReceipt || "", { source: "group-main-agent-provider-decision", required: providerSwitchDecisionReceipt?.valid === true }),
    workerContextUsageCategory("global_memory", "Global memory recall", memory?.globalAgentMemoryRecall || memory?.global_agent_memory_recall || memory?.global_memory || memory?.globalMemory || "", { source: "global-agent-memory" }),
    workerContextUsageCategory("replay_repair_dispatch_briefs", "Replay repair dispatch briefs", packet?.replay_repair_dispatch_briefs || [], { source: "replay-repair", required: Array.isArray(packet?.replay_repair_dispatch_briefs) && packet.replay_repair_dispatch_briefs.length > 0 }),
    workerContextUsageCategory("contract_injections", "Contract injections", packet?.contract_injections || [], { source: "contract-injection" }),
    workerContextUsageCategory("dependencies", "Dependencies", packet?.dependencies || [], { source: "coordinator-plan" }),
    workerContextUsageCategory("context_compaction_retry", "Context compaction retry", packet?.context_compaction_retry || packet?.contextCompactionRetry || "", { source: "worker-context-gate", required: !!(packet?.context_compaction_retry || packet?.contextCompactionRetry) }),
    workerContextUsageCategory("memory_reinjection_proof", "Memory reinjection proof", packet?.memory_reinjection_proof || packet?.memoryReinjectionProof || "", { source: "memory-context-reinjection", required: !!(packet?.memory_reinjection_proof || packet?.memoryReinjectionProof) }),
    workerContextUsageCategory("verification_and_acceptance", "Verification and acceptance", { verification: packet?.verification || null, acceptance: packet?.acceptance || null }, { source: "worker-protocol", required: true }),
  ];
  const activeCategories = categories.filter(category => category.included || category.required);
  const totalTokens = activeCategories.reduce((sum, category) => sum + Number(category.tokens || 0), 0);
  const totalChars = activeCategories.reduce((sum, category) => sum + Number(category.chars || 0), 0);
  const freeTokens = maxTokens - totalTokens - autocompactBufferTokens;
  const pressure = Math.round((totalTokens / maxTokens) * 1000) / 10;
  const status = workerContextUsageStatus(pressure, freeTokens);
  const topCategories = activeCategories
    .filter(category => Number(category.tokens || 0) > 0)
    .sort((a, b) => Number(b.tokens || 0) - Number(a.tokens || 0))
    .slice(0, 8)
    .map(category => ({ id: category.id, name: category.name, tokens: category.tokens, chars: category.chars }));
  const allCategories = [
    ...activeCategories,
    {
      id: "free_space",
      name: "Free space",
      tokens: Math.max(0, freeTokens),
      chars: 0,
      item_count: 0,
      source: "budget",
      required: false,
      included: freeTokens > 0,
    },
    {
      id: "autocompact_buffer",
      name: "Autocompact buffer",
      tokens: autocompactBufferTokens,
      chars: 0,
      item_count: 0,
      source: "budget",
      required: true,
      included: true,
    },
  ];
  return {
    schema: "ccm-worker-context-usage-v1",
    version: 1,
    packet_id: packet?.packet_id || "",
    project: packet?.project || "",
    task_id: packet?.task_id || "",
    model_context_policy: "cc-style-api-view-after-memory-render",
    max_tokens: maxTokens,
    reserved_output_tokens: reservedOutputTokens,
    autocompact_buffer_tokens: autocompactBufferTokens,
    total_tokens: totalTokens,
    total_chars: totalChars,
    free_tokens: freeTokens,
    pressure,
    status,
    compact_recommended: status === "compact_recommended" || status === "critical" || status === "over_budget",
    categories: allCategories,
    top_categories: topCategories,
    suggested_reductions: topCategories
      .filter(category => !["task_goal", "verification_and_acceptance", "worker_packet_envelope", "context_compaction_retry", "memory_reinjection_proof"].includes(String(category.id || "")))
      .slice(0, 5)
      .map(category => ({
        category_id: category.id,
        name: category.name,
        tokens: category.tokens,
        suggestion: workerContextUsageReductionHint(category),
      })),
  };
}

export function renderWorkerContextUsage(usage: any = {}) {
  if (!usage?.schema) return "";
  const rows = Array.isArray(usage.categories) ? usage.categories : [];
  const budgetRows = rows.filter((row: any) => ["free_space", "autocompact_buffer"].includes(String(row.id || "")));
  const visible = [
    ...rows
      .filter((row: any) => !["free_space", "autocompact_buffer"].includes(String(row.id || "")))
      .filter((row: any) => Number(row.tokens || 0) > 0 || row.required === true)
      .slice(0, 8),
    ...budgetRows,
  ];
  return [
    `Context usage budget：${usage.status || "unknown"}；${usage.total_tokens || 0}/${usage.max_tokens || 0} tokens（${usage.pressure || 0}%）；free=${usage.free_tokens || 0}；autocompact_buffer=${usage.autocompact_buffer_tokens || 0}。`,
    ...visible.map((row: any) => `- ${row.name || row.id}: ${row.tokens || 0} tokens${row.source ? `；source=${row.source}` : ""}`),
    usage.compact_recommended ? "- compact recommended before dispatch if this packet grows further." : "",
  ].filter(Boolean).join("\n");
}

export function refreshWorkerContextPacketUsage(packet: any = {}, options: any = {}) {
  const packetWithMemoryProof = {
    ...packet,
    memory_reinjection_proof: buildWorkerContextMemoryReinjectionProof(packet),
  };
  const contextUsage = buildWorkerContextUsage(packetWithMemoryProof, { maxTokens: 90_000, ...(options || {}) });
  const contextBudget = buildContextBudget({ context: { ...packetWithMemoryProof, context_usage: contextUsage }, maxChars: 36_000, maxTokens: contextUsage.max_tokens });
  return {
    ...packetWithMemoryProof,
    context_usage: contextUsage,
    context_budget: contextBudget,
  };
}

function matchesRule(rule: AgentPermissionRule, input: AgentRuntimeLifecycleInput) {
  const scope = input.scope || "global";
  const action = String(input.action || "");
  const risk = input.risk || "read";
  const target = String(input.target || "");
  const actionMatch = rule.action === "*" || rule.action === action;
  const scopeMatch = rule.scope === "all" || rule.scope === scope;
  const riskMatch = !rule.risk || rule.risk === "all" || rule.risk === risk;
  const targetMatch = !rule.target || target.includes(rule.target);
  return actionMatch && scopeMatch && riskMatch && targetMatch;
}

export function evaluateAgentRuntimePermission(input: AgentRuntimeLifecycleInput, rules: AgentPermissionRule[] = DEFAULT_PERMISSION_RULES) {
  const matched = [...rules].reverse().find(rule => matchesRule(rule, input));
  const risk = input.risk || "read";
  const fallback: AgentPermissionRule = risk === "read"
    ? DEFAULT_PERMISSION_RULES[0]
    : risk === "high"
      ? DEFAULT_PERMISSION_RULES[2]
      : { id: "default-ask", scope: "all", action: "*", risk: "all", decision: "ask", reason: "写入、派发或不确定动作默认进入可审计确认" };
  const rule = matched || fallback;
  return {
    decision: rule.decision,
    allowed: rule.decision === "allow",
    needs_confirmation: rule.decision === "ask",
    denied: rule.decision === "deny",
    rule_id: rule.id,
    reason: rule.reason,
  };
}

export function buildArtifactBudget(value: any, maxChars = 12_000) {
  const text = typeof value === "string" ? value : JSON.stringify(value || {});
  const truncated = text.length > maxChars;
  return {
    chars: text.length,
    max_chars: maxChars,
    truncated,
    artifact_hash: truncated ? hash(text, 16) : "",
    preview: truncated ? compact(text, maxChars) : text,
  };
}

export function recordAgentRuntimeLifecycle(input: AgentRuntimeLifecycleInput) {
  const permission = evaluateAgentRuntimePermission(input);
  const context_budget = buildContextBudget({ context: input.data?.context || input.data?.prompt || input.message || "" });
  const artifact_budget = buildArtifactBudget(input.data?.observation || input.data?.result || input.data || {});
  const record: AgentRuntimeLifecycleRecord = {
    id: `arl_${Date.now().toString(36)}_${hash(input, 8)}`,
    type: "agent_runtime.lifecycle",
    scope: input.scope,
    action: String(input.action || "unknown"),
    phase: String(input.phase || "execute"),
    risk: input.risk || "read",
    target: String(input.target || ""),
    status: input.status || "planned",
    permission,
    context_budget,
    artifact_budget: {
      chars: artifact_budget.chars,
      max_chars: artifact_budget.max_chars,
      truncated: artifact_budget.truncated,
      artifact_hash: artifact_budget.artifact_hash,
    },
    data: input.data || {},
  };
  if (input.traceId) {
    appendTraceEvent(input.traceId, {
      id: record.id,
      type: record.type,
      status: record.status === "ok" ? "ok" : record.status === "error" ? "error" : record.status === "blocked" ? "warning" : "info",
      task_id: input.taskId || "",
      group_id: input.groupId || "",
      agent: input.agent || "",
      message: input.message || `${record.scope}:${record.action}:${record.phase}`,
      data: record,
    });
  }
  return record;
}

export function buildWorkerContextPacket(input: {
  group?: any;
  project: string;
  task: string;
  analysis?: any;
  agentType?: string;
  agent_type?: string;
  traceId?: string;
  taskId?: string;
  dependencies?: any[];
  contractInjections?: any[];
  replayRepairDispatchBriefs?: any[];
  memory?: any;
  memoryPolicy?: any;
  pressureMemoryProvenanceReceiptDiscipline?: any;
  pressure_memory_provenance_receipt_discipline?: any;
  pressureProvenanceDispatchFeedbackPolicy?: any;
  pressure_provenance_dispatch_feedback_policy?: any;
  pressureProvenanceProviderDispatchAdvisory?: any;
  pressure_provenance_provider_dispatch_advisory?: any;
  pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?: any;
  pressure_provenance_provider_dispatch_override_followup_receipt_contract?: any;
  providerRankingCompactRepairReceiptMemoryContract?: any;
  provider_ranking_compact_repair_receipt_memory_contract?: any;
  postCompactReinjectionRepairReceiptMemoryContract?: any;
  post_compact_reinjection_repair_receipt_memory_contract?: any;
  providerSwitchDecisionReceipt?: any;
  provider_switch_decision_receipt?: any;
  verification?: any;
  contextUsageOptions?: any;
}) {
  const groupMembers = Array.isArray(input.group?.members) ? input.group.members.map((m: any) => m.project).filter(Boolean) : [];
  const contractInjections = Array.isArray(input.contractInjections) ? input.contractInjections : [];
  const replayRepairDispatchBriefs = Array.isArray(input.replayRepairDispatchBriefs) ? input.replayRepairDispatchBriefs : [];
  const memoryPolicy = normalizeWorkerMemoryPolicy(input, input.memory || null);
  const pressureMemoryProvenanceReceiptDiscipline = extractPressureMemoryProvenanceReceiptDiscipline(
    input.memory || null,
    input.pressureMemoryProvenanceReceiptDiscipline || input.pressure_memory_provenance_receipt_discipline || null
  );
  const pressureProvenanceDispatchFeedbackPolicy = extractPressureProvenanceDispatchFeedbackPolicy(
    input.memory || null,
    input.pressureProvenanceDispatchFeedbackPolicy || input.pressure_provenance_dispatch_feedback_policy || null
  );
  const pressureProvenanceProviderDispatchAdvisory = extractPressureProvenanceProviderDispatchAdvisory(
    input.memory || null,
    input.pressureProvenanceProviderDispatchAdvisory || input.pressure_provenance_provider_dispatch_advisory || null
  );
  const pressureProvenanceProviderSelectedCandidate = pressureProvenanceProviderDispatchAdvisory?.selected_candidate
    || pressureProvenanceProviderDispatchAdvisory?.selectedCandidate
    || {};
  const pressureProvenanceProviderDispatchOverrideFollowupReceiptContract = extractPressureProvenanceProviderDispatchOverrideFollowupReceiptContract(
    input.memory || null,
    input.pressureProvenanceProviderDispatchOverrideFollowupReceiptContract
      || input.pressure_provenance_provider_dispatch_override_followup_receipt_contract
      || null,
    pressureProvenanceProviderDispatchAdvisory
  );
  const providerRankingCompactRepairReceiptMemoryContract = extractProviderRankingCompactRepairReceiptMemoryContract(
    input.memory || null,
    input.providerRankingCompactRepairReceiptMemoryContract
      || input.provider_ranking_compact_repair_receipt_memory_contract
      || null
  );
  const postCompactReinjectionRepairReceiptMemoryContract = extractPostCompactReinjectionRepairReceiptMemoryContract(
    input.memory || null,
    input.postCompactReinjectionRepairReceiptMemoryContract
      || input.post_compact_reinjection_repair_receipt_memory_contract
      || null
  );
  const agentType = String(input.agentType || input.agent_type || "").trim();
  const providerSwitchDecisionReceipt = input.providerSwitchDecisionReceipt
    || input.provider_switch_decision_receipt
    || null;
  const packet: any = {
    packet_id: `wcp_${hash([input.project, input.task, input.traceId, agentType, contractInjections, replayRepairDispatchBriefs, pressureProvenanceDispatchFeedbackPolicy?.active ? pressureProvenanceDispatchFeedbackPolicy : null, pressureProvenanceProviderDispatchAdvisory?.schema ? pressureProvenanceProviderDispatchAdvisory : null, pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active ? pressureProvenanceProviderDispatchOverrideFollowupReceiptContract : null, providerRankingCompactRepairReceiptMemoryContract?.active ? providerRankingCompactRepairReceiptMemoryContract : null, postCompactReinjectionRepairReceiptMemoryContract?.active ? postCompactReinjectionRepairReceiptMemoryContract : null, providerSwitchDecisionReceipt?.valid ? providerSwitchDecisionReceipt : null], 14)}`,
    version: 1,
    project: input.project,
    agent_type: agentType,
    agentType,
    task_id: input.taskId || "",
    trace_id: input.traceId || "",
    group: { id: input.group?.id || "", name: input.group?.name || "", members: groupMembers },
    goal: input.analysis?.summary || input.task,
    task: input.task,
    constraints: Array.isArray(input.analysis?.constraints) ? input.analysis.constraints : [],
    document_findings: Array.isArray(input.analysis?.documentFindings) ? input.analysis.documentFindings : [],
    dependencies: Array.isArray(input.dependencies) ? input.dependencies : [],
    contract_injections: contractInjections.map((item: any) => ({
      injection_id: item.injection_id || item.injectionId || `ci_${hash(item, 12)}`,
      source_agent: item.source_agent || item.source || "",
      target_agent: item.target_agent || item.target || input.project,
      endpoint: item.endpoint || item.type || "",
      summary: item.summary || item.change || "",
      required_receipt_reference: true,
    })),
    replay_repair_dispatch_briefs: replayRepairDispatchBriefs.map((item: any) => ({
      brief_id: item.brief_id || item.briefId || "",
      work_item_id: item.work_item_id || item.workItemId || "",
      source: item.source || "",
      component: item.component || "",
      target_project: item.target_project || item.targetProject || input.project,
      reinjection_gate_id: item.reinjection_gate_id || item.reinjectionGateId || "",
      post_compact_candidate_id: item.post_compact_candidate_id || item.postCompactCandidateId || "",
      post_compact_candidate_kind: item.post_compact_candidate_kind || item.postCompactCandidateKind || "",
      post_compact_candidate_value: item.post_compact_candidate_value || item.postCompactCandidateValue || "",
      post_compact_candidate_source_message_id: item.post_compact_candidate_source_message_id || item.postCompactCandidateSourceMessageId || "",
      proof_entry_id: item.proof_entry_id || item.proofEntryId || "",
      request_patch_checksum: item.request_patch_checksum || item.requestPatchChecksum || "",
      worker_context_packet_id: item.worker_context_packet_id || item.workerContextPacketId || "",
      worker_context_packet_binding_id: item.worker_context_packet_binding_id || item.workerContextPacketBindingId || item.binding_id || "",
      worker_context_packet_memory_policy_reason: item.worker_context_packet_memory_policy_reason || item.workerContextPacketMemoryPolicyReason || "",
      binding_id: item.binding_id || item.worker_context_packet_binding_id || "",
      source_assignment_id: item.source_assignment_id || item.assignment_id || item.assignmentId || "",
      source_dispatch_key: item.source_dispatch_key || item.dispatch_key || item.dispatchKey || "",
      provider_reproof_status: item.provider_reproof_status || item.providerReproofStatus || "",
      provider_reproof_reason: item.provider_reproof_reason || item.providerReproofReason || "",
      reproof_candidate_id: item.reproof_candidate_id || item.reproofCandidateId || "",
      timeline_binding_id: item.timeline_binding_id || item.timelineBindingId || "",
      original_work_item_id: item.original_work_item_id || item.originalWorkItemId || "",
      request_telemetry_session_status: item.request_telemetry_session_status || item.requestTelemetrySessionStatus || "",
      request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || item.requestTelemetryDispatchStatus || "",
      runner_request_id: item.runner_request_id || item.runnerRequestId || "",
      execution_id: item.execution_id || item.executionId || "",
      required_receipt_reference: true,
      should_create_real_task: false,
    })),
    memory: input.memory || null,
    memory_policy: memoryPolicy,
    pressure_memory_provenance_receipt_discipline: pressureMemoryProvenanceReceiptDiscipline?.active ? pressureMemoryProvenanceReceiptDiscipline : null,
    pressure_provenance_dispatch_feedback_policy: pressureProvenanceDispatchFeedbackPolicy?.active ? pressureProvenanceDispatchFeedbackPolicy : null,
    pressure_provenance_provider_dispatch_advisory: pressureProvenanceProviderDispatchAdvisory?.schema ? pressureProvenanceProviderDispatchAdvisory : null,
    pressure_provenance_provider_dispatch_override_followup_receipt_contract: pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active ? pressureProvenanceProviderDispatchOverrideFollowupReceiptContract : null,
    provider_ranking_compact_repair_receipt_memory_contract: providerRankingCompactRepairReceiptMemoryContract?.active ? providerRankingCompactRepairReceiptMemoryContract : null,
    post_compact_reinjection_repair_receipt_memory_contract: postCompactReinjectionRepairReceiptMemoryContract?.active ? postCompactReinjectionRepairReceiptMemoryContract : null,
    provider_switch_decision_receipt: providerSwitchDecisionReceipt?.schema ? providerSwitchDecisionReceipt : null,
    verification: input.verification || null,
    acceptance: {
      ack_required_before_implementation: true,
      receipt_required: true,
      actual_diff_required: true,
      verification_required: true,
      memory_ignored_receipt_required: memoryPolicy.ignored === true,
      contract_injection_receipt_required: contractInjections.length > 0,
      replay_repair_dispatch_brief_receipt_required: replayRepairDispatchBriefs.length > 0,
      memory_provenance_usage_required: pressureMemoryProvenanceReceiptDiscipline?.active === true
        || pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active === true,
      pressure_memory_provenance_receipt_required: pressureMemoryProvenanceReceiptDiscipline?.active === true,
      pressure_provenance_feedback_ack_required: pressureProvenanceDispatchFeedbackPolicy?.active === true,
      pressure_provenance_feedback_final_receipt_review_required: pressureProvenanceDispatchFeedbackPolicy?.active === true,
      pressure_provenance_provider_dispatch_advisory_ack_required: pressureProvenanceProviderDispatchAdvisory?.schema ? true : false,
      pressure_provenance_provider_dispatch_hold_required: pressureProvenanceProviderDispatchAdvisory?.should_hold_dispatch === true,
      pressure_provenance_provider_dispatch_override_followup_sampling_required: pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active === true,
      pressure_provenance_provider_dispatch_override_followup_receipt_required: pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active === true,
      provider_dispatch_override_followup_history_reverification_required: pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active === true,
      provider_ranking_compact_repair_receipt_memory_usage_required: providerRankingCompactRepairReceiptMemoryContract?.active === true,
      provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: providerRankingCompactRepairReceiptMemoryContract?.active === true,
      provider_ranking_memory_usage_receipt_discipline_required: providerRankingCompactRepairReceiptMemoryContract?.memory_usage_receipt_discipline_required === true,
      provider_ranking_memory_receipt_required_doc_rel_paths: providerRankingCompactRepairReceiptMemoryContract?.memory_receipt_required_doc_rel_paths || [],
      post_compact_reinjection_repair_receipt_memory_usage_required: postCompactReinjectionRepairReceiptMemoryContract?.active === true,
      post_compact_reinjection_repair_receipt_memory_current_source_reverification_required: postCompactReinjectionRepairReceiptMemoryContract?.active === true,
      post_compact_reinjection_repair_receipt_memory_ignored_reason_required: postCompactReinjectionRepairReceiptMemoryContract?.active === true,
      post_compact_reinjection_repair_receipt_memory_required_doc_rel_paths: postCompactReinjectionRepairReceiptMemoryContract?.memory_receipt_required_doc_rel_paths || [],
      post_compact_receipt_memory_usage_repair_completion_memory_usage_required: postCompactReinjectionRepairReceiptMemoryContract?.corrected_receipt_completion_memory_active === true,
      post_compact_receipt_memory_usage_repair_completion_current_session_binding_required: postCompactReinjectionRepairReceiptMemoryContract?.corrected_receipt_completion_memory_active === true,
      post_compact_receipt_memory_usage_repair_completion_required_doc_rel_paths: postCompactReinjectionRepairReceiptMemoryContract?.corrected_receipt_completion_doc_rel_paths || [],
      cross_group_provider_reliability_sampling_required: pressureProvenanceProviderSelectedCandidate.cross_group_provider_reliability_actionable === true
        && pressureProvenanceProviderDispatchAdvisory?.should_hold_dispatch !== true,
      cross_group_provider_reliability_local_policy_override_allowed: false,
      ...(pressureProvenanceProviderDispatchAdvisory?.provider_reliability_snapshot?.snapshot_id ? {
        provider_reliability_snapshot_fresh_required: true,
        provider_reliability_safer_alternative_review_required: Number(pressureProvenanceProviderDispatchAdvisory?.safer_alternative_count || 0) > 0,
        provider_reliability_safer_alternative_auto_switch_allowed: false,
      } : {}),
      ...(providerSwitchDecisionReceipt?.schema ? {
        provider_switch_decision_receipt_required: providerSwitchDecisionReceipt.valid === true,
        provider_switch_child_session_binding_required: providerSwitchDecisionReceipt.valid === true,
        provider_switch_executed_provider_receipt_required: providerSwitchDecisionReceipt.valid === true,
      } : {}),
    },
  };
  return refreshWorkerContextPacketUsage(packet, input.contextUsageOptions || {});
}

export function renderWorkerContextPacket(packet: any) {
  const contractLines = Array.isArray(packet?.contract_injections) && packet.contract_injections.length
    ? [
      "contract injection：",
      ...packet.contract_injections.map((item: any) => `- injection_id=${item.injection_id}；endpoint/type=${item.endpoint || "contract"}；source=${item.source_agent || "unknown"}；${item.summary || ""}`),
      "- 回执必须引用 injection_id，并说明是否已适配、已验证或无需适配的证据。",
    ]
    : [];
  const replayRepairBriefLines = Array.isArray(packet?.replay_repair_dispatch_briefs) && packet.replay_repair_dispatch_briefs.length
    ? [
      "Replay repair dispatch brief：",
      ...packet.replay_repair_dispatch_briefs.map((item: any) => [
        `- brief_id=${item.brief_id || ""}`,
        `work_item_id=${item.work_item_id || ""}`,
        `source=${item.source || ""}`,
        item.component ? `component=${item.component}` : "",
        `target=${item.target_project || packet?.project || ""}`,
        item.reinjection_gate_id ? `reinjection_gate=${item.reinjection_gate_id}` : "",
        item.post_compact_candidate_id ? `post_compact_candidate=${item.post_compact_candidate_id}` : "",
        item.post_compact_candidate_kind ? `candidate_kind=${item.post_compact_candidate_kind}` : "",
        item.post_compact_candidate_value ? `candidate_value=${item.post_compact_candidate_value}` : "",
        item.post_compact_candidate_source_message_id ? `source_message=${item.post_compact_candidate_source_message_id}` : "",
        item.original_worker_context_packet_id ? `original_worker_context_packet=${item.original_worker_context_packet_id}` : "",
        item.original_binding_id ? `original_binding=${item.original_binding_id}` : "",
        item.original_task_agent_session_id ? `original_task_agent_session=${item.original_task_agent_session_id}` : "",
        item.original_native_session_id ? `original_native_session=${item.original_native_session_id}` : "",
        Array.isArray(item.post_compact_receipt_memory_required_doc_rel_paths) && item.post_compact_receipt_memory_required_doc_rel_paths.length
          ? `required_receipt_memory_docs=${item.post_compact_receipt_memory_required_doc_rel_paths.join(",")}`
          : "",
        item.proof_entry_id ? `proof=${item.proof_entry_id}` : "",
        item.request_patch_checksum ? `request=${item.request_patch_checksum}` : "",
        item.worker_context_packet_id ? `worker_context_packet=${item.worker_context_packet_id}` : "",
        item.worker_context_packet_binding_id ? `packet_binding=${item.worker_context_packet_binding_id}` : "",
        item.worker_context_packet_memory_policy_reason ? `memory_policy_reason=${item.worker_context_packet_memory_policy_reason}` : "",
        item.source_assignment_id ? `source_assignment=${item.source_assignment_id}` : "",
        item.source_dispatch_key ? `source_dispatch=${item.source_dispatch_key}` : "",
        item.provider_reproof_status ? `provider_reproof=${item.provider_reproof_status}` : "",
        item.provider_reproof_reason ? `provider_reason=${item.provider_reproof_reason}` : "",
        item.reproof_candidate_id ? `reproof_candidate=${item.reproof_candidate_id}` : "",
        item.timeline_binding_id ? `timeline=${item.timeline_binding_id}` : "",
        item.original_work_item_id ? `original_work_item=${item.original_work_item_id}` : "",
        item.request_telemetry_session_status ? `session=${item.request_telemetry_session_status}` : "",
        item.request_telemetry_dispatch_status ? `dispatch=${item.request_telemetry_dispatch_status}` : "",
        item.runner_request_id ? `runner=${item.runner_request_id}` : "",
        item.execution_id ? `execution=${item.execution_id}` : "",
        "shouldCreateRealTask=false",
      ].filter(Boolean).join("；")),
      "- 回执 replayRepairDispatchBriefUsage 必须引用 brief_id/work_item_id，并声明 used/verified/ignored/blocked/strong；post-compact reinjection 修复还必须提交 postCompactCandidateUsage、memoryUsed/memoryIgnored、task_agent_session_id、native_session_id；provider re-proof 的 strong 仍需 native provider proof ledger 证明；ignore-memory receipt 修复必须同时更正 CCM_AGENT_RECEIPT.memoryIgnored。",
    ]
    : [];
  const memoryText = renderWorkerPacketMemory(packet?.memory || null);
  const memoryPolicyText = renderWorkerMemoryPolicy(packet?.memory_policy || packet?.memoryPolicy || null);
  const pressureMemoryProvenanceReceiptDisciplineText = renderPressureMemoryProvenanceReceiptDiscipline(
    extractPressureMemoryProvenanceReceiptDiscipline(packet?.memory || null, packet?.pressure_memory_provenance_receipt_discipline || packet?.pressureMemoryProvenanceReceiptDiscipline || null)
  );
  const pressureProvenanceDispatchFeedbackPolicyText = renderPressureProvenanceDispatchFeedbackPolicy(
    extractPressureProvenanceDispatchFeedbackPolicy(packet?.memory || null, packet?.pressure_provenance_dispatch_feedback_policy || packet?.pressureProvenanceDispatchFeedbackPolicy || null)
  );
  const pressureProvenanceProviderDispatchAdvisoryText = renderPressureProvenanceProviderDispatchAdvisory(
    extractPressureProvenanceProviderDispatchAdvisory(packet?.memory || null, packet?.pressure_provenance_provider_dispatch_advisory || packet?.pressureProvenanceProviderDispatchAdvisory || null)
  );
  const pressureProvenanceProviderDispatchOverrideFollowupReceiptContractText = renderPressureProvenanceProviderDispatchOverrideFollowupReceiptContract(
    extractPressureProvenanceProviderDispatchOverrideFollowupReceiptContract(
      packet?.memory || null,
      packet?.pressure_provenance_provider_dispatch_override_followup_receipt_contract || packet?.pressureProvenanceProviderDispatchOverrideFollowupReceiptContract || null,
      packet?.pressure_provenance_provider_dispatch_advisory || packet?.pressureProvenanceProviderDispatchAdvisory || null
    )
  );
  const providerRankingCompactRepairReceiptMemoryContractText = renderProviderRankingCompactRepairReceiptMemoryContract(
    extractProviderRankingCompactRepairReceiptMemoryContract(
      packet?.memory || null,
      packet?.provider_ranking_compact_repair_receipt_memory_contract || packet?.providerRankingCompactRepairReceiptMemoryContract || null
    )
  );
  const postCompactReinjectionRepairReceiptMemoryContractText = renderPostCompactReinjectionRepairReceiptMemoryContract(
    extractPostCompactReinjectionRepairReceiptMemoryContract(
      packet?.memory || null,
      packet?.post_compact_reinjection_repair_receipt_memory_contract || packet?.postCompactReinjectionRepairReceiptMemoryContract || null
    )
  );
  const providerSwitchDecisionReceiptText = renderProviderSwitchDecisionReceipt(
    packet?.provider_switch_decision_receipt || packet?.providerSwitchDecisionReceipt || null
  );
  const retry = packet?.context_compaction_retry || packet?.contextCompactionRetry || null;
  const memoryProof = packet?.memory_reinjection_proof || packet?.memoryReinjectionProof || null;
  const partialCompaction = retry?.partial_compaction || retry?.partialCompaction || null;
  const partialCompactionCategories = partialCompaction?.schema === "ccm-worker-context-partial-compaction-set-v1"
    ? (Array.isArray(partialCompaction.categories) ? partialCompaction.categories : [])
    : [partialCompaction?.category].filter(Boolean);
  const partialCompactionPreservedFieldCount = partialCompaction?.schema === "ccm-worker-context-partial-compaction-set-v1"
    ? (Array.isArray(partialCompaction.items) ? partialCompaction.items : []).reduce((sum: number, item: any) => sum + (Array.isArray(item.preserved_fields) ? item.preserved_fields.length : 0), 0)
    : Array.isArray(partialCompaction?.preserved_fields) ? partialCompaction.preserved_fields.length : 0;
  const partialCompactPolicy = retry?.partial_compact_policy || retry?.partialCompactPolicy || partialCompaction?.partial_compact_policy || partialCompaction?.partialCompactPolicy || null;
  const compactStrategyMemory = partialCompactPolicy?.compact_strategy_memory || partialCompactPolicy?.compactStrategyMemory || retry?.compact_strategy_memory || retry?.compactStrategyMemory || null;
  const pressureRecallUsageBias = partialCompactPolicy?.pressure_recall_usage_strategy_bias || partialCompactPolicy?.pressureRecallUsageStrategyBias || null;
  const ptlEmergencyHint = retry?.ptl_emergency_hint || retry?.ptlEmergencyHint || null;
  const memoryProofText = memoryProof?.schema ? [
    `Memory reinjection proof：${memoryProof.status || "unknown"}；memory_hash=${memoryProof.packet_memory_hash || ""}；rendered_hash=${memoryProof.rendered_memory_hash || ""}`,
    memoryProof.memory_first ? `- memory_first=true；compaction=${memoryProof.memory_compaction_schema || ""}；hash_match=${memoryProof.hash_matches_compaction === true}` : "",
  ].filter(Boolean).join("\n") : "";
  const retryText = retry?.schema ? [
    `Context compaction retry：${retry.status || "attempted"}；method=${retry.method || "deterministic"}`,
    retry.from_packet_id ? `- from_packet_id=${retry.from_packet_id}` : "",
    retry.retry_packet_id ? `- retry_packet_id=${retry.retry_packet_id}` : "",
    retry.from_usage_status ? `- from=${retry.from_usage_status} ${retry.from_total_tokens || 0}/${retry.from_max_tokens || 0} tokens` : "",
    retry.retry_usage_status ? `- retry=${retry.retry_usage_status} ${retry.retry_total_tokens || 0}/${retry.retry_max_tokens || 0} tokens` : "",
    retry.original_task_hash ? `- original_task_hash=${retry.original_task_hash}; compacted_task_hash=${retry.compacted_task_hash || ""}` : "",
    partialCompaction?.schema ? `- partial_compaction=${partialCompactionCategories.join(",") || partialCompaction.category || ""}; omitted_chars=${partialCompaction.omitted_chars || 0}; preserved_fields=${partialCompactionPreservedFieldCount}` : "",
    partialCompactPolicy?.schema ? `- partial_compact_policy=${(partialCompactPolicy.selected_categories || []).join(",")}; skipped=${(partialCompactPolicy.skipped_categories || []).join(",")}` : "",
    compactStrategyMemory?.schema ? `- compact_strategy_memory=${compactStrategyMemory.strategy_id || "outcome-ledger"}; preferred=${(compactStrategyMemory.preferred_categories || []).join(",")}` : "",
    pressureRecallUsageBias?.schema ? `- pressure_recall_usage_bias=${pressureRecallUsageBias.recommendation || "neutral"}; trust=${pressureRecallUsageBias.trust_score || 0}; adjustment_cap=${pressureRecallUsageBias.category_adjustment_cap || 0}` : "",
    ptlEmergencyHint?.schema && ptlEmergencyHint.engaged === true ? `- ptl_emergency_downgrade=${ptlEmergencyHint.emergency_level || "warning"}; reason=${ptlEmergencyHint.reason || "repeated compact failure"}` : "",
    retry.preserved_receipt_contract === true ? "- preserved receipt/proof identifiers and acceptance contract." : "",
  ].filter(Boolean).join("\n") : "";
  return [
    `WorkerContextPacket: ${packet?.packet_id || ""}`,
    `trace_id: ${packet?.trace_id || ""}`,
    `task_id: ${packet?.task_id || ""}`,
    `project: ${packet?.project || ""}`,
    `goal: ${packet?.goal || ""}`,
    "",
    "任务：",
    packet?.task || "",
    "",
    Array.isArray(packet?.document_findings) && packet.document_findings.length ? `文档/验收依据：\n- ${packet.document_findings.slice(0, 8).join("\n- ")}` : "",
    Array.isArray(packet?.constraints) && packet.constraints.length ? `用户约束：\n- ${packet.constraints.join("\n- ")}` : "",
    memoryPolicyText,
    memoryText,
    pressureMemoryProvenanceReceiptDisciplineText,
    pressureProvenanceDispatchFeedbackPolicyText,
    pressureProvenanceProviderDispatchAdvisoryText,
    pressureProvenanceProviderDispatchOverrideFollowupReceiptContractText,
    providerRankingCompactRepairReceiptMemoryContractText,
    postCompactReinjectionRepairReceiptMemoryContractText,
    providerSwitchDecisionReceiptText,
    memoryProofText,
    retryText,
    renderWorkerContextUsage(packet?.context_usage || null),
    contractLines.join("\n"),
    replayRepairBriefLines.join("\n"),
    "",
    "ACK gate：实现前先给接单 ACK，必须包含 understoodGoal、plannedScope、forbiddenScope、verificationPlan、unclear；ACK 不合格时只重写 ACK，不得继续实现。",
  ].filter(Boolean).join("\n");
}

export function buildContractInjectionEvent(input: { traceId?: string; taskId?: string; sourceAgent?: string; targetAgent: string; contract: any; packetId?: string }) {
  const injectionId = input.contract?.injection_id || input.contract?.injectionId || `ci_${hash([input.taskId, input.sourceAgent, input.targetAgent, input.contract], 16)}`;
  const event = {
    injection_id: injectionId,
    source_agent: input.sourceAgent || "",
    target_agent: input.targetAgent,
    endpoint: input.contract?.endpoint || input.contract?.type || "",
    summary: input.contract?.summary || input.contract?.change || "",
    packet_id: input.packetId || "",
    receipt_reference_required: true,
  };
  if (input.traceId) {
    appendTraceEvent(input.traceId, {
      id: `contract_injection:${injectionId}`,
      type: "agent_runtime.contract_injection",
      status: "info",
      task_id: input.taskId || "",
      agent: input.targetAgent,
      message: `contractChanges 注入 ${input.targetAgent}`,
      data: event,
    });
  }
  return event;
}

export function replayAgentTrace(traceId: string) {
  const trace = getTrace(traceId);
  const events = Array.isArray(trace?.events) ? trace.events : [];
  const lifecycle = events.filter((event: any) => event.type === "agent_runtime.lifecycle");
  const blocked = events.filter((event: any) => /blocked|confirmation|required|failed|error/i.test(`${event.type} ${event.status}`));
  const tools = events.filter((event: any) => /tool|dispatch|agent_runtime\.lifecycle/.test(String(event.type || "")));
  const contractInjections = events.filter((event: any) => event.type === "agent_runtime.contract_injection");
  const ackSignals = events.filter((event: any) => /ack/i.test(`${event.type} ${event.message} ${JSON.stringify(event.data || {})}`));
  return {
    success: !!trace,
    trace_id: traceId,
    event_count: events.length,
    lifecycle_count: lifecycle.length,
    tool_or_dispatch_count: tools.length,
    blocked_count: blocked.length,
    contract_injection_count: contractInjections.length,
    ack_signal_count: ackSignals.length,
    verdict: !trace ? "missing_trace" : blocked.length ? "needs_review" : "pass",
    latest_events: events.slice(-20),
  };
}

export function buildTraceReplaySuite(limit = 20) {
  const traces = listTraces(limit);
  const replays = traces.map((trace: any) => replayAgentTrace(trace.trace_id));
  const pass = replays.every((item: any) => item.verdict === "pass");
  return {
    pass,
    total: replays.length,
    needs_review: replays.filter((item: any) => item.verdict === "needs_review").length,
    replays,
  };
}

export function runAgentRuntimeKernelSelfTest() {
  const read = recordAgentRuntimeLifecycle({ scope: "global", action: "inspect_system", risk: "read", status: "ok", data: { result: { ok: true } } });
  const high = recordAgentRuntimeLifecycle({ scope: "global", action: "delete_task", risk: "high", status: "blocked" });
  const packet = buildWorkerContextPacket({
    project: "frontend",
    task: "适配接口字段",
    analysis: { summary: "前后端契约变更", documentFindings: ["POST /api/demo 新增 name"], constraints: ["不改后端"] },
    contractInjections: [{ source_agent: "backend", target_agent: "frontend", endpoint: "POST /api/demo", summary: "新增 name 字段" }],
    memory: { schema: "ccm-group-memory-context-v1", group_id: "g1", target_project: "frontend", rendered_text: "群聊记忆：必须兼容旧字段。" },
  });
  const rendered = renderWorkerContextPacket(packet);
  const replay = buildTraceReplaySuite(3);
  const checks = {
    readAllowed: read.permission.allowed === true,
    highRiskAsks: high.permission.needs_confirmation === true,
    contextBudgetComputed: packet.context_budget.estimated_tokens > 0,
    contextUsageComputed: packet.context_usage?.schema === "ccm-worker-context-usage-v1"
      && packet.context_usage?.categories?.some((item: any) => item.id === "group_memory_rendered" && Number(item.tokens || 0) > 0)
      && packet.context_usage?.categories?.some((item: any) => item.id === "memory_reinjection_proof" && Number(item.tokens || 0) > 0)
      && packet.context_usage?.categories?.some((item: any) => item.id === "free_space")
      && packet.context_usage?.categories?.some((item: any) => item.id === "autocompact_buffer"),
    workerPacketHasMemoryReinjectionProof: packet.memory_reinjection_proof?.schema === "ccm-worker-context-memory-reinjection-proof-v1"
      && packet.memory_reinjection_proof?.status === "injected"
      && rendered.includes("Memory reinjection proof"),
    workerPacketHasAckGate: rendered.includes("ACK gate"),
    workerPacketRendersContextUsage: rendered.includes("Context usage budget"),
    workerPacketRendersMemory: rendered.includes("平台记忆") && rendered.includes("必须兼容旧字段"),
    contractInjectionHasId: packet.contract_injections[0]?.injection_id,
    replaySuiteShape: Array.isArray(replay.replays),
  };
  return { pass: Object.values(checks).every(Boolean), checks, read, high, packet, replay };
}

export function runWorkerContextUsageSelfTest() {
  const packet = buildWorkerContextPacket({
    group: { id: "context-usage-group", name: "Context Usage", members: [{ project: "api" }] },
    project: "api",
    taskId: "context-usage-task",
    traceId: "trace-context-usage",
    task: "修复 CONTEXT_USAGE_SENTINEL，并使用 provider re-proof brief。",
    analysis: {
      summary: "Context usage budget selftest",
      constraints: ["必须保留 CONTEXT_USAGE_SENTINEL"],
      documentFindings: ["src/context-usage.ts"],
    },
    replayRepairDispatchBriefs: [{
      brief_id: "brief-context-usage",
      work_item_id: "work-context-usage",
      source: "api_microcompact_native_apply_provider_reproof",
      provider_reproof_status: "needed",
      provider_reproof_reason: "missing_native_request_adapter_telemetry",
      request_patch_checksum: "request-context-usage",
      runner_request_id: "runner-context-usage",
      should_create_real_task: false,
    }],
    memory: {
      schema: "ccm-group-memory-context-v1",
      group_id: "context-usage-group",
      target_project: "api",
      rendered_text: "类型化长期记忆（MEMORY.md）：CONTEXT_USAGE_SENTINEL src/context-usage.ts",
      typed_memory_recall: {
        recalled: [{ relPath: "context-usage.md", type: "reference", snippet: "CONTEXT_USAGE_SENTINEL" }],
      },
    },
    verification: { hints: ["npm run check"] },
  });
  const rendered = renderWorkerContextPacket(packet);
  const categories = new Map((packet.context_usage?.categories || []).map((item: any) => [item.id, item]));
  const checks = {
    schema: packet.context_usage?.schema === "ccm-worker-context-usage-v1",
    categorizesTaskAndMemory: Number((categories.get("task_goal") as any)?.tokens || 0) > 0
      && Number((categories.get("group_memory_rendered") as any)?.tokens || 0) > 0,
    categorizesReplayBrief: Number((categories.get("replay_repair_dispatch_briefs") as any)?.tokens || 0) > 0,
    categorizesTypedRecall: Number((categories.get("typed_memory_recall") as any)?.tokens || 0) > 0,
    categorizesMemoryReinjectionProof: Number((categories.get("memory_reinjection_proof") as any)?.tokens || 0) > 0,
    keepsBudgetBuffers: categories.has("free_space")
      && Number((categories.get("autocompact_buffer") as any)?.tokens || 0) > 0,
    suggestsReductions: Array.isArray(packet.context_usage?.suggested_reductions),
    statusOk: ["ok", "warn", "compact_recommended", "critical", "over_budget"].includes(String(packet.context_usage?.status || "")),
    renderedMentionsUsage: rendered.includes("Context usage budget")
      && rendered.includes("Replay repair dispatch briefs")
      && rendered.includes("Autocompact buffer"),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    usage: {
      status: packet.context_usage?.status,
      total_tokens: packet.context_usage?.total_tokens,
      free_tokens: packet.context_usage?.free_tokens,
      top_categories: packet.context_usage?.top_categories,
    },
  };
}

export function runWorkerContextProviderDispatchOverrideFollowupReceiptContractSelfTest() {
  const advisory = {
    schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
    groupId: "runtime-provider-override-followup-contract",
    project: "api",
    agent_type: "codex",
    health_status: "monitor",
    dispatch_policy: "allow_with_receipt_sampling",
    should_hold_dispatch: false,
    selected_candidate: {
      schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
      groupId: "runtime-provider-override-followup-contract",
      project: "api",
      agent_type: "codex",
      health_status: "monitor",
      dispatch_policy: "allow_with_receipt_sampling",
      should_hold_dispatch: false,
      provider_override_followup_repaired: true,
      provider_override_followup_repaired_count: 1,
      provider_override_followup_memory_provenance_usage_count: 1,
      provider_override_followup_current_source_verified_count: 1,
      provider_override_followup_last_completed_at: "2026-07-10T04:31:00.000Z",
      provider_override_followup_fresh_after_last_violation: true,
      provider_override_followup_rel_paths: ["pressure-provider-dispatch-override-followup-pre-dispatch-memory.md"],
      provider_override_followup_work_item_ids: ["work-provider-override-followup-runtime"],
      provider_override_followup_override_ids: ["provider-dispatch-override:runtime"],
    },
  };
  const packet = buildWorkerContextPacket({
    group: { id: "runtime-provider-override-followup-contract", members: [{ project: "api" }] },
    project: "api",
    agentType: "codex",
    task: "验证 provider override follow-up repaired-history sampling contract。",
    pressureProvenanceProviderDispatchAdvisory: advisory,
    contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
  });
  const rendered = renderWorkerContextPacket(packet);
  const categories = new Map((packet.context_usage?.categories || []).map((item: any) => [item.id, item]));
  const contract = packet.pressure_provenance_provider_dispatch_override_followup_receipt_contract || {};
  const checks = {
    packetCarriesContract: contract.schema === "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1"
      && contract.active === true
      && contract.provider_override_followup_repaired === true
      && contract.sampling_required === true,
    acceptanceRequiresSamplingReceipt: packet.acceptance?.pressure_provenance_provider_dispatch_override_followup_sampling_required === true
      && packet.acceptance?.pressure_provenance_provider_dispatch_override_followup_receipt_required === true
      && packet.acceptance?.provider_dispatch_override_followup_history_reverification_required === true
      && packet.acceptance?.memory_provenance_usage_required === true,
    usageCategorizesContract: Number((categories.get("pressure_provenance_provider_dispatch_override_followup_receipt_contract") as any)?.tokens || 0) > 0
      && (categories.get("pressure_provenance_provider_dispatch_override_followup_receipt_contract") as any)?.required === true,
    renderedShowsContract: rendered.includes("Provider dispatch override follow-up receipt contract")
      && rendered.includes("providerDispatchOverrideFollowupHistoryReverified")
      && rendered.includes("pressure-provider-dispatch-override-followup-pre-dispatch-memory.md")
      && rendered.includes("work-provider-override-followup-runtime"),
    advisoryDoesNotHold: packet.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === false
      && packet.acceptance?.pressure_provenance_provider_dispatch_hold_required === false,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    contract: {
      schema: contract.schema || "",
      active: contract.active === true,
      rel_paths: contract.rel_paths || [],
      followup_work_item_ids: contract.followup_work_item_ids || [],
    },
    acceptance: packet.acceptance,
  };
}
