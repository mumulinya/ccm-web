import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CCM_DIR } from "../core/utils";
import {
  listTypedMemoryDispatchWal,
  verifyTypedMemoryDispatchWal,
} from "../modules/collaboration/typed-memory-dispatch-wal";
import {
  readDirectAgentDispatchRequest,
  readDirectAgentDispatchResult,
  validateDirectAgentDispatchPair,
} from "../agents/direct-dispatch-spool";
import {
  buildNativeSessionContinuationEvidence,
  verifyNativeSessionContinuationEvidence,
} from "../agents/native-continuation";
import { verifyNativeModelCapabilityReceipt } from "../agents/runtime";
import { tryRecordTaskAgentContinuationSoakEvent } from "./task-agent-continuation-soak";
import { validateGroupCompactHeadBinding } from "../modules/collaboration/group-compact-head";
import { validateGroupSessionLifecycleBinding } from "../modules/collaboration/group-session-lifecycle-head";

export const TASK_AGENT_INVOCATION_EDGE_SCHEMA = "ccm-task-agent-invocation-edge-v1";
export const TASK_AGENT_INVOCATION_EVENT_SCHEMA = "ccm-task-agent-invocation-lineage-event-v1";
export const TASK_AGENT_INVOCATION_LINEAGE_DIR = path.join(CCM_DIR, "task-agent-invocation-lineage");
export const TASK_AGENT_INVOCATION_RECOVERY_EVENT_SCHEMA = "ccm-task-agent-invocation-recovery-event-v1";
export const TASK_AGENT_INVOCATION_RECOVERY_DIR = path.join(CCM_DIR, "task-agent-invocation-recovery");
export const TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA = "ccm-task-agent-invocation-recovery-lease-v1";
export const TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA = "ccm-task-agent-invocation-adoption-receipt-v1";
export const TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA = "ccm-task-agent-invocation-reinjection-proof-v1";
export const TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA = "ccm-task-agent-native-continuation-receipt-v1";
export const TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA = "ccm-task-agent-context-rebudget-proof-v1";

const LOCK_STALE_MS = 60_000;
const RECOVERY_LEASE_MS = 120_000;
const TERMINAL = new Set(["completed", "failed"]);

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function sha256(value: any, length = 64) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}

function rawJsonSha256(value: any, length = 64) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.tmp`;
  const fd = fs.openSync(temp, "w");
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2), "utf-8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, file);
}

function clean(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}

function processAlive(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function assertIdentity(groupId: string, groupSessionId: string, taskAgentSessionId: string) {
  if (!groupId || !groupSessionId.startsWith("gcs_") || !taskAgentSessionId.startsWith("tas_")) {
    throw new Error("task-agent invocation lineage requires groupId--gcs_*--tas_* identity");
  }
}

function assertGroupSessionIdentity(groupId: string, groupSessionId: string) {
  if (!groupId || !groupSessionId.startsWith("gcs_")) {
    throw new Error("task-agent invocation recovery requires groupId--gcs_* identity");
  }
}

function recordInvocationSoakPhase(edge: any, phase: string, status: string, evidence: any = {}, eventKey = "") {
  return tryRecordTaskAgentContinuationSoakEvent({
    groupId: edge?.group_id,
    groupSessionId: edge?.group_session_id,
    taskAgentSessionId: edge?.task_agent_session_id,
    phase,
    status,
    invocationEdgeId: edge?.invocation_edge_id,
    eventKey: eventKey || `${phase}:${edge?.invocation_edge_id || "unknown"}:${evidence?.proof_checksum || evidence?.receipt_checksum || edge?.edge_checksum || status}`,
    evidence: { ...edge, ...evidence },
    source: "invocation_runtime",
  });
}

export function getTaskAgentInvocationLineageFile(groupId: string, groupSessionId: string, taskAgentSessionId: string) {
  assertIdentity(groupId, groupSessionId, taskAgentSessionId);
  return path.join(TASK_AGENT_INVOCATION_LINEAGE_DIR, `${clean(groupId)}--${clean(groupSessionId)}--${clean(taskAgentSessionId)}.jsonl`);
}

function acquireLock(file: string) {
  const lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const fd = fs.openSync(lock, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, hostname: os.hostname(), acquired_at: new Date().toISOString() }), "utf-8");
      fs.fsyncSync(fd);
      return () => { try { fs.closeSync(fd); } catch {} try { fs.unlinkSync(lock); } catch {} };
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const stat = fs.statSync(lock);
        const owner = JSON.parse(fs.readFileSync(lock, "utf-8"));
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS && !processAlive(Number(owner?.pid || 0))) {
          fs.unlinkSync(lock);
          continue;
        }
      } catch {}
      const until = Date.now() + 12 + attempt * 4;
      while (Date.now() < until) {}
    }
  }
  throw new Error(`task-agent invocation lineage lock busy: ${lock}`);
}

function eventChecksum(event: any) {
  const payload = { ...(event || {}) };
  delete payload.event_checksum;
  delete payload.checksum_valid;
  return sha256(payload);
}

function edgeChecksum(edge: any) {
  const payload = { ...(edge || {}) };
  delete payload.edge_checksum;
  delete payload.checksum_valid;
  delete payload.event_checksum;
  delete payload.previous_event_checksum;
  delete payload.sequence;
  delete payload.ledger_file;
  delete payload.ledger_valid;
  delete payload.event_sequence;
  return sha256(payload);
}

function readEventsFromFile(file: string) {
  if (!fs.existsSync(file)) return { file, valid: true, events: [], issues: [], headChecksum: "", lastSequence: 0 };
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean);
  const events: any[] = [];
  const issues: string[] = [];
  let previous = "";
  let expectedSequence = 1;
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      const checksumValid = String(event.event_checksum || "") === eventChecksum(event);
      if (event.schema !== TASK_AGENT_INVOCATION_EVENT_SCHEMA) issues.push("event_schema_invalid");
      if (Number(event.sequence || 0) !== expectedSequence) issues.push("event_sequence_invalid");
      if (String(event.previous_event_checksum || "") !== previous) issues.push("event_chain_broken");
      if (!checksumValid) issues.push("event_checksum_invalid");
      events.push({ ...event, checksum_valid: checksumValid });
      previous = String(event.event_checksum || "");
      expectedSequence += 1;
    } catch {
      issues.push("event_json_invalid");
    }
  }
  return { file, valid: issues.length === 0, events, issues: Array.from(new Set(issues)), headChecksum: previous, lastSequence: events.length };
}

function appendEvent(file: string, edge: any, transition: string) {
  const release = acquireLock(file);
  try {
    const ledger = readEventsFromFile(file);
    if (!ledger.valid) throw new Error(`task-agent invocation lineage invalid: ${ledger.issues.join(",")}`);
    const event: any = {
      schema: TASK_AGENT_INVOCATION_EVENT_SCHEMA,
      version: 1,
      sequence: ledger.lastSequence + 1,
      previous_event_checksum: ledger.headChecksum,
      transition,
      recorded_at: new Date().toISOString(),
      edge,
    };
    event.event_checksum = eventChecksum(event);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const fd = fs.openSync(file, "a");
    try { fs.writeSync(fd, `${JSON.stringify(event)}\n`, undefined, "utf-8"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return { ...event, checksum_valid: true };
  } finally {
    release();
  }
}

function listFiles() {
  try { return fs.readdirSync(TASK_AGENT_INVOCATION_LINEAGE_DIR).filter(name => name.endsWith(".jsonl")).map(name => path.join(TASK_AGENT_INVOCATION_LINEAGE_DIR, name)); } catch { return []; }
}

export function readTaskAgentInvocationLineage(groupId: string, groupSessionId: string, taskAgentSessionId: string) {
  const ledger = readEventsFromFile(getTaskAgentInvocationLineageFile(groupId, groupSessionId, taskAgentSessionId));
  const byId = new Map<string, any>();
  for (const event of ledger.events) {
    const edge = event.edge || {};
    if (edge.invocation_edge_id) byId.set(String(edge.invocation_edge_id), { ...edge, ledger_file: ledger.file, event_sequence: event.sequence, event_checksum: event.event_checksum });
  }
  return { ...ledger, edges: Array.from(byId.values()), latest: Array.from(byId.values()).slice(-1)[0] || null };
}

export function listTaskAgentInvocationEdges(filter: any = {}) {
  const edges: any[] = [];
  const issues: any[] = [];
  for (const file of listFiles()) {
    const ledger = readEventsFromFile(file);
    if (!ledger.valid) issues.push({ file, issues: ledger.issues });
    const byId = new Map<string, any>();
    for (const event of ledger.events) {
      if (event.edge?.invocation_edge_id) byId.set(String(event.edge.invocation_edge_id), { ...event.edge, ledger_file: file, event_sequence: event.sequence, event_checksum: event.event_checksum, ledger_valid: ledger.valid });
    }
    edges.push(...byId.values());
  }
  const filtered = edges.filter(edge =>
    (!filter.groupId && !filter.group_id || edge.group_id === String(filter.groupId || filter.group_id))
    && (!filter.groupSessionId && !filter.group_session_id || edge.group_session_id === String(filter.groupSessionId || filter.group_session_id))
    && (!filter.taskAgentSessionId && !filter.task_agent_session_id || edge.task_agent_session_id === String(filter.taskAgentSessionId || filter.task_agent_session_id))
    && (!filter.taskId && !filter.task_id || edge.task_id === String(filter.taskId || filter.task_id))
    && (!filter.project || edge.target_project === String(filter.project))
  );
  filtered.sort((a, b) => String(a.prepared_at || "").localeCompare(String(b.prepared_at || "")) || Number(a.provider_attempt || 0) - Number(b.provider_attempt || 0));
  return { schema: "ccm-task-agent-invocation-lineage-list-v1", valid: issues.length === 0, issues, edges: filtered };
}

export function findTaskAgentInvocationEdge(invocationEdgeId: string) {
  return listTaskAgentInvocationEdges({}).edges.find((edge: any) => edge.invocation_edge_id === String(invocationEdgeId || "")) || null;
}

function latestCommittedEdge(filter: any = {}) {
  const edges = listTaskAgentInvocationEdges(filter).edges.filter((edge: any) => ["dispatched", "completed", "failed"].includes(String(edge.status || "")));
  return edges.slice(-1)[0] || null;
}

export function prepareTaskAgentInvocationEdge(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const taskAgentSessionId = String(input.taskAgentSessionId || input.task_agent_session_id || "").trim();
  assertIdentity(groupId, groupSessionId, taskAgentSessionId);
  const parent = input.parentInvocationEdge || input.parent_invocation_edge || (input.parentInvocationEdgeId || input.parent_invocation_edge_id ? findTaskAgentInvocationEdge(String(input.parentInvocationEdgeId || input.parent_invocation_edge_id)) : latestCommittedEdge({ groupId, groupSessionId, taskId: input.taskId || input.task_id, project: input.targetProject || input.target_project }));
  const branchKind = String(input.branchKind || input.branch_kind || (parent ? "native_recovery" : "main"));
  const createsBranch = ["provider_switch", "fork"].includes(branchKind);
  const branchId = String(input.branchId || input.branch_id || (!parent ? `tbr_${sha256(`${groupId}\0${groupSessionId}\0${taskAgentSessionId}\0main`, 20)}` : createsBranch ? `tbr_${sha256(`${parent.invocation_edge_id}\0${taskAgentSessionId}\0${branchKind}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 20)}` : parent.branch_id)).trim();
  const preparedAt = String(input.preparedAt || input.prepared_at || new Date().toISOString());
  const edgeId = `tie_${sha256(`${groupId}\0${groupSessionId}\0${taskAgentSessionId}\0${preparedAt}\0${crypto.randomBytes(10).toString("hex")}`, 24)}`;
  const invocationKind = String(input.invocationKind || input.invocation_kind || (Number(input.attemptSequence || input.attempt_sequence || 1) > 1 ? "resume" : "spawn")) === "resume" ? "resume" : "spawn";
  const parentAncestry = parent ? [
    { invocation_edge_id: String(parent.invocation_edge_id || ""), edge_checksum: String(parent.edge_checksum || "") },
    ...(Array.isArray(parent.parent_ancestry) ? parent.parent_ancestry : []),
  ].filter((row: any) => row.invocation_edge_id && row.edge_checksum).slice(0, 32) : [];
  const edge: any = {
    schema: TASK_AGENT_INVOCATION_EDGE_SCHEMA,
    version: 1,
    invocation_edge_id: edgeId,
    parent_invocation_edge_id: String(parent?.invocation_edge_id || ""),
    root_invocation_edge_id: String(parent?.root_invocation_edge_id || parent?.invocation_edge_id || edgeId),
    branch_id: branchId,
    parent_branch_id: createsBranch ? String(parent?.branch_id || "") : String(parent?.parent_branch_id || ""),
    group_id: groupId,
    group_session_id: groupSessionId,
    task_id: String(input.taskId || input.task_id || ""),
    target_project: String(input.targetProject || input.target_project || input.project || ""),
    task_agent_session_id: taskAgentSessionId,
    native_session_id: String(input.nativeSessionId || input.native_session_id || ""),
    parent_native_session_id: String(parent?.native_session_id || ""),
    execution_id: String(input.executionId || input.execution_id || ""),
    attempt_sequence: Math.max(1, Math.floor(Number(input.attemptSequence || input.attempt_sequence || 1) || 1)),
    provider_attempt: Math.max(1, Math.floor(Number(input.providerAttempt || input.provider_attempt || 1) || 1)),
    invocation_kind: invocationKind,
    branch_kind: branchKind,
    retry_of_invocation_edge_id: String(input.retryOfInvocationEdgeId || input.retry_of_invocation_edge_id || (parent && branchKind !== "main" ? parent.invocation_edge_id : "")),
    fork_reason: String(input.forkReason || input.fork_reason || ""),
    compact_epoch: String(input.compactEpoch || input.compact_epoch || "precompact"),
    expected_lineage_head_checksum: String(parent?.edge_checksum || ""),
    expected_lineage_head_edge_id: String(parent?.invocation_edge_id || ""),
    parent_ancestry: parentAncestry,
    continuity_contract_required: invocationKind === "resume" || ["native_recovery", "provider_switch", "fork"].includes(branchKind),
    status: "prepared",
    prepared_at: preparedAt,
  };
  edge.edge_checksum = edgeChecksum(edge);
  const file = getTaskAgentInvocationLineageFile(groupId, groupSessionId, taskAgentSessionId);
  appendEvent(file, edge, "prepared");
  recordInvocationSoakPhase(edge, "invocation_prepared", "prepared");
  return { ...edge, ledger_file: file };
}

