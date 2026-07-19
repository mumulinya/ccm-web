// Behavior-freeze split from runtime-kernel-part-01.ts (part 1/2).

// Behavior-freeze split from runtime-kernel.ts (part 1/3).
// Typed memory delivery, pressure provenance contracts, and shared helpers.

import * as crypto from "crypto";
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


export interface AgentPermissionRule {
  id: string;
  scope: AgentRuntimeScope | "all";
  action: string;
  target?: string;
  risk?: AgentRuntimeRisk | "all";
  decision: AgentRuntimeDecision;
  reason: string;
}

export const DEFAULT_PERMISSION_RULES: AgentPermissionRule[] = [
  { id: "read-auto", scope: "all", action: "*", risk: "read", decision: "allow", reason: "只读动作默认允许" },
  { id: "worker-dispatch-ask", scope: "group", action: "dispatch_worker", risk: "agent", decision: "ask", reason: "子 Agent 派发需要当前用户消息授权或任务上下文" },
  { id: "high-risk-ask", scope: "all", action: "*", risk: "high", decision: "ask", reason: "高风险动作必须确认" },
];

export function compact(value: any, max = 1200) {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return text.length <= max ? text : `${text.slice(0, Math.ceil(max * 0.65))}\n...[truncated ${text.length - max} chars]...\n${text.slice(-Math.floor(max * 0.25))}`;
}

export function hash(value: any, len = 12) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, len);
}

