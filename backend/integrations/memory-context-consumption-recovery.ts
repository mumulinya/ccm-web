import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  buildNativeSessionContinuationEvidence,
  verifyNativeSessionContinuationEvidence,
} from "../agents/native-continuation";
import { normalizeAgentRuntimeId } from "../agents/runtime";
import {
  inspectMemoryContextConsumptionReceiptFile,
  memoryContextConsumptionChallengeReferenceState,
  readMemoryContextConsumptionReceipt,
  verifyMemoryContextConsumptionChallenge,
} from "./memory-context-consumption-receipt";
import {
  signInternalMcpEvidence,
  verifyInternalMcpEvidenceSignature,
} from "./internal-mcp-runtime";
import { tryRecordTaskAgentContinuationSoakEvent } from "../tasks/task-agent-continuation-soak";

export const MEMORY_CONTEXT_CONSUMPTION_RECOVERY_SCHEMA = "ccm-memory-context-consumption-recovery-v1";
export const MEMORY_CONTEXT_CONSUMPTION_RECOVERY_FAILPOINTS = [
  "after_running_before_provider",
  "after_provider_before_receipt_verify",
  "after_receipt_verify_before_recovery_commit",
  "after_recovery_commit_before_return",
] as const;
const RECOVERY_DIR = path.join(os.homedir(), ".cc-connect", "memory-context-consumption-recoveries");
const DEFAULT_RECOVERY_RETENTION_DAYS = 30;
const DEFAULT_INTERRUPTED_AFTER_MINUTES = 10;
const DEFAULT_RECOVERY_GRACE_HOURS = 1;
const DEFAULT_MAX_ORPHAN_RECOVERIES = 2_000;
const RECOVERY_PROMPT = [
  "CCM memory-load acknowledgement recovery.",
  "Do not repeat, redo, or modify the task and do not change files.",
  "Read the trusted memory context from the immediately preceding native session turn.",
  "Find its memory consumption challenge there, then call ccm__knowledge_context/acknowledge_memory_context with that exact challenge id.",
  "Do not infer or invent an id. If the preceding trusted context is unavailable, return CCM_MEMORY_ACK_CONTEXT_UNAVAILABLE without calling the tool.",
  "After the tool succeeds, return only CCM_MEMORY_ACK_RECOVERED.",
].join("\n");

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function digest(value: any) {
  const data = typeof value === "string" ? value : JSON.stringify(canonical(value));
  return crypto.createHash("sha256").update(data).digest("hex");
}

function recoveryFile(challengeId: string) {
  if (!/^mcrc_[a-f0-9]{28}$/.test(challengeId)) return "";
  return path.join(RECOVERY_DIR, `${challengeId}.json`);
}

function writeRecovery(record: any) {
  const file = recoveryFile(String(record?.challenge_id || ""));
  if (!file) throw new Error("memory receipt recovery challenge id invalid");
  const unsigned = { ...record };
  delete unsigned.recovery_signature;
  delete unsigned.file;
  const value = { ...unsigned, recovery_signature: signInternalMcpEvidence(unsigned) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, file);
  return { ...value, file };
}

function readRecovery(challengeId: string) {
  const file = recoveryFile(challengeId);
  if (!file) return null;
  try {
    const record = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { ...record, file };
  } catch {
    return null;
  }
}

function recordRecoverySoak(input: any, phase: string, status: string, record: any, extra: any = {}) {
  if (!record) return null;
  return tryRecordTaskAgentContinuationSoakEvent({
    groupId: record.group_id || input.groupId || "",
    groupSessionId: record.group_session_id || input.groupSessionId || "",
    taskAgentSessionId: record.task_agent_session_id || input.taskAgentSessionId || "",
    phase,
    status,
    eventKey: `memory-recovery:${record.recovery_id || record.challenge_id}:${phase}:${status}:${extra.faultPoint || ""}`,
    source: String(extra.source || "memory_receipt_recovery"),
    recoveredAfterRestart: extra.recoveredAfterRestart === true,
    evidence: {
      provider: record.provider || input.provider || input.agentType || "",
      runnerRequestId: record.parent_runner_request_id || input.runnerRequestId || "",
      memoryContextConsumptionRecovery: record,
      providerRuntimeVersion: String(extra.providerRuntimeVersion || input.providerRuntimeVersionSnapshot?.semanticVersion || input.providerRuntimeVersionSnapshot?.versionText || ""),
      providerRuntimeIdentityChecksum: String(extra.providerRuntimeIdentityChecksum || input.providerRuntimeVersionSnapshot?.executableIdentityChecksum || ""),
      faultPoint: String(extra.faultPoint || ""),
    },
  });
}