function transitionEdge(edgeOrId: any, status: string, evidence: any = {}) {
  const current = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
  if (!current) throw new Error("task-agent invocation edge not found");
  if (TERMINAL.has(String(current.status || "")) && current.status !== status) throw new Error("task-agent invocation edge is terminal");
  const parent = current.parent_invocation_edge_id ? findTaskAgentInvocationEdge(current.parent_invocation_edge_id) : null;
  if (current.parent_invocation_edge_id && (!parent || parent.invocation_edge_id === current.invocation_edge_id)) throw new Error("task-agent invocation parent missing or cyclic");
  if (parent && (parent.group_id !== current.group_id || parent.group_session_id !== current.group_session_id || parent.task_id !== current.task_id || parent.target_project !== current.target_project)) throw new Error("task-agent invocation parent identity mismatch");
  if (parent && String(parent.edge_checksum || "") !== String(current.expected_lineage_head_checksum || "")) throw new Error("task-agent invocation lineage head changed");
  const now = new Date().toISOString();
  const next: any = {
    ...current,
    ...evidence,
    status,
    ...(status === "dispatched" ? { dispatched_at: evidence.dispatched_at || now } : {}),
    ...(status === "completed" || status === "failed" ? { completed_at: evidence.completed_at || now } : {}),
  };
  delete next.ledger_file;
  delete next.event_sequence;
  delete next.event_checksum;
  delete next.ledger_valid;
  next.edge_checksum = edgeChecksum(next);
  appendEvent(current.ledger_file, next, status);
  return { ...next, ledger_file: current.ledger_file };
}

export function bindTaskAgentInvocationContext(edgeOrId: any, evidence: any = {}) {
  const deliveryCapsule = evidence.typedMemoryDeliveryCapsule || evidence.typed_memory_delivery_capsule || null;
  const deliveryBudget = deliveryCapsule?.budget || {};
  const memoryBinding = evidence.groupSessionMemoryBinding || evidence.group_session_memory_binding || {};
  const compactTransactionReceipt = evidence.compactTransactionReceipt
    || evidence.compact_transaction_receipt
    || memoryBinding.compactTransactionReceipt
    || memoryBinding.compact_transaction_receipt
    || null;
  const next = transitionEdge(edgeOrId, "prepared", {
    worker_context_packet_id: String(evidence.workerContextPacketId || evidence.worker_context_packet_id || ""),
    memory_context_snapshot_id: String(evidence.memoryContextSnapshotId || evidence.memory_context_snapshot_id || ""),
    memory_context_snapshot_checksum: String(evidence.memoryContextSnapshotChecksum || evidence.memory_context_snapshot_checksum || ""),
    summary_capsule_checksum: String(evidence.summaryCapsuleChecksum || evidence.summary_capsule_checksum || ""),
    prompt_checksum: evidence.renderedPrompt || evidence.rendered_prompt ? sha256(String(evidence.renderedPrompt || evidence.rendered_prompt), 32) : String(evidence.promptChecksum || evidence.prompt_checksum || ""),
    compact_epoch: String(evidence.compactEpoch || evidence.compact_epoch || compactTransactionReceipt?.compact_epoch || memoryBinding.compactEpoch || deliveryCapsule?.compact_epoch || "precompact"),
    compact_transaction_receipt_id: String(compactTransactionReceipt?.receipt_id || memoryBinding.compactTransactionReceiptId || ""),
    compact_transaction_boundary_id: String(compactTransactionReceipt?.boundary_id || memoryBinding.compactTransactionBoundaryId || ""),
    compact_transaction_receipt_checksum: String(compactTransactionReceipt?.receipt_checksum || memoryBinding.compactTransactionReceiptChecksum || ""),
    compact_transaction_receipt_valid: memoryBinding.compactTransactionReceiptValid === true,
    compact_head_fence_required: memoryBinding.compactHeadFenceRequired === true,
    compact_head_id: String(memoryBinding.compactHeadId || ""),
    compact_head_generation: Number(memoryBinding.compactHeadGeneration || 0),
    compact_head_checksum: String(memoryBinding.compactHeadChecksum || ""),
    session_lifecycle_fence_required: memoryBinding.sessionLifecycleFenceRequired === true,
    session_lifecycle_head_id: String(memoryBinding.sessionLifecycleHeadId || ""),
    session_lifecycle_generation: Number(memoryBinding.sessionLifecycleGeneration || 0),
    session_lifecycle_status: String(memoryBinding.sessionLifecycleStatus || ""),
    session_lifecycle_head_checksum: String(memoryBinding.sessionLifecycleHeadChecksum || ""),
    typed_memory_delivery_capsule_checksum: String(deliveryCapsule?.capsule_checksum || evidence.typedMemoryDeliveryCapsuleChecksum || evidence.typed_memory_delivery_capsule_checksum || ""),
    dispatch_model_context_window: Number(deliveryBudget.model_context_window || deliveryCapsule?.model_context_window || evidence.modelContextWindow || evidence.model_context_window || 0),
    dispatch_configured_memory_tokens: Number(deliveryBudget.configured_max_tokens || deliveryCapsule?.configured_max_tokens || evidence.configuredMaxTokens || evidence.configured_max_tokens || 0),
    dispatch_effective_memory_tokens: Number(deliveryBudget.effective_max_tokens || deliveryCapsule?.effective_max_tokens || evidence.effectiveMaxTokens || evidence.effective_max_tokens || 0),
    dispatch_memory_budget_formula: String(deliveryBudget.token_budget_formula || ""),
    context_bound_at: new Date().toISOString(),
  });
  recordInvocationSoakPhase(next, "context_bound", "bound");
  return next;
}

export function dispatchTaskAgentInvocationEdge(edgeOrId: any, evidence: any = {}) {
  let edge = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
  if (!edge) throw new Error("task-agent invocation edge not found");
  for (const field of ["worker_context_packet_id", "memory_context_snapshot_id", "prompt_checksum"]) {
    if (!String(edge[field] || evidence[field] || "")) throw new Error(`task-agent invocation ${field} missing`);
  }
  const compactHeadValidation = edge.compact_head_fence_required === true
    ? validateGroupCompactHeadBinding({
      groupId: edge.group_id,
      groupSessionId: edge.group_session_id,
      compactEpoch: edge.compact_epoch,
      compactTransactionReceiptChecksum: edge.compact_transaction_receipt_checksum,
      compactTransactionBoundaryId: edge.compact_transaction_boundary_id,
      compactHeadGeneration: edge.compact_head_generation,
      compactHeadId: edge.compact_head_id,
      compactHeadChecksum: edge.compact_head_checksum,
    })
    : { valid: true, status: "exempt", issues: [], expected: null };
  const sessionLifecycleFenceRequired = edge.session_lifecycle_fence_required === true || String(edge.group_session_id || "").startsWith("gcs_");
  const sessionLifecycleValidation = sessionLifecycleFenceRequired
    ? validateGroupSessionLifecycleBinding({
      groupId: edge.group_id,
      groupSessionId: edge.group_session_id,
      lifecycleStatus: edge.session_lifecycle_status,
      lifecycleGeneration: edge.session_lifecycle_generation,
      lifecycleHeadId: edge.session_lifecycle_head_id,
      lifecycleHeadChecksum: edge.session_lifecycle_head_checksum,
    })
    : { valid: true, status: "exempt", issues: [], expected: null };
  edge = transitionEdge(edge, String(edge.status || "prepared"), {
    compact_head_dispatch_fence_valid: compactHeadValidation.valid === true,
    compact_head_dispatch_fence_status: compactHeadValidation.status,
    compact_head_dispatch_fence_issues: compactHeadValidation.issues,
    compact_head_dispatch_expected: compactHeadValidation.expected,
    compact_head_dispatch_checked_at: new Date().toISOString(),
    session_lifecycle_dispatch_fence_valid: sessionLifecycleValidation.valid === true,
    session_lifecycle_fence_required: sessionLifecycleFenceRequired,
    session_lifecycle_dispatch_fence_status: sessionLifecycleValidation.status,
    session_lifecycle_dispatch_fence_issues: sessionLifecycleValidation.issues,
    session_lifecycle_dispatch_expected: sessionLifecycleValidation.expected,
    session_lifecycle_dispatch_checked_at: new Date().toISOString(),
  });
  recordInvocationSoakPhase(edge, "compact_head_dispatch_fence", compactHeadValidation.valid ? "current" : "stale", compactHeadValidation);
  recordInvocationSoakPhase(edge, "session_lifecycle_dispatch_fence", sessionLifecycleValidation.valid ? "current" : "stale", sessionLifecycleValidation);
  if (!compactHeadValidation.valid) {
    const error: any = new Error(`task-agent compact head stale: ${compactHeadValidation.issues.join(",")}`);
    error.code = "TASK_AGENT_COMPACT_HEAD_STALE";
    error.compactHeadValidation = compactHeadValidation;
    throw error;
  }
  if (!sessionLifecycleValidation.valid) {
    const error: any = new Error(`task-agent group session lifecycle stale: ${sessionLifecycleValidation.issues.join(",")}`);
    error.code = "TASK_AGENT_GROUP_SESSION_STALE";
    error.sessionLifecycleValidation = sessionLifecycleValidation;
    throw error;
  }
  if (edge.status === "dispatched" && (!evidence.runnerRequestId || edge.runner_request_id === String(evidence.runnerRequestId))) return edge;
  const next = transitionEdge(edge, "dispatched", {
    runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
    transport: String(evidence.transport || ""),
    dispatch_ticket_id: String(evidence.dispatchTicketId || evidence.dispatch_ticket_id || edge.dispatch_ticket_id || ""),
    dispatch_ticket_checksum: String(evidence.dispatchTicketChecksum || evidence.dispatch_ticket_checksum || edge.dispatch_ticket_checksum || ""),
    typed_memory_dispatch_wal_file: String(evidence.typedMemoryDispatchWalFile || evidence.typed_memory_dispatch_wal_file || edge.typed_memory_dispatch_wal_file || ""),
    typed_memory_dispatch_wal_record_checksum: String(evidence.typedMemoryDispatchWalRecordChecksum || evidence.typed_memory_dispatch_wal_record_checksum || edge.typed_memory_dispatch_wal_record_checksum || ""),
    typed_memory_dispatch_wal_state: String(evidence.typedMemoryDispatchWalState || evidence.typed_memory_dispatch_wal_state || edge.typed_memory_dispatch_wal_state || ""),
    platform_dispatch_id: String(evidence.platformDispatchId || evidence.platform_dispatch_id || edge.platform_dispatch_id || ""),
    dispatched_at: String(evidence.dispatchedAt || evidence.dispatched_at || new Date().toISOString()),
  });
  recordInvocationSoakPhase(next, "dispatch_started", "started");
  return next;
}