export function uniqueRuntimeStrings(values: any[] = [], limit = 24) {
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

export function renderWorkerPacketMemory(memory: any) {
  if (!memory) return "";
  const transport = taskAgentMemoryTransport(memory);
  if (transport.present && !transport.valid) return `[CCM task-Agent memory entry sync invalid: ${transport.issues.join(",")}]`;
  if (transport.mode === "continuation") return "";
  if (transport.mode === "delta") return transport.text;
  const compactMemory = (value: any, max = 5000) => {
    const text = typeof value === "string" ? value : JSON.stringify(value || {});
    return text.length <= max ? text : `${text.slice(0, Math.ceil(max * 0.68))}\n...[memory truncated ${text.length - max} chars]...\n${text.slice(-Math.floor(max * 0.2))}`;
  };
  if (typeof memory === "string") return compactMemory(memory);
  const schema = String(memory.schema || "ccm-memory-context");
  const continuity = memory.session_continuity
    || memory.sessionContinuity
    || memory.group_memory?.session_continuity
    || memory.groupMemory?.session_continuity
    || null;
  const continuityText = continuity?.schema === "ccm-parent-session-continuity-v2"
    ? [
      "【父会话正式连续性上下文】",
      `scope=${continuity.scope || ""}; session=${continuity.group_session_id || continuity.project_session_id || ""}; source=${continuity.summary_source || ""}; checksum=${continuity.summary_checksum || ""}`,
      continuity.summary ? `模型摘要：${JSON.stringify(continuity.summary)}` : "",
      continuity.session_memory ? `Session Memory：${JSON.stringify(continuity.session_memory)}` : "",
      Array.isArray(continuity.recent_messages) && continuity.recent_messages.length
        ? `近期原文（${Number(continuity.recent_window?.preservedTokenCount || 0)} tokens）：${JSON.stringify(continuity.recent_messages)}`
        : "",
    ].filter(Boolean).join("\n")
    : "";
  const rendered = memory.rendered_text || memory.renderedText || memory.summary || "";
  const invokedSkillAttachmentText = String(
    memory.invoked_skill_attachment_text
      || memory.invokedSkillAttachmentText
      || memory.group_memory?.invoked_skill_attachment_text
      || memory.group_memory?.invokedSkillAttachmentText
      || memory.groupMemory?.invoked_skill_attachment_text
      || memory.groupMemory?.invokedSkillAttachmentText
      || ""
  ).trim();
  const planAttachmentText = String(
    memory.plan_attachment_text
      || memory.planAttachmentText
      || memory.group_memory?.plan_attachment_text
      || memory.group_memory?.planAttachmentText
      || memory.groupMemory?.plan_attachment_text
      || memory.groupMemory?.planAttachmentText
      || ""
  ).trim();
  const dynamicContextDeltaText = String(
    memory.dynamic_context_delta_text
      || memory.dynamicContextDeltaText
      || memory.group_memory?.dynamic_context_delta_text
      || memory.group_memory?.dynamicContextDeltaText
      || memory.groupMemory?.dynamic_context_delta_text
      || memory.groupMemory?.dynamicContextDeltaText
      || ""
  ).trim();
  if (rendered) {
    return [
      `平台记忆：${schema}`,
      memory.group_id ? `group_id: ${memory.group_id}` : "",
      memory.target_project ? `target_project: ${memory.target_project}` : "",
      invokedSkillAttachmentText && !String(rendered).includes(invokedSkillAttachmentText) ? invokedSkillAttachmentText : "",
      planAttachmentText && !String(rendered).includes(planAttachmentText) ? planAttachmentText : "",
      dynamicContextDeltaText && !String(rendered).includes(dynamicContextDeltaText) ? dynamicContextDeltaText : "",
      continuityText,
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
  return [`平台记忆：${schema}`, continuityText, compactMemory(memory)].filter(Boolean).join("\n");
}

export function extractWorkerTypedMemoryRecall(memory: any = null) {
  if (!memory || typeof memory !== "object") return null;
  const candidates = [
    memory.typed_memory_recall,
    memory.typedMemoryRecall,
    memory.typed_memory,
    memory.typedMemory,
    memory.group_memory?.typed_memory_recall,
    memory.group_memory?.typedMemoryRecall,
    memory.groupMemory?.typed_memory_recall,
    memory.groupMemory?.typedMemoryRecall,
    memory.group_state?.typedMemory?.recall,
    memory.group_state?.typed_memory?.recall,
  ];
  return candidates.find((candidate: any) => candidate?.schema === "ccm-group-typed-memory-recall-v1") || null;
}

export function extractWorkerTypedMemoryDeliveryCapsule(memory: any = null) {
  if (!memory || typeof memory !== "object") return null;
  const candidates = [
    memory.typed_memory_delivery_capsule,
    memory.typedMemoryDeliveryCapsule,
    memory.group_memory?.typed_memory_delivery_capsule,
    memory.group_memory?.typedMemoryDeliveryCapsule,
    memory.groupMemory?.typed_memory_delivery_capsule,
    memory.groupMemory?.typedMemoryDeliveryCapsule,
    memory.group_state?.typedMemory?.deliveryCapsule,
    memory.group_state?.typed_memory?.delivery_capsule,
  ];
  return candidates.find((candidate: any) => candidate?.schema === "ccm-child-typed-memory-delivery-capsule-v1") || null;
}

export function workerGroupMemoryContext(memory: any = null) {
  if (!memory || typeof memory !== "object") return {};
  return memory.group_memory || memory.groupMemory || memory;
}

export function buildWorkerTypedMemoryDeliveryExpectedBinding(input: any = {}, memoryInput: any = null) {
  const memory = workerGroupMemoryContext(memoryInput || input.memory || null);
  const sessionBinding = memory.session_binding || memory.sessionBinding || {};
  const typedMemory = memory.group_state?.typedMemory || memory.group_state?.typed_memory || {};
  const ledger = typedMemory.ledger || {};
  const binding: any = {
    schema: "ccm-worker-typed-memory-delivery-expected-binding-v1",
    version: 1,
    group_id: String(input.group?.id || input.group_id || input.groupId || memory.group_id || memory.groupId || ""),
    group_session_id: String(input.group_session_id || input.groupSessionId || memory.group_session_id || memory.groupSessionId || ""),
    target_project: String(input.project || input.target_project || input.targetProject || memory.target_project || memory.targetProject || ""),
    task_id: String(input.task_id || input.taskId || sessionBinding.task_id || sessionBinding.taskId || ""),
    task_agent_session_id: String(input.task_agent_session_id || input.taskAgentSessionId || sessionBinding.task_agent_session_id || sessionBinding.taskAgentSessionId || ""),
    recall_scope: String(input.memory_recall_scope || input.memoryRecallScope || ledger.scope || ""),
    compact_epoch: String(input.memory_compact_epoch || input.memoryCompactEpoch || ledger.compactEpoch || ledger.compact_epoch || ""),
  };
  binding.required_fields = Object.entries(binding)
    .filter(([key, value]) => !["schema", "version", "required_fields", "binding_checksum"].includes(key) && !!String(value || ""))
    .map(([key]) => key);
  binding.binding_checksum = hash([
    binding.version,
    binding.group_id,
    binding.group_session_id,
    binding.target_project,
    binding.task_id,
    binding.task_agent_session_id,
    binding.recall_scope,
    binding.compact_epoch,
  ], 32);
  return binding;
}

function workerTypedMemoryDeliveryCapsuleChecksum(capsule: any = {}) {
  const rows = Array.isArray(capsule.rows) ? capsule.rows : [];
  const version = Number(capsule.version || 1);
  if (version >= 2) {
    return hash([
      version,
      String(capsule.group_id || capsule.groupId || ""),
      String(capsule.group_session_id || capsule.groupSessionId || ""),
      String(capsule.target_project || capsule.targetProject || ""),
      String(capsule.task_id || capsule.taskId || ""),
      String(capsule.task_agent_session_id || capsule.taskAgentSessionId || ""),
      String(capsule.recall_scope || capsule.recallScope || ""),
      String(capsule.compact_epoch || capsule.compactEpoch || "precompact"),
      capsule.budget || {},
      Number(capsule.candidate_count || 0),
      Number(capsule.considered_count || 0),
      Number(capsule.delivered_count || 0),
      Number(capsule.delivered_chars || 0),
      Number(capsule.delivered_bytes || 0),
      Number(capsule.delivered_lines || 0),
      Number(capsule.delivered_tokens || 0),
      Number(capsule.session_delivered_bytes_after || 0),
      Array.isArray(capsule.required_rel_paths || capsule.requiredRelPaths) ? (capsule.required_rel_paths || capsule.requiredRelPaths) : [],
      Array.isArray(capsule.delivered_rel_paths || capsule.deliveredRelPaths) ? (capsule.delivered_rel_paths || capsule.deliveredRelPaths) : [],
      Array.isArray(capsule.skipped_rel_paths || capsule.skippedRelPaths) ? (capsule.skipped_rel_paths || capsule.skippedRelPaths) : [],
      Array.isArray(capsule.skipped_rows || capsule.skippedRows) ? (capsule.skipped_rows || capsule.skippedRows) : [],
      Number(capsule.truncated_count || 0),
      capsule.budget_exhausted === true,
      rows.map((row: any) => [
        String(row.rel_path || row.relPath || ""),
        String(row.document_checksum || row.documentChecksum || ""),
        String(row.content_checksum || row.contentChecksum || ""),
        String(row.content || ""),
        Number(row.source_chars || 0),
        Number(row.source_bytes || 0),
        Number(row.source_lines || 0),
        Number(row.source_tokens || 0),
        Number(row.delivered_chars || 0),
        Number(row.delivered_bytes || 0),
        Number(row.delivered_lines || 0),
        Number(row.delivered_tokens || 0),
        row.truncated === true,
        Array.isArray(row.truncation_reasons || row.truncationReasons) ? (row.truncation_reasons || row.truncationReasons) : [],
      ]),
    ], 32);
  }
  return hash([
    version,
    String(capsule.group_id || capsule.groupId || ""),
    String(capsule.group_session_id || capsule.groupSessionId || ""),
    String(capsule.target_project || capsule.targetProject || ""),
    String(capsule.task_id || capsule.taskId || ""),
    String(capsule.task_agent_session_id || capsule.taskAgentSessionId || ""),
    String(capsule.recall_scope || capsule.recallScope || ""),
    String(capsule.compact_epoch || capsule.compactEpoch || "precompact"),
    Array.isArray(capsule.required_rel_paths || capsule.requiredRelPaths) ? (capsule.required_rel_paths || capsule.requiredRelPaths) : [],
    rows.map((row: any) => [
      String(row.rel_path || row.relPath || ""),
      String(row.document_checksum || row.documentChecksum || ""),
      String(row.content_checksum || row.contentChecksum || ""),
      String(row.content || ""),
      row.truncated === true,
    ]),
  ], 32);
}

function workerTypedMemoryDeliveryLeaseChecksum(lease: any = {}) {
  return hash([
    Number(lease.version || 0),
    String(lease.lease_id || lease.leaseId || ""),
    String(lease.status || ""),
    String(lease.group_id || lease.groupId || ""),
    String(lease.group_session_id || lease.groupSessionId || ""),
    String(lease.target_project || lease.targetProject || ""),
    String(lease.task_id || lease.taskId || ""),
    String(lease.task_agent_session_id || lease.taskAgentSessionId || ""),
    String(lease.recall_scope || lease.recallScope || ""),
    String(lease.compact_epoch || lease.compactEpoch || "precompact"),
    String(lease.capsule_checksum || lease.capsuleChecksum || ""),
    Array.isArray(lease.delivered_rel_paths || lease.deliveredRelPaths) ? (lease.delivered_rel_paths || lease.deliveredRelPaths) : [],
    Number(lease.delivered_bytes || lease.deliveredBytes || 0),
    Number(lease.delivered_tokens || lease.deliveredTokens || 0),
    String(lease.query_checksum || lease.queryChecksum || ""),
    Number(lease.attempt_sequence || lease.attemptSequence || 0),
  ], 32);
}

export function buildWorkerTypedMemoryDeliveryLease(capsuleInput: any = null, options: any = {}) {
  if (capsuleInput?.schema !== "ccm-child-typed-memory-delivery-capsule-v1") return null;
  const deliveredRelPaths = Array.isArray(capsuleInput.delivered_rel_paths || capsuleInput.deliveredRelPaths)
    ? (capsuleInput.delivered_rel_paths || capsuleInput.deliveredRelPaths).map(String).filter(Boolean)
    : [];
  if (!deliveredRelPaths.length) return null;
  const queryChecksum = String(options.queryChecksum || options.query_checksum || "")
    || hash(String(options.query || ""), 32);
  const attemptSequence = Math.max(0, Math.floor(Number(options.attemptSequence || options.attempt_sequence || 0) || 0));
  const identity = [
    String(capsuleInput.group_id || capsuleInput.groupId || ""),
    String(capsuleInput.group_session_id || capsuleInput.groupSessionId || ""),
    String(capsuleInput.target_project || capsuleInput.targetProject || ""),
    String(capsuleInput.task_id || capsuleInput.taskId || ""),
    String(capsuleInput.task_agent_session_id || capsuleInput.taskAgentSessionId || ""),
    String(capsuleInput.recall_scope || capsuleInput.recallScope || ""),
    String(capsuleInput.compact_epoch || capsuleInput.compactEpoch || "precompact"),
    String(capsuleInput.capsule_checksum || capsuleInput.capsuleChecksum || ""),
    queryChecksum,
    attemptSequence,
  ];
  const lease: any = {
    schema: "ccm-child-typed-memory-delivery-lease-v1",
    version: 1,
    lease_id: `tmdl_${hash(identity, 24)}`,
    status: "pending",
    group_id: identity[0],
    group_session_id: identity[1],
    target_project: identity[2],
    task_id: identity[3],
    task_agent_session_id: identity[4],
    recall_scope: identity[5],
    compact_epoch: identity[6],
    capsule_checksum: identity[7],
    delivered_rel_paths: deliveredRelPaths,
    delivered_bytes: Math.max(0, Number(capsuleInput.delivered_bytes || capsuleInput.deliveredBytes || 0)),
    delivered_tokens: Math.max(0, Number(capsuleInput.delivered_tokens || capsuleInput.deliveredTokens || 0)),
    query_checksum: queryChecksum,
    attempt_sequence: attemptSequence,
    created_at: String(options.generatedAt || options.generated_at || new Date().toISOString()),
  };
  lease.lease_checksum = workerTypedMemoryDeliveryLeaseChecksum(lease);
  return lease;
}

export function validateWorkerTypedMemoryDeliveryLease(leaseInput: any = null, options: any = {}) {
  if (!leaseInput?.schema) return null;
  const issues: string[] = [];
  if (leaseInput.schema !== "ccm-child-typed-memory-delivery-lease-v1") issues.push("unsupported_schema");
  if (Number(leaseInput.version || 0) !== 1) issues.push("unsupported_version");
  if (String(leaseInput.status || "") !== "pending") issues.push("lease_not_pending");
  if (!String(leaseInput.lease_id || leaseInput.leaseId || "")) issues.push("missing_lease_id");
  for (const field of ["group_id", "group_session_id", "target_project", "task_id", "task_agent_session_id", "recall_scope", "compact_epoch", "capsule_checksum", "query_checksum"]) {
    if (!String(leaseInput[field] || "")) issues.push(`missing_${field}`);
  }
  const relPaths = Array.isArray(leaseInput.delivered_rel_paths || leaseInput.deliveredRelPaths)
    ? (leaseInput.delivered_rel_paths || leaseInput.deliveredRelPaths).map(String).filter(Boolean)
    : [];
  if (!relPaths.length) issues.push("missing_delivered_rel_paths");
  const declaredChecksum = String(leaseInput.lease_checksum || leaseInput.leaseChecksum || "");
  const computedChecksum = workerTypedMemoryDeliveryLeaseChecksum(leaseInput);
  if (!declaredChecksum || declaredChecksum !== computedChecksum) issues.push("lease_checksum_mismatch");
  const capsule = options.capsule || options.deliveryCapsule || options.delivery_capsule || null;
  if (capsule?.schema) {
    if (String(capsule.capsule_checksum || capsule.capsuleChecksum || "") !== String(leaseInput.capsule_checksum || leaseInput.capsuleChecksum || "")) issues.push("capsule_checksum_binding_mismatch");
    const capsuleRelPaths = Array.isArray(capsule.delivered_rel_paths || capsule.deliveredRelPaths)
      ? (capsule.delivered_rel_paths || capsule.deliveredRelPaths).map(String).filter(Boolean)
      : [];
    if (JSON.stringify(capsuleRelPaths) !== JSON.stringify(relPaths)) issues.push("capsule_rel_paths_binding_mismatch");
    if (Number(capsule.delivered_bytes || capsule.deliveredBytes || 0) !== Number(leaseInput.delivered_bytes || leaseInput.deliveredBytes || 0)) issues.push("capsule_bytes_binding_mismatch");
    if (Number(capsule.delivered_tokens || capsule.deliveredTokens || 0) !== Number(leaseInput.delivered_tokens || leaseInput.deliveredTokens || 0)) issues.push("capsule_tokens_binding_mismatch");
    for (const field of ["group_id", "group_session_id", "target_project", "task_id", "task_agent_session_id", "recall_scope", "compact_epoch"]) {
      if (String(capsule[field] || "") !== String(leaseInput[field] || "")) issues.push(`${field}_binding_mismatch`);
    }
  }
  return {
    ...leaseInput,
    delivered_rel_paths: relPaths,
    computed_lease_checksum: computedChecksum,
    checksum_valid: declaredChecksum === computedChecksum,
    validation_issues: [...new Set(issues)],
    valid_for_commit: issues.length === 0,
  };
}

function workerTypedMemoryDispatchTicketChecksum(ticket: any = {}) {
  return hash([
    Number(ticket.version || 0),
    String(ticket.ticket_id || ticket.ticketId || ""),
    String(ticket.status || ""),
    String(ticket.lease_id || ticket.leaseId || ""),
    String(ticket.lease_checksum || ticket.leaseChecksum || ""),
    String(ticket.capsule_checksum || ticket.capsuleChecksum || ""),
    String(ticket.worker_context_packet_id || ticket.workerContextPacketId || ""),
    String(ticket.prompt_checksum || ticket.promptChecksum || ""),
    Number(ticket.attempt_sequence || ticket.attemptSequence || 0),
    String(ticket.compact_epoch || ticket.compactEpoch || "precompact"),
    String(ticket.admitted_at || ticket.admittedAt || ""),
    String(ticket.dispatch_not_after || ticket.dispatchNotAfter || ""),
    String(ticket.consume_point || ticket.consumePoint || ""),
    ticket.single_use === true,
  ], 32);
}

export function buildWorkerTypedMemoryDispatchTicket(input: any = {}, options: any = {}) {
  const lease = input.lease || input.deliveryLease || input.delivery_lease || null;
  const capsule = input.capsule || input.deliveryCapsule || input.delivery_capsule || null;
  const packet = input.workerContextPacket || input.worker_context_packet || input.packet || null;
  const renderedPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
  if (!lease?.schema || !capsule?.schema || !packet?.packet_id || !renderedPrompt) return null;
  const admittedAt = String(options.admittedAt || options.admitted_at || new Date().toISOString());
  const admittedAtMs = Date.parse(admittedAt);
  if (!Number.isFinite(admittedAtMs)) return null;
  const dispatchWindowMs = Math.min(60_000, Math.max(1000, Math.floor(Number(options.dispatchWindowMs || options.dispatch_window_ms || 30_000))));
  const stable = [
    String(lease.lease_id || lease.leaseId || ""),
    String(lease.lease_checksum || lease.leaseChecksum || ""),
    String(capsule.capsule_checksum || capsule.capsuleChecksum || ""),
    String(packet.packet_id || ""),
    hash(renderedPrompt, 32),
    Number(lease.attempt_sequence || lease.attemptSequence || 0),
    String(lease.compact_epoch || lease.compactEpoch || "precompact"),
    admittedAt,
    new Date(admittedAtMs + dispatchWindowMs).toISOString(),
  ];
  const ticket: any = {
    schema: "ccm-child-typed-memory-dispatch-ticket-v1",
    version: 1,
    ticket_id: `tmdt_${hash(stable, 24)}`,
    status: "admitted",
    lease_id: stable[0],
    lease_checksum: stable[1],
    capsule_checksum: stable[2],
    worker_context_packet_id: stable[3],
    prompt_checksum: stable[4],
    attempt_sequence: stable[5],
    compact_epoch: stable[6],
    admitted_at: stable[7],
    dispatch_not_after: stable[8],
    consume_point: "immediately_before_runner_call",
    single_use: true,
  };
  ticket.ticket_checksum = workerTypedMemoryDispatchTicketChecksum(ticket);
  return ticket;
}

export function validateWorkerTypedMemoryDispatchTicket(ticketInput: any = null, options: any = {}) {
  if (!ticketInput?.schema) return null;
  const issues: string[] = [];
  if (ticketInput.schema !== "ccm-child-typed-memory-dispatch-ticket-v1") issues.push("unsupported_schema");
  if (Number(ticketInput.version || 0) !== 1) issues.push("unsupported_version");
  if (String(ticketInput.status || "") !== "admitted") issues.push("ticket_not_admitted");
  if (ticketInput.single_use !== true) issues.push("ticket_not_single_use");
  if (String(ticketInput.consume_point || ticketInput.consumePoint || "") !== "immediately_before_runner_call") issues.push("consume_point_mismatch");
  const declaredChecksum = String(ticketInput.ticket_checksum || ticketInput.ticketChecksum || "");
  const computedChecksum = workerTypedMemoryDispatchTicketChecksum(ticketInput);
  if (!declaredChecksum || declaredChecksum !== computedChecksum) issues.push("ticket_checksum_mismatch");
  const lease = options.lease || options.deliveryLease || options.delivery_lease || null;
  const capsule = options.capsule || options.deliveryCapsule || options.delivery_capsule || null;
  const packet = options.workerContextPacket || options.worker_context_packet || options.packet || null;
  const renderedPrompt = String(options.renderedPrompt || options.rendered_prompt || "");
  if (lease?.schema) {
    if (String(ticketInput.lease_id || ticketInput.leaseId || "") !== String(lease.lease_id || lease.leaseId || "")) issues.push("lease_id_binding_mismatch");
    if (String(ticketInput.lease_checksum || ticketInput.leaseChecksum || "") !== String(lease.lease_checksum || lease.leaseChecksum || "")) issues.push("lease_checksum_binding_mismatch");
    if (Number(ticketInput.attempt_sequence || ticketInput.attemptSequence || 0) !== Number(lease.attempt_sequence || lease.attemptSequence || 0)) issues.push("attempt_sequence_binding_mismatch");
    if (String(ticketInput.compact_epoch || ticketInput.compactEpoch || "") !== String(lease.compact_epoch || lease.compactEpoch || "")) issues.push("compact_epoch_binding_mismatch");
  }
  if (capsule?.schema && String(ticketInput.capsule_checksum || ticketInput.capsuleChecksum || "") !== String(capsule.capsule_checksum || capsule.capsuleChecksum || "")) issues.push("capsule_checksum_binding_mismatch");
  if (packet?.packet_id && String(ticketInput.worker_context_packet_id || ticketInput.workerContextPacketId || "") !== String(packet.packet_id || "")) issues.push("worker_packet_binding_mismatch");
  if (renderedPrompt && String(ticketInput.prompt_checksum || ticketInput.promptChecksum || "") !== hash(renderedPrompt, 32)) issues.push("prompt_checksum_binding_mismatch");
  const admittedAtMs = Date.parse(String(ticketInput.admitted_at || ticketInput.admittedAt || ""));
  const dispatchNotAfterMs = Date.parse(String(ticketInput.dispatch_not_after || ticketInput.dispatchNotAfter || ""));
  if (!Number.isFinite(admittedAtMs) || !Number.isFinite(dispatchNotAfterMs) || dispatchNotAfterMs <= admittedAtMs) issues.push("dispatch_window_invalid");
  const dispatchStartedAt = String(options.dispatchStartedAt || options.dispatch_started_at || "");
  if (options.requireDispatchStart === true || options.require_dispatch_start === true) {
    const dispatchStartedAtMs = Date.parse(dispatchStartedAt);
    if (!Number.isFinite(dispatchStartedAtMs)) issues.push("dispatch_started_at_missing");
    else {
      if (Number.isFinite(admittedAtMs) && dispatchStartedAtMs < admittedAtMs - 2000) issues.push("dispatch_started_before_admission");
      if (Number.isFinite(dispatchNotAfterMs) && dispatchStartedAtMs > dispatchNotAfterMs) issues.push("dispatch_started_after_ticket_expiry");
    }
  }
  return {
    ...ticketInput,
    computed_ticket_checksum: computedChecksum,
    checksum_valid: declaredChecksum === computedChecksum,
    validation_issues: [...new Set(issues)],
    valid_for_dispatch: issues.length === 0,
    valid_for_commit: issues.length === 0 && (!!dispatchStartedAt || options.requireDispatchStart !== true),
  };
}

function truncateWorkerTypedMemoryContent(source: any, maxLines: number, maxBytes: number, maxTokens: number) {
  const lineBounded = String(source || "").replace(/\r/g, "").split("\n").slice(0, Math.max(0, maxLines)).join("\n");
  const points = Array.from(lineBounded);
  let low = 0;
  let high = points.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = points.slice(0, mid).join("");
    if (Buffer.byteLength(candidate, "utf8") <= maxBytes && estimateTextTokens(candidate) <= maxTokens) low = mid;
    else high = mid - 1;
  }
  return points.slice(0, low).join("").trimEnd();
}

function replaceWorkerTypedMemoryDeliveryArtifacts(value: any, oldCapsuleChecksum: string, capsule: any, lease: any, deliveredRelPaths: Set<string>): any {
  if (Array.isArray(value)) return value.map(item => replaceWorkerTypedMemoryDeliveryArtifacts(item, oldCapsuleChecksum, capsule, lease, deliveredRelPaths));
  if (!value || typeof value !== "object") return value;
  if (value.schema === "ccm-child-typed-memory-delivery-capsule-v1" && String(value.capsule_checksum || value.capsuleChecksum || "") === oldCapsuleChecksum) return { ...capsule };
  if (value.schema === "ccm-child-typed-memory-delivery-lease-v1" && String(value.capsule_checksum || value.capsuleChecksum || "") === oldCapsuleChecksum) return lease ? { ...lease } : null;
  const clone: any = {};
  for (const [key, nested] of Object.entries(value)) clone[key] = replaceWorkerTypedMemoryDeliveryArtifacts(nested, oldCapsuleChecksum, capsule, lease, deliveredRelPaths);
  if (clone.schema === "ccm-group-typed-memory-recall-v1") {
    clone.surfaced = Array.from(deliveredRelPaths);
    if (Array.isArray(clone.recalled)) clone.recalled = clone.recalled.filter((doc: any) => deliveredRelPaths.has(String(doc.relPath || doc.rel_path || "").toLowerCase()));
    clone.deliveryBudget = capsule.budget;
    clone.budgetExhausted = capsule.budget_exhausted === true;
  }
  if (clone.ledger && typeof clone.ledger === "object") {
    clone.ledger = { ...clone.ledger, recordedThisTurn: [], pendingThisTurn: capsule.delivered_rel_paths || [] };
  }
  return clone;
}

export function rebuildWorkerTypedMemoryDeliveryForModelContext(memoryInput: any, targetContextWindow: any) {
  const sourceCapsule = extractWorkerTypedMemoryDeliveryCapsule(memoryInput);
  const requestedTargetWindow = Number(targetContextWindow || 0);
  if (!sourceCapsule?.schema || !Number.isFinite(requestedTargetWindow) || requestedTargetWindow <= 0) {
    return { rebuilt: false, memory: memoryInput, capsule: sourceCapsule, lease: null, reason: "capsule_or_target_missing" };
  }
  const targetWindow = Math.min(4_000_000, Math.max(32_000, Math.floor(requestedTargetWindow)));
  const oldWindow = Number(sourceCapsule.budget?.model_context_window || sourceCapsule.model_context_window || 0);
  if (oldWindow > 0 && oldWindow <= targetWindow) return { rebuilt: false, memory: memoryInput, capsule: sourceCapsule, lease: null, reason: "capsule_already_within_model_capacity" };
  const budget = sourceCapsule.budget || {};
  const maxDocuments = Math.min(5, Math.max(1, Number(budget.max_documents || 5)));
  const maxBytesPerDocument = Math.min(4096, Math.max(512, Number(budget.max_bytes_per_document || 4096)));
  const maxLinesPerDocument = Math.min(200, Math.max(10, Number(budget.max_lines_per_document || 200)));
  const maxSessionBytes = Math.min(60 * 1024, Math.max(4096, Number(budget.max_session_bytes || 60 * 1024)));
  const configuredMaxTokens = Math.min(20_000, Math.max(500, Number(budget.configured_max_tokens || 5000)));
  const effectiveMaxTokens = Math.min(configuredMaxTokens, Math.max(1000, Math.floor(targetWindow * 0.02)));
  const sessionDeliveredBytesBefore = Math.max(0, Math.min(maxSessionBytes, Number(budget.session_delivered_bytes_before || 0)));
  const sessionRemainingBytesBefore = Math.max(0, maxSessionBytes - sessionDeliveredBytesBefore);
  const turnMaxBytes = Math.min(maxDocuments * maxBytesPerDocument, sessionRemainingBytesBefore);
  const rows: any[] = [];
  const skippedRows = Array.isArray(sourceCapsule.skipped_rows) ? sourceCapsule.skipped_rows.map((row: any) => ({ ...row })) : [];
  let deliveredChars = 0;
  let deliveredBytes = 0;
  let deliveredLines = 0;
  let deliveredTokens = 0;
  for (const sourceRow of (Array.isArray(sourceCapsule.rows) ? sourceCapsule.rows : []).slice(0, maxDocuments)) {
    const remainingBytes = turnMaxBytes - deliveredBytes;
    const remainingTokens = effectiveMaxTokens - deliveredTokens;
    const relPath = String(sourceRow.rel_path || sourceRow.relPath || "");
    if (remainingBytes <= 0 || remainingTokens <= 0) {
      skippedRows.push({ rel_path: relPath, reason: remainingBytes <= 0 ? "capacity_rebudget_byte_exhausted" : "capacity_rebudget_token_exhausted" });
      continue;
    }
    const content = truncateWorkerTypedMemoryContent(sourceRow.content, maxLinesPerDocument, Math.min(maxBytesPerDocument, remainingBytes), remainingTokens);
    if (!content) {
      skippedRows.push({ rel_path: relPath, reason: "capacity_rebudget_empty" });
      continue;
    }
    const rowDeliveredBytes = Buffer.byteLength(content, "utf8");
    const rowDeliveredLines = workerTypedMemoryDeliveryLineCount(content);
    const rowDeliveredTokens = estimateTextTokens(content);
    const truncationReasons = Array.isArray(sourceRow.truncation_reasons || sourceRow.truncationReasons) ? [...(sourceRow.truncation_reasons || sourceRow.truncationReasons)] : [];
    if (content !== String(sourceRow.content || "")) truncationReasons.push("model_context_rebudget");
    const row = {
      ...sourceRow,
      content,
      content_checksum: hash(content, 32),
      delivered_chars: content.length,
      delivered_bytes: rowDeliveredBytes,
      delivered_lines: rowDeliveredLines,
      delivered_tokens: rowDeliveredTokens,
      truncated: Number(sourceRow.source_chars || String(sourceRow.content || "").length) !== content.length,
      truncation_reasons: [...new Set(truncationReasons)],
    };
    rows.push(row);
    deliveredChars += content.length;
    deliveredBytes += rowDeliveredBytes;
    deliveredLines += rowDeliveredLines;
    deliveredTokens += rowDeliveredTokens;
  }
  const requiredRelPaths = rows.map(row => String(row.rel_path || "")).filter(Boolean);
  const rebuiltBudget = {
    ...budget,
    schema: "ccm-child-typed-memory-delivery-budget-v1",
    max_documents: maxDocuments,
    max_bytes_per_document: maxBytesPerDocument,
    max_lines_per_document: maxLinesPerDocument,
    max_session_bytes: maxSessionBytes,
    configured_max_tokens: configuredMaxTokens,
    model_context_window: targetWindow,
    model_window_ratio: 0.02,
    effective_max_tokens: effectiveMaxTokens,
    session_delivered_bytes_before: sessionDeliveredBytesBefore,
    session_remaining_bytes_before: sessionRemainingBytesBefore,
    turn_max_bytes: turnMaxBytes,
    token_budget_formula: "min(configured_max_tokens,max(1000,floor(model_context_window*0.02)))",
  };
  const capsule: any = {
    ...sourceCapsule,
    budget: rebuiltBudget,
    max_documents: maxDocuments,
    max_bytes_per_document: maxBytesPerDocument,
    max_lines_per_document: maxLinesPerDocument,
    max_session_bytes: maxSessionBytes,
    configured_max_tokens: configuredMaxTokens,
    model_context_window: targetWindow,
    effective_max_tokens: effectiveMaxTokens,
    delivered_count: rows.length,
    delivered_chars: deliveredChars,
    delivered_bytes: deliveredBytes,
    delivered_lines: deliveredLines,
    delivered_tokens: deliveredTokens,
    session_delivered_bytes_before: sessionDeliveredBytesBefore,
    session_delivered_bytes_after: sessionDeliveredBytesBefore + deliveredBytes,
    session_remaining_bytes_after: Math.max(0, maxSessionBytes - sessionDeliveredBytesBefore - deliveredBytes),
    required_rel_paths: requiredRelPaths,
    delivered_rel_paths: requiredRelPaths,
    skipped_rel_paths: skippedRows.map((row: any) => String(row.rel_path || "")).filter(Boolean),
    skipped_rows: skippedRows,
    truncated_count: rows.filter(row => row.truncated === true).length,
    budget_exhausted: sessionRemainingBytesBefore <= 0 || deliveredBytes >= turnMaxBytes || deliveredTokens >= effectiveMaxTokens,
    delivery_complete: rows.length === requiredRelPaths.length && rows.every(row => row.document_checksum && row.content_checksum),
    rows,
  };
  capsule.capsule_checksum = workerTypedMemoryDeliveryCapsuleChecksum(capsule);
  const oldLease = (() => {
    const seen = new Set<any>();
    const walk = (value: any): any => {
      if (!value || typeof value !== "object" || seen.has(value)) return null;
      seen.add(value);
      if (value.schema === "ccm-child-typed-memory-delivery-lease-v1" && String(value.capsule_checksum || value.capsuleChecksum || "") === String(sourceCapsule.capsule_checksum || "")) return value;
      for (const nested of Array.isArray(value) ? value : Object.values(value)) {
        const found = walk(nested);
        if (found) return found;
      }
      return null;
    };
    return walk(memoryInput);
  })();
  const lease = buildWorkerTypedMemoryDeliveryLease(capsule, {
    queryChecksum: oldLease?.query_checksum || oldLease?.queryChecksum || "",
    attemptSequence: oldLease?.attempt_sequence || oldLease?.attemptSequence || 0,
    generatedAt: oldLease?.created_at || oldLease?.createdAt || new Date().toISOString(),
  });
  const deliveredSet = new Set(requiredRelPaths.map((item: string) => item.toLowerCase()));
  const memory = replaceWorkerTypedMemoryDeliveryArtifacts(memoryInput, String(sourceCapsule.capsule_checksum || ""), capsule, lease, deliveredSet);
  return {
    rebuilt: true,
    memory,
    capsule,
    lease,
    previous_model_context_window: oldWindow,
    current_model_context_window: targetWindow,
    previous_capsule_checksum: String(sourceCapsule.capsule_checksum || ""),
    current_capsule_checksum: capsule.capsule_checksum,
  };
}

function workerTypedMemoryDeliveryLineCount(value: any) {
  const text = String(value || "");
  return text ? text.split("\n").length : 0;
}

function hasUnpairedUtf16Surrogate(value: any) {
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

export function validateWorkerTypedMemoryDeliveryCapsule(input: any = null, options: any = {}) {
  if (!input?.schema) return null;
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const integrityIssues: string[] = [];
  if (input.schema !== "ccm-child-typed-memory-delivery-capsule-v1") integrityIssues.push("unsupported_schema");
  if (Number(input.version || 0) !== 2) integrityIssues.push("unsupported_capsule_version");
  const budget = input.budget || {};
  const maxDocuments = Number(budget.max_documents || 0);
  const maxBytesPerDocument = Number(budget.max_bytes_per_document || 0);
  const maxLinesPerDocument = Number(budget.max_lines_per_document || 0);
  const maxSessionBytes = Number(budget.max_session_bytes || 0);
  const configuredMaxTokens = Number(budget.configured_max_tokens || 0);
  const modelContextWindow = Number(budget.model_context_window || 0);
  const effectiveMaxTokens = Number(budget.effective_max_tokens || 0);
  const sessionDeliveredBytesBefore = Number(budget.session_delivered_bytes_before || 0);
  const sessionRemainingBytesBefore = Number(budget.session_remaining_bytes_before || 0);
  const turnMaxBytes = Number(budget.turn_max_bytes || 0);
  const validInteger = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
  if (!validInteger(maxDocuments, 1, 5)) integrityIssues.push("budget_max_documents_invalid");
  if (!validInteger(maxBytesPerDocument, 512, 4096)) integrityIssues.push("budget_max_bytes_per_document_invalid");
  if (!validInteger(maxLinesPerDocument, 10, 200)) integrityIssues.push("budget_max_lines_per_document_invalid");
  if (!validInteger(maxSessionBytes, 4096, 60 * 1024)) integrityIssues.push("budget_max_session_bytes_invalid");
  if (!validInteger(configuredMaxTokens, 500, 20_000)) integrityIssues.push("budget_configured_max_tokens_invalid");
  if (!validInteger(modelContextWindow, 32_000, 4_000_000)) integrityIssues.push("budget_model_context_window_invalid");
  const expectedEffectiveMaxTokens = Math.min(configuredMaxTokens, Math.max(1000, Math.floor(modelContextWindow * 0.02)));
  if (effectiveMaxTokens !== expectedEffectiveMaxTokens) integrityIssues.push("budget_effective_max_tokens_mismatch");
  if (Number(budget.model_window_ratio) !== 0.02) integrityIssues.push("budget_model_window_ratio_mismatch");
  if (!Number.isInteger(sessionDeliveredBytesBefore) || sessionDeliveredBytesBefore < 0 || sessionDeliveredBytesBefore > maxSessionBytes) integrityIssues.push("budget_session_delivered_bytes_before_invalid");
  const expectedSessionRemainingBytesBefore = Math.max(0, maxSessionBytes - sessionDeliveredBytesBefore);
  if (sessionRemainingBytesBefore !== expectedSessionRemainingBytesBefore) integrityIssues.push("budget_session_remaining_bytes_before_mismatch");
  const expectedTurnMaxBytes = Math.min(maxDocuments * maxBytesPerDocument, expectedSessionRemainingBytesBefore);
  if (turnMaxBytes !== expectedTurnMaxBytes) integrityIssues.push("budget_turn_max_bytes_mismatch");
  const mirroredBudgetFields = [
    ["max_documents", maxDocuments],
    ["max_bytes_per_document", maxBytesPerDocument],
    ["max_lines_per_document", maxLinesPerDocument],
    ["max_session_bytes", maxSessionBytes],
    ["configured_max_tokens", configuredMaxTokens],
    ["model_context_window", modelContextWindow],
    ["effective_max_tokens", effectiveMaxTokens],
    ["session_delivered_bytes_before", sessionDeliveredBytesBefore],
  ];
  for (const [field, expected] of mirroredBudgetFields) {
    if (Number(input[field] || 0) !== expected) integrityIssues.push(`${field}_mismatch`);
  }
  let computedDeliveredChars = 0;
  let computedDeliveredBytes = 0;
  let computedDeliveredLines = 0;
  let computedDeliveredTokens = 0;
  for (const row of rows) {
    const content = String(row.content || "");
    const declaredContentChecksum = String(row.content_checksum || row.contentChecksum || "");
    if (!String(row.rel_path || row.relPath || "")) integrityIssues.push("missing_rel_path");
    if (!String(row.document_checksum || row.documentChecksum || "")) integrityIssues.push("missing_document_checksum");
    if (!content) integrityIssues.push("missing_content");
    if (!declaredContentChecksum || declaredContentChecksum !== hash(content, 32)) integrityIssues.push("content_checksum_mismatch");
    if (hasUnpairedUtf16Surrogate(content)) integrityIssues.push("content_unpaired_unicode_surrogate");
    const deliveredChars = content.length;
    const deliveredBytes = Buffer.byteLength(content, "utf8");
    const deliveredLines = workerTypedMemoryDeliveryLineCount(content);
    const deliveredTokens = estimateTextTokens(content);
    if (Number(row.delivered_chars || 0) !== deliveredChars) integrityIssues.push("row_delivered_chars_mismatch");
    if (Number(row.delivered_bytes || 0) !== deliveredBytes) integrityIssues.push("row_delivered_bytes_mismatch");
    if (Number(row.delivered_lines || 0) !== deliveredLines) integrityIssues.push("row_delivered_lines_mismatch");
    if (Number(row.delivered_tokens || 0) !== deliveredTokens) integrityIssues.push("row_delivered_tokens_mismatch");
    if (deliveredBytes > maxBytesPerDocument) integrityIssues.push("row_byte_budget_exceeded");
    if (deliveredLines > maxLinesPerDocument) integrityIssues.push("row_line_budget_exceeded");
    const sourceChars = Number(row.source_chars || 0);
    const sourceBytes = Number(row.source_bytes || 0);
    const sourceLines = Number(row.source_lines || 0);
    const sourceTokens = Number(row.source_tokens || 0);
    if (sourceChars < deliveredChars || sourceBytes < deliveredBytes || sourceLines < deliveredLines || sourceTokens < deliveredTokens) integrityIssues.push("row_source_stats_invalid");
    const shouldBeTruncated = sourceChars !== deliveredChars;
    if ((row.truncated === true) !== shouldBeTruncated) integrityIssues.push("row_truncated_state_mismatch");
    if (row.truncated === true && !Array.isArray(row.truncation_reasons || row.truncationReasons)) integrityIssues.push("row_truncation_reasons_missing");
    computedDeliveredChars += deliveredChars;
    computedDeliveredBytes += deliveredBytes;
    computedDeliveredLines += deliveredLines;
    computedDeliveredTokens += deliveredTokens;
  }
  const declaredChecksum = String(input.capsule_checksum || input.capsuleChecksum || "");
  const computedChecksum = workerTypedMemoryDeliveryCapsuleChecksum(input);
  if (!declaredChecksum || declaredChecksum !== computedChecksum) integrityIssues.push("capsule_checksum_mismatch");
  const requiredRelPaths = Array.isArray(input.required_rel_paths || input.requiredRelPaths) ? (input.required_rel_paths || input.requiredRelPaths).map(String) : [];
  const deliveredRelPaths = rows.map((row: any) => String(row.rel_path || row.relPath || "")).filter(Boolean);
  if (requiredRelPaths.some((relPath: string) => !deliveredRelPaths.includes(relPath))) integrityIssues.push("required_rel_path_missing");
  const declaredDeliveredRelPaths = Array.isArray(input.delivered_rel_paths || input.deliveredRelPaths) ? (input.delivered_rel_paths || input.deliveredRelPaths).map(String) : [];
  if (JSON.stringify(requiredRelPaths) !== JSON.stringify(deliveredRelPaths)) integrityIssues.push("required_rel_paths_mismatch");
  if (JSON.stringify(declaredDeliveredRelPaths) !== JSON.stringify(deliveredRelPaths)) integrityIssues.push("delivered_rel_paths_mismatch");
  if (Number(input.delivered_count || 0) !== rows.length) integrityIssues.push("delivered_count_mismatch");
  if (Number(input.delivered_chars || 0) !== computedDeliveredChars) integrityIssues.push("delivered_chars_mismatch");
  if (Number(input.delivered_bytes || 0) !== computedDeliveredBytes) integrityIssues.push("delivered_bytes_mismatch");
  if (Number(input.delivered_lines || 0) !== computedDeliveredLines) integrityIssues.push("delivered_lines_mismatch");
  if (Number(input.delivered_tokens || 0) !== computedDeliveredTokens) integrityIssues.push("delivered_tokens_mismatch");
  if (Number(input.truncated_count || 0) !== rows.filter((row: any) => row.truncated === true).length) integrityIssues.push("truncated_count_mismatch");
  if (!Number.isInteger(Number(input.candidate_count || 0)) || Number(input.candidate_count || 0) < Number(input.considered_count || 0)) integrityIssues.push("candidate_count_invalid");
  if (!Number.isInteger(Number(input.considered_count || 0)) || Number(input.considered_count || 0) < rows.length || Number(input.considered_count || 0) > maxDocuments) integrityIssues.push("considered_count_invalid");
  if (computedDeliveredBytes > turnMaxBytes) integrityIssues.push("turn_byte_budget_exceeded");
  if (computedDeliveredTokens > effectiveMaxTokens) integrityIssues.push("turn_token_budget_exceeded");
  const expectedSessionDeliveredBytesAfter = sessionDeliveredBytesBefore + computedDeliveredBytes;
  if (Number(input.session_delivered_bytes_after || 0) !== expectedSessionDeliveredBytesAfter) integrityIssues.push("session_delivered_bytes_after_mismatch");
  if (expectedSessionDeliveredBytesAfter > maxSessionBytes) integrityIssues.push("session_byte_budget_exceeded");
  if (Number(input.session_remaining_bytes_after || 0) !== Math.max(0, maxSessionBytes - expectedSessionDeliveredBytesAfter)) integrityIssues.push("session_remaining_bytes_after_mismatch");
  const expectedBudgetExhausted = sessionRemainingBytesBefore <= 0 || computedDeliveredBytes >= turnMaxBytes || computedDeliveredTokens >= effectiveMaxTokens;
  if ((input.budget_exhausted === true) !== expectedBudgetExhausted) integrityIssues.push("budget_exhausted_state_mismatch");
  const expectedBinding = options.expectedBinding || options.expected_binding || null;
  const bindingIssues: string[] = [];
  const bindingFields = [
    ["group_id", "groupId"],
    ["group_session_id", "groupSessionId"],
    ["target_project", "targetProject"],
    ["task_id", "taskId"],
    ["task_agent_session_id", "taskAgentSessionId"],
    ["recall_scope", "recallScope"],
    ["compact_epoch", "compactEpoch"],
  ];
  if (expectedBinding) {
    for (const [snake, camel] of bindingFields) {
      const expected = String(expectedBinding[snake] || expectedBinding[camel] || "");
      if (!expected) continue;
      const actual = String(input[snake] || input[camel] || "");
      if (actual !== expected) bindingIssues.push(`binding_${snake}_mismatch`);
    }
  }
  const checksumValid = integrityIssues.length === 0;
  const bindingValid = bindingIssues.length === 0;
  const issues = [...new Set([...integrityIssues, ...bindingIssues])];
  return {
    ...input,
    rows,
    required_rel_paths: requiredRelPaths,
    delivered_rel_paths: deliveredRelPaths,
    computed_capsule_checksum: computedChecksum,
    checksum_valid: checksumValid,
    budget_valid: !integrityIssues.some(issue => issue.includes("budget") || issue.includes("bytes") || issue.includes("lines") || issue.includes("tokens") || issue.includes("unicode") || issue.includes("truncated")),
    binding_required: !!expectedBinding && Number(expectedBinding.required_fields?.length || 0) > 0,
    binding_valid: bindingValid,
    expected_binding: expectedBinding,
    integrity_issues: [...new Set(integrityIssues)],
    binding_issues: [...new Set(bindingIssues)],
    delivery_complete: input.delivery_complete === true && checksumValid && bindingValid,
    trusted_for_delivery: input.delivery_complete === true && checksumValid && bindingValid,
    validation_issues: issues,
  };
}

export function renderWorkerTypedMemoryDeliveryCapsule(capsuleInput: any = null, expectedBinding: any = null) {
  const capsule = validateWorkerTypedMemoryDeliveryCapsule(capsuleInput, { expectedBinding });
  if (!capsule?.schema || !Array.isArray(capsule.rows) || !capsule.rows.length) return "";
  if (capsule.trusted_for_delivery !== true) {
    return [
      "## Typed memory delivery capsule",
      `INVALID delivery capsule：declared=${capsule.capsule_checksum || "missing"}；computed=${capsule.computed_capsule_checksum || "missing"}；issues=${(capsule.validation_issues || []).join(",") || "unknown"}.`,
      "- Fail closed: do not use capsule memory content; report it in memoryIgnored and rely on current source only.",
    ].join("\n");
  }
  const lines = [
    "## Typed memory delivery capsule",
    `capsule_checksum=${capsule.capsule_checksum}；scope=${capsule.recall_scope || ""}；task_agent_session=${capsule.task_agent_session_id || ""}；compact_epoch=${capsule.compact_epoch || "precompact"}；documents=${capsule.rows.length}.`,
    `delivery_budget=${capsule.delivered_bytes || 0}/${capsule.budget?.turn_max_bytes || 0} bytes；tokens=${capsule.delivered_tokens || 0}/${capsule.budget?.effective_max_tokens || 0}；session=${capsule.session_delivered_bytes_after || 0}/${capsule.budget?.max_session_bytes || 0} bytes.`,
    "- These are bounded task-relevant excerpts from this group chat session. Current repository/resource state wins on conflict.",
  ];
  for (const row of capsule.rows) {
    lines.push(`- [${row.type || "project"}] ${row.rel_path}；document_checksum=${row.document_checksum}；content_checksum=${row.content_checksum}；stale=${row.stale === true}；truncated=${row.truncated === true}`);
    lines.push(`  ${String(row.content || "").replace(/\n/g, "\n  ")}`);
  }
  return lines.join("\n");
}
