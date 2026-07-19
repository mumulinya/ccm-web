// Behavior-freeze split from runtime-kernel.ts (part 2/3).
// Worker context packets, permissions, lifecycle, and trace replay.

import { taskAgentMemoryTransport } from "../tasks/task-agent-memory-entry-sync";
import {
  DEFAULT_AUTO_COMPACT_BUFFER_TOKENS,
  DEFAULT_RESERVED_OUTPUT_TOKENS,
  buildContextBudget,
  estimateTextTokens,
} from "../system/context-budget";
import { appendTraceEvent, getTrace, listTraces } from "../system/reliability-ledger";
import {
  extractGroupPostTurnSummaryDeliveryCapsule,
  validateGroupPostTurnSummaryDeliveryCapsule,
} from "../modules/collaboration/group-post-turn-summary";
import {
  type AgentRuntimeScope,
  type AgentRuntimeRisk,
  type AgentRuntimeLifecycleInput,
  type AgentPermissionRule,
  DEFAULT_PERMISSION_RULES,
  buildWorkerTypedMemoryDeliveryExpectedBinding,
  validateWorkerTypedMemoryDeliveryCapsule,
  compact,
  hash,
  renderWorkerPacketMemory,
  extractWorkerTypedMemoryDeliveryCapsule,
  workerGroupMemoryContext,
  renderWorkerTypedMemoryDeliveryCapsule,
  buildWorkerMemoryRecallTrustContract,
  renderWorkerMemoryRecallTrustContract,
  extractPressureMemoryProvenanceReceiptDiscipline,
  renderPressureMemoryProvenanceReceiptDiscipline,
  extractPressureProvenanceDispatchFeedbackPolicy,
  renderPressureProvenanceDispatchFeedbackPolicy,
  extractPressureProvenanceProviderDispatchAdvisory,
  renderPressureProvenanceProviderDispatchAdvisory,
  extractProviderRankingCompactRepairReceiptMemoryContract,
  renderProviderRankingCompactRepairReceiptMemoryContract,
  extractPostCompactReinjectionRepairReceiptMemoryContract,
  renderPostCompactReinjectionRepairReceiptMemoryContract,
  renderProviderSwitchDecisionReceipt,
} from "./runtime-kernel-part-01";

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
  // A tas_* worker may consume only the parent's canonical model summary /
  // Session Memory. Creating a second deterministic summary here would fork
  // the conversation's continuity. The final dispatch gate must fail closed
  // when that canonical payload does not fit.
  return {
    compacted: false,
    memory,
    summary: null,
    reason: memory ? "canonical_parent_memory_required" : "memory_missing",
    localCompactionDisabled: true,
  };
}

