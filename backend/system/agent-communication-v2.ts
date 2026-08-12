import * as crypto from "crypto";
import { withSqliteTaskStore } from "../core/task-store";
import { captureRepoStateIdentity, recordEvidence } from "./unified-evidence-registry";
import { appendUserVisibleAgentEvent } from "./user-visible-agent-events";
import { markAgentReportedSemanticProgress } from "./agent-runtime-progress";

export const AGENT_COMMUNICATION_ENVELOPE_SCHEMA = "ccm-agent-communication-envelope-v2";
export const AGENT_DISPATCH_ACK_SCHEMA = "ccm-agent-dispatch-ack-v2";
export const AGENT_PROGRESS_RECEIPT_SCHEMA = "ccm-agent-progress-receipt-v2";
export const AGENT_RESULT_RECEIPT_SCHEMA = "ccm-agent-result-receipt-v2";
export const AGENT_TERMINAL_RECEIPT_SCHEMA = "ccm-agent-terminal-receipt-v2";

function runtimeDisplayLabel(value: any) {
  const runtime = String(value || "").trim();
  const normalized = runtime.toLowerCase().replace(/[\s_-]+/g, "");
  if (!runtime) return "";
  if (normalized === "claudecode" || normalized === "claude") return "Claude Code";
  if (normalized === "codex") return "Codex";
  if (normalized === "cursor") return "Cursor";
  if (normalized === "gemini" || normalized === "geminicli") return "Gemini";
  if (normalized === "opencode") return "OpenCode";
  if (normalized === "qoder") return "Qoder";
  if (normalized.includes("testagent")) return "TestAgent";
  return runtime;
}

function projectCommunicationEvent(envelope: any, eventType: "agent_started" | "agent_progress" | "agent_completed" | "agent_failed", input: any = {}) {
  if (!envelope?.scope || !envelope?.scopeId || !envelope?.exactSessionId) return null;
  const phase = String(input?.phase || envelope.state || "");
  const waiting = /queued|waiting|ack|verifying|submitted/.test(phase);
  let payload: any = {};
  try { payload = getAgentCommunication(envelope.messageId, { includeEvents: false, includeReceipts: false })?.payload || {}; } catch {}
  const projectId = String(payload.authorizedProject || payload.projectId || payload.project_id || envelope.receiverAgentId || "").trim();
  const projectName = String(payload.projectName || payload.project_name || projectId || "项目 Agent").trim();
  const runtimeLabel = runtimeDisplayLabel(payload.runtimeLabel || payload.runtime_label || payload.runtimeId || payload.runtime_id || input?.runtimeLabel || input?.runtime_label);
  const workItemTitle = String(payload.workItemTitle || payload.work_item_title || input?.workItemTitle || input?.work_item_title || envelope.workItemId || "").trim().slice(0, 300);
  const parallelGroupId = String(payload.parallelGroupId || payload.parallel_group_id || input?.parallelGroupId || input?.parallel_group_id || "").trim();
  const queuePositionValue = Number(input?.queuePosition ?? input?.queue_position);
  const testAgent = /test.?agent/i.test(`${runtimeLabel} ${envelope.receiverAgentId || ""}`);
  const durationMs = Math.max(0, Number(input?.durationMs || input?.duration_ms || 0));
  const terminal = eventType === "agent_completed" || eventType === "agent_failed";
  const actionIdentity = {
    ...(Number.isFinite(Number(payload.taskRevision || payload.task_revision)) ? { revision: Math.max(0, Number(payload.taskRevision || payload.task_revision)) } : {}),
    generation: Math.max(0, Number(envelope.generation || 0)),
    ...(String(payload.bindingChecksum || payload.binding_checksum || "").trim()
      ? { bindingChecksum: String(payload.bindingChecksum || payload.binding_checksum).trim() } : {}),
  };
  const recoveryRequired = /recovery_required|side.?effect.?unknown/i.test(`${phase} ${input?.status || ""}`);
  const permissionRequired = /permission|authorization|denied/i.test(`${phase} ${input?.status || ""}`);
  const safeRetry = input?.retryable === true && ["", "none", "not_started", "safe", "read_only"]
    .includes(String(input?.sideEffectState || input?.side_effect_state || "").toLowerCase());
  const availableActions = eventType !== "agent_failed" ? [] : recoveryRequired
    ? [
      { id: "recheck", kind: "recheck", label: "重新核验", enabled: true, ...actionIdentity },
      { id: "takeover", kind: "takeover", label: "人工接管", enabled: true, ...actionIdentity },
    ]
    : [
      ...(safeRetry ? [{ id: "retry", kind: "retry", label: "重试", enabled: true, ...actionIdentity }] : []),
      ...(permissionRequired ? [{ id: "resolve_permission", kind: "resolve_permission", label: "处理授权", enabled: true, ...actionIdentity }] : []),
      { id: "view_error", kind: "view_error", label: "查看错误", enabled: true, ...actionIdentity },
    ];
  const startedAt = String(input?.startedAt || input?.started_at || payload.startedAt || payload.started_at || envelope.createdAt || envelope.created_at || "")
    || (durationMs > 0 ? new Date(Date.now() - durationMs).toISOString() : new Date().toISOString());
  return appendUserVisibleAgentEvent({
    eventId: `agent-communication:${envelope.messageId}:${eventType}:${input?.receiptChecksum || phase}:${envelope.attempt || 1}`,
    scope: envelope.scope,
    scopeId: envelope.scopeId,
    exactSessionId: envelope.exactSessionId,
    generation: envelope.generation,
    ...(String(payload.anchorMessageId || payload.anchor_message_id || "").trim()
      ? { anchorMessageId: String(payload.anchorMessageId || payload.anchor_message_id).trim() } : {}),
    ...(String(payload.originMessageId || payload.origin_message_id || "").trim()
      ? { originMessageId: String(payload.originMessageId || payload.origin_message_id).trim() } : {}),
    taskId: envelope.taskId,
    workItemId: envelope.workItemId,
    agentRunId: envelope.messageId,
    parentEventId: envelope.parentMessageId,
    ...(parallelGroupId ? { parallelGroupId } : {}),
    eventType,
    display: {
      title: [projectName, runtimeLabel].filter(Boolean).join(" · ") || "执行 Agent",
      target: workItemTitle,
      summary: String(input?.summary || phase || "").slice(0, 500),
      status: eventType === "agent_completed" ? "success" : eventType === "agent_failed" ? "failed" : waiting ? "waiting" : "running",
      toolUseCount: Math.max(0, Number(input?.toolUseCount || input?.tool_use_count || 0)),
      tokenCount: Math.max(0, Number(input?.tokenCount || input?.token_count || input?.totalTokens || 0)),
      durationMs: Math.max(0, Number(input?.durationMs || input?.duration_ms || 0)),
    },
    detail: {
      safeResult: {
        phase,
        status: input?.status || envelope.state,
        filesChanged: input?.filesChanged || input?.files_changed || [],
        verificationResults: input?.verificationResults || input?.verification_results || [],
        blockers: input?.blockers || [],
        contentStored: false,
      },
      fileChanges: input?.filesChanged || input?.files_changed || [],
      evidenceIds: input?.evidenceIds || input?.evidence_ids || [],
      usage: input?.usage || {},
      agentDisplay: {
        projectId,
        projectName,
        runtimeLabel,
        workItemTitle,
        phase,
        attempt: Math.max(1, Number(envelope.attempt || 1)),
        ...(Number.isFinite(queuePositionValue) && queuePositionValue > 0 ? { queuePosition: Math.floor(queuePositionValue) } : {}),
        isParallel: !!parallelGroupId,
      },
      executionStage: {
        kind: envelope.scope === "global"
          ? "coordination_dispatch"
          : testAgent ? "independent_verification" : "project_execution",
        stageRunId: envelope.messageId,
        ...(String(payload.reviewCycleId || payload.review_cycle_id || "").trim()
          ? { reviewCycleId: String(payload.reviewCycleId || payload.review_cycle_id) } : {}),
        attempt: Math.max(1, Number(envelope.attempt || 1)),
        startedAt,
        ...(terminal ? { completedAt: new Date().toISOString() } : {}),
        ...(durationMs > 0 ? { activeDurationMs: durationMs } : {}),
      },
      ...(input?.progressSource && String(input?.summary || "").trim() ? { progress: {
        kind: "key_finding",
        text: String(input.summary).slice(0, 600),
        modelCallIndex: 0,
        relatedToolCallIds: [],
        batchId: `agent-report:${envelope.messageId}:${envelope.attempt || 1}`,
        milestoneChecksum: String(input.receiptChecksum || checksum({ phase, summary: input.summary })).slice(0, 80),
        source: input.progressSource,
        confidence: "declared",
        sourceEventChecksum: String(input.receiptChecksum || checksum({ phase, summary: input.summary })).slice(0, 80),
      } } : {}),
      ...(availableActions.length ? { availableActions } : {}),
    },
  });
}

