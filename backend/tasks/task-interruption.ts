import * as crypto from "crypto";
import { clearTaskCancellation, requestTaskCancellation } from "../agents/execution-kernel";
import { listTaskAgentSessions, reopenTaskAgentSessions } from "./agent-sessions-resume";
import { suspendTaskAgentSessions } from "./agent-sessions-purge";

export type TaskInterruptionReason =
  | "user_interrupt"
  | "temporary_network"
  | "provider_overload"
  | "provider_unavailable"
  | "model_stream_interrupted"
  | "agent_runtime_unavailable"
  | "service_restart"
  | "lease_lost"
  | "service_draining"
  | "unknown";

export type TaskResumeCheckpointV1 = {
  phase: string;
  workItemId?: string;
  reviewRound?: number;
  planChecksum: string;
  workspaceChecksum?: string;
  completedWorkItemIds: string[];
  summaryPending?: boolean;
};

export type TaskRecoveryScheduleV1 = {
  mode: "safe_auto" | "manual";
  state: "waiting_provider" | "waiting_agent" | "validating" | "queued" | "needs_user";
  attempt: number;
  maxAttempts: number;
  nextRetryAt?: string;
};

export const TASK_RECOVERY_BACKOFF_MS = [30_000, 120_000, 300_000] as const;

export type TaskInterruptionReceiptV1 = {
  schema: "ccm-task-interruption-receipt-v1";
  version: 1;
  receipt_id: string;
  task_id: string;
  reason_code: TaskInterruptionReason;
  reason: string;
  actor: string;
  checkpoint: string;
  resume_checkpoint?: TaskResumeCheckpointV1;
  recovery?: TaskRecoveryScheduleV1;
  execution_attempt: number;
  workspace_checksum: string;
  task_agent_sessions: Array<{
    task_agent_session_id: string;
    native_session_id: string;
    agent_type: string;
    project: string;
    resume_mode: string;
    turn_count: number;
  }>;
  side_effect_state: "none" | "committed" | "uncertain";
  recoverable: boolean;
  auto_resume_allowed: boolean;
  interrupted_at: string;
  checksum: string;
};

export type TaskRecoveryDecisionV1 = {
  schema: "ccm-task-recovery-decision-v1";
  version: 1;
  task_id: string;
  mode: "auto" | "manual" | "reject";
  reason_code: string;
  reason: string;
  checks: Record<string, boolean>;
  decided_at: string;
  checksum: string;
};

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function receiptChecksum(receipt: Omit<TaskInterruptionReceiptV1, "checksum">) {
  return checksum(receipt);
}

function recoveryChecksum(receipt: Omit<TaskRecoveryDecisionV1, "checksum">) {
  return checksum(receipt);
}

function sessionProjection(taskId: string) {
  return listTaskAgentSessions({ taskId }).map((session: any) => ({
    task_agent_session_id: String(session.id || ""),
    native_session_id: String(session.nativeSessionId || ""),
    agent_type: String(session.agentType || ""),
    project: String(session.project || ""),
    resume_mode: String(session.resumeMode || "scratchpad"),
    turn_count: Math.max(0, Number(session.turnCount || 0)),
  }));
}

function transientReason(reason: TaskInterruptionReason) {
  return [
    "temporary_network",
    "provider_overload",
    "provider_unavailable",
    "model_stream_interrupted",
    "agent_runtime_unavailable",
    "service_restart",
    "lease_lost",
  ].includes(reason);
}

function recoveryWaitingState(reason: TaskInterruptionReason): TaskRecoveryScheduleV1["state"] {
  return reason === "agent_runtime_unavailable" ? "waiting_agent" : "waiting_provider";
}

