import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CCM_DIR } from "../core/utils";

export const TASK_AGENT_CONTINUATION_SOAK_DIR = path.join(CCM_DIR, "task-agent-continuation-soak");
export const TASK_AGENT_CONTINUATION_SOAK_EVENT_SCHEMA = "ccm-task-agent-continuation-soak-event-v1";
export const TASK_AGENT_CONTINUATION_SOAK_SERVICE_EPOCH = String(
  process.env.CCM_CONTINUATION_SOAK_EPOCH
  || `svc_${process.pid}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
);

const LOCK_STALE_MS = 60_000;

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function checksum(value: any, length = 64) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}

function eventChecksum(event: any) {
  const payload = { ...(event || {}) };
  delete payload.event_checksum;
  delete payload.checksum_valid;
  return checksum(payload);
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
    throw new Error("continuation soak requires groupId--gcs_*--tas_* identity");
  }
}

export function getTaskAgentContinuationSoakFile(groupId: string, groupSessionId: string, taskAgentSessionId: string) {
  assertIdentity(groupId, groupSessionId, taskAgentSessionId);
  return path.join(TASK_AGENT_CONTINUATION_SOAK_DIR, `${clean(groupId)}--${clean(groupSessionId)}--${clean(taskAgentSessionId)}.jsonl`);
}

function acquireLock(file: string) {
  const lockFile = `${file}.lock`;
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const fd = fs.openSync(lockFile, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, hostname: os.hostname(), acquired_at: new Date().toISOString() }), "utf-8");
      fs.fsyncSync(fd);
      return () => {
        try { fs.closeSync(fd); } catch {}
        try { fs.unlinkSync(lockFile); } catch {}
      };
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const owner = JSON.parse(fs.readFileSync(lockFile, "utf-8"));
        const age = Date.now() - fs.statSync(lockFile).mtimeMs;
        if (age > LOCK_STALE_MS || (String(owner.hostname || "") === os.hostname() && !processAlive(Number(owner.pid || 0)))) {
          fs.unlinkSync(lockFile);
          continue;
        }
      } catch {}
      const until = Date.now() + 10 + attempt * 4;
      while (Date.now() < until) {}
    }
  }
  throw new Error(`continuation soak lock busy: ${lockFile}`);
}

export function readTaskAgentContinuationSoakFile(file: string) {
  if (!fs.existsSync(file)) return { file, valid: true, events: [], issues: [], headChecksum: "", lastSequence: 0 };
  const events: any[] = [];
  const issues: string[] = [];
  let previous = "";
  let expectedSequence = 1;
  for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      const checksumValid = String(event.event_checksum || "") === eventChecksum(event);
      if (event.schema !== TASK_AGENT_CONTINUATION_SOAK_EVENT_SCHEMA || Number(event.version || 0) !== 1) issues.push("event_schema_invalid");
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
  return {
    file,
    valid: issues.length === 0,
    events,
    issues: Array.from(new Set(issues)),
    headChecksum: previous,
    lastSequence: events.length,
  };
}

function compactEvidence(input: any = {}) {
  const evidence = input.evidence || input;
  const continuation = evidence.nativeContinuationEvidence || evidence.native_continuation_evidence || evidence.native_continuation_receipt || null;
  const memoryRecovery = evidence.memoryContextConsumptionRecovery || evidence.memory_context_consumption_recovery || null;
  const memoryRecoveryContinuation = memoryRecovery?.recovery_native_continuation_evidence || null;
  const reinjection = evidence.reinjectionProof || evidence.reinjection_proof || null;
  const capacityProof = evidence.capacityRevalidationProof || evidence.capacity_revalidation_proof || null;
  const capacityCommit = evidence.capacityRevalidationCommitReceipt || evidence.capacity_revalidation_commit_receipt || null;
  const taskArtifact = evidence.taskArtifactEvidence || evidence.task_artifact_evidence || evidence;
  const reinjectionPayload = reinjection ? { ...reinjection } : null;
  if (reinjectionPayload) {
    delete reinjectionPayload.proof_checksum;
    delete reinjectionPayload.checksum_valid;
  }
  const reinjectionProofChecksum = String(reinjection?.proof_checksum || evidence.reinjectionProofChecksum || evidence.reinjection_proof_checksum || "");
  const reinjectionProofChecksumValid = !!reinjection
    && !!reinjectionProofChecksum
    && reinjectionProofChecksum === checksum(reinjectionPayload);
  const fileChangePaths = Array.isArray(taskArtifact.fileChangePaths || taskArtifact.file_change_paths)
    ? (taskArtifact.fileChangePaths || taskArtifact.file_change_paths)
      .map((item: any) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 80)
    : [];
  return {
    invocation_edge_id: String(evidence.invocationEdgeId || evidence.invocation_edge_id || ""),
    runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || continuation?.runnerRequestId || continuation?.runner_request_id || ""),
    provider: String(evidence.provider || continuation?.provider || ""),
    memory_context_consumption_recovery_id: String(memoryRecovery?.recovery_id || ""),
    memory_context_consumption_recovery_status: String(memoryRecovery?.status || ""),
    memory_context_consumption_recovery_policy: String(memoryRecovery?.policy || ""),
    memory_context_consumption_recovery_attempt: Number(memoryRecovery?.attempt || 0),
    memory_context_consumption_recovery_challenge_id: String(memoryRecovery?.challenge_id || ""),
    memory_context_consumption_recovery_receipt_signature: String(memoryRecovery?.receipt_signature || ""),
    memory_context_consumption_recovery_suppress_task_replay: memoryRecovery?.suppress_task_replay === true,
    memory_context_consumption_recovery_native_evidence_checksum: String(memoryRecoveryContinuation?.evidenceChecksum || ""),
    memory_context_consumption_recovery_native_acknowledged: memoryRecoveryContinuation?.nativeContinuationAcknowledged === true,
    memory_context_consumption_recovery_provider_version: String(memoryRecoveryContinuation?.providerRuntimeVersion || memoryRecoveryContinuation?.providerRuntimeVersionSnapshot?.semanticVersion || memoryRecoveryContinuation?.providerRuntimeVersionSnapshot?.versionText || evidence.providerRuntimeVersion || ""),
    memory_context_consumption_recovery_provider_identity_checksum: String(memoryRecoveryContinuation?.providerRuntimeIdentityChecksum || memoryRecoveryContinuation?.providerRuntimeVersionSnapshot?.executableIdentityChecksum || evidence.providerRuntimeIdentityChecksum || ""),
    memory_context_consumption_recovery_fault_point: String(evidence.faultPoint || evidence.fault_point || ""),
    compact_epoch: String(evidence.compactEpoch || evidence.compact_epoch || reinjection?.compact_epoch || ""),
    worker_context_packet_id: String(evidence.workerContextPacketId || evidence.worker_context_packet_id || capacityProof?.worker_context_packet_id || ""),
    memory_context_snapshot_id: String(evidence.memoryContextSnapshotId || evidence.memory_context_snapshot_id || reinjection?.memory_context_snapshot_id || ""),
    typed_memory_dispatch_wal_record_checksum: String(evidence.typedMemoryDispatchWalRecordChecksum || evidence.typed_memory_dispatch_wal_record_checksum || capacityCommit?.typed_memory_dispatch_wal_record_checksum || ""),
    native_continuation_evidence_checksum: String(continuation?.evidenceChecksum || continuation?.evidence_checksum || continuation?.receipt_checksum || ""),
    native_continuation_status: String(continuation?.compatibilityStatus || continuation?.compatibility_status || continuation?.status || ""),
    native_continuation_acknowledged: continuation?.nativeContinuationAcknowledged === true || continuation?.native_continuation_acknowledged === true || continuation?.status === "acknowledged",
    provider_output_contract_status: String(continuation?.providerOutputContractStatus || continuation?.provider_output_contract_status || continuation?.providerOutputContractEvidence?.status || continuation?.provider_output_contract_evidence?.status || ""),
    provider_output_format_fingerprint: String(continuation?.providerOutputFormatFingerprint || continuation?.provider_output_format_fingerprint || continuation?.providerOutputContractEvidence?.formatFingerprint || continuation?.provider_output_contract_evidence?.format_fingerprint || ""),
    provider_contract_id: String(continuation?.providerContractId || continuation?.provider_contract_id || continuation?.providerOutputContractEvidence?.providerContractId || ""),
    expected_provider_contract_id: String(continuation?.expectedProviderContractId || continuation?.expected_provider_contract_id || ""),
    provider_contract_transition: continuation?.providerContractTransition === true || continuation?.provider_contract_transition === true,
    provider_contract_continuity_verified: continuation?.providerContractContinuityVerified === true || continuation?.provider_contract_continuity_verified === true,
    provider_runtime_version: String(continuation?.providerRuntimeVersion || continuation?.provider_runtime_version || continuation?.providerRuntimeVersionSnapshot?.semanticVersion || continuation?.providerRuntimeVersionSnapshot?.versionText || evidence.providerRuntimeVersion || evidence.provider_runtime_version || ""),
    provider_runtime_identity_checksum: String(continuation?.providerRuntimeIdentityChecksum || continuation?.provider_runtime_identity_checksum || continuation?.providerRuntimeVersionSnapshot?.executableIdentityChecksum || evidence.providerRuntimeIdentityChecksum || evidence.provider_runtime_identity_checksum || ""),
    live_provider_memory_probe_run_id: String(evidence.liveProviderMemoryProbeRunId || evidence.live_provider_memory_probe_run_id || ""),
    live_provider_memory_probe_stage: String(evidence.liveProviderMemoryProbeStage || evidence.live_provider_memory_probe_stage || ""),
    live_provider_memory_probe_sentinel_checksum: String(evidence.liveProviderMemoryProbeSentinelChecksum || evidence.live_provider_memory_probe_sentinel_checksum || ""),
    live_provider_memory_probe_session_checksum: String(evidence.liveProviderMemoryProbeSessionChecksum || evidence.live_provider_memory_probe_session_checksum || ""),
    live_provider_memory_probe_output_checksum: String(evidence.liveProviderMemoryProbeOutputChecksum || evidence.live_provider_memory_probe_output_checksum || ""),
    live_provider_memory_probe_account_backed: evidence.liveProviderMemoryProbeAccountBacked === true || evidence.live_provider_memory_probe_account_backed === true,
    live_provider_memory_probe_workspace_unchanged: evidence.liveProviderMemoryProbeWorkspaceUnchanged === true || evidence.live_provider_memory_probe_workspace_unchanged === true,
    live_provider_memory_probe_timed_out: evidence.liveProviderMemoryProbeTimedOut === true || evidence.live_provider_memory_probe_timed_out === true,
    live_provider_memory_probe_duration_ms: Math.max(0, Number(evidence.liveProviderMemoryProbeDurationMs || evidence.live_provider_memory_probe_duration_ms || 0)),
    live_provider_memory_probe_issue: String(evidence.liveProviderMemoryProbeIssue || evidence.live_provider_memory_probe_issue || "").slice(0, 160),
    live_provider_memory_probe_model: String(evidence.liveProviderMemoryProbeModel || evidence.live_provider_memory_probe_model || "").slice(0, 120),
    live_provider_memory_probe_parsed_event_count: Math.max(0, Number(evidence.liveProviderMemoryProbeParsedEventCount || evidence.live_provider_memory_probe_parsed_event_count || 0)),
    live_provider_memory_probe_event_types: (Array.isArray(evidence.liveProviderMemoryProbeEventTypes || evidence.live_provider_memory_probe_event_types)
      ? (evidence.liveProviderMemoryProbeEventTypes || evidence.live_provider_memory_probe_event_types) : [])
      .map((item: any) => String(item || "").slice(0, 80)).filter(Boolean).slice(0, 20),
    live_provider_memory_probe_session_established: evidence.liveProviderMemoryProbeSessionEstablished === true || evidence.live_provider_memory_probe_session_established === true,
    live_provider_memory_probe_turn_started: evidence.liveProviderMemoryProbeTurnStarted === true || evidence.live_provider_memory_probe_turn_started === true,
    live_provider_memory_probe_terminal_observed: evidence.liveProviderMemoryProbeTerminalObserved === true || evidence.live_provider_memory_probe_terminal_observed === true,
    live_provider_memory_probe_model_output_observed: evidence.liveProviderMemoryProbeModelOutputObserved === true || evidence.live_provider_memory_probe_model_output_observed === true,
    live_provider_memory_probe_api_retry_count: Math.max(0, Number(evidence.liveProviderMemoryProbeApiRetryCount || evidence.live_provider_memory_probe_api_retry_count || 0)),
    live_provider_memory_probe_last_api_retry_attempt: Math.max(0, Number(evidence.liveProviderMemoryProbeLastApiRetryAttempt || evidence.live_provider_memory_probe_last_api_retry_attempt || 0)),
    live_provider_memory_probe_progress_stage: String(evidence.liveProviderMemoryProbeProgressStage || evidence.live_provider_memory_probe_progress_stage || "").slice(0, 80),
    live_provider_memory_probe_first_output_observed: evidence.liveProviderMemoryProbeFirstOutputObserved === true || evidence.live_provider_memory_probe_first_output_observed === true,
    live_provider_memory_probe_first_output_ms: Math.max(0, Number(evidence.liveProviderMemoryProbeFirstOutputMs || evidence.live_provider_memory_probe_first_output_ms || 0)),
    live_provider_memory_probe_stdout_bytes: Math.max(0, Number(evidence.liveProviderMemoryProbeStdoutBytes || evidence.live_provider_memory_probe_stdout_bytes || 0)),
    live_provider_memory_probe_stderr_bytes: Math.max(0, Number(evidence.liveProviderMemoryProbeStderrBytes || evidence.live_provider_memory_probe_stderr_bytes || 0)),
    live_provider_memory_probe_receipt_recovery_required: evidence.liveProviderMemoryProbeReceiptRecoveryRequired === true || evidence.live_provider_memory_probe_receipt_recovery_required === true,
    live_provider_memory_probe_receipt_recovery_status: String(evidence.liveProviderMemoryProbeReceiptRecoveryStatus || evidence.live_provider_memory_probe_receipt_recovery_status || "").slice(0, 80),
    live_provider_memory_probe_receipt_valid: evidence.liveProviderMemoryProbeReceiptValid === true || evidence.live_provider_memory_probe_receipt_valid === true,
    capacity_revalidation_proof_checksum: String(capacityProof?.proof_checksum || evidence.capacityRevalidationProofChecksum || evidence.capacity_revalidation_proof_checksum || ""),
    capacity_revalidation_commit_checksum: String(capacityCommit?.receipt_checksum || evidence.capacityRevalidationCommitChecksum || evidence.capacity_revalidation_commit_checksum || ""),
    reinjection_proof_checksum: reinjectionProofChecksum,
    reinjection_proof_checksum_valid: reinjectionProofChecksumValid,
    reinjection_invocation_edge_id: String(reinjection?.invocation_edge_id || ""),
    reinjection_group_id: String(reinjection?.group_id || ""),
    reinjection_group_session_id: String(reinjection?.group_session_id || ""),
    reinjection_task_agent_session_id: String(reinjection?.task_agent_session_id || ""),
    reinjection_memory_context_snapshot_id: String(reinjection?.memory_context_snapshot_id || ""),
    reinjection_compact_epoch: String(reinjection?.compact_epoch || ""),
    reinjection_runner_request_id: String(reinjection?.runner_request_id || ""),
    reinjection_delivery_receipt_checksum: String(reinjection?.delivery_receipt_checksum || ""),
    reinjection_compact_transaction_receipt_checksum: String(reinjection?.compact_transaction_receipt_checksum || ""),
    reinjection_compact_transaction_boundary_id: String(reinjection?.compact_transaction_boundary_id || ""),
    reinjection_compact_transaction_receipt_valid: reinjection?.compact_transaction_receipt_valid === true,
    reinjection_compact_head_fence_valid: reinjection?.compact_head_fence_valid === true,
    reinjection_compact_head_generation: Number(reinjection?.compact_head_generation || 0),
    reinjection_compact_head_checksum: String(reinjection?.compact_head_checksum || ""),
    reinjection_status: String(reinjection?.status || evidence.reinjectionStatus || evidence.reinjection_status || ""),
    recovery_outcome: String(evidence.recoveryOutcome || evidence.recovery_outcome || ""),
    task_artifact_proven: taskArtifact.taskArtifactProven === true || taskArtifact.task_artifact_proven === true,
    task_output_checksum: String(taskArtifact.taskOutputChecksum || taskArtifact.task_output_checksum || ""),
    file_change_count: Math.max(0, Number(taskArtifact.fileChangeCount || taskArtifact.file_change_count || 0)),
    file_change_checksum: String(taskArtifact.fileChangeChecksum || taskArtifact.file_change_checksum || ""),
    file_change_paths: fileChangePaths,
    memory_delivery_receipt_checksum: String(taskArtifact.memoryDeliveryReceiptChecksum || taskArtifact.memory_delivery_receipt_checksum || ""),
    memory_prompt_checksum: String(taskArtifact.memoryPromptChecksum || taskArtifact.memory_prompt_checksum || ""),
    memory_context_checksum: String(taskArtifact.memoryContextChecksum || taskArtifact.memory_context_checksum || ""),
    group_session_memory_binding_checksum: String(taskArtifact.groupSessionMemoryBindingChecksum || taskArtifact.group_session_memory_binding_checksum || ""),
    compact_transaction_receipt_checksum: String(taskArtifact.compactTransactionReceiptChecksum || taskArtifact.compact_transaction_receipt_checksum || evidence.compactTransactionReceiptChecksum || evidence.compact_transaction_receipt_checksum || ""),
    compact_transaction_boundary_id: String(taskArtifact.compactTransactionBoundaryId || taskArtifact.compact_transaction_boundary_id || evidence.compactTransactionBoundaryId || evidence.compact_transaction_boundary_id || ""),
    compact_transaction_receipt_valid: taskArtifact.compactTransactionReceiptValid === true || taskArtifact.compact_transaction_receipt_valid === true || evidence.compactTransactionReceiptValid === true || evidence.compact_transaction_receipt_valid === true,
    compact_head_fence_valid: taskArtifact.compactHeadFenceValid === true || taskArtifact.compact_head_fence_valid === true || evidence.compactHeadFenceValid === true || evidence.compact_head_fence_valid === true,
    compact_head_generation: Number(taskArtifact.compactHeadGeneration || taskArtifact.compact_head_generation || evidence.compactHeadGeneration || evidence.compact_head_generation || 0),
    compact_head_checksum: String(taskArtifact.compactHeadChecksum || taskArtifact.compact_head_checksum || evidence.compactHeadChecksum || evidence.compact_head_checksum || ""),
    source_checksum: checksum(evidence, 32),
  };
}

export function recordTaskAgentContinuationSoakEvent(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const taskAgentSessionId = String(input.taskAgentSessionId || input.task_agent_session_id || "").trim();
  assertIdentity(groupId, groupSessionId, taskAgentSessionId);
  const phase = String(input.phase || "observed").trim();
  const status = String(input.status || "observed").trim();
  const evidence = compactEvidence(input);
  const eventKey = String(input.eventKey || input.event_key || checksum([
    phase,
    status,
    evidence.invocation_edge_id,
    evidence.runner_request_id,
    evidence.native_continuation_evidence_checksum,
    evidence.capacity_revalidation_proof_checksum,
    evidence.capacity_revalidation_commit_checksum,
    evidence.reinjection_proof_checksum,
    evidence.recovery_outcome,
  ], 40));
  const file = getTaskAgentContinuationSoakFile(groupId, groupSessionId, taskAgentSessionId);
  const release = acquireLock(file);
  try {
    const ledger = readTaskAgentContinuationSoakFile(file);
    if (!ledger.valid) throw new Error(`continuation soak chain invalid: ${ledger.issues.join(",")}`);
    const existing = ledger.events.find((event: any) => event.event_key === eventKey);
    if (existing) return { recorded: false, idempotent: true, event: existing, file, ledger };
    const event: any = {
      schema: TASK_AGENT_CONTINUATION_SOAK_EVENT_SCHEMA,
      version: 1,
      sequence: ledger.lastSequence + 1,
      previous_event_checksum: ledger.headChecksum,
      event_key: eventKey,
      phase,
      status,
      group_id: groupId,
      group_session_id: groupSessionId,
      task_agent_session_id: taskAgentSessionId,
      service_epoch: String(input.serviceEpoch || input.service_epoch || TASK_AGENT_CONTINUATION_SOAK_SERVICE_EPOCH),
      recovered_after_restart: input.recoveredAfterRestart === true || input.recovered_after_restart === true,
      source: String(input.source || "runtime"),
      evidence,
      recorded_at: String(input.recordedAt || input.recorded_at || new Date().toISOString()),
    };
    event.event_checksum = eventChecksum(event);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const fd = fs.openSync(file, "a");
    try { fs.writeSync(fd, `${JSON.stringify(event)}\n`, undefined, "utf-8"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return { recorded: true, idempotent: false, event: { ...event, checksum_valid: true }, file };
  } finally {
    release();
  }
}

export function tryRecordTaskAgentContinuationSoakEvent(input: any = {}) {
  try { return recordTaskAgentContinuationSoakEvent(input); } catch (error: any) {
    return { recorded: false, error: error?.message || String(error) };
  }
}

function listSoakFiles() {
  try {
    return fs.readdirSync(TASK_AGENT_CONTINUATION_SOAK_DIR, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith(".jsonl"))
      .map(entry => path.join(TASK_AGENT_CONTINUATION_SOAK_DIR, entry.name));
  } catch { return []; }
}

function recordRecoveredEdgePhase(edge: any, phase: string, status: string, evidence: any = {}) {
  return tryRecordTaskAgentContinuationSoakEvent({
    groupId: edge.group_id,
    groupSessionId: edge.group_session_id,
    taskAgentSessionId: edge.task_agent_session_id,
    phase,
    status,
    invocationEdgeId: edge.invocation_edge_id,
    eventKey: `reconcile:${phase}:${edge.invocation_edge_id}:${evidence?.proof_checksum || evidence?.receipt_checksum || edge.edge_checksum || status}`,
    evidence: { ...edge, ...evidence },
    source: "startup_reconcile",
    recoveredAfterRestart: true,
  });
}

export function reconcileTaskAgentContinuationSoak(input: any = {}) {
  const edges = Array.isArray(input.invocationEdges || input.invocation_edges) ? (input.invocationEdges || input.invocation_edges) : [];
  const sessions = Array.isArray(input.taskAgentSessions || input.task_agent_sessions) ? (input.taskAgentSessions || input.task_agent_sessions) : [];
  const rows: any[] = [];
  const edgeByTaskSession = new Map<string, any>();
  for (const edge of edges) {
    if (!String(edge?.group_session_id || "").startsWith("gcs_") || !String(edge?.task_agent_session_id || "").startsWith("tas_")) continue;
    edgeByTaskSession.set(String(edge.task_agent_session_id), edge);
    rows.push(recordRecoveredEdgePhase(edge, "invocation_prepared", "prepared"));
    if (edge.worker_context_packet_id && edge.memory_context_snapshot_id) rows.push(recordRecoveredEdgePhase(edge, "context_bound", "bound"));
    if (edge.dispatched_at || edge.runner_request_id || edge.dispatch_ticket_id) rows.push(recordRecoveredEdgePhase(edge, "dispatch_started", "started"));
    if (edge.native_continuation_receipt) rows.push(recordRecoveredEdgePhase(edge, "continuation_evidence_captured", String(edge.native_continuation_status || "observed"), edge.native_continuation_receipt));
    if (["completed", "failed"].includes(String(edge.status || ""))) rows.push(recordRecoveredEdgePhase(edge, "invocation_terminal", String(edge.status), edge.native_continuation_receipt || {}));
    if (edge.reinjection_proof) rows.push(recordRecoveredEdgePhase(edge, "post_compact_reinjection", String(edge.reinjection_status || "unverified"), edge.reinjection_proof));
    if (edge.recovery_outcome) rows.push(recordRecoveredEdgePhase(edge, "invocation_recovery", String(edge.recovery_outcome), edge));
  }
  for (const session of sessions) {
    const edge = edgeByTaskSession.get(String(session?.id || ""));
    if (!edge) continue;
    if (session.capacityRevalidationProof) rows.push(tryRecordTaskAgentContinuationSoakEvent({
      groupId: edge.group_id,
      groupSessionId: edge.group_session_id,
      taskAgentSessionId: session.id,
      phase: "capacity_revalidation_prepared",
      status: session.capacityRevalidationRequired === true ? "pending" : "prepared",
      eventKey: `reconcile:capacity:prepared:${session.capacityRevalidationProof.proof_checksum}`,
      evidence: { invocation_edge_id: edge.invocation_edge_id, capacityRevalidationProof: session.capacityRevalidationProof },
      source: "startup_reconcile",
      recoveredAfterRestart: true,
    }));
    if (session.capacityRevalidationCommitReceipt) rows.push(tryRecordTaskAgentContinuationSoakEvent({
      groupId: edge.group_id,
      groupSessionId: edge.group_session_id,
      taskAgentSessionId: session.id,
      phase: "capacity_revalidation_committed",
      status: "committed",
      eventKey: `reconcile:capacity:committed:${session.capacityRevalidationCommitReceipt.receipt_checksum}`,
      evidence: { invocation_edge_id: edge.invocation_edge_id, capacityRevalidationProof: session.capacityRevalidationProof, capacityRevalidationCommitReceipt: session.capacityRevalidationCommitReceipt },
      source: "startup_reconcile",
      recoveredAfterRestart: true,
    }));
  }
  return {
    schema: "ccm-task-agent-continuation-soak-reconcile-v1",
    checked: edges.length,
    recorded: rows.filter(row => row?.recorded).length,
    idempotent: rows.filter(row => row?.idempotent).length,
    failed: rows.filter(row => row?.error).length,
    serviceEpoch: TASK_AGENT_CONTINUATION_SOAK_SERVICE_EPOCH,
    rows,
  };
}

export function buildTaskAgentContinuationSoakReport(filter: any = {}) {
  const ledgers = listSoakFiles().map(readTaskAgentContinuationSoakFile).filter(ledger => {
    const first = ledger.events[0] || {};
    return (!filter.groupId || first.group_id === filter.groupId)
      && (!filter.groupSessionId || first.group_session_id === filter.groupSessionId)
      && (!filter.taskAgentSessionId || first.task_agent_session_id === filter.taskAgentSessionId);
  });
  const rows = ledgers.map(ledger => {
    const events = ledger.events;
    const uniqueEvents = (source: any[], identity: (event: any) => string) => {
      const seen = new Set<string>();
      return source.filter((event: any) => {
        const key = identity(event) || event.event_checksum;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const first = events[0] || {};
    const terminalEdges = new Set(events.filter((event: any) => event.phase === "invocation_terminal").map((event: any) => event.evidence?.invocation_edge_id).filter(Boolean));
    const continuationEvents = uniqueEvents(
      events.filter((event: any) => event.phase === "continuation_evidence_captured"),
      event => String(event.evidence?.invocation_edge_id || event.evidence?.native_continuation_evidence_checksum || ""),
    );
    const formatDriftEvents = continuationEvents.filter((event: any) => ["output_format_drift", "drift"].includes(String(event.evidence?.provider_output_contract_status || "")) || event.evidence?.native_continuation_status === "provider_output_format_drift");
    const providerContractTransitions = continuationEvents.filter((event: any) => event.evidence?.provider_contract_transition === true);
    const verifiedProviderContractTransitions = providerContractTransitions.filter((event: any) => event.evidence?.provider_contract_continuity_verified === true);
    const unverifiedProviderContractTransitions = providerContractTransitions.filter((event: any) => event.evidence?.provider_contract_continuity_verified !== true);
    const providerContractIds = new Set(continuationEvents.map((event: any) => event.evidence?.provider_contract_id).filter(Boolean));
    const providerRuntimeVersions = Array.from(new Set(continuationEvents.map((event: any) => event.evidence?.provider_runtime_version).filter(Boolean)));
    const unverifiedContinuations = continuationEvents.filter((event: any) => event.evidence?.native_continuation_acknowledged !== true && !["not_required", "not_requested"].includes(String(event.status || "")));
    const postCompactEvents = uniqueEvents(
      events.filter((event: any) => event.phase === "post_compact_reinjection"),
      event => String(event.evidence?.invocation_edge_id || event.evidence?.reinjection_proof_checksum || ""),
    );
    const postCompactRequiredEdges = new Set(events
      .filter((event: any) => ["context_bound", "invocation_terminal"].includes(event.phase)
        && event.evidence?.compact_epoch
        && event.evidence.compact_epoch !== "precompact")
      .map((event: any) => event.evidence?.invocation_edge_id)
      .filter(Boolean));
    const postCompactProvenEdges = new Set(postCompactEvents
      .filter((event: any) => event.evidence?.reinjection_status === "proven" || event.status === "proven")
      .map((event: any) => event.evidence?.invocation_edge_id)
      .filter(Boolean));
    const postCompactUnprovenEdges = Array.from(postCompactRequiredEdges).filter(edgeId => !postCompactProvenEdges.has(edgeId));
    const capacityPrepared = uniqueEvents(
      events.filter((event: any) => event.phase === "capacity_revalidation_prepared"),
      event => String(event.evidence?.capacity_revalidation_proof_checksum || ""),
    );
    const capacityCommitted = uniqueEvents(
      events.filter((event: any) => event.phase === "capacity_revalidation_committed"),
      event => String(event.evidence?.capacity_revalidation_commit_checksum || ""),
    );
    const taskArtifactEvents = uniqueEvents(
      events.filter((event: any) => event.phase === "task_artifact_committed"),
      event => String(event.evidence?.memory_delivery_receipt_checksum || event.evidence?.runner_request_id || ""),
    );
    const taskArtifactProvenEvents = taskArtifactEvents.filter((event: any) => event.evidence?.task_artifact_proven === true);
    const memoryBoundTaskArtifactEvents = taskArtifactProvenEvents.filter((event: any) =>
      !!event.evidence?.memory_context_snapshot_id
      && !!event.evidence?.memory_delivery_receipt_checksum
      && !!event.evidence?.memory_prompt_checksum
      && !!event.evidence?.group_session_memory_binding_checksum
    );
    const taskArtifactRuntimeVersions = Array.from(new Set(
      taskArtifactProvenEvents.map((event: any) => event.evidence?.provider_runtime_version).filter(Boolean),
    ));
    const recoveredTaskArtifactEvents = taskArtifactProvenEvents.filter((event: any) => !!event.evidence?.recovery_outcome);
    const crossVersionTaskArtifact = taskArtifactRuntimeVersions.length >= 2
      && memoryBoundTaskArtifactEvents.length >= 2
      && verifiedProviderContractTransitions.length >= 1
      && (unverifiedProviderContractTransitions.length === 0 || recoveredTaskArtifactEvents.length >= 1);
    const postCompactArtifactEvents = taskArtifactEvents.filter((event: any) =>
      !!event.evidence?.compact_epoch && event.evidence.compact_epoch !== "precompact"
    );
    const postCompactArtifactClosures = postCompactArtifactEvents.map((artifactEvent: any) => {
      const artifact = artifactEvent.evidence || {};
      const sameEdgeProofs = postCompactEvents.filter((proofEvent: any) =>
        !!artifact.invocation_edge_id
        && proofEvent.evidence?.invocation_edge_id === artifact.invocation_edge_id
      );
      const proofEvent = sameEdgeProofs.find((candidate: any) =>
        candidate.evidence?.reinjection_delivery_receipt_checksum
        && candidate.evidence.reinjection_delivery_receipt_checksum === artifact.memory_delivery_receipt_checksum
      ) || sameEdgeProofs[0] || null;
      const proof = proofEvent?.evidence || {};
      const issues: string[] = [];
      if (!proofEvent) issues.push("edge_mismatch");
      if (proofEvent && (
        artifactEvent.group_id !== proofEvent.group_id
        || artifactEvent.group_session_id !== proofEvent.group_session_id
        || artifactEvent.task_agent_session_id !== proofEvent.task_agent_session_id
        || proof.reinjection_group_id !== artifactEvent.group_id
        || proof.reinjection_group_session_id !== artifactEvent.group_session_id
        || proof.reinjection_task_agent_session_id !== artifactEvent.task_agent_session_id
      )) issues.push("identity_mismatch");
      if (proofEvent && (
        proof.reinjection_invocation_edge_id !== artifact.invocation_edge_id
        || proof.invocation_edge_id !== artifact.invocation_edge_id
      )) issues.push("edge_mismatch");
      if (!artifact.memory_context_snapshot_id
        || artifact.memory_context_snapshot_id !== proof.reinjection_memory_context_snapshot_id) issues.push("snapshot_mismatch");
      if (!artifact.compact_epoch
        || artifact.compact_epoch === "precompact"
        || artifact.compact_epoch !== proof.reinjection_compact_epoch) issues.push("epoch_mismatch");
      if (!artifact.compact_transaction_receipt_checksum
        || artifact.compact_transaction_receipt_checksum !== proof.reinjection_compact_transaction_receipt_checksum
        || artifact.compact_transaction_boundary_id !== proof.reinjection_compact_transaction_boundary_id
        || artifact.compact_transaction_receipt_valid !== true
        || proof.reinjection_compact_transaction_receipt_valid !== true) issues.push("compact_transaction_receipt_mismatch");
      if (artifact.compact_head_fence_valid !== true
        || proof.reinjection_compact_head_fence_valid !== true
        || Number(artifact.compact_head_generation || 0) < 1
        || artifact.compact_head_generation !== proof.reinjection_compact_head_generation
        || !artifact.compact_head_checksum
        || artifact.compact_head_checksum !== proof.reinjection_compact_head_checksum) issues.push("compact_head_fence_mismatch");
      if (!artifact.memory_delivery_receipt_checksum
        || artifact.memory_delivery_receipt_checksum !== proof.reinjection_delivery_receipt_checksum) issues.push("delivery_receipt_mismatch");
      if (artifact.runner_request_id && proof.reinjection_runner_request_id
        && artifact.runner_request_id !== proof.reinjection_runner_request_id) issues.push("runner_request_mismatch");
      if (artifact.task_artifact_proven !== true) issues.push("task_artifact_unproven");
      if (!artifact.provider_contract_id || !artifact.provider_runtime_version || !artifact.provider_runtime_identity_checksum) issues.push("provider_contract_missing");
      if (proof.reinjection_status !== "proven" || proof.reinjection_proof_checksum_valid !== true) issues.push("reinjection_proof_invalid");
      return {
        invocationEdgeId: String(artifact.invocation_edge_id || ""),
        compactEpoch: String(artifact.compact_epoch || ""),
        compactTransactionReceiptChecksum: String(artifact.compact_transaction_receipt_checksum || ""),
        compactTransactionBoundaryId: String(artifact.compact_transaction_boundary_id || ""),
        compactHeadGeneration: Number(artifact.compact_head_generation || 0),
        compactHeadChecksum: String(artifact.compact_head_checksum || ""),
        memoryContextSnapshotId: String(artifact.memory_context_snapshot_id || ""),
        providerRuntimeVersion: String(artifact.provider_runtime_version || ""),
        providerContractId: String(artifact.provider_contract_id || ""),
        recoveryOutcome: String(artifact.recovery_outcome || ""),
        artifactSequence: Number(artifactEvent.sequence || 0),
        proofSequence: Number(proofEvent?.sequence || 0),
        proven: issues.length === 0,
        issues: Array.from(new Set(issues)),
      };
    });
    const provenPostCompactArtifactClosures = postCompactArtifactClosures.filter((closure: any) => closure.proven);
    const unsafeTransitionSequence = unverifiedProviderContractTransitions.reduce(
      (latest: number, event: any) => Math.max(latest, Number(event.sequence || 0)),
      0,
    );
    const postCompactRecoveryClosures = provenPostCompactArtifactClosures.filter((closure: any) =>
      !!closure.recoveryOutcome && (!unsafeTransitionSequence || closure.artifactSequence > unsafeTransitionSequence)
    );
    const postCompactArtifactRuntimeVersions = Array.from(new Set(
      provenPostCompactArtifactClosures.map((closure: any) => closure.providerRuntimeVersion).filter(Boolean),
    ));
    const crossVersionPostCompactArtifact = postCompactArtifactRuntimeVersions.length >= 2
      && verifiedProviderContractTransitions.length >= 1
      && (unverifiedProviderContractTransitions.length === 0 || postCompactRecoveryClosures.length >= 1);
    const serviceEpochs = new Set(events.map((event: any) => event.service_epoch).filter(Boolean));
    const memoryRecoveryEvents = uniqueEvents(
      events.filter((event: any) => event.phase.startsWith("memory_receipt_recovery_")),
      event => `${event.phase}:${event.evidence?.memory_context_consumption_recovery_id || event.event_checksum}`,
    );
    const memoryRecoveryCommitted = memoryRecoveryEvents.filter((event: any) => event.phase === "memory_receipt_recovery_committed" && event.status === "recovered");
    const memoryRecoveryBlocked = memoryRecoveryEvents.filter((event: any) => event.phase === "memory_receipt_recovery_blocked" || event.status === "blocked");
    const memoryRecoveryFaults = memoryRecoveryEvents.filter((event: any) => event.phase === "memory_receipt_recovery_fault_injected");
    const memoryRecoveryRestartReconciled = memoryRecoveryEvents.filter((event: any) => event.phase === "memory_receipt_recovery_restart_reconciled");
    const memoryRecoveryProviders = Array.from(new Set(memoryRecoveryEvents.map((event: any) => event.evidence?.provider).filter(Boolean)));
    const memoryRecoveryProviderVersions = Array.from(new Set(memoryRecoveryEvents.map((event: any) => event.evidence?.memory_context_consumption_recovery_provider_version).filter(Boolean)));
    const liveProviderMemoryProbeEvents = uniqueEvents(
      events.filter((event: any) => event.phase.startsWith("live_provider_memory_probe_")),
      event => `${event.evidence?.live_provider_memory_probe_run_id || ""}:${event.phase}:${event.status}`,
    );
    const liveProviderMemoryProbeTerminal = liveProviderMemoryProbeEvents.filter((event: any) => event.phase === "live_provider_memory_probe_terminal");
    const liveProviderMemoryProbeProviders = Array.from(new Set(liveProviderMemoryProbeEvents.map((event: any) => event.evidence?.provider).filter(Boolean)));
    const liveProviderMemoryProbeVersions = Array.from(new Set(liveProviderMemoryProbeEvents.map((event: any) => event.evidence?.provider_runtime_version).filter(Boolean)));
    const liveProviderMemoryProbeModels = Array.from(new Set(liveProviderMemoryProbeEvents.map((event: any) => event.evidence?.live_provider_memory_probe_model).filter(Boolean)));
    const gaps: string[] = [...ledger.issues];
    if (unverifiedContinuations.length) gaps.push("native_continuation_unverified");
    if (formatDriftEvents.length) gaps.push("provider_output_format_drift");
    if (unverifiedProviderContractTransitions.length) gaps.push("provider_runtime_contract_transition_unverified");
    if (postCompactUnprovenEdges.length > 0) gaps.push("post_compact_reinjection_unproven");
    if (postCompactArtifactClosures.some((closure: any) => !closure.proven)) gaps.push("post_compact_artifact_closure_unproven");
    if (capacityPrepared.length > capacityCommitted.length) gaps.push("capacity_revalidation_commit_pending");
    if (liveProviderMemoryProbeTerminal.some((event: any) => event.status !== "passed")) gaps.push("live_provider_memory_probe_unproven");
    return {
      groupId: String(first.group_id || ""),
      groupSessionId: String(first.group_session_id || ""),
      taskAgentSessionId: String(first.task_agent_session_id || ""),
      file: ledger.file,
      valid: ledger.valid,
      status: !ledger.valid ? "fail" : gaps.length ? "warn" : "ok",
      eventCount: events.length,
      turnCount: terminalEdges.size,
      multiTurn: terminalEdges.size >= 2,
      continuationCount: continuationEvents.length,
      continuationAcknowledgedCount: continuationEvents.filter((event: any) => event.evidence?.native_continuation_acknowledged === true).length,
      continuationUnverifiedCount: unverifiedContinuations.length,
      formatDriftCount: formatDriftEvents.length,
      providerContractEpochCount: providerContractIds.size,
      providerContractTransitionCount: providerContractTransitions.length,
      providerContractTransitionVerifiedCount: verifiedProviderContractTransitions.length,
      providerContractTransitionUnverifiedCount: unverifiedProviderContractTransitions.length,
      providerRuntimeVersions,
      latestProviderContractId: String([...continuationEvents].reverse().find((event: any) => event.evidence?.provider_contract_id)?.evidence?.provider_contract_id || ""),
      latestProviderRuntimeVersion: String([...continuationEvents].reverse().find((event: any) => event.evidence?.provider_runtime_version)?.evidence?.provider_runtime_version || ""),
      postCompactReinjectionCount: postCompactEvents.length,
      postCompactReinjectionProvenCount: postCompactEvents.filter((event: any) => event.evidence?.reinjection_status === "proven" || event.status === "proven").length,
      postCompactReinjectionRequiredEdgeCount: postCompactRequiredEdges.size,
      postCompactReinjectionUnprovenEdgeCount: postCompactUnprovenEdges.length,
      capacityPreparedCount: capacityPrepared.length,
      capacityCommittedCount: capacityCommitted.length,
      taskArtifactEvidenceCount: taskArtifactEvents.length,
      taskArtifactProvenCount: taskArtifactProvenEvents.length,
      taskArtifactUnprovenCount: taskArtifactEvents.length - taskArtifactProvenEvents.length,
      memoryBoundTaskArtifactCount: memoryBoundTaskArtifactEvents.length,
      recoveredTaskArtifactCount: recoveredTaskArtifactEvents.length,
      taskArtifactRuntimeVersions,
      crossVersionTaskArtifact,
      postCompactTaskArtifactEvidenceCount: postCompactArtifactEvents.length,
      postCompactArtifactClosureProvenCount: provenPostCompactArtifactClosures.length,
      postCompactArtifactClosureUnprovenCount: postCompactArtifactClosures.length - provenPostCompactArtifactClosures.length,
      postCompactArtifactEdgeMismatchCount: postCompactArtifactClosures.filter((closure: any) => closure.issues.includes("edge_mismatch")).length,
      postCompactArtifactIdentityMismatchCount: postCompactArtifactClosures.filter((closure: any) => closure.issues.includes("identity_mismatch")).length,
      postCompactArtifactSnapshotMismatchCount: postCompactArtifactClosures.filter((closure: any) => closure.issues.includes("snapshot_mismatch")).length,
      postCompactArtifactEpochMismatchCount: postCompactArtifactClosures.filter((closure: any) => closure.issues.includes("epoch_mismatch")).length,
      postCompactArtifactDeliveryMismatchCount: postCompactArtifactClosures.filter((closure: any) => closure.issues.includes("delivery_receipt_mismatch")).length,
      postCompactArtifactCompactTransactionReceiptMismatchCount: postCompactArtifactClosures.filter((closure: any) => closure.issues.includes("compact_transaction_receipt_mismatch")).length,
      postCompactArtifactCompactHeadFenceMismatchCount: postCompactArtifactClosures.filter((closure: any) => closure.issues.includes("compact_head_fence_mismatch")).length,
      postCompactArtifactRecoveryClosureCount: postCompactRecoveryClosures.length,
      postCompactArtifactRuntimeVersions,
      crossVersionPostCompactArtifact,
      postCompactArtifactClosures,
      serviceEpochCount: serviceEpochs.size,
      restartObserved: serviceEpochs.size >= 2,
      recoveredEventCount: events.filter((event: any) => event.recovered_after_restart === true).length,
      memoryRecoveryEventCount: memoryRecoveryEvents.length,
      memoryRecoveryCommittedCount: memoryRecoveryCommitted.length,
      memoryRecoveryBlockedCount: memoryRecoveryBlocked.length,
      memoryRecoveryFaultInjectedCount: memoryRecoveryFaults.length,
      memoryRecoveryRestartReconciledCount: memoryRecoveryRestartReconciled.length,
      memoryRecoveryReplaySuppressedCount: memoryRecoveryEvents.filter((event: any) => event.evidence?.memory_context_consumption_recovery_suppress_task_replay === true).length,
      memoryRecoveryNativeAcknowledgedCount: memoryRecoveryEvents.filter((event: any) => event.evidence?.memory_context_consumption_recovery_native_acknowledged === true).length,
      memoryRecoveryProviders,
      memoryRecoveryProviderVersions,
      liveProviderMemoryProbeEventCount: liveProviderMemoryProbeEvents.length,
      liveProviderMemoryProbeTerminalCount: liveProviderMemoryProbeTerminal.length,
      liveProviderMemoryProbePassedCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.status === "passed").length,
      liveProviderMemoryProbeTimeoutCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.status === "timeout" || event.evidence?.live_provider_memory_probe_timed_out === true).length,
      liveProviderMemoryProbeUnavailableCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.status === "unavailable").length,
      liveProviderMemoryProbeFailedCount: liveProviderMemoryProbeTerminal.filter((event: any) => !["passed", "timeout", "unavailable"].includes(String(event.status || ""))).length,
      liveProviderMemoryProbeProviders,
      liveProviderMemoryProbeVersions,
      liveProviderMemoryProbeModels,
      liveProviderMemoryProbeSessionEstablishedCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_session_established === true).length,
      liveProviderMemoryProbeTurnStartedCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_turn_started === true).length,
      liveProviderMemoryProbeFirstOutputCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_first_output_observed === true).length,
      liveProviderMemoryProbeTerminalObservedCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_terminal_observed === true).length,
      liveProviderMemoryProbeModelOutputCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_model_output_observed === true).length,
      liveProviderMemoryProbeApiRetryEventCount: liveProviderMemoryProbeTerminal.reduce((sum: number, event: any) => sum + Number(event.evidence?.live_provider_memory_probe_api_retry_count || 0), 0),
      liveProviderMemoryProbeStartupTimeoutCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_issue === "provider_startup_timeout").length,
      liveProviderMemoryProbeApiRetryTimeoutCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_issue === "provider_api_retry_timeout").length,
      liveProviderMemoryProbeTurnTimeoutCount: liveProviderMemoryProbeTerminal.filter((event: any) => ["provider_turn_timeout", "provider_terminal_timeout"].includes(String(event.evidence?.live_provider_memory_probe_issue || ""))).length,
      liveProviderMemoryProbeReceiptRecoveryRequiredCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_receipt_recovery_required === true).length,
      liveProviderMemoryProbeReceiptRecoveryPassedCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_receipt_recovery_status === "recovered" && event.evidence?.live_provider_memory_probe_receipt_valid === true).length,
      liveProviderMemoryProbeWorkspaceChangedCount: liveProviderMemoryProbeTerminal.filter((event: any) => event.evidence?.live_provider_memory_probe_workspace_unchanged !== true).length,
      headChecksum: ledger.headChecksum,
      gaps: Array.from(new Set(gaps)),
      latestAt: String(events[events.length - 1]?.recorded_at || ""),
    };
  });
  const eventCount = rows.reduce((sum, row) => sum + row.eventCount, 0);
  return {
    schema: "ccm-task-agent-continuation-soak-report-v6",
    generatedAt: new Date().toISOString(),
    directory: TASK_AGENT_CONTINUATION_SOAK_DIR,
    serviceEpoch: TASK_AGENT_CONTINUATION_SOAK_SERVICE_EPOCH,
    overall: {
      status: rows.length === 0 ? "empty" : rows.some(row => row.status === "fail") ? "fail" : rows.some(row => row.status === "warn") ? "warn" : "ok",
      chainCount: rows.length,
      validChainCount: rows.filter(row => row.valid).length,
      invalidChainCount: rows.filter(row => !row.valid).length,
      healthyChainCount: rows.filter(row => row.status === "ok").length,
      eventCount,
      multiTurnChainCount: rows.filter(row => row.multiTurn).length,
      restartObservedChainCount: rows.filter(row => row.restartObserved).length,
      recoveredEventCount: rows.reduce((sum, row) => sum + row.recoveredEventCount, 0),
      memoryRecoveryEventCount: rows.reduce((sum, row) => sum + row.memoryRecoveryEventCount, 0),
      memoryRecoveryCommittedCount: rows.reduce((sum, row) => sum + row.memoryRecoveryCommittedCount, 0),
      memoryRecoveryBlockedCount: rows.reduce((sum, row) => sum + row.memoryRecoveryBlockedCount, 0),
      memoryRecoveryFaultInjectedCount: rows.reduce((sum, row) => sum + row.memoryRecoveryFaultInjectedCount, 0),
      memoryRecoveryRestartReconciledCount: rows.reduce((sum, row) => sum + row.memoryRecoveryRestartReconciledCount, 0),
      memoryRecoveryReplaySuppressedCount: rows.reduce((sum, row) => sum + row.memoryRecoveryReplaySuppressedCount, 0),
      memoryRecoveryNativeAcknowledgedCount: rows.reduce((sum, row) => sum + row.memoryRecoveryNativeAcknowledgedCount, 0),
      memoryRecoveryProviderCount: new Set(rows.flatMap(row => row.memoryRecoveryProviders || [])).size,
      memoryRecoveryProviderVersionCount: new Set(rows.flatMap(row => row.memoryRecoveryProviderVersions || [])).size,
      liveProviderMemoryProbeEventCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeEventCount, 0),
      liveProviderMemoryProbeTerminalCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeTerminalCount, 0),
      liveProviderMemoryProbePassedCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbePassedCount, 0),
      liveProviderMemoryProbeTimeoutCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeTimeoutCount, 0),
      liveProviderMemoryProbeUnavailableCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeUnavailableCount, 0),
      liveProviderMemoryProbeFailedCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeFailedCount, 0),
      liveProviderMemoryProbeProviderCount: new Set(rows.flatMap(row => row.liveProviderMemoryProbeProviders || [])).size,
      liveProviderMemoryProbeProviderVersionCount: new Set(rows.flatMap(row => row.liveProviderMemoryProbeVersions || [])).size,
      liveProviderMemoryProbeModelCount: new Set(rows.flatMap(row => row.liveProviderMemoryProbeModels || [])).size,
      liveProviderMemoryProbeSessionEstablishedCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeSessionEstablishedCount, 0),
      liveProviderMemoryProbeTurnStartedCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeTurnStartedCount, 0),
      liveProviderMemoryProbeFirstOutputCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeFirstOutputCount, 0),
      liveProviderMemoryProbeTerminalObservedCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeTerminalObservedCount, 0),
      liveProviderMemoryProbeModelOutputCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeModelOutputCount, 0),
      liveProviderMemoryProbeApiRetryEventCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeApiRetryEventCount, 0),
      liveProviderMemoryProbeStartupTimeoutCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeStartupTimeoutCount, 0),
      liveProviderMemoryProbeApiRetryTimeoutCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeApiRetryTimeoutCount, 0),
      liveProviderMemoryProbeTurnTimeoutCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeTurnTimeoutCount, 0),
      liveProviderMemoryProbeReceiptRecoveryRequiredCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeReceiptRecoveryRequiredCount, 0),
      liveProviderMemoryProbeReceiptRecoveryPassedCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeReceiptRecoveryPassedCount, 0),
      liveProviderMemoryProbeWorkspaceChangedCount: rows.reduce((sum, row) => sum + row.liveProviderMemoryProbeWorkspaceChangedCount, 0),
      continuationAcknowledgedCount: rows.reduce((sum, row) => sum + row.continuationAcknowledgedCount, 0),
      continuationUnverifiedCount: rows.reduce((sum, row) => sum + row.continuationUnverifiedCount, 0),
      providerOutputFormatDriftCount: rows.reduce((sum, row) => sum + row.formatDriftCount, 0),
      providerContractEpochCount: rows.reduce((sum, row) => sum + row.providerContractEpochCount, 0),
      providerContractTransitionCount: rows.reduce((sum, row) => sum + row.providerContractTransitionCount, 0),
      providerContractTransitionVerifiedCount: rows.reduce((sum, row) => sum + row.providerContractTransitionVerifiedCount, 0),
      providerContractTransitionUnverifiedCount: rows.reduce((sum, row) => sum + row.providerContractTransitionUnverifiedCount, 0),
      postCompactReinjectionProvenCount: rows.reduce((sum, row) => sum + row.postCompactReinjectionProvenCount, 0),
      capacityPreparedCount: rows.reduce((sum, row) => sum + row.capacityPreparedCount, 0),
      capacityCommittedCount: rows.reduce((sum, row) => sum + row.capacityCommittedCount, 0),
      taskArtifactEvidenceCount: rows.reduce((sum, row) => sum + row.taskArtifactEvidenceCount, 0),
      taskArtifactProvenCount: rows.reduce((sum, row) => sum + row.taskArtifactProvenCount, 0),
      taskArtifactUnprovenCount: rows.reduce((sum, row) => sum + row.taskArtifactUnprovenCount, 0),
      memoryBoundTaskArtifactCount: rows.reduce((sum, row) => sum + row.memoryBoundTaskArtifactCount, 0),
      recoveredTaskArtifactCount: rows.reduce((sum, row) => sum + row.recoveredTaskArtifactCount, 0),
      crossVersionTaskArtifactChainCount: rows.filter(row => row.crossVersionTaskArtifact).length,
      postCompactTaskArtifactEvidenceCount: rows.reduce((sum, row) => sum + row.postCompactTaskArtifactEvidenceCount, 0),
      postCompactArtifactClosureProvenCount: rows.reduce((sum, row) => sum + row.postCompactArtifactClosureProvenCount, 0),
      postCompactArtifactClosureUnprovenCount: rows.reduce((sum, row) => sum + row.postCompactArtifactClosureUnprovenCount, 0),
      postCompactArtifactEdgeMismatchCount: rows.reduce((sum, row) => sum + row.postCompactArtifactEdgeMismatchCount, 0),
      postCompactArtifactIdentityMismatchCount: rows.reduce((sum, row) => sum + row.postCompactArtifactIdentityMismatchCount, 0),
      postCompactArtifactSnapshotMismatchCount: rows.reduce((sum, row) => sum + row.postCompactArtifactSnapshotMismatchCount, 0),
      postCompactArtifactEpochMismatchCount: rows.reduce((sum, row) => sum + row.postCompactArtifactEpochMismatchCount, 0),
      postCompactArtifactDeliveryMismatchCount: rows.reduce((sum, row) => sum + row.postCompactArtifactDeliveryMismatchCount, 0),
      postCompactArtifactCompactTransactionReceiptMismatchCount: rows.reduce((sum, row) => sum + row.postCompactArtifactCompactTransactionReceiptMismatchCount, 0),
      postCompactArtifactCompactHeadFenceMismatchCount: rows.reduce((sum, row) => sum + row.postCompactArtifactCompactHeadFenceMismatchCount, 0),
      postCompactArtifactRecoveryClosureCount: rows.reduce((sum, row) => sum + row.postCompactArtifactRecoveryClosureCount, 0),
      crossVersionPostCompactArtifactChainCount: rows.filter(row => row.crossVersionPostCompactArtifact).length,
    },
    rows: rows.sort((a, b) => String(b.latestAt).localeCompare(String(a.latestAt))),
  };
}

export function deleteTaskAgentContinuationSoakArtifacts(groupId: string, groupSessionId: string, taskAgentSessionId = "") {
  let deleted = 0;
  const prefix = `${clean(groupId)}--${clean(groupSessionId)}--`;
  for (const file of listSoakFiles()) {
    const name = path.basename(file);
    if (!name.startsWith(prefix)) continue;
    if (taskAgentSessionId && name !== `${prefix}${clean(taskAgentSessionId)}.jsonl`) continue;
    try { fs.unlinkSync(file); deleted += 1; } catch {}
    try { fs.unlinkSync(`${file}.lock`); } catch {}
  }
  return { deleted, groupId, groupSessionId, taskAgentSessionId };
}