export function bindTaskAgentInvocationRunnerRequest(edgeOrId: any, runnerRequestId: string, evidence: any = {}) {
  const edge = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
  if (!edge) throw new Error("task-agent invocation edge not found");
  const nextRunnerRequestId = String(runnerRequestId || "");
  const walRecordChecksum = String(evidence.typedMemoryDispatchWalRecordChecksum || evidence.typed_memory_dispatch_wal_record_checksum || edge.typed_memory_dispatch_wal_record_checksum || "");
  if (edge.runner_request_id === nextRunnerRequestId && edge.typed_memory_dispatch_wal_record_checksum === walRecordChecksum) return edge;
  return transitionEdge(edge, "dispatched", {
    runner_request_id: nextRunnerRequestId,
    typed_memory_dispatch_wal_record_checksum: walRecordChecksum,
    typed_memory_dispatch_wal_state: String(evidence.typedMemoryDispatchWalState || evidence.typed_memory_dispatch_wal_state || edge.typed_memory_dispatch_wal_state || ""),
  });
}

function nativeContinuationReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return sha256(payload);
}

export function verifyTaskAgentNativeContinuationReceipt(receipt: any, edge: any = null) {
  const issues: string[] = [];
  if (receipt?.schema !== TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA || Number(receipt?.version || 0) !== 1) issues.push("native_continuation_receipt_schema_invalid");
  if (String(receipt?.receipt_checksum || "") !== nativeContinuationReceiptChecksum(receipt)) issues.push("native_continuation_receipt_checksum_invalid");
  if (receipt?.continuation_capability_profile
    && String(receipt?.continuation_capability_profile_checksum || "") !== sha256(receipt.continuation_capability_profile)) {
    issues.push("native_continuation_capability_profile_checksum_invalid");
  }
  if (edge) {
    if (String(receipt?.invocation_edge_id || "") !== String(edge.invocation_edge_id || "")) issues.push("native_continuation_edge_mismatch");
    if (String(receipt?.group_id || "") !== String(edge.group_id || "")) issues.push("native_continuation_group_mismatch");
    if (String(receipt?.group_session_id || "") !== String(edge.group_session_id || "")) issues.push("native_continuation_group_session_mismatch");
    if (String(receipt?.task_agent_session_id || "") !== String(edge.task_agent_session_id || "")) issues.push("native_continuation_task_session_mismatch");
    if (String(receipt?.runner_request_id || "") !== String(edge.runner_request_id || "")) issues.push("native_continuation_runner_request_mismatch");
  }
  if (receipt?.continuation_required === true && receipt?.status === "acknowledged") {
    if (receipt?.runner_evidence_valid !== true) issues.push("native_continuation_runner_evidence_invalid");
    if (receipt?.native_continuation_acknowledged !== true) issues.push("native_continuation_ack_missing");
    if (!receipt?.requested_native_session_id || receipt.requested_native_session_id !== receipt.effective_native_session_id) issues.push("native_continuation_identity_invalid");
    if (["request_fallback", "missing"].includes(String(receipt?.session_id_evidence_source || ""))) issues.push("native_continuation_source_untrusted");
    if (receipt?.source_allowed_by_profile !== true) issues.push("native_continuation_source_policy_rejected");
    if (receipt?.resume_ack_policy === "provider_output" && receipt?.provider_output_contract_status !== "recognized") issues.push("native_continuation_provider_output_contract_unverified");
    if (!String(receipt?.continuation_capability_profile_checksum || "")) issues.push("native_continuation_capability_profile_missing");
  }
  return { valid: issues.length === 0, issues };
}

function buildTaskAgentNativeContinuationReceipt(edge: any, evidence: any, success: boolean) {
  const requestedNativeSessionId = String(evidence.requestedNativeSessionId || evidence.requested_native_session_id || edge.native_session_id || "");
  const rawEvidence = evidence.nativeContinuationEvidence || evidence.native_continuation_evidence || null;
  const fallbackEvidence = buildNativeSessionContinuationEvidence({
    provider: evidence.provider || evidence.runtime || edge.transport || "",
    runnerRequestId: evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || "",
    requestedNativeSessionId,
    returnedNativeSessionId: evidence.returnedNativeSessionId || evidence.returned_native_session_id || "",
    nativeResumeRequested: evidence.nativeResumeRequested === true || evidence.native_resume_requested === true,
    runnerSuccess: success,
  });
  const runnerEvidence = rawEvidence || fallbackEvidence;
  const runnerValidation = verifyNativeSessionContinuationEvidence(runnerEvidence, {
    provider: evidence.provider || evidence.runtime || edge.transport || "",
    runnerRequestId: evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || "",
    requestedNativeSessionId,
  });
  const continuationRequired = edge.invocation_kind === "resume" && !!requestedNativeSessionId && !["provider_switch", "fork"].includes(String(edge.branch_kind || ""));
  const effectiveNativeSessionId = String(runnerEvidence?.effectiveNativeSessionId || evidence.effectiveNativeSessionId || evidence.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || requestedNativeSessionId || "");
  const acknowledged = !!rawEvidence
    && runnerValidation.valid
    && runnerEvidence?.nativeContinuationAcknowledged === true
    && effectiveNativeSessionId === requestedNativeSessionId
    && !["request_fallback", "missing"].includes(String(runnerEvidence?.evidenceSource || ""));
  const status = !success ? "failed" : continuationRequired ? acknowledged ? "acknowledged" : "unverified" : "not_required";
  const receipt: any = {
    schema: TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA,
    version: 1,
    receipt_id: `tncr_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
    invocation_edge_id: String(edge.invocation_edge_id || ""),
    invocation_edge_preterminal_checksum: String(edge.edge_checksum || ""),
    parent_invocation_edge_id: String(edge.parent_invocation_edge_id || ""),
    branch_id: String(edge.branch_id || ""),
    branch_kind: String(edge.branch_kind || ""),
    group_id: String(edge.group_id || ""),
    group_session_id: String(edge.group_session_id || ""),
    task_id: String(edge.task_id || ""),
    task_agent_session_id: String(edge.task_agent_session_id || ""),
    provider: String(runnerEvidence?.provider || edge.transport || ""),
    runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
    requested_native_session_id: requestedNativeSessionId,
    returned_native_session_id: String(runnerEvidence?.returnedNativeSessionId || ""),
    effective_native_session_id: effectiveNativeSessionId,
    native_resume_requested: runnerEvidence?.nativeResumeRequested === true,
    continuation_required: continuationRequired,
    session_id_evidence_source: String(runnerEvidence?.evidenceSource || "missing"),
    continuation_capability_profile: runnerEvidence?.continuationCapabilityProfile || null,
    continuation_capability_profile_checksum: runnerEvidence?.continuationCapabilityProfile
      ? sha256(runnerEvidence.continuationCapabilityProfile)
      : "",
    resume_ack_policy: String(runnerEvidence?.resumeAckPolicy || "unsupported"),
    source_allowed_by_profile: runnerEvidence?.sourceAllowedByProfile === true,
    compatibility_status: String(runnerEvidence?.compatibilityStatus || "unknown"),
    provider_output_contract_status: String(runnerEvidence?.providerOutputContractStatus || ""),
    provider_output_contract_recognized: runnerEvidence?.providerOutputContractRecognized === true,
    provider_output_format_fingerprint: String(runnerEvidence?.providerOutputFormatFingerprint || ""),
    provider_output_contract_evidence: runnerEvidence?.providerOutputContractEvidence || null,
    provider_contract_id: String(runnerEvidence?.providerContractId || runnerEvidence?.providerOutputContractEvidence?.providerContractId || ""),
    expected_provider_contract_id: String(runnerEvidence?.expectedProviderContractId || ""),
    provider_contract_transition: runnerEvidence?.providerContractTransition === true,
    provider_contract_continuity_verified: runnerEvidence?.providerContractContinuityVerified === true,
    provider_runtime_version: String(runnerEvidence?.providerRuntimeVersion || runnerEvidence?.providerRuntimeVersionSnapshot?.semanticVersion || runnerEvidence?.providerRuntimeVersionSnapshot?.versionText || ""),
    provider_runtime_identity_checksum: String(runnerEvidence?.providerRuntimeIdentityChecksum || runnerEvidence?.providerRuntimeVersionSnapshot?.executableIdentityChecksum || ""),
    runner_success: runnerEvidence?.runnerSuccess === true,
    provider_return_matched_request: runnerEvidence?.providerReturnMatchedRequest === true,
    native_continuation_acknowledged: acknowledged,
    runner_evidence_checksum: String(runnerEvidence?.evidenceChecksum || ""),
    runner_evidence_valid: runnerValidation.valid,
    runner_evidence_issues: runnerValidation.issues,
    status,
    acknowledged_at: new Date().toISOString(),
  };
  receipt.receipt_checksum = nativeContinuationReceiptChecksum(receipt);
  return receipt;
}

function contextRebudgetProofChecksum(proof: any) {
  const payload = { ...(proof || {}) };
  delete payload.proof_checksum;
  delete payload.checksum_valid;
  return sha256(payload);
}

export function verifyTaskAgentContextRebudgetProof(proof: any, edge: any = null) {
  const issues: string[] = [];
  if (proof?.schema !== TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA || Number(proof?.version || 0) !== 1) issues.push("context_rebudget_proof_schema_invalid");
  if (String(proof?.proof_checksum || "") !== contextRebudgetProofChecksum(proof)) issues.push("context_rebudget_proof_checksum_invalid");
  if (edge) {
    if (String(proof?.invocation_edge_id || "") !== String(edge.invocation_edge_id || "")) issues.push("context_rebudget_edge_mismatch");
    if (String(proof?.group_id || "") !== String(edge.group_id || "")) issues.push("context_rebudget_group_mismatch");
    if (String(proof?.group_session_id || "") !== String(edge.group_session_id || "")) issues.push("context_rebudget_group_session_mismatch");
    if (String(proof?.task_agent_session_id || "") !== String(edge.task_agent_session_id || "")) issues.push("context_rebudget_task_session_mismatch");
    if (Number(proof?.dispatch_model_context_window || 0) !== Number(edge.dispatch_model_context_window || 0)) issues.push("context_rebudget_dispatch_window_mismatch");
  }
  if (proof?.native_capability_receipt_present === true && proof?.native_capability_receipt_valid !== true) issues.push("context_rebudget_native_receipt_invalid");
  if (proof?.capacity_downgrade_detected === true && proof?.next_dispatch_rebuild_required !== true) issues.push("context_rebudget_downgrade_gate_missing");
  return { valid: issues.length === 0, issues };
}

function buildTaskAgentContextRebudgetProof(edge: any, evidence: any) {
  const nativeReceipt = evidence.nativeModelCapabilityReceipt || evidence.native_model_capability_receipt || null;
  const continuationEvidence = evidence.nativeContinuationEvidence || evidence.native_continuation_evidence || null;
  const effectiveNativeSessionId = String(continuationEvidence?.effectiveNativeSessionId || evidence.effectiveNativeSessionId || evidence.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || edge.native_session_id || "");
  const receiptValidation = nativeReceipt
    ? verifyNativeModelCapabilityReceipt(nativeReceipt, {
        provider: evidence.provider || evidence.runtime || edge.transport || "",
        runnerRequestId: evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || "",
        groupId: edge.group_id,
        taskId: edge.task_id,
        executionId: edge.execution_id,
        taskAgentSessionId: edge.task_agent_session_id,
        nativeSessionId: effectiveNativeSessionId,
      })
    : { valid: false, gaps: ["receipt_missing"] };
  const dispatchWindow = Number(edge.dispatch_model_context_window || 0);
  const actualWindow = receiptValidation.valid ? Number(nativeReceipt?.contextWindow || 0) : 0;
  const configuredTokens = Number(edge.dispatch_configured_memory_tokens || 0);
  const dispatchEffectiveTokens = Number(edge.dispatch_effective_memory_tokens || 0);
  const expectedActualEffectiveTokens = actualWindow > 0 && configuredTokens > 0
    ? Math.min(configuredTokens, Math.max(1000, Math.floor(actualWindow * 0.02)))
    : 0;
  const downgradeDetected = receiptValidation.valid && dispatchWindow > 0 && actualWindow > 0 && actualWindow < dispatchWindow;
  const record = evidence.nativeModelCapabilityRecord || evidence.native_model_capability_record || null;
  const proof: any = {
    schema: TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA,
    version: 1,
    proof_id: `tcrp_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
    invocation_edge_id: String(edge.invocation_edge_id || ""),
    invocation_edge_preterminal_checksum: String(edge.edge_checksum || ""),
    group_id: String(edge.group_id || ""),
    group_session_id: String(edge.group_session_id || ""),
    task_id: String(edge.task_id || ""),
    task_agent_session_id: String(edge.task_agent_session_id || ""),
    provider: String(nativeReceipt?.provider || edge.transport || ""),
    model: String(nativeReceipt?.model || record?.entry?.model || ""),
    runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
    native_session_id: effectiveNativeSessionId,
    typed_memory_delivery_capsule_checksum: String(edge.typed_memory_delivery_capsule_checksum || ""),
    dispatch_model_context_window: dispatchWindow,
    dispatch_configured_memory_tokens: configuredTokens,
    dispatch_effective_memory_tokens: dispatchEffectiveTokens,
    actual_model_context_window: actualWindow,
    actual_effective_memory_tokens: expectedActualEffectiveTokens,
    native_capability_receipt_present: !!nativeReceipt,
    native_capability_receipt_checksum: String(nativeReceipt?.checksum || ""),
    native_capability_receipt_valid: receiptValidation.valid,
    native_capability_receipt_issues: receiptValidation.gaps || [],
    capacity_downgrade_detected: downgradeDetected,
    budget_drift_tokens: downgradeDetected ? Math.max(0, dispatchEffectiveTokens - expectedActualEffectiveTokens) : 0,
    current_prompt_rebudgeted: false,
    next_dispatch_rebuild_required: downgradeDetected,
    next_dispatch_action: downgradeDetected ? "rebuild_and_recompact_before_next_dispatch" : "none",
    capacity_downgrade_gate: record?.downgrade || null,
    status: !nativeReceipt ? "capacity_unavailable" : !receiptValidation.valid ? "unverified" : downgradeDetected ? "drift_detected" : "within_verified_capacity",
    compared_at: new Date().toISOString(),
  };
  proof.proof_checksum = contextRebudgetProofChecksum(proof);
  return proof;
}

function adoptionReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return sha256(payload);
}

export function verifyTaskAgentInvocationAdoptionReceipt(receipt: any, edge: any = null) {
  const issues: string[] = [];
  if (receipt?.schema !== TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA || Number(receipt?.version || 0) !== 1) issues.push("adoption_receipt_schema_invalid");
  if (String(receipt?.receipt_checksum || "") !== adoptionReceiptChecksum(receipt)) issues.push("adoption_receipt_checksum_invalid");
  if (edge) {
    if (String(receipt?.invocation_edge_id || "") !== String(edge.invocation_edge_id || "")) issues.push("adoption_receipt_edge_mismatch");
    if (String(receipt?.group_id || "") !== String(edge.group_id || "")) issues.push("adoption_receipt_group_mismatch");
    if (String(receipt?.group_session_id || "") !== String(edge.group_session_id || "")) issues.push("adoption_receipt_group_session_mismatch");
    if (String(receipt?.task_agent_session_id || "") !== String(edge.task_agent_session_id || "")) issues.push("adoption_receipt_task_session_mismatch");
    if (String(receipt?.parent_invocation_edge_id || "") !== String(edge.parent_invocation_edge_id || "")) issues.push("adoption_receipt_parent_mismatch");
    if (String(receipt?.native_continuation_receipt_checksum || "") !== String(edge.native_continuation_receipt_checksum || "")) issues.push("adoption_receipt_native_continuation_mismatch");
  }
  return { valid: issues.length === 0, issues };
}

function buildTaskAgentInvocationAdoptionReceipt(edge: any, evidence: any, success: boolean, nativeContinuationReceipt: any) {
  const requestedNativeSessionId = String(edge.native_session_id || "");
  const adoptedNativeSessionId = String(nativeContinuationReceipt?.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || requestedNativeSessionId || "");
  const required = edge.continuity_contract_required === true;
  const mode = ["provider_switch", "fork"].includes(String(edge.branch_kind || ""))
    ? "provider_switch_fork"
    : edge.invocation_kind === "resume" && requestedNativeSessionId
      ? "native_resume"
      : edge.invocation_kind === "resume" ? "scratchpad_resume" : "spawn";
  const contextBound = !!edge.worker_context_packet_id && !!edge.memory_context_snapshot_id && !!edge.prompt_checksum && !!(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id);
  const nativeReceiptValidation = verifyTaskAgentNativeContinuationReceipt(nativeContinuationReceipt, edge);
  const nativeIdentityValid = mode !== "native_resume" || (
    !!requestedNativeSessionId
    && requestedNativeSessionId === adoptedNativeSessionId
    && nativeContinuationReceipt?.status === "acknowledged"
    && nativeReceiptValidation.valid
  );
  const runnerContinuationValid = nativeReceiptValidation.valid
    && (mode === "native_resume" ? nativeContinuationReceipt?.status === "acknowledged" : nativeContinuationReceipt?.status === "not_required");
  const adoptionStatus = !success ? "failed"
    : required ? contextBound && nativeIdentityValid && runnerContinuationValid ? "adopted" : "unverified"
      : "observed";
  const payload: any = {
    schema: TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA,
    version: 1,
    receipt_id: `tiar_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
    invocation_edge_id: String(edge.invocation_edge_id || ""),
    invocation_edge_preterminal_checksum: String(edge.edge_checksum || ""),
    parent_invocation_edge_id: String(edge.parent_invocation_edge_id || ""),
    parent_invocation_edge_checksum: String(edge.expected_lineage_head_checksum || ""),
    root_invocation_edge_id: String(edge.root_invocation_edge_id || ""),
    branch_id: String(edge.branch_id || ""),
    branch_kind: String(edge.branch_kind || ""),
    invocation_kind: String(edge.invocation_kind || ""),
    group_id: String(edge.group_id || ""),
    group_session_id: String(edge.group_session_id || ""),
    task_id: String(edge.task_id || ""),
    target_project: String(edge.target_project || ""),
    task_agent_session_id: String(edge.task_agent_session_id || ""),
    transport: String(edge.transport || evidence.transport || ""),
    adoption_mode: mode,
    requested_native_session_id: requestedNativeSessionId,
    parent_native_session_id: String(edge.parent_native_session_id || ""),
    adopted_native_session_id: adoptedNativeSessionId,
    native_identity_valid: nativeIdentityValid,
    native_continuation_receipt_checksum: String(nativeContinuationReceipt?.receipt_checksum || ""),
    native_continuation_status: String(nativeContinuationReceipt?.status || ""),
    native_continuation_receipt_valid: nativeReceiptValidation.valid,
    worker_context_packet_id: String(edge.worker_context_packet_id || ""),
    memory_context_snapshot_id: String(edge.memory_context_snapshot_id || ""),
    memory_context_snapshot_checksum: String(edge.memory_context_snapshot_checksum || ""),
    prompt_checksum: String(edge.prompt_checksum || ""),
    compact_epoch: String(edge.compact_epoch || ""),
    runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
    continuity_contract_required: required,
    context_bound: contextBound,
    status: adoptionStatus,
    adopted_at: new Date().toISOString(),
  };
  payload.receipt_checksum = adoptionReceiptChecksum(payload);
  return payload;
}

export function completeTaskAgentInvocationEdge(edgeOrId: any, evidence: any = {}) {
  const current = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
  if (!current) throw new Error("task-agent invocation edge not found");
  const status = evidence.success === false || evidence.status === "failed" ? "failed" : "completed";
  const nativeContinuationReceipt = buildTaskAgentNativeContinuationReceipt(current, evidence, status === "completed");
  const contextRebudgetProof = buildTaskAgentContextRebudgetProof(current, evidence);
  const adoptionReceipt = buildTaskAgentInvocationAdoptionReceipt(current, evidence, status === "completed", nativeContinuationReceipt);
  const next = transitionEdge(current, status, {
    native_session_id: String(nativeContinuationReceipt.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || current.native_session_id || ""),
    runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || current.runner_request_id || ""),
    result_checksum: evidence.output !== undefined ? sha256(String(evidence.output || ""), 32) : String(evidence.resultChecksum || evidence.result_checksum || ""),
    error: String(evidence.error || "").slice(0, 1200),
    terminal_reason: String(evidence.reason || evidence.terminal_reason || ""),
    recovery_outcome: String(evidence.recoveryOutcome || evidence.recovery_outcome || ""),
    recovery_source: String(evidence.recoverySource || evidence.recovery_source || ""),
    recovered_at: String(evidence.recoveredAt || evidence.recovered_at || ""),
    recovery_lease_id: String(evidence.recoveryLeaseId || evidence.recovery_lease_id || current.recovery_lease_id || ""),
    recovery_fencing_token: Number(evidence.recoveryFencingToken || evidence.recovery_fencing_token || current.recovery_fencing_token || 0),
    adoption_receipt: adoptionReceipt,
    adoption_receipt_checksum: adoptionReceipt.receipt_checksum,
    adoption_status: adoptionReceipt.status,
    native_continuation_receipt: nativeContinuationReceipt,
    native_continuation_receipt_checksum: nativeContinuationReceipt.receipt_checksum,
    native_continuation_status: nativeContinuationReceipt.status,
    context_rebudget_proof: contextRebudgetProof,
    context_rebudget_proof_checksum: contextRebudgetProof.proof_checksum,
    context_rebudget_status: contextRebudgetProof.status,
  });
  recordInvocationSoakPhase(next, "continuation_evidence_captured", nativeContinuationReceipt.status, nativeContinuationReceipt);
  recordInvocationSoakPhase(next, "invocation_terminal", status, nativeContinuationReceipt);
  return next;
}

function verifyMemoryDeliveryReceiptChecksum(receipt: any) {
  if (!receipt?.checksum) return false;
  const payload = { ...receipt };
  const expected = String(payload.checksum || "");
  delete payload.checksum;
  delete payload.receiptFile;
  return rawJsonSha256(payload) === expected;
}

function reinjectionProofChecksum(proof: any) {
  const payload = { ...(proof || {}) };
  delete payload.proof_checksum;
  delete payload.checksum_valid;
  return sha256(payload);
}

export function verifyTaskAgentInvocationReinjectionProof(proof: any, edge: any = null) {
  const issues: string[] = [];
  if (proof?.schema !== TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA || Number(proof?.version || 0) !== 1) issues.push("reinjection_proof_schema_invalid");
  if (String(proof?.proof_checksum || "") !== reinjectionProofChecksum(proof)) issues.push("reinjection_proof_checksum_invalid");
  if (edge) {
    if (String(proof?.invocation_edge_id || "") !== String(edge.invocation_edge_id || "")) issues.push("reinjection_proof_edge_mismatch");
    if (String(proof?.group_id || "") !== String(edge.group_id || "")) issues.push("reinjection_proof_group_mismatch");
    if (String(proof?.group_session_id || "") !== String(edge.group_session_id || "")) issues.push("reinjection_proof_group_session_mismatch");
    if (String(proof?.task_agent_session_id || "") !== String(edge.task_agent_session_id || "")) issues.push("reinjection_proof_task_session_mismatch");
    if (String(proof?.memory_context_snapshot_id || "") !== String(edge.memory_context_snapshot_id || "")) issues.push("reinjection_proof_snapshot_mismatch");
    if (String(edge.compact_epoch || "") !== "precompact") {
      if (proof?.compact_transaction_receipt_valid !== true) issues.push("reinjection_proof_compact_transaction_invalid");
      if (!String(proof?.compact_transaction_receipt_checksum || "")) issues.push("reinjection_proof_compact_transaction_missing");
      if (String(proof?.compact_transaction_receipt_checksum || "") !== String(edge.compact_transaction_receipt_checksum || "")) issues.push("reinjection_proof_compact_transaction_mismatch");
      if (String(proof?.compact_transaction_boundary_id || "") !== String(edge.compact_transaction_boundary_id || "")) issues.push("reinjection_proof_compact_boundary_mismatch");
    }
    if (edge.compact_head_fence_required === true) {
      if (proof?.compact_head_fence_valid !== true) issues.push("reinjection_proof_compact_head_stale");
      if (Number(proof?.compact_head_generation || 0) !== Number(edge.compact_head_generation || 0)) issues.push("reinjection_proof_compact_head_generation_mismatch");
      if (String(proof?.compact_head_checksum || "") !== String(edge.compact_head_checksum || "")) issues.push("reinjection_proof_compact_head_checksum_mismatch");
    }
  }
  return { valid: issues.length === 0, issues };
}

export function bindTaskAgentInvocationMemoryDelivery(edgeOrId: any, evidence: any = {}) {
  const edge = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
  if (!edge) throw new Error("task-agent invocation edge not found");
  const receipt = evidence.deliveryReceipt || evidence.delivery_receipt || null;
  const binding = receipt?.groupSessionMemoryBinding || receipt?.group_session_memory_binding || {};
  const receiptChecksumValid = receipt ? verifyMemoryDeliveryReceiptChecksum(receipt) : false;
  const receiptIdentityValid = !!receipt
    && String(receipt.groupId || receipt.group_id || "") === String(edge.group_id || "")
    && String(receipt.taskId || receipt.task_id || "") === String(edge.task_id || "")
    && String(receipt.taskAgentSessionId || receipt.task_agent_session_id || "") === String(edge.task_agent_session_id || "")
    && String(receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "") === String(edge.memory_context_snapshot_id || "")
    && (!receipt.workerContextPacketId || String(receipt.workerContextPacketId || "") === String(edge.worker_context_packet_id || ""))
    && (!receipt.runnerRequestId || String(receipt.runnerRequestId || "") === String(edge.runner_request_id || ""))
    && (!binding.groupSessionId || String(binding.groupSessionId || binding.group_session_id || "") === String(edge.group_session_id || ""));
  const receiptDelivered = receipt?.delivered === true && ["exact", "contains_snapshot_prompt"].includes(String(receipt.promptBindingMode || receipt.prompt_binding_mode || ""));
  const compactTransactionRequired = String(edge.compact_epoch || "") !== "precompact";
  const compactTransactionReceiptChecksum = String(receipt?.compactTransactionReceiptChecksum || receipt?.compact_transaction_receipt_checksum || binding.compactTransactionReceiptChecksum || binding.compact_transaction_receipt_checksum || "");
  const compactTransactionBoundaryId = String(receipt?.compactTransactionBoundaryId || receipt?.compact_transaction_boundary_id || binding.compactTransactionBoundaryId || binding.compact_transaction_boundary_id || "");
  const compactTransactionReceiptValid = !compactTransactionRequired || (
    receipt?.compactTransactionReceiptValid === true
    && binding.compactTransactionReceiptValid === true
    && !!compactTransactionReceiptChecksum
    && !!compactTransactionBoundaryId
    && String(receipt?.compactEpoch || receipt?.compact_epoch || binding.compactEpoch || binding.compact_epoch || "") === String(edge.compact_epoch || "")
    && compactTransactionReceiptChecksum === String(edge.compact_transaction_receipt_checksum || "")
    && compactTransactionBoundaryId === String(edge.compact_transaction_boundary_id || "")
  );
  const compactHeadFenceRequired = edge.compact_head_fence_required === true;
  const compactHeadFenceValid = !compactHeadFenceRequired || (
    edge.compact_head_dispatch_fence_valid === true
    && receipt?.compactHeadFenceValid === true
    && Number(receipt?.compactHeadGeneration || 0) === Number(edge.compact_head_generation || 0)
    && String(receipt?.compactHeadChecksum || "") === String(edge.compact_head_checksum || "")
  );
  const sessionLifecycleFenceRequired = edge.session_lifecycle_fence_required === true || String(edge.group_session_id || "").startsWith("gcs_");
  const sessionLifecycleFenceValid = !sessionLifecycleFenceRequired || (
    edge.session_lifecycle_dispatch_fence_valid === true
    && receipt?.sessionLifecycleFenceValid === true
    && Number(receipt?.sessionLifecycleGeneration || 0) === Number(edge.session_lifecycle_generation || 0)
    && String(receipt?.sessionLifecycleHeadChecksum || "") === String(edge.session_lifecycle_head_checksum || "")
  );
  const runnerPairValid = evidence.recoveryRunnerPairValid === true || evidence.recovery_runner_pair_valid === true;
  const runnerPromptChecksum = String(evidence.runnerPromptChecksum || evidence.runner_prompt_checksum || "");
  const reconstructedIdentityValid = runnerPairValid
    && !!edge.runner_request_id
    && (!runnerPromptChecksum || runnerPromptChecksum === String(edge.prompt_checksum || ""));
  const proven = receipt
    ? receiptChecksumValid && receiptIdentityValid && receiptDelivered && binding.deliveryReady !== false && compactTransactionReceiptValid && compactHeadFenceValid && sessionLifecycleFenceValid
    : reconstructedIdentityValid;
  const source = receipt ? "memory_context_delivery_receipt" : runnerPairValid ? "direct_runner_pair_reconstruction" : "missing";
  const proof: any = {
    schema: TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA,
    version: 1,
    proof_id: `tirp_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
    invocation_edge_id: String(edge.invocation_edge_id || ""),
    invocation_edge_predelivery_checksum: String(edge.edge_checksum || ""),
    adoption_receipt_checksum: String(edge.adoption_receipt_checksum || ""),
    group_id: String(edge.group_id || ""),
    group_session_id: String(edge.group_session_id || ""),
    group_session_scope_id: String(binding.scopeId || binding.scope_id || ""),
    group_session_memory_binding_checksum: String(receipt?.groupSessionMemoryBindingChecksum || receipt?.group_session_memory_binding_checksum || binding.checksum || ""),
    task_id: String(edge.task_id || ""),
    task_agent_session_id: String(edge.task_agent_session_id || ""),
    native_session_id: String(receipt?.nativeSessionId || receipt?.native_session_id || edge.native_session_id || ""),
    runner_request_id: String(edge.runner_request_id || ""),
    worker_context_packet_id: String(edge.worker_context_packet_id || ""),
    memory_context_snapshot_id: String(edge.memory_context_snapshot_id || ""),
    memory_context_snapshot_checksum: String(edge.memory_context_snapshot_checksum || ""),
    prompt_checksum: String(edge.prompt_checksum || ""),
    compact_epoch: String(edge.compact_epoch || ""),
    compact_transaction_receipt_required: compactTransactionRequired,
    compact_transaction_receipt_id: String(receipt?.compactTransactionReceiptId || receipt?.compact_transaction_receipt_id || binding.compactTransactionReceiptId || ""),
    compact_transaction_boundary_id: compactTransactionBoundaryId,
    compact_transaction_receipt_checksum: compactTransactionReceiptChecksum,
    compact_transaction_receipt_valid: compactTransactionReceiptValid,
    compact_head_fence_required: compactHeadFenceRequired,
    compact_head_fence_valid: compactHeadFenceValid,
    compact_head_id: String(receipt?.compactHeadId || binding.compactHeadId || edge.compact_head_id || ""),
    compact_head_generation: Number(receipt?.compactHeadGeneration || binding.compactHeadGeneration || edge.compact_head_generation || 0),
    compact_head_checksum: String(receipt?.compactHeadChecksum || binding.compactHeadChecksum || edge.compact_head_checksum || ""),
    session_lifecycle_fence_required: sessionLifecycleFenceRequired,
    session_lifecycle_fence_valid: sessionLifecycleFenceValid,
    session_lifecycle_head_id: String(receipt?.sessionLifecycleHeadId || binding.sessionLifecycleHeadId || edge.session_lifecycle_head_id || ""),
    session_lifecycle_generation: Number(receipt?.sessionLifecycleGeneration || binding.sessionLifecycleGeneration || edge.session_lifecycle_generation || 0),
    session_lifecycle_status: String(receipt?.sessionLifecycleStatus || binding.sessionLifecycleStatus || edge.session_lifecycle_status || ""),
    session_lifecycle_head_checksum: String(receipt?.sessionLifecycleHeadChecksum || binding.sessionLifecycleHeadChecksum || edge.session_lifecycle_head_checksum || ""),
    delivery_receipt_id: String(receipt?.receiptId || receipt?.receipt_id || ""),
    delivery_receipt_checksum: String(receipt?.checksum || ""),
    delivery_receipt_checksum_valid: receiptChecksumValid,
    delivery_receipt_identity_valid: receiptIdentityValid,
    delivery_prompt_binding_mode: String(receipt?.promptBindingMode || receipt?.prompt_binding_mode || (runnerPairValid ? "runner_pair_exact" : "")),
    source,
    first_dispatch_after_recovery: edge.continuity_contract_required === true,
    required: edge.continuity_contract_required === true,
    status: proven ? "proven" : "unverified",
    proven_at: proven ? new Date().toISOString() : "",
  };
  proof.proof_checksum = reinjectionProofChecksum(proof);
  const next = transitionEdge(edge, String(edge.status || "prepared"), {
    reinjection_proof: proof,
    reinjection_proof_checksum: proof.proof_checksum,
    reinjection_status: proof.status,
  });
  recordInvocationSoakPhase(next, "post_compact_reinjection", proof.status, proof);
  return next;
}