function maybeInjectRecoveryCrash(input: any, point: typeof MEMORY_CONTEXT_CONSUMPTION_RECOVERY_FAILPOINTS[number], record: any) {
  if (String(input.faultInjectionPoint || input.fault_injection_point || "") !== point) return;
  recordRecoverySoak(input, "memory_receipt_recovery_fault_injected", "crash_injected", record, { faultPoint: point });
  const error: any = new Error(`Injected memory receipt recovery crash at ${point}`);
  error.code = "CCM_INJECTED_MEMORY_RECEIPT_RECOVERY_CRASH";
  error.simulatedRecoveryCrash = true;
  error.faultPoint = point;
  error.recoveryRecord = record;
  throw error;
}

function baseRecovery(input: any, status: string, issues: string[] = []) {
  const challenge = input.challenge || input.memoryContextConsumptionChallenge || null;
  const parentEvidence = input.nativeContinuationEvidence || null;
  const provider = normalizeAgentRuntimeId(input.provider || input.agentType || "");
  const recoveryId = `mcrr_${digest([
    challenge?.challenge_id || "",
    input.runnerRequestId || "",
    parentEvidence?.effectiveNativeSessionId || "",
    1,
  ]).slice(0, 28)}`;
  return {
    schema: MEMORY_CONTEXT_CONSUMPTION_RECOVERY_SCHEMA,
    version: 1,
    recovery_id: recoveryId,
    challenge_id: String(challenge?.challenge_id || ""),
    parent_runner_request_id: String(input.runnerRequestId || ""),
    recovery_runner_request_id: `${String(input.runnerRequestId || "runner")}:memory-receipt-recovery:1`,
    group_id: String(input.groupId || ""),
    group_session_id: String(input.groupSessionId || ""),
    task_id: String(input.taskId || ""),
    execution_id: String(input.executionId || ""),
    project: String(input.project || input.projectName || ""),
    task_agent_session_id: String(input.taskAgentSessionId || ""),
    provider,
    native_session_id: String(parentEvidence?.effectiveNativeSessionId || ""),
    parent_native_continuation_evidence_checksum: String(parentEvidence?.evidenceChecksum || ""),
    trusted_memory_envelope_checksum: String(input.trustedMemoryEnvelopeChecksum || ""),
    trusted_memory_source_checksum: String(input.trustedMemoryEnvelopeSourceChecksum || ""),
    policy: "same_native_session_receipt_only_once",
    max_attempts: 1,
    attempt: status === "not_needed" ? 0 : 1,
    task_reexecution_allowed: false,
    suppress_task_replay: status !== "recovered" && status !== "not_needed",
    provider_work_completed_before_recovery: input.providerWorkCompleted !== false,
    recovery_prompt_checksum: digest(RECOVERY_PROMPT),
    recovery_prompt_contains_challenge_id: false,
    status,
    issues: [...new Set(issues)],
    prepared_at: new Date().toISOString(),
    completed_at: ["recovered", "blocked", "not_needed"].includes(status) ? new Date().toISOString() : "",
  };
}