export type AgentCommunicationMessageType =
  | "task_dispatch"
  | "dispatch_ack"
  | "progress"
  | "heartbeat"
  | "coordination_request"
  | "coordination_resolution"
  | "result"
  | "cancel"
  | "terminal";

export type AgentCommunicationState =
  | "created"
  | "queued"
  | "lease_acquired"
  | "runner_starting"
  | "runner_started"
  | "acknowledged"
  | "executing"
  | "waiting_dependency"
  | "result_submitted"
  | "verifying"
  | "accepted"
  | "rejected"
  | "completed"
  | "startup_timeout"
  | "ack_timeout"
  | "heartbeat_lost"
  | "lease_expired"
  | "cancel_requested"
  | "cancelled"
  | "recovery_required"
  | "stale_receipt"
  | "failed";

export type AgentCommunicationIdentity = {
  taskId: string;
  workItemId?: string;
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  generation: number;
  attempt: number;
  senderAgentId: string;
  receiverAgentId: string;
};

export type AgentCommunicationEnvelopeV2 = {
  schema: typeof AGENT_COMMUNICATION_ENVELOPE_SCHEMA;
  messageId: string;
  messageType: AgentCommunicationMessageType;
  correlationId: string;
  parentMessageId: string;
  taskId: string;
  workItemId: string;
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  generation: number;
  attempt: number;
  leaseId: string;
  senderAgentId: string;
  receiverAgentId: string;
  deadlineAt: string;
  idempotencyKey: string;
  payloadChecksum: string;
  state: AgentCommunicationState;
  contentStored: false;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_AGENT_COMMUNICATION_POLICY = Object.freeze({
  agentCommunicationV2Enabled: true,
  agentRunnerStartTimeoutMs: 60_000,
  agentAckTimeoutMs: 30_000,
  agentHeartbeatIntervalMs: 20_000,
  agentHeartbeatLostTimeoutMs: 90_000,
  agentLeaseTtlMs: 120_000,
  agentMaxAttempts: 3,
  agentMaxParallelPerProject: 2,
  agentMaxParallelGlobal: 6,
  agentRuntimeStructuredProgressEnabled: true,
  strictPreExecutionAckEnabled: true,
  agentProgressFallbackTimeoutMs: 60_000,
  agentRawOutputRetentionMode: "ephemeral",
});

export function readAgentCommunicationPolicy(overrides: any = {}) {
  let stored: any = {};
  try { stored = require("../modules/collaboration/group-orchestrator-config").loadOrchestratorConfig() || {}; } catch {}
  const source = { ...DEFAULT_AGENT_COMMUNICATION_POLICY, ...stored, ...overrides };
  const globalPerProject = Math.max(1, integer(stored.agentMaxParallelPerProject, DEFAULT_AGENT_COMMUNICATION_POLICY.agentMaxParallelPerProject));
  const globalTotal = Math.max(1, integer(stored.agentMaxParallelGlobal, DEFAULT_AGENT_COMMUNICATION_POLICY.agentMaxParallelGlobal));
  return {
    agentCommunicationV2Enabled: source.agentCommunicationV2Enabled !== false,
    agentRunnerStartTimeoutMs: Math.max(5_000, integer(source.agentRunnerStartTimeoutMs, 60_000)),
    agentAckTimeoutMs: Math.max(5_000, integer(source.agentAckTimeoutMs, 30_000)),
    agentHeartbeatIntervalMs: Math.max(5_000, integer(source.agentHeartbeatIntervalMs, 20_000)),
    agentHeartbeatLostTimeoutMs: Math.max(15_000, integer(source.agentHeartbeatLostTimeoutMs, 90_000)),
    agentLeaseTtlMs: Math.max(15_000, integer(source.agentLeaseTtlMs, 120_000)),
    agentMaxAttempts: Math.max(1, Math.min(3, integer(source.agentMaxAttempts, 3))),
    agentMaxParallelPerProject: Math.min(globalPerProject, Math.max(1, integer(source.agentMaxParallelPerProject, globalPerProject))),
    agentMaxParallelGlobal: Math.min(globalTotal, Math.max(1, integer(source.agentMaxParallelGlobal, globalTotal))),
    agentRuntimeStructuredProgressEnabled: source.agentRuntimeStructuredProgressEnabled !== false,
    strictPreExecutionAckEnabled: source.strictPreExecutionAckEnabled !== false,
    agentProgressFallbackTimeoutMs: Math.max(15_000, Math.min(300_000, integer(source.agentProgressFallbackTimeoutMs, 60_000))),
    agentRawOutputRetentionMode: "ephemeral" as const,
  };
}

const terminalStates = new Set<AgentCommunicationState>(["completed", "cancelled", "failed"]);
const allowedTransitions: Record<AgentCommunicationState, Set<AgentCommunicationState>> = {
  created: new Set(["queued", "cancel_requested", "cancelled", "failed"]),
  queued: new Set(["lease_acquired", "cancel_requested", "startup_timeout", "recovery_required", "failed"]),
  lease_acquired: new Set(["runner_starting", "lease_expired", "cancel_requested", "recovery_required", "failed"]),
  runner_starting: new Set(["runner_started", "startup_timeout", "lease_expired", "cancel_requested", "recovery_required", "failed"]),
  runner_started: new Set(["acknowledged", "ack_timeout", "heartbeat_lost", "cancel_requested", "recovery_required", "failed"]),
  acknowledged: new Set(["executing", "waiting_dependency", "result_submitted", "heartbeat_lost", "cancel_requested", "recovery_required", "failed"]),
  executing: new Set(["waiting_dependency", "result_submitted", "heartbeat_lost", "cancel_requested", "recovery_required", "failed"]),
  waiting_dependency: new Set(["executing", "result_submitted", "heartbeat_lost", "cancel_requested", "recovery_required", "failed"]),
  result_submitted: new Set(["verifying", "rejected", "cancel_requested", "recovery_required", "failed"]),
  verifying: new Set(["accepted", "rejected", "cancel_requested", "recovery_required", "failed"]),
  accepted: new Set(["completed", "recovery_required", "failed"]),
  rejected: new Set(["queued", "cancel_requested", "cancelled", "failed"]),
  completed: new Set(),
  startup_timeout: new Set(["queued", "recovery_required", "failed", "cancelled"]),
  ack_timeout: new Set(["queued", "recovery_required", "failed", "cancelled"]),
  heartbeat_lost: new Set(["queued", "recovery_required", "failed", "cancelled"]),
  lease_expired: new Set(["queued", "recovery_required", "failed", "cancelled"]),
  cancel_requested: new Set(["cancelled", "recovery_required", "failed"]),
  cancelled: new Set(),
  recovery_required: new Set(["queued", "cancel_requested", "cancelled", "failed"]),
  stale_receipt: new Set(),
  failed: new Set(["queued"]),
};

function nowIso() { return new Date().toISOString(); }
function checksum(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`; }
function text(value: any, max = 500) { return String(value || "").trim().slice(0, max); }
function integer(value: any, fallback = 0) { const parsed = Math.floor(Number(value)); return Number.isFinite(parsed) ? parsed : fallback; }
function json(value: any, fallback: any = null) { try { return JSON.parse(String(value || "")); } catch { return fallback; } }

function safeStringList(value: any, maxItems = 40, maxLength = 500) {
  return (Array.isArray(value) ? value : []).map(item => text(typeof item === "string" ? item : JSON.stringify(item), maxLength)).filter(Boolean).slice(0, maxItems);
}

function safeVerificationResults(value: any) {
  return (Array.isArray(value) ? value : []).slice(0, 50).map((item: any) => ({
    name: text(item?.name ?? item?.check ?? item?.label, 240),
    status: text(item?.status ?? item?.result, 80),
    exitCode: Number.isFinite(Number(item?.exitCode ?? item?.exit_code)) ? Number(item?.exitCode ?? item?.exit_code) : null,
    commandChecksum: text(item?.commandChecksum ?? item?.command_checksum, 128),
    evidenceRefs: safeStringList(item?.evidenceRefs ?? item?.evidence_refs, 20, 500),
    summary: text(item?.summary, 500),
  }));
}

function safeSourceRefs(value: any) {
  return (Array.isArray(value) ? value : []).slice(0, 100).map((item: any) => ({
    sourceKind: text(item?.sourceKind ?? item?.source_kind ?? item?.kind, 80),
    sourceId: text(item?.sourceId ?? item?.source_id, 240),
    documentId: text(item?.documentId ?? item?.document_id, 240),
    chunkIds: safeStringList(item?.chunkIds ?? item?.chunk_ids, 100, 240),
    revision: text(item?.revision, 160),
    checksum: text(item?.checksum, 128),
    citation: text(item?.citation, 500),
  }));
}

function safeArtifactRefs(value: any) {
  return (Array.isArray(value) ? value : []).slice(0, 100).map((item: any) => ({
    artifactId: text(item?.artifactId ?? item?.artifact_id ?? item?.id, 240),
    kind: text(item?.kind ?? item?.type, 80),
    path: text(item?.path, 1000),
    checksum: text(item?.checksum, 128),
  }));
}

const forbiddenPayloadKey = /^(?:content|text|body|raw|rawoutput|raw_output|context|prompt|systemprompt|system_prompt|apikey|api_key|authorization|secret|token)$/i;
function sanitizeMetadata(value: any, depth = 0): any {
  if (depth > 5 || value === null || value === undefined) return null;
  if (typeof value === "string") return text(value, 1000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(item => sanitizeMetadata(item, depth + 1));
  if (typeof value !== "object") return text(value, 500);
  const result: any = {};
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenPayloadKey.test(key)) continue;
    result[text(key, 100)] = sanitizeMetadata(item, depth + 1);
  }
  return result;
}

function configure(db: any) {
  db.pragma("busy_timeout = 10000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
}

function rowToEnvelope(row: any): AgentCommunicationEnvelopeV2 {
  return {
    schema: AGENT_COMMUNICATION_ENVELOPE_SCHEMA,
    messageId: String(row.message_id),
    messageType: row.message_type,
    correlationId: String(row.correlation_id),
    parentMessageId: String(row.parent_message_id || ""),
    taskId: String(row.task_id),
    workItemId: String(row.work_item_id),
    scope: row.scope,
    scopeId: String(row.scope_id),
    exactSessionId: String(row.exact_session_id),
    generation: Number(row.generation || 0),
    attempt: Number(row.attempt || 1),
    leaseId: String(row.lease_id || ""),
    senderAgentId: String(row.sender_agent_id),
    receiverAgentId: String(row.receiver_agent_id),
    deadlineAt: String(row.deadline_at || ""),
    idempotencyKey: String(row.idempotency_key),
    payloadChecksum: String(row.payload_checksum),
    state: row.state,
    contentStored: false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function appendEvent(db: any, row: any) {
  db.prepare(`INSERT INTO agent_communication_events(
    message_id,event_type,from_state,to_state,generation,attempt,lease_id,receipt_checksum,detail_json,created_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
    row.messageId, row.eventType, row.fromState || "", row.toState || "",
    integer(row.generation), Math.max(1, integer(row.attempt, 1)), text(row.leaseId, 240),
    text(row.receiptChecksum, 128), JSON.stringify(sanitizeMetadata(row.detail || {})), nowIso(),
  );
}

function assertIdentity(row: any, input: any) {
  const issues: string[] = [];
  const compare = (label: string, expected: any, actual: any) => {
    if (String(expected ?? "") !== String(actual ?? "")) issues.push(`${label}_mismatch`);
  };
  compare("task", row.task_id, input.taskId ?? input.task_id);
  compare("work_item", row.work_item_id, input.workItemId ?? input.work_item_id ?? row.work_item_id);
  compare("session", row.exact_session_id, input.exactSessionId ?? input.exact_session_id);
  compare("generation", row.generation, integer(input.generation));
  compare("attempt", row.attempt, Math.max(1, integer(input.attempt, 1)));
  compare("lease", row.lease_id, input.leaseId ?? input.lease_id);
  if (input.senderAgentId !== undefined || input.sender_agent_id !== undefined) compare("sender", row.receiver_agent_id, input.senderAgentId ?? input.sender_agent_id);
  if (input.receiverAgentId !== undefined || input.receiver_agent_id !== undefined) compare("receiver", row.sender_agent_id, input.receiverAgentId ?? input.receiver_agent_id);
  return issues;
}

export function createAgentCommunicationEnvelope(input: AgentCommunicationIdentity & {
  messageType?: AgentCommunicationMessageType;
  correlationId?: string;
  parentMessageId?: string;
  deadlineAt?: string;
  idempotencyKey?: string;
  payload?: any;
  initialState?: AgentCommunicationState;
}) {
  if (!input.taskId || !input.scopeId || !input.exactSessionId || !input.senderAgentId || !input.receiverAgentId) {
    throw new Error("Agent Communication V2缺少精确任务、作用域、会话或Agent身份");
  }
  const payload = sanitizeMetadata(input.payload || {});
  const createdAt = nowIso();
  const messageId = id("acm");
  const idempotencyKey = text(input.idempotencyKey, 500) || checksum({
    taskId: input.taskId, workItemId: input.workItemId || input.taskId, generation: input.generation,
    attempt: input.attempt, sender: input.senderAgentId, receiver: input.receiverAgentId,
    type: input.messageType || "task_dispatch", payload,
  });
  return withSqliteTaskStore(db => {
    configure(db);
    const transaction = db.transaction(() => {
      const existing = db.prepare("SELECT * FROM agent_communication_messages WHERE idempotency_key=?").get(idempotencyKey);
      if (existing) return { envelope: rowToEnvelope(existing), deduplicated: true };
      const state = input.initialState || "created";
      db.prepare(`INSERT INTO agent_communication_messages(
        message_id,message_type,correlation_id,parent_message_id,task_id,work_item_id,scope,scope_id,exact_session_id,
        generation,attempt,lease_id,sender_agent_id,receiver_agent_id,state,deadline_at,idempotency_key,payload_checksum,payload_json,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        messageId, input.messageType || "task_dispatch", text(input.correlationId, 240) || messageId,
        text(input.parentMessageId, 240), input.taskId, input.workItemId || input.taskId, input.scope, input.scopeId,
        input.exactSessionId, Math.max(0, integer(input.generation)), Math.max(1, integer(input.attempt, 1)), "",
        input.senderAgentId, input.receiverAgentId, state, input.deadlineAt || new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        idempotencyKey, checksum(payload), JSON.stringify(payload), createdAt, createdAt,
      );
      appendEvent(db, { messageId, eventType: "created", toState: state, generation: input.generation, attempt: input.attempt, detail: { contentStored: false } });
      const row = db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(messageId);
      return { envelope: rowToEnvelope(row), deduplicated: false };
    });
    return transaction();
  });
}

export function getAgentCommunication(messageId: string, options: { includeEvents?: boolean; includeReceipts?: boolean } = {}) {
  return withSqliteTaskStore(db => {
    configure(db);
    const row: any = db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(text(messageId, 240));
    if (!row) return null;
    const value: any = { ...rowToEnvelope(row), payload: sanitizeMetadata(json(row.payload_json, {})) };
    if (options.includeEvents !== false) value.events = db.prepare("SELECT * FROM agent_communication_events WHERE message_id=? ORDER BY event_id ASC").all(row.message_id).map((event: any) => ({
      eventId: event.event_id, eventType: event.event_type, fromState: event.from_state, toState: event.to_state,
      generation: event.generation, attempt: event.attempt, leaseId: event.lease_id, receiptChecksum: event.receipt_checksum,
      detail: sanitizeMetadata(json(event.detail_json, {})), createdAt: event.created_at, contentStored: false,
    }));
    if (options.includeReceipts !== false) value.receipts = db.prepare("SELECT * FROM agent_communication_receipts WHERE message_id=? ORDER BY created_at ASC").all(row.message_id).map((receipt: any) => ({
      receiptChecksum: receipt.receipt_checksum, receiptType: receipt.receipt_type, generation: receipt.generation,
      attempt: receipt.attempt, leaseId: receipt.lease_id, status: receipt.status,
      receipt: sanitizeMetadata(json(receipt.receipt_json, {})), createdAt: receipt.created_at, contentStored: false,
    }));
    return value;
  });
}

export function listAgentCommunications(query: any = {}) {
  return withSqliteTaskStore(db => {
    configure(db);
    const clauses: string[] = [];
    const args: any[] = [];
    const add = (column: string, value: any) => { if (String(value || "").trim()) { clauses.push(`${column}=?`); args.push(String(value).trim()); } };
    add("task_id", query.taskId ?? query.task_id);
    add("exact_session_id", query.exactSessionId ?? query.exact_session_id);
    add("scope", query.scope);
    add("scope_id", query.scopeId ?? query.scope_id);
    add("state", query.state);
    const limit = Math.max(1, Math.min(500, integer(query.limit, 100)));
    const rows = db.prepare(`SELECT * FROM agent_communication_messages ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY updated_at DESC LIMIT ?`).all(...args, limit);
    return rows.map(rowToEnvelope);
  });
}

export function transitionAgentCommunication(messageId: string, toState: AgentCommunicationState, input: any = {}) {
  return withSqliteTaskStore(db => {
    configure(db);
    const transaction = db.transaction(() => {
      const row: any = db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(text(messageId, 240));
      if (!row) throw new Error("Agent Communication消息不存在");
      const fromState = row.state as AgentCommunicationState;
      if (fromState === toState) return { envelope: rowToEnvelope(row), unchanged: true };
      if (!allowedTransitions[fromState]?.has(toState)) throw new Error(`Agent Communication状态迁移不合法：${fromState} -> ${toState}`);
      if (input.expectedState && input.expectedState !== fromState) throw new Error(`Agent Communication状态已变化：expected=${input.expectedState}, actual=${fromState}`);
      const updatedAt = nowIso();
      db.prepare("UPDATE agent_communication_messages SET state=?,updated_at=? WHERE message_id=? AND state=?").run(toState, updatedAt, row.message_id, fromState);
      appendEvent(db, { messageId: row.message_id, eventType: input.eventType || "state_transition", fromState, toState, generation: row.generation, attempt: row.attempt, leaseId: row.lease_id, detail: input.detail || {} });
      return { envelope: rowToEnvelope(db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(row.message_id)), unchanged: false };
    });
    return transaction();
  });
}

export function recordAgentCommunicationAuditEvent(messageId: string, eventType: string, detail: any = {}) {
  return withSqliteTaskStore(db => {
    configure(db);
    const row: any = db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(text(messageId, 240));
    if (!row) return { recorded: false, reason: "message_not_found" };
    appendEvent(db, {
      messageId: row.message_id,
      eventType: text(eventType, 120) || "audit",
      fromState: row.state,
      toState: row.state,
      generation: row.generation,
      attempt: row.attempt,
      leaseId: row.lease_id,
      detail: sanitizeMetadata(detail),
    });
    return { recorded: true, messageId: row.message_id, state: row.state, contentStored: false };
  });
}

export function acquireAgentCommunicationLease(messageId: string, ownerId: string, options: any = {}) {
  const policy = readAgentCommunicationPolicy(options.policy);
  return withSqliteTaskStore(db => {
    configure(db);
    const transaction = db.transaction(() => {
      const row: any = db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(text(messageId, 240));
      if (!row) throw new Error("Agent Communication消息不存在");
      const existing: any = db.prepare("SELECT * FROM agent_communication_leases WHERE message_id=?").get(row.message_id);
      const now = Date.now();
      if (existing?.status === "active" && Date.parse(existing.expires_at) > now) return { acquired: false, lease: sanitizeMetadata(existing), envelope: rowToEnvelope(row) };
      if (!["created", "queued", "rejected", "startup_timeout", "ack_timeout", "heartbeat_lost", "lease_expired", "recovery_required", "failed"].includes(row.state)) {
        throw new Error(`当前状态不能领取执行租约：${row.state}`);
      }
      const activeGlobal = Number((db.prepare("SELECT COUNT(*) AS count FROM agent_communication_leases WHERE status='active' AND expires_at>?").get(nowIso()) as any)?.count || 0);
      const activeProject = Number((db.prepare(`SELECT COUNT(*) AS count FROM agent_communication_leases l
        JOIN agent_communication_messages m ON m.message_id=l.message_id
        WHERE l.status='active' AND l.expires_at>? AND m.receiver_agent_id=?`).get(nowIso(), row.receiver_agent_id) as any)?.count || 0);
      if (activeGlobal >= policy.agentMaxParallelGlobal || activeProject >= policy.agentMaxParallelPerProject) {
        if (row.state !== "queued") {
          db.prepare("UPDATE agent_communication_messages SET state='queued',updated_at=? WHERE message_id=?").run(nowIso(), row.message_id);
        }
        const globalLimited = activeGlobal >= policy.agentMaxParallelGlobal;
        const queuePosition = Number((globalLimited
          ? db.prepare(`SELECT COUNT(*) AS count FROM agent_communication_messages
              WHERE message_type='task_dispatch' AND state='queued'
                AND (created_at<? OR (created_at=? AND message_id<=?))`).get(row.created_at, row.created_at, row.message_id)
          : db.prepare(`SELECT COUNT(*) AS count FROM agent_communication_messages
              WHERE message_type='task_dispatch' AND state='queued' AND receiver_agent_id=?
                AND (created_at<? OR (created_at=? AND message_id<=?))`).get(row.receiver_agent_id, row.created_at, row.created_at, row.message_id) as any)?.count || 1);
        appendEvent(db, { messageId: row.message_id, eventType: "capacity_wait", fromState: row.state, toState: "queued", generation: row.generation, attempt: row.attempt, detail: { activeGlobal, activeProject, maxGlobal: policy.agentMaxParallelGlobal, maxPerProject: policy.agentMaxParallelPerProject, queuePosition } });
        return { acquired: false, capacity: true, reason: globalLimited ? "global_parallel_limit" : "project_parallel_limit", position: Math.max(1, queuePosition), envelope: rowToEnvelope(db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(row.message_id)) };
      }
      const attempt = Math.max(1, integer(options.attempt, row.attempt || 1));
      const maxAttempts = Math.max(1, integer(options.maxAttempts, policy.agentMaxAttempts));
      if (attempt > maxAttempts) throw new Error("Agent Communication执行次数已达到上限");
      const leaseId = id("acl");
      const at = nowIso();
      const ttl = Math.max(15_000, Math.min(15 * 60_000, integer(options.leaseTtlMs, policy.agentLeaseTtlMs)));
      const expiresAt = new Date(now + ttl).toISOString();
      db.prepare(`INSERT INTO agent_communication_leases(lease_id,message_id,owner_id,generation,attempt,status,side_effect_state,heartbeat_at,expires_at,created_at,updated_at)
        VALUES(?,?,?,?,?,'active','none',?,?,?,?)
        ON CONFLICT(message_id) DO UPDATE SET lease_id=excluded.lease_id,owner_id=excluded.owner_id,generation=excluded.generation,attempt=excluded.attempt,status='active',side_effect_state='none',heartbeat_at=excluded.heartbeat_at,expires_at=excluded.expires_at,created_at=excluded.created_at,updated_at=excluded.updated_at`).run(
        leaseId, row.message_id, text(ownerId, 240), row.generation, attempt, at, expiresAt, at, at,
      );
      db.prepare("UPDATE agent_communication_messages SET state='lease_acquired',lease_id=?,attempt=?,updated_at=? WHERE message_id=?").run(leaseId, attempt, at, row.message_id);
      appendEvent(db, { messageId: row.message_id, eventType: "lease_acquired", fromState: row.state, toState: "lease_acquired", generation: row.generation, attempt, leaseId, detail: { ownerId: text(ownerId, 240), expiresAt } });
      return { acquired: true, lease: { leaseId, ownerId: text(ownerId, 240), attempt, heartbeatAt: at, expiresAt, status: "active" }, envelope: rowToEnvelope(db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(row.message_id)) };
    });
    return transaction();
  });
}

export function heartbeatAgentCommunication(messageId: string, identity: any, input: any = {}) {
  const policy = readAgentCommunicationPolicy(input.policy);
  return withSqliteTaskStore(db => {
    configure(db);
    const transaction = db.transaction(() => {
      const row: any = db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(text(messageId, 240));
      if (!row) throw new Error("Agent Communication消息不存在");
      const issues = assertIdentity(row, identity);
      if (issues.length) {
        appendEvent(db, { messageId: row.message_id, eventType: "stale_receipt", fromState: row.state, toState: row.state, generation: row.generation, attempt: row.attempt, leaseId: row.lease_id, detail: { issues, receiptType: "heartbeat" } });
        return { accepted: false, stale: true, issues, envelope: rowToEnvelope(row) };
      }
      const lease: any = db.prepare("SELECT * FROM agent_communication_leases WHERE message_id=?").get(row.message_id);
      if (!lease || lease.status !== "active") return { accepted: false, stale: true, issues: ["lease_inactive"], envelope: rowToEnvelope(row) };
      const at = nowIso();
      const ttl = Math.max(15_000, integer(input.leaseTtlMs, policy.agentLeaseTtlMs));
      const expiresAt = new Date(Date.now() + ttl).toISOString();
      const sideEffectState = ["none", "known", "uncertain"].includes(String(input.sideEffectState || input.side_effect_state)) ? String(input.sideEffectState || input.side_effect_state) : lease.side_effect_state;
      db.prepare("UPDATE agent_communication_leases SET heartbeat_at=?,expires_at=?,side_effect_state=?,updated_at=? WHERE lease_id=?").run(at, expiresAt, sideEffectState, at, lease.lease_id);
      appendEvent(db, { messageId: row.message_id, eventType: "heartbeat", fromState: row.state, toState: row.state, generation: row.generation, attempt: row.attempt, leaseId: row.lease_id, detail: { phase: text(input.phase, 120), progress: Math.max(0, Math.min(100, integer(input.progress))), sideEffectState, expiresAt } });
      return { accepted: true, heartbeatAt: at, expiresAt, state: row.state, contentStored: false };
    });
    return transaction();
  });
}

function receiptSchema(type: string) {
  if (type === "dispatch_ack") return AGENT_DISPATCH_ACK_SCHEMA;
  if (type === "progress") return AGENT_PROGRESS_RECEIPT_SCHEMA;
  if (type === "result") return AGENT_RESULT_RECEIPT_SCHEMA;
  if (type === "terminal") return AGENT_TERMINAL_RECEIPT_SCHEMA;
  throw new Error(`不支持的Agent回执类型：${type}`);
}

export function recordAgentCommunicationReceipt(messageId: string, receiptType: "dispatch_ack" | "progress" | "result" | "terminal", identity: any, rawReceipt: any, options: any = {}) {
  const result: any = withSqliteTaskStore(db => {
    configure(db);
    const transaction = db.transaction(() => {
      const row: any = db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(text(messageId, 240));
      if (!row) throw new Error("Agent Communication消息不存在");
      const issues = assertIdentity(row, identity);
      if (receiptType === "terminal" && options.ccmTrusted !== true) issues.push("terminal_requires_ccm");
      const schema = receiptSchema(receiptType);
      const projected: any = {
        schema,
        status: text(rawReceipt?.status, 80) || (receiptType === "dispatch_ack" ? "acknowledged" : "submitted"),
        summary: text(rawReceipt?.summary, 1000),
        phase: text(rawReceipt?.phase, 120),
        progress: Math.max(0, Math.min(100, integer(rawReceipt?.progress))),
        understoodGoal: text(rawReceipt?.understoodGoal ?? rawReceipt?.understood_goal, 1000),
        plannedScope: safeStringList(rawReceipt?.plannedScope ?? rawReceipt?.planned_scope),
        forbiddenScope: safeStringList(rawReceipt?.forbiddenScope ?? rawReceipt?.forbidden_scope),
        verificationPlan: safeStringList(rawReceipt?.verificationPlan ?? rawReceipt?.verification_plan),
        unclear: safeStringList(rawReceipt?.unclear),
        actions: safeStringList(rawReceipt?.actions),
        filesChanged: safeStringList(rawReceipt?.filesChanged ?? rawReceipt?.files_changed, 100, 1000),
        verificationResults: safeVerificationResults(rawReceipt?.verificationResults ?? rawReceipt?.verification_results ?? []),
        blockers: safeStringList(rawReceipt?.blockers),
        needs: safeStringList(rawReceipt?.needs),
        sourceRefs: safeSourceRefs(rawReceipt?.sourceRefs ?? rawReceipt?.source_refs ?? []),
        artifactRefs: safeArtifactRefs(rawReceipt?.artifactRefs ?? rawReceipt?.artifact_refs ?? []),
        sideEffectState: ["none", "known", "uncertain"].includes(String(rawReceipt?.sideEffectState ?? rawReceipt?.side_effect_state)) ? String(rawReceipt?.sideEffectState ?? rawReceipt?.side_effect_state) : "none",
        generation: row.generation,
        attempt: row.attempt,
        leaseId: row.lease_id,
        contentStored: false,
        recordedAt: nowIso(),
      };
      const { recordedAt: _recordedAt, ...stableReceipt } = projected;
      const receiptChecksum = checksum(stableReceipt);
      const existing = db.prepare("SELECT receipt_checksum FROM agent_communication_receipts WHERE receipt_checksum=?").get(receiptChecksum);
      if (existing) return { accepted: issues.length === 0, deduplicated: true, stale: issues.length > 0, issues, receiptChecksum, envelope: rowToEnvelope(row) };
      if (issues.length) {
        appendEvent(db, { messageId: row.message_id, eventType: "stale_receipt", fromState: row.state, toState: row.state, generation: row.generation, attempt: row.attempt, leaseId: row.lease_id, receiptChecksum, detail: { issues, receiptType } });
        return { accepted: false, stale: true, issues, receiptChecksum, envelope: rowToEnvelope(row) };
      }
      const nextState: AgentCommunicationState = receiptType === "dispatch_ack" ? "acknowledged" : receiptType === "progress" ? (projected.phase === "waiting_dependency" ? "waiting_dependency" : "executing") : receiptType === "result" ? "result_submitted" : (projected.status === "accepted" ? "completed" : projected.status === "cancelled" ? "cancelled" : "failed");
      if (row.state !== nextState && !allowedTransitions[row.state as AgentCommunicationState]?.has(nextState)) throw new Error(`当前状态不能接收${receiptType}回执：${row.state}`);
      db.prepare("INSERT INTO agent_communication_receipts(receipt_checksum,message_id,receipt_type,generation,attempt,lease_id,status,receipt_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)").run(
        receiptChecksum, row.message_id, receiptType, row.generation, row.attempt, row.lease_id, projected.status, JSON.stringify(projected), projected.recordedAt,
      );
      db.prepare("UPDATE agent_communication_messages SET state=?,updated_at=? WHERE message_id=?").run(nextState, projected.recordedAt, row.message_id);
      appendEvent(db, { messageId: row.message_id, eventType: `${receiptType}_accepted`, fromState: row.state, toState: nextState, generation: row.generation, attempt: row.attempt, leaseId: row.lease_id, receiptChecksum, detail: { status: projected.status, contentStored: false } });
      return { accepted: true, deduplicated: false, stale: false, issues: [], receiptChecksum, receipt: projected, envelope: rowToEnvelope(db.prepare("SELECT * FROM agent_communication_messages WHERE message_id=?").get(row.message_id)) };
    });
    return transaction();
  });
  if (result?.accepted && receiptType === "result" && result.receipt) {
    const receipt = result.receipt;
    let repoStateIdentity: any = null;
    const workDir = String(rawReceipt?.workDir || rawReceipt?.work_dir || rawReceipt?.worktree || "").trim();
    try {
      if (workDir) repoStateIdentity = captureRepoStateIdentity(workDir, receipt.filesChanged || []);
    } catch {}
    const evidenceBase = {
      taskId: identity?.taskId || identity?.task_id || result.envelope?.taskId,
      workItemId: identity?.workItemId || identity?.work_item_id || result.envelope?.workItemId,
      scope: result.envelope?.scope,
      scopeId: result.envelope?.scopeId,
      exactSessionId: result.envelope?.exactSessionId,
      generation: result.envelope?.generation,
      attempt: result.envelope?.attempt,
      leaseId: result.envelope?.leaseId,
      producerAgentId: result.envelope?.receiverAgentId,
      repoStateIdentity,
    };
    for (const item of Array.isArray(receipt.verificationResults) ? receipt.verificationResults.slice(0, 80) : []) {
      const command = typeof item === "string" ? item : item?.command || item?.name || "verification";
      const status = typeof item === "object" ? String(item?.status || item?.state || (Number(item?.exitCode) === 0 ? "passed" : "failed")) : "recorded";
      recordEvidence({ ...evidenceBase, evidenceType: "test", subject: command, status: /pass|success|ok|recorded|completed|0/.test(status.toLowerCase()) ? "valid" : "invalid", summary: status });
    }
    if (Array.isArray(receipt.filesChanged) && receipt.filesChanged.length) {
      recordEvidence({ ...evidenceBase, evidenceType: "diff", subject: "worker diff", status: "valid", references: receipt.filesChanged, summary: `${receipt.filesChanged.length} files changed` });
    }
  }
  if (result?.accepted && !result?.deduplicated && result?.envelope) {
    const receipt = result.receipt || rawReceipt || {};
    const projectedType = receiptType === "terminal"
      ? (String(receipt.status || "").toLowerCase() === "accepted" ? "agent_completed" : "agent_failed")
      : "agent_progress";
    projectCommunicationEvent(result.envelope, projectedType, {
      ...receipt,
      phase: receiptType === "dispatch_ack" ? "acknowledged"
        : receiptType === "result" ? "verifying"
          : receipt.phase || result.envelope.state,
      receiptChecksum: result.receiptChecksum,
      ...(receiptType === "progress" ? { progressSource: "agent_reported" } : {}),
      summary: receiptType === "result"
        ? `已提交结果，等待 CCM 验收${receipt.summary ? `：${text(receipt.summary, 240)}` : ""}`
        : receipt.summary || (receiptType === "dispatch_ack" ? "已确认工作单"
          : receiptType === "terminal" ? "CCM 已完成终态验收" : "执行进度已更新"),
    });
    if (receiptType === "progress") markAgentReportedSemanticProgress(result.envelope.messageId, result.envelope.generation, result.envelope.attempt);
  }
  return result;
}

export function releaseAgentCommunicationLease(messageId: string, status = "released") {
  return withSqliteTaskStore(db => {
    configure(db);
    const at = nowIso();
    const result = db.prepare("UPDATE agent_communication_leases SET status=?,updated_at=? WHERE message_id=? AND status='active'").run(text(status, 80), at, text(messageId, 240));
    return { released: Number(result.changes || 0) > 0, releasedAt: at };
  });
}

export function reconcileAgentCommunications(options: any = {}) {
  const now = Number(options.now || Date.now());
  const policy = readAgentCommunicationPolicy(options.policy);
  return withSqliteTaskStore(db => {
    configure(db);
    const transaction = db.transaction(() => {
      const rows: any[] = db.prepare("SELECT * FROM agent_communication_messages WHERE state NOT IN ('completed','cancelled','failed')").all();
      const outcomes: any[] = [];
      for (const row of rows) {
        const lease: any = db.prepare("SELECT * FROM agent_communication_leases WHERE message_id=?").get(row.message_id);
        let next: AgentCommunicationState | "" = "";
        if (lease?.status === "active" && Date.parse(lease.expires_at) <= now) next = lease.side_effect_state === "none" ? "lease_expired" : "recovery_required";
        else if (row.state === "runner_starting" && now - Date.parse(row.updated_at) > policy.agentRunnerStartTimeoutMs) next = "startup_timeout";
        else if (row.state === "runner_started" && now - Date.parse(row.updated_at) > policy.agentAckTimeoutMs) next = "ack_timeout";
        else if (["acknowledged", "executing", "waiting_dependency"].includes(row.state) && lease && now - Date.parse(lease.heartbeat_at) > policy.agentHeartbeatLostTimeoutMs) next = lease.side_effect_state === "none" ? "heartbeat_lost" : "recovery_required";
        if (!next || !allowedTransitions[row.state as AgentCommunicationState]?.has(next)) continue;
        const at = nowIso();
        db.prepare("UPDATE agent_communication_messages SET state=?,updated_at=? WHERE message_id=?").run(next, at, row.message_id);
        if (lease?.status === "active") db.prepare("UPDATE agent_communication_leases SET status='expired',updated_at=? WHERE lease_id=?").run(at, lease.lease_id);
        appendEvent(db, { messageId: row.message_id, eventType: "watchdog_reconciled", fromState: row.state, toState: next, generation: row.generation, attempt: row.attempt, leaseId: row.lease_id, detail: { sideEffectState: lease?.side_effect_state || "none" } });
        outcomes.push({
          messageId: row.message_id,
          taskId: row.task_id,
          fromState: row.state,
          toState: next,
          attempt: row.attempt,
          sideEffectState: lease?.side_effect_state || "none",
          safeRetry: ["startup_timeout", "ack_timeout", "heartbeat_lost", "lease_expired"].includes(next)
            && (lease?.side_effect_state || "none") === "none"
            && Number(row.attempt || 1) < policy.agentMaxAttempts,
        });
      }
      return outcomes;
    });
    return transaction();
  });
}

export function performAgentCommunicationAction(messageId: string, action: "cancel" | "retry" | "takeover" | "reconcile", input: any = {}) {
  if (action === "reconcile") return { action, outcomes: reconcileAgentCommunications(input) };
  const current = getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
  if (!current) throw new Error("Agent Communication消息不存在");
  if (action === "cancel") return transitionAgentCommunication(messageId, current.state === "created" ? "cancelled" : "cancel_requested", { detail: { reason: text(input.reason, 500) } });
  if (action === "retry") {
    const policy = readAgentCommunicationPolicy(input.policy);
    if (!["rejected", "startup_timeout", "ack_timeout", "heartbeat_lost", "lease_expired", "recovery_required", "failed"].includes(current.state)) throw new Error(`当前状态不能重试：${current.state}`);
    if (current.attempt >= policy.agentMaxAttempts) throw new Error("Agent Communication执行次数已达到上限");
    releaseAgentCommunicationLease(messageId, "retrying");
    withSqliteTaskStore(db => db.prepare("UPDATE agent_communication_messages SET attempt=?,updated_at=? WHERE message_id=?").run(current.attempt + 1, nowIso(), current.messageId));
    return transitionAgentCommunication(messageId, "queued", { detail: { reason: text(input.reason, 500), nextAttempt: current.attempt + 1 } });
  }
  if (action === "takeover") {
    if (terminalStates.has(current.state)) throw new Error(`终态消息不能接管：${current.state}`);
    releaseAgentCommunicationLease(messageId, "taken_over");
    return transitionAgentCommunication(messageId, "recovery_required", { detail: { reason: text(input.reason, 500), takeoverBy: text(input.actor, 200) } });
  }
  throw new Error(`不支持的Agent Communication操作：${action}`);
}

export function bridgeLegacyAgentCommunication(input: AgentCommunicationIdentity & { legacySchema: string; legacyId: string; legacyStatus: string; payload?: any }) {
  const terminal = ["completed", "done", "failed", "cancelled", "archived", "resumed"].includes(String(input.legacyStatus || "").toLowerCase());
  if (terminal) return { bridged: false, reason: "legacy_terminal_read_only" };
  const created = createAgentCommunicationEnvelope({
    ...input,
    messageType: "task_dispatch",
    idempotencyKey: `legacy-bridge:${input.legacySchema}:${input.legacyId}:${input.generation}`,
    initialState: "queued",
    payload: { legacySchema: input.legacySchema, legacyId: input.legacyId, legacyStatus: input.legacyStatus, ...sanitizeMetadata(input.payload || {}) },
  });
  return { bridged: true, legacyBridge: true, ...created };
}

export function getAgentCommunicationDiagnostics() {
  const policy = readAgentCommunicationPolicy();
  return withSqliteTaskStore(db => {
    configure(db);
    const states = db.prepare("SELECT state,COUNT(*) AS count FROM agent_communication_messages GROUP BY state").all();
    const activeLeases: any[] = db.prepare("SELECT * FROM agent_communication_leases WHERE status='active'").all();
    const messages: any[] = db.prepare("SELECT * FROM agent_communication_messages ORDER BY updated_at DESC LIMIT 500").all();
    const startedDurations = db.prepare(`SELECT e1.message_id,(julianday(e2.created_at)-julianday(e1.created_at))*86400000 AS duration_ms
      FROM agent_communication_events e1 JOIN agent_communication_events e2 ON e1.message_id=e2.message_id
      WHERE e1.event_type='created' AND e2.to_state='runner_started' ORDER BY e2.event_id DESC LIMIT 100`).all() as any[];
    const ackDurations = db.prepare(`SELECT e.message_id,(julianday(r.created_at)-julianday(e.created_at))*86400000 AS duration_ms
      FROM agent_communication_events e JOIN agent_communication_receipts r ON e.message_id=r.message_id
      WHERE e.to_state='runner_started' AND r.receipt_type='dispatch_ack' ORDER BY r.created_at DESC LIMIT 100`).all() as any[];
    const coordinationDurations = db.prepare(`SELECT q.message_id,(julianday(r.created_at)-julianday(q.created_at))*86400000 AS duration_ms
      FROM agent_communication_messages q JOIN agent_communication_messages r
        ON q.task_id=r.task_id AND q.work_item_id=r.work_item_id
      WHERE q.message_type='coordination_request' AND r.message_type='coordination_resolution'
      ORDER BY r.created_at DESC LIMIT 100`).all() as any[];
    const now = Date.now();
    return {
      schema: "ccm-agent-communication-diagnostics-v2",
      states: Object.fromEntries(states.map((row: any) => [row.state, Number(row.count || 0)])),
      concurrency: {
        global: activeLeases.length,
        byProject: Object.fromEntries([...new Set(messages.filter(row => activeLeases.some(lease => lease.message_id === row.message_id)).map(row => row.receiver_agent_id))].map(project => [project, activeLeases.filter(lease => messages.some(row => row.message_id === lease.message_id && row.receiver_agent_id === project)).length])),
        maxGlobal: policy.agentMaxParallelGlobal,
        maxPerProject: policy.agentMaxParallelPerProject,
      },
      metrics: {
        dispatch_to_runner_started_ms: startedDurations.length ? Math.round(startedDurations.reduce((sum, row) => sum + Number(row.duration_ms || 0), 0) / startedDurations.length) : 0,
        runner_started_to_ack_ms: ackDurations.length ? Math.round(ackDurations.reduce((sum, row) => sum + Number(row.duration_ms || 0), 0) / ackDurations.length) : 0,
        heartbeat_lost_total: Number((db.prepare("SELECT COUNT(*) AS count FROM agent_communication_events WHERE to_state='heartbeat_lost'").get() as any)?.count || 0),
        lease_recovery_total: Number((db.prepare("SELECT COUNT(*) AS count FROM agent_communication_events WHERE event_type='watchdog_reconciled'").get() as any)?.count || 0),
        stale_receipt_total: Number((db.prepare("SELECT COUNT(*) AS count FROM agent_communication_events WHERE event_type='stale_receipt'").get() as any)?.count || 0),
        coordination_dependency_wait_ms: coordinationDurations.length ? Math.round(coordinationDurations.reduce((sum, row) => sum + Number(row.duration_ms || 0), 0) / coordinationDurations.length) : 0,
        worktree_merge_conflict_total: Number((db.prepare("SELECT COUNT(*) AS count FROM agent_communication_events WHERE event_type='worktree_merge_conflict'").get() as any)?.count || 0),
      },
      alerts: messages.filter(row => row.message_type === "task_dispatch" && ["created", "queued"].includes(row.state) && now - Date.parse(row.updated_at) > policy.agentRunnerStartTimeoutMs).map(row => ({ messageId: row.message_id, taskId: row.task_id, state: row.state, reason: "dispatch_not_started_within_60s" })).slice(0, 50),
      contentStored: false,
      generatedAt: nowIso(),
    };
  });
}

export function buildAgentCommunicationTaskSummary(taskId: string) {
  const rows = listAgentCommunications({ taskId, limit: 100 });
  const latest = rows[0] || null;
  const current = latest ? getAgentCommunication(latest.messageId) : null;
  const active = rows.filter(row => !terminalStates.has(row.state));
  const lease: any = current?.leaseId ? withSqliteTaskStore(db => db.prepare("SELECT * FROM agent_communication_leases WHERE lease_id=?").get(current.leaseId)) : null;
  return {
    schema: "ccm-agent-communication-task-summary-v2",
    total: rows.length,
    active: active.length,
    latest: latest ? {
      messageId: latest.messageId, state: latest.state, receiverAgentId: latest.receiverAgentId,
      generation: latest.generation, attempt: latest.attempt,
      heartbeatAt: lease?.heartbeat_at || "", leaseExpiresAt: lease?.expires_at || "",
      sideEffectState: lease?.side_effect_state || "none", updatedAt: latest.updatedAt,
    } : null,
    states: Object.fromEntries([...new Set(rows.map(row => row.state))].map(state => [state, rows.filter(row => row.state === state).length])),
    contentStored: false,
  };
}

let watchdogTimer: NodeJS.Timeout | null = null;

export function startAgentCommunicationWatchdog(options: { onSafeRetry?: (outcome: any) => void } = {}) {
  if (watchdogTimer) return { started: false, running: true };
  watchdogTimer = setInterval(() => {
    try {
      const outcomes: any[] = reconcileAgentCommunications();
      for (const outcome of outcomes) {
        if (!outcome.safeRetry || typeof options.onSafeRetry !== "function") continue;
        try { options.onSafeRetry(outcome); } catch {}
      }
    } catch {}
  }, 5_000);
  watchdogTimer.unref?.();
  return { started: true, running: true };
}

export function stopAgentCommunicationWatchdog() {
  if (!watchdogTimer) return { stopped: false };
  clearInterval(watchdogTimer);
  watchdogTimer = null;
  return { stopped: true };
}

function reverseReceiptIdentity(envelope: AgentCommunicationEnvelopeV2) {
  return {
    taskId: envelope.taskId,
    workItemId: envelope.workItemId,
    exactSessionId: envelope.exactSessionId,
    generation: envelope.generation,
    attempt: envelope.attempt,
    leaseId: envelope.leaseId,
    senderAgentId: envelope.receiverAgentId,
    receiverAgentId: envelope.senderAgentId,
  };
}

/** Starts the durable dispatch gate before a third-party runner is invoked. */
export function startAgentCommunicationDispatch(input: AgentCommunicationIdentity & {
  ownerId: string;
  existingMessageId?: string;
  deadlineAt?: string;
  payload?: any;
  idempotencyKey?: string;
  policy?: any;
}) {
  const policy = readAgentCommunicationPolicy(input.policy);
  if (!policy.agentCommunicationV2Enabled) return { enabled: false, acquired: true, envelope: null, lease: null };
  const existing = input.existingMessageId
    ? getAgentCommunication(input.existingMessageId, { includeEvents: false, includeReceipts: false })
    : null;
  const created = existing ? { envelope: existing, deduplicated: true } : createAgentCommunicationEnvelope({
    ...input,
    messageType: "task_dispatch",
    deadlineAt: input.deadlineAt,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    initialState: "queued",
  });
  let envelope = created.envelope;
  if (["lease_acquired", "runner_starting", "runner_started", "acknowledged", "executing", "waiting_dependency", "result_submitted", "verifying", "accepted", "completed"].includes(envelope.state)) {
    return { enabled: true, acquired: true, deduplicated: true, envelope, lease: envelope.leaseId ? { leaseId: envelope.leaseId } : null };
  }
  const resumesAfterAttempt = ["rejected", "startup_timeout", "ack_timeout", "heartbeat_lost", "lease_expired", "recovery_required", "failed"].includes(envelope.state);
  const requestedAttempt = Math.max(
    1,
    integer(input.attempt, envelope.attempt || 1),
    resumesAfterAttempt ? Number(envelope.attempt || 1) + 1 : Number(envelope.attempt || 1),
  );
  const leased = acquireAgentCommunicationLease(envelope.messageId, input.ownerId, { attempt: requestedAttempt, policy });
  if (!leased.acquired) {
    projectCommunicationEvent(leased.envelope || envelope, "agent_started", {
      phase: "queued",
      summary: leased.capacity ? `等待执行容量${leased.position ? `，队列第 ${leased.position} 位` : ""}` : "等待领取执行租约",
      queuePosition: leased.position,
    });
    return { enabled: true, ...leased };
  }
  envelope = transitionAgentCommunication(envelope.messageId, "runner_starting", {
    eventType: "runner_start_requested",
    detail: { ownerId: text(input.ownerId, 240), timeoutMs: policy.agentRunnerStartTimeoutMs },
  }).envelope;
  projectCommunicationEvent(envelope, "agent_started", { phase: "runner_starting", summary: "正在启动执行 Agent" });
  return { enabled: true, acquired: true, deduplicated: created.deduplicated, envelope, lease: leased.lease };
}

/** Keeps a capacity-limited dispatch queued until its durable lease can be acquired. */
export async function waitForAgentCommunicationDispatch(
  input: Parameters<typeof startAgentCommunicationDispatch>[0],
  options: { initialDispatch?: any; pollIntervalMs?: number; shouldCancel?: () => boolean } = {},
) {
  let dispatch: any = options.initialDispatch || startAgentCommunicationDispatch(input);
  const pollIntervalMs = Math.max(100, Math.min(5_000, Number(options.pollIntervalMs || 500)));
  while (dispatch?.enabled !== false && dispatch?.acquired !== true && dispatch?.capacity === true) {
    const messageId = String(dispatch?.envelope?.messageId || input.existingMessageId || "");
    if (options.shouldCancel?.()) {
      if (messageId) {
        try { finalizeAgentCommunication(messageId, "cancelled", { sideEffectState: "none", reason: "任务等待执行容量期间被取消" }); } catch {}
      }
      return { ...dispatch, capacity: false, cancelled: true, reason: "cancelled_while_queued" };
    }
    const deadlineAt = Date.parse(String(dispatch?.envelope?.deadlineAt || input.deadlineAt || ""));
    if (Number.isFinite(deadlineAt) && Date.now() >= deadlineAt) {
      return { ...dispatch, capacity: false, timedOut: true, reason: "dispatch_deadline_reached" };
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    dispatch = startAgentCommunicationDispatch({
      ...input,
      existingMessageId: messageId || input.existingMessageId,
    });
  }
  return dispatch;
}

export function markAgentCommunicationRunnerStarted(messageId: string, detail: any = {}) {
  const current = getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
  if (!current) throw new Error("Agent Communication消息不存在");
  if (["runner_started", "acknowledged", "executing", "waiting_dependency", "result_submitted", "verifying", "accepted", "completed"].includes(current.state)) return { envelope: current, unchanged: true };
  const result = transitionAgentCommunication(messageId, "runner_started", { eventType: "runner_started", detail });
  projectCommunicationEvent(result.envelope, "agent_progress", { ...detail, phase: "runner_started", summary: detail?.summary || "执行 Agent 已启动，等待 ACK" });
  return result;
}

/** Compatibility bridge for runtimes that still return ACK inside CCM_AGENT_RECEIPT. */
export function ensureAgentCommunicationAcknowledged(messageId: string, ack: any = {}) {
  let current = getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
  if (!current) throw new Error("Agent Communication消息不存在");
  if (current.state === "runner_starting") current = markAgentCommunicationRunnerStarted(messageId, { legacyBridge: true }).envelope;
  if (["acknowledged", "executing", "waiting_dependency", "result_submitted", "verifying", "accepted", "completed"].includes(current.state)) return { accepted: true, deduplicated: true, envelope: current };
  if (current.state !== "runner_started") throw new Error(`当前状态不能补齐ACK：${current.state}`);
  return recordAgentCommunicationReceipt(messageId, "dispatch_ack", reverseReceiptIdentity(current), {
    status: "acknowledged",
    understoodGoal: ack.understoodGoal || ack.understood_goal || ack.summary || "已接收并核对 CCM 工作单",
    plannedScope: ack.plannedScope || ack.planned_scope || [],
    forbiddenScope: ack.forbiddenScope || ack.forbidden_scope || [],
    verificationPlan: ack.verificationPlan || ack.verification_plan || [],
    unclear: ack.unclear || [],
    summary: ack.summary || "兼容运行时ACK已桥接",
    legacyBridge: ack.legacyBridge !== false,
  });
}

export function submitAgentCommunicationResult(messageId: string, result: any = {}) {
  let current = getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
  if (!current) throw new Error("Agent Communication消息不存在");
  if (["runner_starting", "runner_started"].includes(current.state)) {
    const payload = current.payload || {};
    if (payload.strictPreExecutionAck === true || payload.strict_pre_execution_ack === true) {
      throw new Error("新任务必须在执行前通过 acknowledge_assignment 完成真实ACK，Result不能补造ACK");
    }
    ensureAgentCommunicationAcknowledged(messageId, result.ack || result);
    current = getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
  }
  if (current.state === "acknowledged") current = transitionAgentCommunication(messageId, "executing", { eventType: "execution_observed" }).envelope;
  if (["result_submitted", "verifying", "accepted", "completed", "rejected", "failed"].includes(current.state)) return { accepted: true, deduplicated: true, envelope: current };
  const recorded: any = recordAgentCommunicationReceipt(messageId, "result", reverseReceiptIdentity(current), {
    status: result.status || "submitted",
    summary: result.summary || "第三方 Agent 已提交执行结果",
    actions: result.actions || [],
    filesChanged: result.filesChanged || result.files_changed || [],
    verificationResults: result.verificationResults || result.verification_results || result.verification || [],
    blockers: result.blockers || [],
    sourceRefs: result.sourceRefs || result.source_refs || [],
    artifactRefs: result.artifactRefs || result.artifact_refs || [],
    sideEffectState: result.sideEffectState || result.side_effect_state || ((result.filesChanged || result.files_changed || []).length ? "known" : "none"),
  });
  // The third-party runner has finished once Result is durably accepted. CCM
  // verification keeps the immutable lease identity on the envelope, but the
  // execution slot must be released so queued independent project Agents can
  // start before the parent batch finishes its terminal review.
  if (recorded?.accepted === true) releaseAgentCommunicationLease(messageId, "result_submitted");
  return recorded;
}

/** CCM-only acceptance gate. A worker result can never create its own terminal state. */
export function finalizeAgentCommunication(messageId: string, outcome: "accepted" | "rejected" | "cancelled" | "failed", evidence: any = {}) {
  let current = getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
  if (!current) throw new Error("Agent Communication消息不存在");
  const expectedAttempt = Number(evidence.expectedAttempt ?? evidence.expected_attempt ?? 0);
  const expectedLeaseId = String(evidence.expectedLeaseId ?? evidence.expected_lease_id ?? "");
  if ((expectedAttempt > 0 && expectedAttempt !== current.attempt) || (expectedLeaseId && expectedLeaseId !== current.leaseId)) {
    recordAgentCommunicationAuditEvent(messageId, "stale_receipt", {
      receiptType: "ccm_terminal_gate",
      expectedAttempt,
      actualAttempt: current.attempt,
      expectedLeaseChecksum: expectedLeaseId ? checksum(expectedLeaseId) : "",
      actualLeaseChecksum: current.leaseId ? checksum(current.leaseId) : "",
    });
    return { accepted: false, stale: true, envelope: current };
  }
  if (terminalStates.has(current.state)) return { envelope: current, unchanged: true };
  if (outcome === "cancelled") {
    if (current.state !== "cancel_requested") transitionAgentCommunication(messageId, "cancel_requested", { detail: evidence });
    const stopped = transitionAgentCommunication(messageId, evidence.sideEffectState === "uncertain" ? "recovery_required" : "cancelled", { eventType: "cancel_verified", detail: evidence });
    releaseAgentCommunicationLease(messageId, stopped.envelope.state === "cancelled" ? "cancelled" : "recovery_required");
    return stopped;
  }
  if (!["result_submitted", "verifying", "accepted", "rejected"].includes(current.state)) {
    submitAgentCommunicationResult(messageId, evidence.result || evidence);
    current = getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
  }
  if (current.state === "result_submitted") current = transitionAgentCommunication(messageId, "verifying", { eventType: "ccm_verification_started", detail: evidence }).envelope;
  const accepted = outcome === "accepted";
  if (current.state === "verifying") current = transitionAgentCommunication(messageId, accepted ? "accepted" : "rejected", { eventType: accepted ? "ccm_verification_passed" : "ccm_verification_failed", detail: evidence }).envelope;
  if (current.state === "rejected" && outcome === "rejected") {
    releaseAgentCommunicationLease(messageId, "rejected");
    return { envelope: current, terminal: false };
  }
  const terminalStatus = accepted ? "accepted" : outcome;
  const terminal = recordAgentCommunicationReceipt(messageId, "terminal", reverseReceiptIdentity(current), {
    status: terminalStatus,
    summary: evidence.summary || (accepted ? "CCM 验收通过" : "CCM 验收未通过"),
    verificationResults: evidence.verificationResults || evidence.verification_results || [],
    artifactRefs: evidence.artifactRefs || evidence.artifact_refs || [],
  }, { ccmTrusted: true });
  releaseAgentCommunicationLease(messageId, accepted ? "completed" : "failed");
  return terminal;
}