function recoveryEventChecksum(event: any) {
  const payload = { ...(event || {}) };
  delete payload.event_checksum;
  delete payload.checksum_valid;
  return sha256(payload);
}

function recoveryStatusChecksum(status: any) {
  const payload = { ...(status || {}) };
  delete payload.checksum;
  delete payload.checksum_valid;
  delete payload.file;
  return sha256(payload);
}

function getInvocationRecoveryHistoryFile(groupId: string, groupSessionId: string) {
  return path.join(TASK_AGENT_INVOCATION_RECOVERY_DIR, `${clean(groupId)}--${clean(groupSessionId)}.jsonl`);
}

function getInvocationRecoveryStatusFile(groupId: string, groupSessionId: string) {
  return path.join(TASK_AGENT_INVOCATION_RECOVERY_DIR, `${clean(groupId)}--${clean(groupSessionId)}.latest.json`);
}

export function getTaskAgentInvocationRecoveryLeaseFile(groupId: string, groupSessionId: string) {
  assertGroupSessionIdentity(groupId, groupSessionId);
  return path.join(TASK_AGENT_INVOCATION_RECOVERY_DIR, `${clean(groupId)}--${clean(groupSessionId)}.lease.json`);
}

function recoveryLeaseChecksum(lease: any) {
  const payload = { ...(lease || {}) };
  delete payload.checksum;
  delete payload.checksum_valid;
  delete payload.file;
  return sha256(payload);
}

export function readTaskAgentInvocationRecoveryLease(groupId: string, groupSessionId: string) {
  const file = getTaskAgentInvocationRecoveryLeaseFile(groupId, groupSessionId);
  try {
    if (!fs.existsSync(file)) return null;
    const lease = JSON.parse(fs.readFileSync(file, "utf-8"));
    const checksumValid = lease.schema === TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA
      && String(lease.checksum || "") === recoveryLeaseChecksum(lease);
    return { ...lease, checksum_valid: checksumValid, file };
  } catch {
    return { schema: TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA, checksum_valid: false, file, status: "invalid" };
  }
}

export function acquireTaskAgentInvocationRecoveryLease(groupId: string, groupSessionId: string, options: any = {}) {
  assertGroupSessionIdentity(groupId, groupSessionId);
  const file = getTaskAgentInvocationRecoveryLeaseFile(groupId, groupSessionId);
  const release = acquireLock(file);
  try {
    const current = readTaskAgentInvocationRecoveryLease(groupId, groupSessionId);
    const nowMs = Date.parse(String(options.now || "")) || Date.now();
    const ownerPid = Math.max(1, Math.floor(Number(options.ownerPid || options.owner_pid || process.pid) || process.pid));
    const expiresMs = Date.parse(String(current?.expires_at || ""));
    const activeOwner = current?.checksum_valid === true
      && current.status === "active"
      && Number.isFinite(expiresMs)
      && expiresMs > nowMs
      && processAlive(Number(current.owner_pid || 0));
    if (activeOwner) {
      return { acquired: false, reason: "active_recovery_owner", lease: current, file };
    }
    const previousFence = current?.checksum_valid === true ? Math.max(0, Number(current.fencing_token || 0)) : 0;
    const fencingToken = previousFence + 1;
    const acquiredAt = new Date(nowMs).toISOString();
    const leaseDurationMs = Math.max(5_000, Number(options.leaseMs || options.lease_ms || RECOVERY_LEASE_MS));
    const takeover = !!current && current.checksum_valid === true && current.status === "active";
    const payload: any = {
      schema: TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA,
      version: 1,
      lease_id: `tirl_${sha256(`${groupId}\0${groupSessionId}\0${ownerPid}\0${acquiredAt}\0${crypto.randomBytes(8).toString("hex")}`, 24)}`,
      group_id: groupId,
      group_session_id: groupSessionId,
      status: "active",
      owner_pid: ownerPid,
      owner_hostname: String(options.ownerHostname || options.owner_hostname || os.hostname()),
      recovery_run_id: String(options.recoveryRunId || options.recovery_run_id || ""),
      fencing_token: fencingToken,
      acquired_at: acquiredAt,
      expires_at: new Date(nowMs + leaseDurationMs).toISOString(),
      takeover,
      previous_lease_id: String(current?.lease_id || ""),
      previous_owner_pid: Number(current?.owner_pid || 0),
      previous_fencing_token: previousFence,
    };
    payload.checksum = recoveryLeaseChecksum(payload);
    writeJsonAtomic(file, payload);
    return { acquired: true, reason: takeover ? "abandoned_owner_taken_over" : "acquired", lease: { ...payload, checksum_valid: true, file }, file };
  } finally {
    release();
  }
}