export function verifyMemoryContextConsumptionRecovery(record: any, expected: any = {}) {
  const issues: string[] = [];
  if (record?.schema !== MEMORY_CONTEXT_CONSUMPTION_RECOVERY_SCHEMA || Number(record?.version || 0) !== 1) issues.push("recovery_schema_invalid");
  const { recovery_signature: signature, file: _file, ...unsigned } = record || {};
  if (!verifyInternalMcpEvidenceSignature(unsigned, signature)) issues.push("recovery_signature_invalid");
  if (!/^mcrr_[a-f0-9]{28}$/.test(String(record?.recovery_id || ""))) issues.push("recovery_id_invalid");
  if (!/^mcrc_[a-f0-9]{28}$/.test(String(record?.challenge_id || ""))) issues.push("challenge_id_invalid");
  if (Number(record?.max_attempts || 0) !== 1 || Number(record?.attempt || 0) > 1) issues.push("recovery_attempt_policy_invalid");
  if (record?.task_reexecution_allowed !== false) issues.push("task_reexecution_policy_invalid");
  if (!["prepared", "running", "recovered", "blocked", "not_needed", "interrupted"].includes(String(record?.status || ""))) issues.push("recovery_status_invalid");
  if (["blocked", "interrupted"].includes(String(record?.status || "")) && record?.suppress_task_replay !== true) issues.push("blocked_replay_policy_invalid");
  if (record?.recovery_prompt_contains_challenge_id !== false || String(record?.recovery_prompt_checksum || "") !== digest(RECOVERY_PROMPT)) issues.push("recovery_prompt_binding_invalid");
  for (const [field, aliases] of Object.entries({
    challenge_id: ["challengeId", "challenge_id"],
    parent_runner_request_id: ["runnerRequestId", "runner_request_id"],
    group_id: ["groupId", "group_id"],
    group_session_id: ["groupSessionId", "group_session_id"],
    task_id: ["taskId", "task_id"],
    execution_id: ["executionId", "execution_id"],
    project: ["project", "projectName"],
    task_agent_session_id: ["taskAgentSessionId", "task_agent_session_id"],
    provider: ["provider", "agentType"],
  })) {
    const expectedValue = (aliases as string[]).map(alias => expected?.[alias]).find(value => String(value || "").trim());
    const normalized = field === "provider" && expectedValue ? normalizeAgentRuntimeId(expectedValue) : expectedValue;
    if (normalized && String(record?.[field] || "") !== String(normalized)) issues.push(`${field}_mismatch`);
  }
  if (record?.status === "recovered") {
    const continuation = verifyNativeSessionContinuationEvidence(record?.recovery_native_continuation_evidence, {
      provider: record.provider,
      runnerRequestId: record.recovery_runner_request_id,
      requestedNativeSessionId: record.native_session_id,
      expectedProviderContractId: record?.recovery_native_continuation_evidence?.expectedProviderContractId || "",
    });
    if (!continuation.valid || record?.recovery_native_continuation_evidence?.nativeContinuationAcknowledged !== true) issues.push("recovery_native_continuation_unverified");
    if (!String(record?.receipt_signature || "")) issues.push("recovery_receipt_signature_missing");
    if (record?.suppress_task_replay !== false) issues.push("recovered_replay_policy_invalid");
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

export async function recoverMemoryContextConsumptionReceipt(input: any, executeContinuation: (request: any) => Promise<any>) {
  const challenge = input.challenge || input.memoryContextConsumptionChallenge || null;
  const expected = {
    groupId: input.groupId,
    groupSessionId: input.groupSessionId,
    taskId: input.taskId,
    executionId: input.executionId,
    project: input.project || input.projectName,
    taskAgentSessionId: input.taskAgentSessionId,
  };
  const existing = readMemoryContextConsumptionReceipt(challenge, expected);
  if (existing.valid) {
    const priorRecovery = readRecovery(String(challenge?.challenge_id || ""));
    if (priorRecovery?.status === "recovered" && verifyMemoryContextConsumptionRecovery(priorRecovery, {
      challengeId: challenge?.challenge_id || "",
      runnerRequestId: input.runnerRequestId || "",
      groupId: input.groupId || "",
      groupSessionId: input.groupSessionId || "",
      taskId: input.taskId || "",
      executionId: input.executionId || "",
      project: input.project || input.projectName || "",
      taskAgentSessionId: input.taskAgentSessionId || "",
      provider: input.provider || input.agentType || "",
    }).valid) {
      recordRecoverySoak(input, "memory_receipt_recovery_idempotent", "recovered", priorRecovery);
      return { recovered: true, receipt: existing.receipt, record: priorRecovery };
    }
    const record = writeRecovery({
      ...baseRecovery(input, "not_needed"),
      attempt: 0,
      suppress_task_replay: false,
      receipt_signature: existing.receiptSignature,
    });
    recordRecoverySoak(input, "memory_receipt_recovery_not_needed", "not_needed", record);
    return { recovered: true, receipt: existing.receipt, record };
  }
  const initialIssues = [...new Set(existing.issues || [])];
  const challengeVerification = verifyMemoryContextConsumptionChallenge(challenge, expected);
  const parentEvidence = input.nativeContinuationEvidence || null;
  const parentVerification = parentEvidence ? verifyNativeSessionContinuationEvidence(parentEvidence, {
    provider: input.provider || input.agentType,
    runnerRequestId: input.runnerRequestId,
  }) : { valid: false, issues: ["parent_native_continuation_evidence_missing"] };
  const eligibilityIssues: string[] = [];
  if (!challengeVerification.valid) eligibilityIssues.push(...challengeVerification.issues);
  if (initialIssues.some(issue => issue !== "receipt_missing")) eligibilityIssues.push("receipt_failure_not_recoverable");
  if (!parentVerification.valid) eligibilityIssues.push(...parentVerification.issues.map((issue: string) => `parent_${issue}`));
  if (parentEvidence?.nativeSessionReusable !== true || !String(parentEvidence?.effectiveNativeSessionId || "")) eligibilityIssues.push("trusted_native_session_unavailable");
  if (typeof executeContinuation !== "function") eligibilityIssues.push("recovery_executor_missing");
  if (eligibilityIssues.length) {
    const record = writeRecovery(baseRecovery(input, "blocked", [...initialIssues, ...eligibilityIssues]));
    recordRecoverySoak(input, "memory_receipt_recovery_blocked", "blocked", record);
    return { recovered: false, receipt: null, record };
  }

  let record = writeRecovery({ ...baseRecovery(input, "prepared", initialIssues), completed_at: "" });
  recordRecoverySoak(input, "memory_receipt_recovery_prepared", "prepared", record);
  record = writeRecovery({ ...record, recovery_signature: undefined, file: undefined, status: "running", started_at: new Date().toISOString(), completed_at: "" });
  recordRecoverySoak(input, "memory_receipt_recovery_running", "running", record);
  maybeInjectRecoveryCrash(input, "after_running_before_provider", record);
  try {
    const result = await executeContinuation({
      recoveryId: record.recovery_id,
      runnerRequestId: record.recovery_runner_request_id,
      prompt: RECOVERY_PROMPT,
      promptChecksum: record.recovery_prompt_checksum,
      nativeSessionId: record.native_session_id,
      provider: record.provider,
      attempt: 1,
    });
    maybeInjectRecoveryCrash(input, "after_provider_before_receipt_verify", record);
    const normalizedProvider = normalizeAgentRuntimeId(result?.provider || record.provider);
    const expectedProviderContractId = parentEvidence?.resumeAckPolicy === "provider_output"
      ? parentEvidence?.providerContractId || parentEvidence?.expectedProviderContractId || ""
      : "";
    const recoveryContinuation = buildNativeSessionContinuationEvidence({
      provider: normalizedProvider,
      runnerRequestId: record.recovery_runner_request_id,
      requestedNativeSessionId: record.native_session_id,
      returnedNativeSessionId: result?.returnedNativeSessionId || result?.nativeSessionId || "",
      providerOutputContractEvidence: result?.providerOutputContractEvidence || null,
      providerRuntimeVersionSnapshot: result?.providerRuntimeVersionSnapshot || input.providerRuntimeVersionSnapshot || null,
      expectedProviderContractId,
      nativeResumeRequested: true,
      runnerSuccess: result?.success !== false && Number(result?.exitCode ?? 0) === 0,
    });
    const continuationVerification = verifyNativeSessionContinuationEvidence(recoveryContinuation, {
      provider: normalizedProvider,
      runnerRequestId: record.recovery_runner_request_id,
      requestedNativeSessionId: record.native_session_id,
      expectedProviderContractId,
    });
    const receipt = readMemoryContextConsumptionReceipt(challenge, expected);
    const issues = [
      ...(continuationVerification.valid ? [] : continuationVerification.issues.map(issue => `recovery_${issue}`)),
      ...(recoveryContinuation.nativeContinuationAcknowledged === true ? [] : ["recovery_native_continuation_unacknowledged"]),
      ...(receipt.valid ? [] : receipt.issues),
    ];
    const recovered = issues.length === 0;
    maybeInjectRecoveryCrash(input, "after_receipt_verify_before_recovery_commit", record);
    record = writeRecovery({
      ...record,
      recovery_signature: undefined,
      file: undefined,
      status: recovered ? "recovered" : "blocked",
      suppress_task_replay: !recovered,
      issues: [...new Set(issues)],
      recovery_output_checksum: digest(String(result?.output || result?.stdout || "")),
      recovery_native_continuation_evidence: recoveryContinuation,
      receipt_signature: recovered ? receipt.receiptSignature : "",
      completed_at: new Date().toISOString(),
    });
    recordRecoverySoak(input, recovered ? "memory_receipt_recovery_committed" : "memory_receipt_recovery_blocked", recovered ? "recovered" : "blocked", record, {
      providerRuntimeVersion: recoveryContinuation.providerRuntimeVersion,
      providerRuntimeIdentityChecksum: recoveryContinuation.providerRuntimeIdentityChecksum,
    });
    maybeInjectRecoveryCrash(input, "after_recovery_commit_before_return", record);
    return { recovered, receipt: recovered ? receipt.receipt : null, record };
  } catch (error: any) {
    if (error?.simulatedRecoveryCrash === true) throw error;
    record = writeRecovery({
      ...record,
      recovery_signature: undefined,
      file: undefined,
      status: "blocked",
      suppress_task_replay: true,
      issues: [...new Set([...(record.issues || []), "recovery_execution_failed"])],
      error_code: String(error?.code || ""),
      error_checksum: digest(String(error?.message || error || "")),
      completed_at: new Date().toISOString(),
    });
    recordRecoverySoak(input, "memory_receipt_recovery_blocked", "blocked", record);
    return { recovered: false, receipt: null, record };
  }
}

function pathIsInsideRecoveryDir(file: string) {
  try {
    const base = path.resolve(RECOVERY_DIR).toLowerCase();
    const target = path.resolve(file).toLowerCase();
    return target === base || target.startsWith(`${base}${path.sep}`);
  } catch {
    return false;
  }
}

export function memoryContextConsumptionRecoveryDirectory() {
  return RECOVERY_DIR;
}

export function removeMemoryContextConsumptionRecoveryIfUnreferenced(challengeId: any, options: any = {}) {
  const id = String(challengeId || "");
  const file = recoveryFile(id);
  if (!file || !pathIsInsideRecoveryDir(file)) return { removed: false, reason: "challenge_id_invalid", challengeId: id, file };
  const reference = memoryContextConsumptionChallengeReferenceState(id, options);
  if (reference.referenced) return { removed: false, reason: reference.uncertain ? "snapshot_reference_uncertain" : "snapshot_still_references_recovery", challengeId: id, file };
  try {
    const existed = fs.existsSync(file);
    if (existed) fs.rmSync(file, { force: true });
    return { removed: existed, reason: existed ? "unreferenced_recovery_removed" : "recovery_missing", challengeId: id, file };
  } catch (error: any) {
    return { removed: false, reason: error?.message || String(error), challengeId: id, file };
  }
}

export function reconcileMemoryContextConsumptionRecoveries(options: any = {}) {
  const nowMs = Number(options.nowMs || options.now_ms || Date.now());
  const retentionDays = Math.max(1, Number(options.retentionDays ?? options.retention_days ?? DEFAULT_RECOVERY_RETENTION_DAYS));
  const interruptedAfterMinutes = Math.max(1, Number(options.interruptedAfterMinutes ?? options.interrupted_after_minutes ?? DEFAULT_INTERRUPTED_AFTER_MINUTES));
  const graceHours = Math.max(0, Number(options.graceHours ?? options.grace_hours ?? DEFAULT_RECOVERY_GRACE_HOURS));
  const maxOrphans = Math.max(0, Number(options.maxOrphanRecoveries ?? options.max_orphan_recoveries ?? DEFAULT_MAX_ORPHAN_RECOVERIES));
  const prune = options.prune === true;
  const reconcileInterrupted = options.reconcileInterrupted === true || options.reconcile_interrupted === true;
  const allRows: any[] = [];
  const unexpectedFiles: string[] = [];
  try {
    if (fs.existsSync(RECOVERY_DIR)) {
      for (const entry of fs.readdirSync(RECOVERY_DIR, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (!/^mcrc_[a-f0-9]{28}\.json$/.test(entry.name)) { unexpectedFiles.push(path.join(RECOVERY_DIR, entry.name)); continue; }
        const file = path.join(RECOVERY_DIR, entry.name);
        let record: any = null;
        try { record = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {}
        let mtimeMs = 0;
        try { mtimeMs = fs.statSync(file).mtimeMs; } catch {}
        const challengeId = String(record?.challenge_id || entry.name.replace(/\.json$/, ""));
        let verification = verifyMemoryContextConsumptionRecovery(record || {});
        const ageMs = Math.max(0, nowMs - mtimeMs);
        const interruptedCandidate = verification.valid
          && ["prepared", "running"].includes(String(record?.status || ""))
          && ageMs >= interruptedAfterMinutes * 60_000;
        if (interruptedCandidate && reconcileInterrupted) {
          record = writeRecovery({
            ...record,
            recovery_signature: undefined,
            file: undefined,
            status: "interrupted",
            suppress_task_replay: true,
            issues: [...new Set([...(record?.issues || []), "recovery_process_interrupted_before_commit"])],
            interrupted_at: new Date(nowMs).toISOString(),
            completed_at: new Date(nowMs).toISOString(),
          });
          verification = verifyMemoryContextConsumptionRecovery(record);
          recordRecoverySoak(record, "memory_receipt_recovery_restart_reconciled", "interrupted", record, { source: "startup_reconcile", recoveredAfterRestart: true });
          try { mtimeMs = fs.statSync(file).mtimeMs; } catch {}
        }
        const reference = memoryContextConsumptionChallengeReferenceState(challengeId, options);
        const receipt = inspectMemoryContextConsumptionReceiptFile(challengeId);
        const lifecycleIssues: string[] = [];
        if (record?.status === "recovered" && (!receipt.valid || String(record?.receipt_signature || "") !== String(receipt.receiptSignature || ""))) lifecycleIssues.push("recovered_receipt_missing_or_mismatched");
        if (reference.referenced && record?.status === "not_needed" && !receipt.valid) lifecycleIssues.push("referenced_not_needed_receipt_missing");
        if (record?.status === "interrupted" && receipt.present) lifecycleIssues.push("interrupted_receipt_present_without_continuation_commit");
        allRows.push({
          recoveryId: String(record?.recovery_id || ""),
          challengeId,
          status: String(record?.status || "unreadable"),
          provider: String(record?.provider || ""),
          groupId: String(record?.group_id || ""),
          groupSessionId: String(record?.group_session_id || ""),
          taskAgentSessionId: String(record?.task_agent_session_id || ""),
          attempt: Number(record?.attempt || 0),
          valid: verification.valid && lifecycleIssues.length === 0,
          signatureValid: verification.valid,
          issues: [...new Set([...(verification.issues || []), ...lifecycleIssues])],
          suppressTaskReplay: record?.suppress_task_replay === true,
          completedAt: String(record?.completed_at || ""),
          file,
          mtimeMs,
          ageMs,
          referenced: reference.referenced,
          referenceUncertain: reference.uncertain,
          referenceCount: Number(reference.referenceCount || 0),
          receiptPresent: receipt.present,
          receiptValid: receipt.valid,
          interruptedCandidate,
          reconciledInterrupted: interruptedCandidate && reconcileInterrupted,
        });
      }
    }
  } catch {}
  const retentionMs = retentionDays * 86_400_000;
  const graceMs = graceHours * 3_600_000;
  const orphanRows = allRows.filter(row => !row.referenced && !row.referenceUncertain).sort((a, b) => b.mtimeMs - a.mtimeMs);
  orphanRows.forEach((row, index) => {
    row.orphan = true;
    row.stale = row.ageMs >= retentionMs;
    row.overflow = index >= maxOrphans;
    row.prunable = row.ageMs >= graceMs && !["prepared", "running"].includes(row.status) && (row.stale || row.overflow);
  });
  for (const row of allRows.filter(row => !row.orphan)) {
    row.orphan = false;
    row.stale = row.ageMs >= retentionMs;
    row.overflow = false;
    row.prunable = false;
  }
  const pruningBlocked = allRows.some(row => row.referenceUncertain);
  const pruned: any[] = [];
  const skipped: any[] = [];
  if (prune) {
    for (const row of orphanRows.filter(row => row.prunable)) {
      if (pruningBlocked) { skipped.push({ challengeId: row.challengeId, reason: "snapshot_reference_uncertain" }); continue; }
      const result = removeMemoryContextConsumptionRecoveryIfUnreferenced(row.challengeId, options);
      if (result.removed) pruned.push({ challengeId: row.challengeId, recoveryId: row.recoveryId, reason: row.stale ? "retention_expired" : "orphan_overflow", file: row.file });
      else skipped.push({ challengeId: row.challengeId, recoveryId: row.recoveryId, reason: result.reason });
    }
  }
  const groupId = String(options.groupId || options.group_id || "");
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "");
  const taskAgentSessionId = String(options.taskAgentSessionId || options.task_agent_session_id || options.sessionId || options.session_id || "");
  const rows = allRows.filter(row =>
    (!groupId || row.groupId === groupId)
    && (!groupSessionId || row.groupSessionId === groupSessionId)
    && (!taskAgentSessionId || row.taskAgentSessionId === taskAgentSessionId)
  );
  return {
    schema: "ccm-memory-context-consumption-recovery-lifecycle-v1",
    generatedAt: new Date(nowMs).toISOString(),
    directory: RECOVERY_DIR,
    policy: { retentionDays, interruptedAfterMinutes, graceHours, maxOrphanRecoveries: maxOrphans },
    prune,
    reconcileInterrupted,
    pruningBlocked,
    summary: {
      count: rows.length,
      recoveredCount: rows.filter(row => row.status === "recovered" && row.valid).length,
      blockedCount: rows.filter(row => row.status === "blocked").length,
      runningCount: rows.filter(row => ["prepared", "running"].includes(row.status)).length,
      invalidCount: rows.filter(row => !row.valid).length,
      replaySuppressedCount: rows.filter(row => row.suppressTaskReplay).length,
      referencedCount: rows.filter(row => row.referenced).length,
      orphanCount: rows.filter(row => row.orphan).length,
      staleOrphanCount: rows.filter(row => row.orphan && row.stale).length,
      overflowOrphanCount: rows.filter(row => row.orphan && row.overflow).length,
      interruptedCount: rows.filter(row => row.status === "interrupted").length,
      interruptedCandidateCount: rows.filter(row => row.interruptedCandidate).length,
      interruptedReceiptUncommittedCount: rows.filter(row => row.issues.includes("interrupted_receipt_present_without_continuation_commit")).length,
      prunableCount: rows.filter(row => row.prunable).length,
      prunedCount: pruned.length,
      skippedCount: skipped.length,
      unexpectedFileCount: unexpectedFiles.length,
    },
    rows: rows.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 120),
    prunableRows: rows.filter(row => row.prunable),
    pruned,
    skipped,
    unexpectedFiles: unexpectedFiles.slice(0, 40),
  };
}

export function buildMemoryContextConsumptionRecoveryInventory(options: any = {}) {
  return reconcileMemoryContextConsumptionRecoveries({ ...options, prune: false, reconcileInterrupted: false });
}
