// Behavior-freeze split from task-agent-invocation-lineage.ts (part 2/2).
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
import { verifyFinalWorkerDispatchPayloadGate } from "../agents/final-dispatch-payload-gate";

export * from "./task-agent-invocation-lineage-part-01";
import {
  TASK_AGENT_INVOCATION_EDGE_SCHEMA,
  TASK_AGENT_INVOCATION_RECOVERY_DIR,
  TASK_AGENT_INVOCATION_RECOVERY_EVENT_SCHEMA,
  TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA,
  RECOVERY_LEASE_MS,
  TERMINAL,
  assertGroupSessionIdentity,
  acquireLock,
  appendEvent,
  bindTaskAgentInvocationMemoryDelivery,
  clean,
  completeTaskAgentInvocationEdge,
  edgeChecksum,
  findTaskAgentInvocationEdge,
  getInvocationRecoveryHistoryFile,
  getInvocationRecoveryStatusFile,
  listFiles,
  listTaskAgentInvocationEdges,
  processAlive,
  recoveryEventChecksum,
  recoveryStatusChecksum,
  sha256,
  verifyTaskAgentContextRebudgetProof,
  verifyTaskAgentInvocationAdoptionReceipt,
  verifyTaskAgentInvocationReinjectionProof,
  verifyTaskAgentNativeContinuationReceipt,
  writeJsonAtomic,
} from "./task-agent-invocation-lineage-part-01";

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
  if (edge.final_dispatch_payload_gate_required === true) {
    const gateVerification = verifyFinalWorkerDispatchPayloadGate(edge.final_dispatch_payload_gate, {
      groupId: edge.group_id,
      groupSessionId: edge.group_session_id,
      taskId: edge.task_id,
      taskAgentSessionId: edge.task_agent_session_id,
      workerContextPacketId: edge.worker_context_packet_id,
    });
    if (!gateVerification.valid) issues.push(...gateVerification.issues);
    if (["dispatched", "completed", "failed"].includes(String(edge.status || "")) && edge.final_dispatch_payload_gate?.provider_call_allowed !== true) issues.push("final_dispatch_payload_not_ready");
    if (["dispatched", "completed", "failed"].includes(String(edge.status || "")) && edge.final_dispatch_payload_gate_dispatch_valid !== true) issues.push("final_dispatch_payload_gate_dispatch_proof_missing");
  }
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