export function finalizeTaskAgentInvocationRecoveryLease(leaseInput: any, report: any = {}) {
  const groupId = String(leaseInput?.group_id || "");
  const groupSessionId = String(leaseInput?.group_session_id || "");
  const file = getTaskAgentInvocationRecoveryLeaseFile(groupId, groupSessionId);
  const release = acquireLock(file);
  try {
    const current = readTaskAgentInvocationRecoveryLease(groupId, groupSessionId);
    if (!current?.checksum_valid
      || current.status !== "active"
      || String(current.lease_id || "") !== String(leaseInput?.lease_id || "")
      || Number(current.fencing_token || 0) !== Number(leaseInput?.fencing_token || 0)) {
      return { finalized: false, reason: "recovery_lease_fence_lost", lease: current };
    }
    const payload: any = {
      ...current,
      checksum_valid: undefined,
      file: undefined,
      status: "completed",
      completed_at: new Date().toISOString(),
      report_checksum: sha256(report),
    };
    payload.checksum = recoveryLeaseChecksum(payload);
    writeJsonAtomic(file, payload);
    return { finalized: true, lease: { ...payload, checksum_valid: true, file } };
  } finally {
    release();
  }
}

function readInvocationRecoveryHistory(file: string) {
  if (!fs.existsSync(file)) return { valid: true, events: [], issues: [], headChecksum: "", lastSequence: 0 };
  const events: any[] = [];
  const issues: string[] = [];
  let previous = "";
  let expectedSequence = 1;
  for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      const checksumValid = String(event.event_checksum || "") === recoveryEventChecksum(event);
      if (event.schema !== TASK_AGENT_INVOCATION_RECOVERY_EVENT_SCHEMA) issues.push("recovery_event_schema_invalid");
      if (Number(event.sequence || 0) !== expectedSequence) issues.push("recovery_event_sequence_invalid");
      if (String(event.previous_event_checksum || "") !== previous) issues.push("recovery_event_chain_broken");
      if (!checksumValid) issues.push("recovery_event_checksum_invalid");
      events.push({ ...event, checksum_valid: checksumValid });
      previous = String(event.event_checksum || "");
      expectedSequence += 1;
    } catch {
      issues.push("recovery_event_json_invalid");
    }
  }
  return { valid: issues.length === 0, events, issues: Array.from(new Set(issues)), headChecksum: previous, lastSequence: events.length };
}