export function buildTaskRecoverySchedule(input: {
  reasonCode: TaskInterruptionReason;
  attempt?: number;
  autoResumeAllowed?: boolean;
  now?: number;
}): TaskRecoveryScheduleV1 {
  const attempt = Math.max(0, Math.min(TASK_RECOVERY_BACKOFF_MS.length, Number(input.attempt || 0)));
  const safeAuto = input.autoResumeAllowed === true && attempt < TASK_RECOVERY_BACKOFF_MS.length;
  return {
    mode: safeAuto ? "safe_auto" : "manual",
    state: safeAuto ? recoveryWaitingState(input.reasonCode) : "needs_user",
    attempt,
    maxAttempts: TASK_RECOVERY_BACKOFF_MS.length,
    ...(safeAuto ? { nextRetryAt: new Date((input.now ?? Date.now()) + TASK_RECOVERY_BACKOFF_MS[attempt]).toISOString() } : {}),
  };
}

export function buildTaskInterruptionReceipt(input: {
  task: any;
  reasonCode?: TaskInterruptionReason;
  reason?: string;
  actor?: string;
  checkpoint?: string;
  sideEffectState?: "none" | "committed" | "uncertain";
  workspaceChecksum?: string;
  resumeCheckpoint?: TaskResumeCheckpointV1;
  recovery?: TaskRecoveryScheduleV1;
  processTerminationProven?: boolean;
}) {
  const taskId = String(input.task?.id || input.task?.task_id || "").trim();
  if (!taskId) throw new Error("任务中断缺少任务 ID");
  const reasonCode = input.reasonCode || "unknown";
  const sideEffectState = input.sideEffectState || "uncertain";
  const sessions = sessionProjection(taskId);
  const recoveryAttempt = Math.max(0, Number(input.task?.recovery?.attempt || 0));
  const nativeIdentityProven = sessions.every(row => row.resume_mode !== "native" || !!row.native_session_id);
  const recoverable = reasonCode !== "unknown" && input.processTerminationProven !== false;
  const autoResumeAllowed = recoverable
    && transientReason(reasonCode)
    && sideEffectState !== "uncertain"
    && nativeIdentityProven
    && recoveryAttempt < TASK_RECOVERY_BACKOFF_MS.length;
  const raw: Omit<TaskInterruptionReceiptV1, "checksum"> = {
    schema: "ccm-task-interruption-receipt-v1",
    version: 1,
    receipt_id: `tir_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
    task_id: taskId,
    reason_code: reasonCode,
    reason: String(input.reason || "任务执行已中断").slice(0, 500),
    actor: String(input.actor || "ccm").slice(0, 120),
    checkpoint: String(input.checkpoint || input.task?.acceptance_state || input.task?.status || "unknown").slice(0, 120),
    ...(input.resumeCheckpoint ? { resume_checkpoint: input.resumeCheckpoint } : {}),
    execution_attempt: Math.max(0, Number(input.task?.execution_attempt || input.task?.project_main_execution?.attempt || 0)),
    workspace_checksum: String(input.workspaceChecksum || input.task?.workspace_snapshot_checksum || input.task?.workspace_evidence?.checksum || ""),
    task_agent_sessions: sessions,
    side_effect_state: sideEffectState,
    recoverable,
    auto_resume_allowed: autoResumeAllowed,
    recovery: input.recovery || buildTaskRecoverySchedule({
      reasonCode,
      attempt: recoveryAttempt,
      autoResumeAllowed,
    }),
    interrupted_at: new Date().toISOString(),
  };
  return { ...raw, checksum: receiptChecksum(raw) };
}

export function interruptTaskExecution(input: Parameters<typeof buildTaskInterruptionReceipt>[0]) {
  const taskId = String(input.task?.id || input.task?.task_id || "").trim();
  const reason = String(input.reason || "任务执行已中断");
  const cancellation = requestTaskCancellation(taskId, reason, String(input.actor || "ccm-interruption"));
  const suspendedSessions = suspendTaskAgentSessions({ taskId }, reason);
  const receipt = buildTaskInterruptionReceipt({
    ...input,
    processTerminationProven: cancellation.killedProcesses >= 0 && cancellation.externalRunnerRequests >= 0,
  });
  return { receipt, cancellation, suspendedSessions };
}

export function buildTaskRecoveryDecision(task: any, receiptInput?: TaskInterruptionReceiptV1 | null, options: {
  userRequested?: boolean;
  workspaceChecksum?: string;
  authorizationValid?: boolean;
  runtimeValid?: boolean;
} = {}): TaskRecoveryDecisionV1 {
  const receipt = receiptInput || task?.interruption_receipt || null;
  const taskId = String(task?.id || receipt?.task_id || "");
  const checks = {
    receipt_valid: !!receipt && receipt.schema === "ccm-task-interruption-receipt-v1" && receipt.task_id === taskId && receipt.checksum === receiptChecksum(({ ...receipt, checksum: undefined } as any)),
    task_recoverable: receipt?.recoverable === true,
    side_effect_known: receipt?.side_effect_state !== "uncertain",
    workspace_unchanged: !receipt?.workspace_checksum || !options.workspaceChecksum || receipt.workspace_checksum === options.workspaceChecksum,
    authorization_valid: options.authorizationValid !== false,
    runtime_valid: options.runtimeValid !== false,
    native_identity_valid: Array.isArray(receipt?.task_agent_sessions) && receipt.task_agent_sessions.every(row => row.resume_mode !== "native" || !!row.native_session_id),
    checkpoint_valid: !receipt?.resume_checkpoint || (
      !!String(receipt.resume_checkpoint.phase || "").trim()
      && !!String(receipt.resume_checkpoint.planChecksum || "").trim()
      && Array.isArray(receipt.resume_checkpoint.completedWorkItemIds)
    ),
  };
  let mode: TaskRecoveryDecisionV1["mode"] = "reject";
  let reasonCode = "receipt_invalid";
  let reason = "中断回执无效，不能安全恢复。";
  if (checks.receipt_valid && checks.task_recoverable) {
    // An uncertain side effect forbids automatic recovery. The explicit
    // resume action is the user's acknowledgement after inspecting the task
    // card/replay; all objective scope, runtime and identity checks still apply.
    const safetyReady = (checks.side_effect_known || options.userRequested === true)
      && checks.workspace_unchanged
      && checks.authorization_valid
      && checks.runtime_valid
      && checks.native_identity_valid
      && checks.checkpoint_valid;
    if (!safetyReady) {
      mode = "manual";
      reasonCode = "safety_revalidation_required";
      reason = "源码、权限、运行时、原生会话或副作用状态需要用户确认。";
    } else if (options.userRequested || receipt?.auto_resume_allowed) {
      mode = options.userRequested ? "auto" : "auto";
      reasonCode = options.userRequested ? "user_confirmed_resume" : "safe_automatic_resume";
      reason = "中断证据完整，可以沿用原任务和子 Agent 会话继续。";
    } else {
      mode = "manual";
      reasonCode = "user_confirmation_required";
      reason = "该中断需要用户明确恢复。";
    }
  }
  const raw: Omit<TaskRecoveryDecisionV1, "checksum"> = {
    schema: "ccm-task-recovery-decision-v1",
    version: 1,
    task_id: taskId,
    mode,
    reason_code: reasonCode,
    reason,
    checks,
    decided_at: new Date().toISOString(),
  };
  return { ...raw, checksum: recoveryChecksum(raw) };
}

export function resumeInterruptedTaskExecution(task: any, options: Parameters<typeof buildTaskRecoveryDecision>[2] = {}) {
  const decision = buildTaskRecoveryDecision(task, task?.interruption_receipt || null, { ...options, userRequested: options.userRequested === true });
  if (decision.mode !== "auto") return { resumed: false, decision, reopenedSessions: [] };
  const taskId = String(task?.id || "");
  clearTaskCancellation(taskId);
  const reopenedSessions = reopenTaskAgentSessions(taskId, "中断恢复：继续原任务和原生 Agent 会话");
  return { resumed: true, decision, reopenedSessions };
}