export function buildWorkerContextMemoryReinjectionProof(packet: any = {}) {
  const memory = packet?.memory || null;
  const memoryPolicy = packet?.memory_policy || packet?.memoryPolicy || normalizeWorkerMemoryPolicy({}, memory);
  const retry = packet?.context_compaction_retry || packet?.contextCompactionRetry || null;
  const memoryCompaction = retry?.memory_compaction || retry?.memoryCompaction || null;
  const memoryText = renderWorkerPacketMemory(memory);
  const expectedDeliveryBinding = buildWorkerTypedMemoryDeliveryExpectedBinding(packet, memory);
  const typedMemoryDeliveryCapsule = validateWorkerTypedMemoryDeliveryCapsule(
    packet?.typed_memory_delivery_capsule
    || packet?.typedMemoryDeliveryCapsule
    || extractWorkerTypedMemoryDeliveryCapsule(memory),
    { expectedBinding: expectedDeliveryBinding }
  );
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
    typed_memory_delivery_capsule_present: !!typedMemoryDeliveryCapsule?.schema,
    typed_memory_delivery_capsule_checksum: typedMemoryDeliveryCapsule?.capsule_checksum || "",
    typed_memory_delivery_capsule_checksum_valid: typedMemoryDeliveryCapsule?.checksum_valid === true,
    typed_memory_delivery_capsule_binding_checksum: expectedDeliveryBinding.binding_checksum || "",
    typed_memory_delivery_capsule_binding_valid: typedMemoryDeliveryCapsule?.binding_valid === true,
    typed_memory_delivery_capsule_trusted: typedMemoryDeliveryCapsule?.trusted_for_delivery === true,
    typed_memory_delivery_capsule_complete: typedMemoryDeliveryCapsule?.delivery_complete === true,
    typed_memory_delivery_capsule_required_rel_paths: typedMemoryDeliveryCapsule?.required_rel_paths || [],
    typed_memory_delivery_capsule_delivered_rel_paths: typedMemoryDeliveryCapsule?.delivered_rel_paths || [],
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
  const expectedDeliveryBinding = buildWorkerTypedMemoryDeliveryExpectedBinding(packet, memory);
  const typedMemoryDeliveryCapsule = validateWorkerTypedMemoryDeliveryCapsule(
    packet?.typed_memory_delivery_capsule
    || packet?.typedMemoryDeliveryCapsule
    || extractWorkerTypedMemoryDeliveryCapsule(memory),
    { expectedBinding: expectedDeliveryBinding }
  );
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
  const memoryRecallTrustContract = packet?.memory_recall_trust_contract
    || packet?.memoryRecallTrustContract
    || buildWorkerMemoryRecallTrustContract(memory, memoryPolicy);
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
    workerContextUsageCategory("memory_recall_trust_contract", "Memory recall trust contract", memoryRecallTrustContract || "", { source: "typed-memory-freshness", required: memoryRecallTrustContract?.receipt_required === true }),
    workerContextUsageCategory("typed_memory_delivery_capsule", "Typed memory delivery capsule", typedMemoryDeliveryCapsule || "", { source: "typed-memory-delivery", required: memoryRecallTrustContract?.delivery_capsule_required === true }),
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
    workerContextUsageCategory("cleanup_commit_repair_context", "Cleanup commit repair context", packet?.cleanup_commit_repair_context || "", { source: "cleanup-commit-repair", required: Number(packet?.cleanup_commit_repair_context?.brief_count || 0) > 0 }),
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
    capacity_provenance: options.capacityProvenance || options.capacity_provenance || packet?.model_context_capacity || null,
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
  groupSessionId?: string;
  group_session_id?: string;
  taskAgentSessionId?: string;
  task_agent_session_id?: string;
  dependencies?: any[];
  contractInjections?: any[];
  replayRepairDispatchBriefs?: any[];
  cleanupCommitRepairContext?: any;
  cleanup_commit_repair_context?: any;
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
  modelContextCapacity?: any;
  model_context_capacity?: any;
  verification?: any;
  contextUsageOptions?: any;
}) {
  const groupMembers = Array.isArray(input.group?.members) ? input.group.members.map((m: any) => m.project).filter(Boolean) : [];
  const contractInjections = Array.isArray(input.contractInjections) ? input.contractInjections : [];
  const replayRepairDispatchBriefs = Array.isArray(input.replayRepairDispatchBriefs) ? input.replayRepairDispatchBriefs : [];
  const cleanupCommitRepairContext = input.cleanupCommitRepairContext || input.cleanup_commit_repair_context || null;
  const memoryPolicy = normalizeWorkerMemoryPolicy(input, input.memory || null);
  const groupMemoryContext = workerGroupMemoryContext(input.memory || null);
  const groupMemorySessionBinding = groupMemoryContext.session_binding || groupMemoryContext.sessionBinding || {};
  const postTurnSummaryDeliveryCapsule = validateGroupPostTurnSummaryDeliveryCapsule(
    extractGroupPostTurnSummaryDeliveryCapsule(input.memory || null),
    {
      expectedBinding: {
        group_id: String(input.group?.id || groupMemoryContext.group_id || ""),
        group_session_id: String(input.groupSessionId || input.group_session_id || groupMemoryContext.group_session_id || ""),
        task_id: String(input.taskId || groupMemorySessionBinding.task_id || ""),
        target_project: String(input.project || groupMemoryContext.target_project || ""),
        task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || groupMemorySessionBinding.task_agent_session_id || ""),
        native_session_id: String(groupMemorySessionBinding.native_session_id || ""),
        execution_id: String(groupMemorySessionBinding.execution_id || ""),
        ...(Number(groupMemorySessionBinding.turn || 0) > 0 ? {
          attempt_sequence: Number(groupMemorySessionBinding.turn || 0),
          invocation_kind: Number(groupMemorySessionBinding.turn || 0) > 1 ? "resume" : "spawn",
        } : {}),
      },
    }
  );
  const taskAgentInvocationLineage = groupMemoryContext.task_agent_invocation_lineage
    || groupMemoryContext.taskAgentInvocationLineage
    || null;
  const typedMemoryDeliveryExpectedBinding = buildWorkerTypedMemoryDeliveryExpectedBinding(input, input.memory || null);
  const typedMemoryDeliveryCapsule = validateWorkerTypedMemoryDeliveryCapsule(
    extractWorkerTypedMemoryDeliveryCapsule(input.memory || null),
    { expectedBinding: typedMemoryDeliveryExpectedBinding }
  );
  const memoryRecallTrustContract = buildWorkerMemoryRecallTrustContract(input.memory || null, memoryPolicy, typedMemoryDeliveryCapsule, typedMemoryDeliveryExpectedBinding);
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
    packet_id: `wcp_${hash([input.project, input.task, input.traceId, agentType, contractInjections, replayRepairDispatchBriefs, cleanupCommitRepairContext?.brief_count ? cleanupCommitRepairContext : null, memoryRecallTrustContract?.contract_checksum || "", postTurnSummaryDeliveryCapsule?.capsule_checksum || "", taskAgentInvocationLineage, pressureProvenanceDispatchFeedbackPolicy?.active ? pressureProvenanceDispatchFeedbackPolicy : null, pressureProvenanceProviderDispatchAdvisory?.schema ? pressureProvenanceProviderDispatchAdvisory : null, pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?.active ? pressureProvenanceProviderDispatchOverrideFollowupReceiptContract : null, providerRankingCompactRepairReceiptMemoryContract?.active ? providerRankingCompactRepairReceiptMemoryContract : null, postCompactReinjectionRepairReceiptMemoryContract?.active ? postCompactReinjectionRepairReceiptMemoryContract : null, providerSwitchDecisionReceipt?.valid ? providerSwitchDecisionReceipt : null, input.modelContextCapacity || input.model_context_capacity || null], 14)}`,
    version: 1,
    project: input.project,
    agent_type: agentType,
    agentType,
    model_context_capacity: input.modelContextCapacity || input.model_context_capacity || null,
    task_id: input.taskId || "",
    group_session_id: typedMemoryDeliveryExpectedBinding.group_session_id || "",
    task_agent_session_id: typedMemoryDeliveryExpectedBinding.task_agent_session_id || "",
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
    cleanup_commit_repair_context: cleanupCommitRepairContext?.brief_count > 0 ? cleanupCommitRepairContext : null,
    memory: input.memory || null,
    memory_policy: memoryPolicy,
    memory_recall_trust_contract: memoryRecallTrustContract,
    typed_memory_delivery_expected_binding: typedMemoryDeliveryExpectedBinding,
    typed_memory_delivery_capsule: typedMemoryDeliveryCapsule,
    post_turn_summary_delivery_capsule: postTurnSummaryDeliveryCapsule,
    task_agent_invocation_lineage: taskAgentInvocationLineage?.invocation_edge_id ? {
      schema: "ccm-task-agent-invocation-lineage-binding-v1",
      invocation_edge_id: taskAgentInvocationLineage.invocation_edge_id,
      parent_invocation_edge_id: taskAgentInvocationLineage.parent_invocation_edge_id || "",
      root_invocation_edge_id: taskAgentInvocationLineage.root_invocation_edge_id || taskAgentInvocationLineage.invocation_edge_id,
      branch_id: taskAgentInvocationLineage.branch_id || "",
      parent_branch_id: taskAgentInvocationLineage.parent_branch_id || "",
      branch_kind: taskAgentInvocationLineage.branch_kind || "main",
      expected_lineage_head_checksum: taskAgentInvocationLineage.expected_lineage_head_checksum || "",
      capsule_checksum: postTurnSummaryDeliveryCapsule?.capsule_checksum || "",
    } : null,
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
      typed_memory_usage_receipt_required: memoryRecallTrustContract?.receipt_required === true,
      typed_memory_current_source_verification_required: memoryRecallTrustContract?.verification_required_before_recommendation === true,
      typed_memory_stale_recall_present: Number(memoryRecallTrustContract?.stale_count || 0) > 0,
      typed_memory_required_rel_paths: memoryRecallTrustContract?.required_rel_paths || [],
      typed_memory_delivery_capsule_required: memoryRecallTrustContract?.delivery_capsule_required === true,
      typed_memory_delivery_capsule_checksum_valid: typedMemoryDeliveryCapsule?.checksum_valid === true,
      typed_memory_delivery_capsule_binding_valid: typedMemoryDeliveryCapsule?.binding_valid === true,
      typed_memory_delivery_capsule_trusted: typedMemoryDeliveryCapsule?.trusted_for_delivery === true,
      typed_memory_delivery_capsule_complete: typedMemoryDeliveryCapsule?.delivery_complete === true,
      post_turn_summary_delivery_capsule_required: postTurnSummaryDeliveryCapsule?.schema ? true : false,
      post_turn_summary_delivery_capsule_checksum_valid: postTurnSummaryDeliveryCapsule?.checksum_valid === true,
      post_turn_summary_delivery_capsule_binding_valid: postTurnSummaryDeliveryCapsule?.binding_valid === true,
      post_turn_summary_delivery_capsule_receipt_required: postTurnSummaryDeliveryCapsule?.trusted_for_delivery === true,
      contract_injection_receipt_required: contractInjections.length > 0,
      replay_repair_dispatch_brief_receipt_required: replayRepairDispatchBriefs.length > 0,
      cleanup_commit_repair_brief_receipt_required: cleanupCommitRepairContext?.brief_count > 0,
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
      post_compact_completion_memory_preservation_closure_feedback_conflict_current_session_verification_required: postCompactReinjectionRepairReceiptMemoryContract?.closure_feedback_conflict_active === true,
      post_compact_completion_memory_preservation_closure_feedback_historical_majority_authorization_allowed: false,
      post_compact_completion_memory_preservation_closure_conflict_resolution_reverification_required: postCompactReinjectionRepairReceiptMemoryContract?.closure_conflict_resolution_active === true,
      post_compact_completion_memory_preservation_closure_conflict_resolution_reversible: postCompactReinjectionRepairReceiptMemoryContract?.closure_conflict_resolution_active === true,
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
  const cleanupCommitRepairContext = packet?.cleanup_commit_repair_context || null;
  const cleanupCommitRepairLines = cleanupCommitRepairContext?.brief_count > 0
    ? [
      "Cleanup commit repair brief (exact assignment binding):",
      ...cleanupCommitRepairContext.briefs.map((item: any) => [
        `- brief_id=${item.brief_id || ""}`,
        `work_item_id=${item.work_item_id || ""}`,
        `transaction_id=${item.transaction_id || ""}`,
        item.title ? `title=${item.title}` : "",
        "shouldCreateRealTask=false",
      ].filter(Boolean).join("；")),
      `- assignment_binding_id=${cleanupCommitRepairContext.assignment_binding_id || ""}`,
      "- 只能按简报收集和复核证据；不得删除 quarantine/WAL，不得自行 claim、resolve 或扩大到其他群聊。",
    ]
    : [];
  const memoryText = renderWorkerPacketMemory(packet?.memory || null);
  const memoryPolicyText = renderWorkerMemoryPolicy(packet?.memory_policy || packet?.memoryPolicy || null);
  const typedMemoryDeliveryExpectedBinding = buildWorkerTypedMemoryDeliveryExpectedBinding(packet, packet?.memory || null);
  const memoryEntryTransport = taskAgentMemoryTransport(packet?.memory || null);
  const typedMemoryDeliveryCapsuleText = ["delta", "continuation"].includes(memoryEntryTransport.mode)
    ? ""
    : renderWorkerTypedMemoryDeliveryCapsule(
      packet?.typed_memory_delivery_capsule
      || packet?.typedMemoryDeliveryCapsule
      || extractWorkerTypedMemoryDeliveryCapsule(packet?.memory || null),
      typedMemoryDeliveryExpectedBinding
    );
  const postTurnSummaryDeliveryCapsule = packet?.post_turn_summary_delivery_capsule
    || packet?.postTurnSummaryDeliveryCapsule
    || extractGroupPostTurnSummaryDeliveryCapsule(packet?.memory || null);
  const postTurnSummaryDeliveryCapsuleText = postTurnSummaryDeliveryCapsule?.capsule_checksum
    ? [
      "Post-turn summary delivery capsule:",
      `- capsule_checksum=${postTurnSummaryDeliveryCapsule.capsule_checksum}; task_agent_session_id=${postTurnSummaryDeliveryCapsule.task_agent_session_id || ""}; attempt=${postTurnSummaryDeliveryCapsule.attempt_sequence || 0}; invocation=${postTurnSummaryDeliveryCapsule.invocation_kind || ""}; compact_epoch=${postTurnSummaryDeliveryCapsule.compact_epoch || ""}.`,
      "- Final CCM_AGENT_RECEIPT must cite capsule_checksum when these summaries are delivered.",
    ].join("\n")
    : "";
  const memoryRecallTrustContractText = renderWorkerMemoryRecallTrustContract(
    packet?.memory_recall_trust_contract || packet?.memoryRecallTrustContract || null
  );
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
  const completionMemoryPreservation = retry?.post_compact_receipt_memory_usage_repair_completion_preservation
    || retry?.postCompactReceiptMemoryUsageRepairCompletionPreservation
    || null;
  const memoryProofText = memoryProof?.schema ? [
    `Memory reinjection proof：${memoryProof.status || "unknown"}；memory_hash=${memoryProof.packet_memory_hash || ""}；rendered_hash=${memoryProof.rendered_memory_hash || ""}`,
    memoryProof.typed_memory_delivery_capsule_present === true
      ? `- typed_memory_delivery_capsule=${memoryProof.typed_memory_delivery_capsule_checksum || "missing"}；valid=${memoryProof.typed_memory_delivery_capsule_checksum_valid === true}；binding=${memoryProof.typed_memory_delivery_capsule_binding_valid === true}；trusted=${memoryProof.typed_memory_delivery_capsule_trusted === true}；complete=${memoryProof.typed_memory_delivery_capsule_complete === true}`
      : "",
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
    completionMemoryPreservation?.schema ? `- completion_memory_preservation=${completionMemoryPreservation.preserved === true}; required=${completionMemoryPreservation.required === true}; gaps=${(completionMemoryPreservation.gaps || []).join(",") || "none"}.` : "",
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
    postTurnSummaryDeliveryCapsuleText,
    typedMemoryDeliveryCapsuleText,
    memoryRecallTrustContractText,
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
    cleanupCommitRepairLines.join("\n"),
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