function appendInvocationRecoveryAudit(groupId: string, groupSessionId: string, report: any) {
  const historyFile = getInvocationRecoveryHistoryFile(groupId, groupSessionId);
  const release = acquireLock(historyFile);
  try {
    const history = readInvocationRecoveryHistory(historyFile);
    if (!history.valid) throw new Error(`task-agent invocation recovery history invalid: ${history.issues.join(",")}`);
    const event: any = {
      schema: TASK_AGENT_INVOCATION_RECOVERY_EVENT_SCHEMA,
      version: 1,
      sequence: history.lastSequence + 1,
      previous_event_checksum: history.headChecksum,
      recorded_at: new Date().toISOString(),
      group_id: groupId,
      group_session_id: groupSessionId,
      report,
    };
    event.event_checksum = recoveryEventChecksum(event);
    fs.mkdirSync(path.dirname(historyFile), { recursive: true });
    const fd = fs.openSync(historyFile, "a");
    try { fs.writeSync(fd, `${JSON.stringify(event)}\n`, undefined, "utf-8"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    const status: any = {
      schema: "ccm-task-agent-invocation-recovery-status-v1",
      version: 1,
      group_id: groupId,
      group_session_id: groupSessionId,
      updated_at: event.recorded_at,
      history_sequence: event.sequence,
      history_head_checksum: event.event_checksum,
      report,
    };
    status.checksum = recoveryStatusChecksum(status);
    writeJsonAtomic(getInvocationRecoveryStatusFile(groupId, groupSessionId), status);
    return { event, status };
  } finally {
    release();
  }
}

function relinkInvocationEdgeToAncestor(edge: any, edgesById: Map<string, any>, recoveryLease: any = null) {
  const ancestry = Array.isArray(edge.parent_ancestry) ? edge.parent_ancestry : [];
  const replacement = ancestry.slice(1).map((row: any) => ({ row, edge: edgesById.get(String(row.invocation_edge_id || "")) }))
    .find(({ row, edge: candidate }: any) => candidate
      && candidate.group_id === edge.group_id
      && candidate.group_session_id === edge.group_session_id
      && candidate.task_id === edge.task_id
      && candidate.target_project === edge.target_project
      && String(candidate.edge_checksum || "") === String(row.edge_checksum || ""));
  if (!replacement?.edge) return { repaired: false, reason: "no_checksum_verified_surviving_ancestor" };
  const current = findTaskAgentInvocationEdge(String(edge.invocation_edge_id || ""));
  if (!current) return { repaired: false, reason: "edge_missing_during_repair" };
  const ancestor = replacement.edge;
  const next: any = {
    ...current,
    parent_invocation_edge_id: String(ancestor.invocation_edge_id || ""),
    expected_lineage_head_edge_id: String(ancestor.invocation_edge_id || ""),
    expected_lineage_head_checksum: String(ancestor.edge_checksum || ""),
    parent_ancestry: [
      { invocation_edge_id: String(ancestor.invocation_edge_id || ""), edge_checksum: String(ancestor.edge_checksum || "") },
      ...(Array.isArray(ancestor.parent_ancestry) ? ancestor.parent_ancestry : []),
    ].slice(0, 32),
    recovery_original_parent_invocation_edge_id: String(current.recovery_original_parent_invocation_edge_id || current.parent_invocation_edge_id || ""),
    recovery_parent_relinked_at: new Date().toISOString(),
    recovery_parent_relink_reason: "dangling_parent_relinked_to_checksum_verified_ancestor",
    recovery_lease_id: String(recoveryLease?.lease_id || ""),
    recovery_fencing_token: Number(recoveryLease?.fencing_token || 0),
  };
  delete next.ledger_file;
  delete next.event_sequence;
  delete next.event_checksum;
  delete next.ledger_valid;
  next.edge_checksum = edgeChecksum(next);
  appendEvent(current.ledger_file, next, "parent_relinked");
  return { repaired: true, edge: { ...next, ledger_file: current.ledger_file }, ancestor };
}

function rebindInvocationEdgeToRecoveredParent(edge: any, parent: any, recoveryLease: any = null) {
  if (!parent?.recovery_parent_relinked_at && !parent?.recovery_parent_head_rebound_at) {
    return { repaired: false, reason: "parent_head_changed_without_verified_recovery" };
  }
  const current = findTaskAgentInvocationEdge(String(edge.invocation_edge_id || ""));
  if (!current) return { repaired: false, reason: "edge_missing_during_head_rebind" };
  if (current.group_id !== parent.group_id || current.group_session_id !== parent.group_session_id || current.task_id !== parent.task_id || current.target_project !== parent.target_project) {
    return { repaired: false, reason: "recovered_parent_identity_mismatch" };
  }
  const next: any = {
    ...current,
    expected_lineage_head_edge_id: String(parent.invocation_edge_id || ""),
    expected_lineage_head_checksum: String(parent.edge_checksum || ""),
    parent_ancestry: [
      { invocation_edge_id: String(parent.invocation_edge_id || ""), edge_checksum: String(parent.edge_checksum || "") },
      ...(Array.isArray(parent.parent_ancestry) ? parent.parent_ancestry : []),
    ].slice(0, 32),
    recovery_original_expected_lineage_head_checksum: String(current.recovery_original_expected_lineage_head_checksum || current.expected_lineage_head_checksum || ""),
    recovery_parent_head_rebound_at: new Date().toISOString(),
    recovery_parent_head_rebind_reason: "parent_checksum_changed_by_verified_recovery_relink",
    recovery_lease_id: String(recoveryLease?.lease_id || ""),
    recovery_fencing_token: Number(recoveryLease?.fencing_token || 0),
  };
  delete next.ledger_file;
  delete next.event_sequence;
  delete next.event_checksum;
  delete next.ledger_valid;
  next.edge_checksum = edgeChecksum(next);
  appendEvent(current.ledger_file, next, "parent_head_rebound");
  return { repaired: true, edge: { ...next, ledger_file: current.ledger_file }, parent };
}

function directResultEvidence(edge: any) {
  const runnerRequestId = String(edge.runner_request_id || "");
  if (!runnerRequestId.startsWith("adr_")) return { present: false, valid: false, request: null, result: null, issues: [] };
  const request = readDirectAgentDispatchRequest(runnerRequestId);
  const result = readDirectAgentDispatchResult(runnerRequestId);
  if (!request || !result) return { present: !!request || !!result, valid: false, request, result, issues: [request ? "result_missing" : "request_missing"] };
  const pair = validateDirectAgentDispatchPair(request, result);
  const issues = [...pair.issues];
  if (String(request.groupId || "") !== String(edge.group_id || "")) issues.push("edge_runner_group_mismatch");
  if (String(request.taskId || "") !== String(edge.task_id || "")) issues.push("edge_runner_task_mismatch");
  if (String(request.taskAgentSessionId || "") !== String(edge.task_agent_session_id || "")) issues.push("edge_runner_task_session_mismatch");
  if (edge.execution_id && String(request.executionId || "") !== String(edge.execution_id || "")) issues.push("edge_runner_execution_mismatch");
  if (edge.prompt_checksum && String(request.prompt_checksum || "") !== String(edge.prompt_checksum || "")) issues.push("edge_runner_prompt_mismatch");
  return { present: true, valid: issues.length === 0, request, result, issues: Array.from(new Set(issues)) };
}

export function buildTaskAgentInvocationRecoveryStatus(options: any = {}) {
  const rows: any[] = [];
  const issues: any[] = [];
  if (fs.existsSync(TASK_AGENT_INVOCATION_RECOVERY_DIR)) {
    for (const entry of fs.readdirSync(TASK_AGENT_INVOCATION_RECOVERY_DIR, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".latest.json")) continue;
      const file = path.join(TASK_AGENT_INVOCATION_RECOVERY_DIR, entry.name);
      try {
        const status = JSON.parse(fs.readFileSync(file, "utf-8"));
        const checksumValid = String(status.checksum || "") === recoveryStatusChecksum(status);
        if (!checksumValid) issues.push({ file, issues: ["recovery_status_checksum_invalid"] });
        if (options.groupId && status.group_id !== String(options.groupId)) continue;
        if (options.groupSessionId && status.group_session_id !== String(options.groupSessionId)) continue;
        rows.push({ ...status, checksum_valid: checksumValid, file });
      } catch {
        issues.push({ file, issues: ["recovery_status_read_failed"] });
      }
    }
  }
  rows.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  const reports = rows.map(row => row.report || {});
  return {
    schema: "ccm-task-agent-invocation-recovery-status-report-v1",
    generated_at: new Date().toISOString(),
    overall: {
      status: issues.length > 0 ? "fail" : rows.length === 0 ? "empty" : "ok",
      session_count: rows.length,
      checked_count: reports.reduce((sum, report) => sum + Number(report.checked || 0), 0),
      recovered_count: reports.reduce((sum, report) => sum + Number(report.recovered || 0), 0),
      uncertain_count: reports.reduce((sum, report) => sum + Number(report.uncertain || 0), 0),
      active_count: reports.reduce((sum, report) => sum + Number(report.active || 0), 0),
      pending_count: reports.reduce((sum, report) => sum + Number(report.pending || 0), 0),
      relinked_count: reports.reduce((sum, report) => sum + Number(report.relinked || 0), 0),
      quarantined_count: reports.reduce((sum, report) => sum + Number(report.quarantined || 0), 0),
      leased_count: reports.filter(report => !!report.recovery_lease_id).length,
      lease_takeover_count: reports.filter(report => report.recovery_lease_takeover === true).length,
      max_fencing_token: reports.reduce((max, report) => Math.max(max, Number(report.recovery_fencing_token || 0)), 0),
    },
    rows,
    issues,
  };
}

export function reconcileTaskAgentInvocationRecovery(options: any = {}) {
  const startedAt = new Date().toISOString();
  const nowMs = Date.parse(String(options.now || "")) || Date.now();
  const minimumAgeMs = Math.max(0, Number(options.minimumAgeMs ?? options.minimum_age_ms ?? 30_000));
  const listed = listTaskAgentInvocationEdges(options);
  const recoveryRunId = `tirr_${sha256(`${process.pid}\0${startedAt}\0${crypto.randomBytes(8).toString("hex")}`, 24)}`;
  const leaseAttempts = new Map<string, any>();
  for (const edge of listed.edges) {
    const scopeKey = `${edge.group_id}\0${edge.group_session_id}`;
    if (leaseAttempts.has(scopeKey)) continue;
    leaseAttempts.set(scopeKey, acquireTaskAgentInvocationRecoveryLease(String(edge.group_id || ""), String(edge.group_session_id || ""), {
      now: new Date(nowMs).toISOString(),
      leaseMs: options.leaseMs || options.lease_ms,
      recoveryRunId,
    }));
  }
  const edgesById = new Map(listed.edges.map((edge: any) => [String(edge.invocation_edge_id || ""), edge]));
  const walByTicket = new Map(listTypedMemoryDispatchWal().map((record: any) => [String(record.ticket_id || ""), record]));
  const rows: any[] = [];
  for (const source of listed.edges) {
    let edge = source;
    const scopeKey = `${edge.group_id}\0${edge.group_session_id}`;
    const leaseAttempt = leaseAttempts.get(scopeKey);
    if (!leaseAttempt?.acquired) {
      rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, status: edge.status, action: "recovery_lease_contended", reason: leaseAttempt?.reason || "recovery_lease_unavailable", recovery_lease_id: String(leaseAttempt?.lease?.lease_id || ""), recovery_fencing_token: Number(leaseAttempt?.lease?.fencing_token || 0) });
      continue;
    }
    const recoveryLease = leaseAttempt.lease;
    const parentMissing = !!edge.parent_invocation_edge_id && !edgesById.has(String(edge.parent_invocation_edge_id));
    if (parentMissing) {
      const repaired = options.repairDanglingParents === false ? { repaired: false, reason: "repair_disabled" } : relinkInvocationEdgeToAncestor(edge, edgesById, recoveryLease);
      if (!repaired.repaired) {
        rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, action: "quarantined_dangling_parent", reason: repaired.reason });
        continue;
      }
      edge = repaired.edge;
      edgesById.set(String(edge.invocation_edge_id), edge);
      rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: source.status, status: edge.status, action: "parent_relinked", parent_invocation_edge_id: edge.parent_invocation_edge_id });
    }
    const currentParent = edge.parent_invocation_edge_id ? edgesById.get(String(edge.parent_invocation_edge_id)) : null;
    const parentHeadMismatch = !!currentParent && String(edge.expected_lineage_head_checksum || "") !== String(currentParent.edge_checksum || "");
    if (parentHeadMismatch) {
      const rebound = rebindInvocationEdgeToRecoveredParent(edge, currentParent, recoveryLease);
      if (!rebound.repaired) {
        rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, action: "quarantined_lineage_head_mismatch", reason: rebound.reason });
        continue;
      }
      edge = rebound.edge;
      edgesById.set(String(edge.invocation_edge_id), edge);
      rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: source.status, status: edge.status, action: "parent_head_rebound", parent_invocation_edge_id: edge.parent_invocation_edge_id });
    }
    if (TERMINAL.has(String(edge.status || ""))) continue;
    const preparedMs = Date.parse(String(edge.dispatched_at || edge.prepared_at || ""));
    const oldEnough = !Number.isFinite(preparedMs) || nowMs - preparedMs >= minimumAgeMs;
    const ticketId = String(edge.dispatch_ticket_id || "");
    const wal = ticketId ? walByTicket.get(ticketId) || null : null;
    if (wal) {
      const walVerification = verifyTypedMemoryDispatchWal(wal);
      const walIssues = [...walVerification.issues];
      if (String(wal.group_id || "") !== String(edge.group_id || "")) walIssues.push("wal_group_mismatch");
      if (String(wal.group_session_id || "") !== String(edge.group_session_id || "")) walIssues.push("wal_group_session_mismatch");
      if (String(wal.task_id || "") !== String(edge.task_id || "")) walIssues.push("wal_task_mismatch");
      if (String(wal.task_agent_session_id || "") !== String(edge.task_agent_session_id || "")) walIssues.push("wal_task_session_mismatch");
      if (edge.dispatch_ticket_checksum && String(wal.ticket_checksum || "") !== String(edge.dispatch_ticket_checksum || "")) walIssues.push("wal_ticket_checksum_mismatch");
      if (walIssues.length > 0) {
        rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, action: "quarantined_wal_identity", reason: Array.from(new Set(walIssues)).join(",") });
        continue;
      }
    }
    const direct = directResultEvidence(edge);
    if (direct.valid && direct.result) {
      let recovered = completeTaskAgentInvocationEdge(edge, {
        success: direct.result.success === true,
        nativeSessionId: direct.result.nativeSessionId || "",
        requestedNativeSessionId: direct.result.nativeContinuationEvidence?.requestedNativeSessionId || direct.request?.requestedNativeSessionId || "",
        returnedNativeSessionId: direct.result.nativeContinuationEvidence?.returnedNativeSessionId || "",
        effectiveNativeSessionId: direct.result.nativeContinuationEvidence?.effectiveNativeSessionId || direct.result.nativeSessionId || "",
        nativeResumeRequested: direct.result.nativeContinuationEvidence?.nativeResumeRequested === true || direct.request?.nativeResumeRequested === true,
        nativeContinuationEvidence: direct.result.nativeContinuationEvidence || null,
        nativeModelCapabilityReceipt: direct.result.nativeModelCapabilityReceipt || null,
        nativeModelCapabilityRecord: direct.result.nativeModelCapabilityRecord || null,
        runnerRequestId: edge.runner_request_id,
        output: direct.result.output || direct.result.error || "",
        error: direct.result.error || "",
        reason: direct.result.success === true ? "startup_runner_result_recovered" : "startup_runner_failure_recovered",
        recoveryOutcome: direct.result.success === true ? "recovered_completed" : "recovered_failed",
        recoverySource: "direct_runner_request_result_pair",
        recoveredAt: new Date(nowMs).toISOString(),
        recoveryLeaseId: recoveryLease.lease_id,
        recoveryFencingToken: recoveryLease.fencing_token,
      });
      if (recovered.status === "completed") {
        recovered = bindTaskAgentInvocationMemoryDelivery(recovered, {
          recoveryRunnerPairValid: true,
          runnerPromptChecksum: direct.request?.prompt_checksum || "",
        });
      }
      rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, status: recovered.status, action: direct.result.success === true ? "recovered_completed" : "recovered_failed", runner_request_id: edge.runner_request_id, ticket_id: ticketId });
      continue;
    }
    if (wal && ["committed", "cancelled", "expired", "uncertain_after_crash"].includes(String(wal.state || ""))) {
      const success = wal.state === "committed" && wal.runner_succeeded !== false;
      let recovered = completeTaskAgentInvocationEdge(edge, {
        success,
        runnerRequestId: edge.runner_request_id || wal.runner_request_id || "",
        reason: `startup_wal_${wal.state}`,
        error: success ? "" : `invocation recovery resolved by WAL state ${wal.state}`,
        recoveryOutcome: success ? "recovered_completed" : wal.state === "uncertain_after_crash" ? "uncertain" : "recovered_failed",
        recoverySource: "typed_memory_dispatch_wal",
        recoveredAt: new Date(nowMs).toISOString(),
        recoveryLeaseId: recoveryLease.lease_id,
        recoveryFencingToken: recoveryLease.fencing_token,
      });
      if (recovered.status === "completed" && wal.delivery_receipt) {
        recovered = bindTaskAgentInvocationMemoryDelivery(recovered, { deliveryReceipt: wal.delivery_receipt });
      }
      rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, status: recovered.status, action: success ? "recovered_completed" : wal.state === "uncertain_after_crash" ? "marked_uncertain" : "recovered_failed", runner_request_id: edge.runner_request_id || wal.runner_request_id || "", ticket_id: ticketId, wal_state: wal.state });
      continue;
    }
    const request = direct.request || (edge.runner_request_id ? readDirectAgentDispatchRequest(String(edge.runner_request_id)) : null);
    if (request?.status === "running" && processAlive(Number(request.runner_pid || request.runnerPid || 0))) {
      rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, status: edge.status, action: "left_active_runner", runner_request_id: edge.runner_request_id });
      continue;
    }
    if (!oldEnough || (wal?.state === "admitted" && Number.isFinite(Date.parse(String(wal.dispatch_not_after || ""))) && nowMs <= Date.parse(String(wal.dispatch_not_after || "")))) {
      rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, status: edge.status, action: "left_pending", ticket_id: ticketId });
      continue;
    }
    const uncertain = edge.status === "dispatched" || !!edge.runner_request_id || wal?.state === "dispatch_started" || direct.present;
    const recovered = completeTaskAgentInvocationEdge(edge, {
      success: false,
      runnerRequestId: edge.runner_request_id || wal?.runner_request_id || "",
      reason: uncertain ? "startup_dispatch_witness_without_terminal_evidence" : "startup_prepared_without_dispatch_witness",
      error: uncertain ? `runner terminal evidence unavailable${direct.issues.length ? `: ${direct.issues.join(",")}` : ""}` : "prepared invocation was never dispatched",
      recoveryOutcome: uncertain ? "uncertain" : "abandoned_before_dispatch",
      recoverySource: wal ? "typed_memory_dispatch_wal" : edge.runner_request_id ? "runner_request" : "invocation_ledger",
      recoveredAt: new Date(nowMs).toISOString(),
      recoveryLeaseId: recoveryLease.lease_id,
      recoveryFencingToken: recoveryLease.fencing_token,
    });
    rows.push({ invocation_edge_id: edge.invocation_edge_id, group_id: edge.group_id, group_session_id: edge.group_session_id, task_agent_session_id: edge.task_agent_session_id, previous_status: edge.status, status: recovered.status, action: uncertain ? "marked_uncertain" : "abandoned_before_dispatch", runner_request_id: edge.runner_request_id || "", ticket_id: ticketId });
  }
  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    const key = `${row.group_id}\0${row.group_session_id}`;
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  }
  for (const sessionRows of grouped.values()) {
    const first = sessionRows[0];
    const scopeKey = `${first.group_id}\0${first.group_session_id}`;
    const leaseAttempt = leaseAttempts.get(scopeKey);
    if (!leaseAttempt?.acquired) continue;
    const sessionReport = {
      schema: "ccm-task-agent-invocation-recovery-run-v1",
      recovery_run_id: recoveryRunId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      recovery_lease_id: String(leaseAttempt.lease?.lease_id || ""),
      recovery_fencing_token: Number(leaseAttempt.lease?.fencing_token || 0),
      recovery_lease_takeover: leaseAttempt.lease?.takeover === true,
      checked: sessionRows.length,
      recovered: sessionRows.filter(row => ["recovered_completed", "recovered_failed", "abandoned_before_dispatch"].includes(row.action)).length,
      uncertain: sessionRows.filter(row => row.action === "marked_uncertain").length,
      active: sessionRows.filter(row => row.action === "left_active_runner").length,
      pending: sessionRows.filter(row => row.action === "left_pending").length,
      relinked: sessionRows.filter(row => row.action === "parent_relinked" || row.action === "parent_head_rebound").length,
      quarantined: sessionRows.filter(row => row.action.startsWith("quarantined_")).length,
      rows: sessionRows,
    };
    appendInvocationRecoveryAudit(first.group_id, first.group_session_id, sessionReport);
    finalizeTaskAgentInvocationRecoveryLease(leaseAttempt.lease, sessionReport);
  }
  const acquiredLeases = Array.from(leaseAttempts.values()).filter((attempt: any) => attempt?.acquired);
  const contendedLeases = Array.from(leaseAttempts.values()).filter((attempt: any) => !attempt?.acquired);
  return {
    schema: "ccm-task-agent-invocation-recovery-run-v1",
    recovery_run_id: recoveryRunId,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    checked: rows.length,
    recovered: rows.filter(row => ["recovered_completed", "recovered_failed", "abandoned_before_dispatch"].includes(row.action)).length,
    uncertain: rows.filter(row => row.action === "marked_uncertain").length,
    active: rows.filter(row => row.action === "left_active_runner").length,
    pending: rows.filter(row => row.action === "left_pending").length,
    relinked: rows.filter(row => row.action === "parent_relinked" || row.action === "parent_head_rebound").length,
    quarantined: rows.filter(row => row.action.startsWith("quarantined_")).length,
    leased: acquiredLeases.length,
    lease_contended: contendedLeases.length,
    lease_takeover: acquiredLeases.filter((attempt: any) => attempt.lease?.takeover === true).length,
    max_fencing_token: acquiredLeases.reduce((max: number, attempt: any) => Math.max(max, Number(attempt.lease?.fencing_token || 0)), 0),
    rows,
  };
}

export function verifyTaskAgentInvocationEdge(edge: any, options: any = {}) {
  if (!edge?.invocation_edge_id) return { valid: false, issues: ["edge_missing"] };
  const issues: string[] = [];
  if (edge.schema !== TASK_AGENT_INVOCATION_EDGE_SCHEMA || Number(edge.version || 0) !== 1) issues.push("edge_schema_invalid");
  if (!String(edge.group_session_id || "").startsWith("gcs_")) issues.push("group_session_identity_invalid");
  if (!String(edge.task_agent_session_id || "").startsWith("tas_")) issues.push("task_agent_session_identity_invalid");
  if (!edge.branch_id || !edge.root_invocation_edge_id) issues.push("branch_identity_missing");
  if (edge.parent_invocation_edge_id === edge.invocation_edge_id) issues.push("self_parent_cycle");
  const checksumValid = String(edge.edge_checksum || "") === edgeChecksum(edge);
  if (!checksumValid) issues.push("edge_checksum_invalid");
  const parent = edge.parent_invocation_edge_id
    ? options.edgesById?.get?.(edge.parent_invocation_edge_id) || findTaskAgentInvocationEdge(edge.parent_invocation_edge_id)
    : null;
  if (edge.parent_invocation_edge_id && !parent) issues.push("parent_edge_missing");
  if (parent && (parent.group_id !== edge.group_id || parent.group_session_id !== edge.group_session_id || parent.task_id !== edge.task_id || parent.target_project !== edge.target_project)) issues.push("parent_identity_mismatch");
  if (parent && String(parent.edge_checksum || "") !== String(edge.expected_lineage_head_checksum || "")) issues.push("lineage_head_mismatch");
  return { valid: issues.length === 0, checksumValid, issues, parent };
}

export function buildTaskAgentInvocationLineageReport(filter: any = {}) {
  const listed = listTaskAgentInvocationEdges(filter);
  const edgesById = new Map(listed.edges.map((edge: any) => [String(edge.invocation_edge_id || ""), edge]));
  const recoveryStatus = buildTaskAgentInvocationRecoveryStatus(filter);
  const rows = listed.edges.map((edge: any) => {
    const verification = verifyTaskAgentInvocationEdge(edge, { edgesById });
    const gaps = [...verification.issues];
    const adoptionVerification = edge.adoption_receipt ? verifyTaskAgentInvocationAdoptionReceipt(edge.adoption_receipt, edge) : { valid: false, issues: [] };
    const reinjectionVerification = edge.reinjection_proof ? verifyTaskAgentInvocationReinjectionProof(edge.reinjection_proof, edge) : { valid: false, issues: [] };
    const nativeContinuationVerification = edge.native_continuation_receipt ? verifyTaskAgentNativeContinuationReceipt(edge.native_continuation_receipt, edge) : { valid: false, issues: [] };
    const contextRebudgetVerification = edge.context_rebudget_proof ? verifyTaskAgentContextRebudgetProof(edge.context_rebudget_proof, edge) : { valid: false, issues: [] };
    if (edge.adoption_receipt && !adoptionVerification.valid) gaps.push(...adoptionVerification.issues);
    if (edge.reinjection_proof && !reinjectionVerification.valid) gaps.push(...reinjectionVerification.issues);
    if (edge.native_continuation_receipt && !nativeContinuationVerification.valid) gaps.push(...nativeContinuationVerification.issues);
    if (edge.context_rebudget_proof && !contextRebudgetVerification.valid) gaps.push(...contextRebudgetVerification.issues);
    if (["dispatched", "completed", "failed"].includes(edge.status) && !edge.worker_context_packet_id) gaps.push("worker_context_packet_missing");
    if (["dispatched", "completed", "failed"].includes(edge.status) && !edge.memory_context_snapshot_id) gaps.push("memory_context_snapshot_missing");
    const recoveryWithoutRunnerAllowed = !!edge.recovery_outcome && (edge.recovery_outcome === "abandoned_before_dispatch" || !!edge.dispatch_ticket_id);
    if (["completed", "failed"].includes(edge.status) && !edge.runner_request_id && !recoveryWithoutRunnerAllowed) gaps.push("runner_request_missing");
    if (edge.compact_head_dispatch_fence_valid === false) gaps.push("compact_head_dispatch_stale");
    if (["dispatched", "completed", "failed"].includes(edge.status)
      && edge.compact_head_fence_required === true
      && edge.compact_head_dispatch_fence_valid !== true) gaps.push("compact_head_dispatch_fence_missing");
    if (edge.session_lifecycle_dispatch_fence_valid === false) gaps.push("session_lifecycle_dispatch_stale");
    if (["dispatched", "completed", "failed"].includes(edge.status)
      && (edge.session_lifecycle_fence_required === true || String(edge.group_session_id || "").startsWith("gcs_"))
      && edge.session_lifecycle_dispatch_fence_valid !== true) gaps.push("session_lifecycle_dispatch_fence_missing");
    if (edge.dispatch_ticket_id && !edge.typed_memory_dispatch_wal_file) gaps.push("typed_memory_dispatch_wal_file_missing");
    if (edge.dispatch_ticket_id && !edge.typed_memory_dispatch_wal_record_checksum) gaps.push("typed_memory_dispatch_wal_checksum_missing");
    const continuityProofRequired = edge.continuity_contract_required === true && edge.status === "completed";
    if (continuityProofRequired && edge.adoption_status !== "adopted") gaps.push("adoption_receipt_unverified");
    if (continuityProofRequired && edge.reinjection_status !== "proven") gaps.push("recovery_reinjection_unproven");
    if (continuityProofRequired && edge.native_continuation_status === "unverified") gaps.push("native_continuation_unverified");
    return {
      ...edge,
      adoption_receipt_valid: edge.adoption_receipt ? adoptionVerification.valid : false,
      reinjection_proof_valid: edge.reinjection_proof ? reinjectionVerification.valid : false,
      native_continuation_receipt_valid: edge.native_continuation_receipt ? nativeContinuationVerification.valid : false,
      context_rebudget_proof_valid: edge.context_rebudget_proof ? contextRebudgetVerification.valid : false,
      continuity_proof_required: continuityProofRequired,
      valid: gaps.length === 0,
      gaps: Array.from(new Set(gaps)),
    };
  });
  return {
    schema: "ccm-task-agent-invocation-lineage-report-v1",
    generatedAt: new Date().toISOString(),
    overall: {
      status: rows.length === 0 ? "empty" : rows.every(row => row.valid) && listed.valid ? "ok" : "fail",
      edgeCount: rows.length,
      validCount: rows.filter(row => row.valid).length,
      invalidCount: rows.filter(row => !row.valid).length,
       branchCount: new Set(rows.map(row => row.branch_id)).size,
       retryCount: rows.filter(row => row.retry_of_invocation_edge_id).length,
       providerSwitchCount: rows.filter(row => row.branch_kind === "provider_switch").length,
       nonTerminalCount: rows.filter(row => !TERMINAL.has(String(row.status || ""))).length,
       recoveredCount: rows.filter(row => ["recovered_completed", "recovered_failed", "abandoned_before_dispatch"].includes(String(row.recovery_outcome || ""))).length,
       uncertainCount: rows.filter(row => row.recovery_outcome === "uncertain").length,
       orphanParentCount: rows.filter(row => row.gaps.includes("parent_edge_missing")).length,
       relinkedParentCount: rows.filter(row => !!row.recovery_parent_relinked_at).length,
       adoptionRequiredCount: rows.filter(row => row.continuity_proof_required).length,
       adoptionReceiptCount: rows.filter(row => !!row.adoption_receipt).length,
       adoptionVerifiedCount: rows.filter(row => row.adoption_status === "adopted" && row.adoption_receipt_valid).length,
       adoptionInvalidCount: rows.filter(row => !!row.adoption_receipt && !row.adoption_receipt_valid || row.continuity_proof_required && row.adoption_status !== "adopted").length,
       reinjectionRequiredCount: rows.filter(row => row.continuity_proof_required).length,
       reinjectionProofCount: rows.filter(row => !!row.reinjection_proof).length,
       reinjectionProvenCount: rows.filter(row => row.reinjection_status === "proven" && row.reinjection_proof_valid).length,
        reinjectionUnverifiedCount: rows.filter(row => row.continuity_proof_required && row.reinjection_status !== "proven" || !!row.reinjection_proof && !row.reinjection_proof_valid).length,
        nativeContinuationReceiptCount: rows.filter(row => !!row.native_continuation_receipt).length,
        nativeContinuationAcknowledgedCount: rows.filter(row => row.native_continuation_status === "acknowledged" && row.native_continuation_receipt_valid).length,
        nativeContinuationUnverifiedCount: rows.filter(row => row.native_continuation_status === "unverified" || !!row.native_continuation_receipt && !row.native_continuation_receipt_valid).length,
        nativeContinuationPolicyRejectedCount: rows.filter(row => ["resume_evidence_insufficient", "native_resume_unsupported", "provider_output_contract_unverified", "provider_output_format_drift"].includes(String(row.native_continuation_receipt?.compatibility_status || ""))).length,
        nativeContinuationOutputFormatDriftCount: rows.filter(row => String(row.native_continuation_receipt?.compatibility_status || "") === "provider_output_format_drift").length,
        nativeForkUnsupportedCount: rows.filter(row => String(row.native_continuation_receipt?.compatibility_status || "") === "native_fork_unsupported").length,
        contextRebudgetProofCount: rows.filter(row => !!row.context_rebudget_proof).length,
        contextRebudgetVerifiedCount: rows.filter(row => row.context_rebudget_proof_valid && row.context_rebudget_status === "within_verified_capacity").length,
        contextRebudgetDriftCount: rows.filter(row => row.context_rebudget_proof_valid && row.context_rebudget_status === "drift_detected").length,
         contextRebudgetUnavailableCount: rows.filter(row => row.context_rebudget_status === "capacity_unavailable").length,
         compactHeadFenceRequiredCount: rows.filter(row => row.compact_head_fence_required === true).length,
         compactHeadFenceValidatedCount: rows.filter(row => row.compact_head_dispatch_fence_valid === true).length,
         compactHeadFenceStaleCount: rows.filter(row => row.compact_head_dispatch_fence_valid === false).length,
         sessionLifecycleFenceRequiredCount: rows.filter(row => row.session_lifecycle_fence_required === true || String(row.group_session_id || "").startsWith("gcs_")).length,
         sessionLifecycleFenceValidatedCount: rows.filter(row => row.session_lifecycle_dispatch_fence_valid === true).length,
         sessionLifecycleFenceStaleCount: rows.filter(row => row.session_lifecycle_dispatch_fence_valid === false).length,
      },
     rows,
     weakRows: rows.filter(row => !row.valid),
     ledgerIssues: listed.issues,
     recoveryStatus,
   };
}

export function deleteTaskAgentInvocationLineageArtifacts(groupId: string, groupSessionId: string, taskAgentSessionId?: string) {
  let deleted = 0;
  for (const file of listFiles()) {
    const name = path.basename(file);
    const prefix = `${clean(groupId)}--${clean(groupSessionId)}--`;
    if (!name.startsWith(prefix)) continue;
    if (taskAgentSessionId && name !== `${prefix}${clean(taskAgentSessionId)}.jsonl`) continue;
    try { fs.unlinkSync(file); deleted += 1; } catch {}
    try { fs.unlinkSync(`${file}.lock`); } catch {}
  }
  let recoveryDeleted = 0;
  let recoveryLeaseDeleted = 0;
  if (!taskAgentSessionId) {
    for (const file of [getInvocationRecoveryHistoryFile(groupId, groupSessionId), getInvocationRecoveryStatusFile(groupId, groupSessionId)]) {
      try { if (fs.existsSync(file)) { fs.unlinkSync(file); recoveryDeleted += 1; } } catch {}
      try { fs.unlinkSync(`${file}.lock`); } catch {}
    }
    const leaseFile = getTaskAgentInvocationRecoveryLeaseFile(groupId, groupSessionId);
    try { if (fs.existsSync(leaseFile)) { fs.unlinkSync(leaseFile); recoveryLeaseDeleted += 1; } } catch {}
    try { fs.unlinkSync(`${leaseFile}.lock`); } catch {}
  }
  return { deleted, recoveryDeleted, recoveryLeaseDeleted };
}
