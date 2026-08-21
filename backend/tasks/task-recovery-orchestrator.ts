import * as crypto from "crypto";
import * as fs from "fs";
import { getTaskById, updateTaskByIdCas } from "../core/db";
import { getWorkDirForProject, parseGitStatus } from "../core/utils";
import { listActiveAgentRuns, listExecutions, clearTaskCancellation, requestTaskCancellation } from "../agents/execution-kernel";
import { getAgentRuntime } from "../agents/runtime";
import { captureRepoStateIdentity, repoStateFingerprint } from "../system/unified-evidence-registry";
import {
  acquireIdempotency,
  acquireTaskLease,
  completeIdempotency,
  failIdempotency,
  releaseTaskLease,
} from "../system/reliability-ledger";
import {
  activateTaskAgentSessionsForRecovery,
  listTaskAgentSessions,
} from "./agent-sessions-resume";
import { suspendTaskAgentSessions } from "./agent-sessions-purge";
import { buildTaskRecoveryDecision } from "./task-interruption";
import { resolveTaskUserSession, resolveTaskAgentSessionProjection } from "./task-recovery-sessions";
import { buildTaskContextCapsule } from "./task-context";

export type CcmTaskRecoveryMode = "native_session" | "rehydrated_attempt" | "manual_reconciliation" | "rejected";

export type CcmTaskRecoveryPreflightV1 = {
  schema: "ccm-task-recovery-preflight-v1";
  taskId: string;
  scope: "global" | "group" | "project";
  exactSessionId: string;
  previousAttempt: number;
  nextAttempt: number;
  recoveryMode: CcmTaskRecoveryMode;
  checks: {
    authorizationValid: boolean;
    runtimeValid: boolean;
    providerContractValid: boolean;
    planChecksumValid: boolean;
    dispatchContractValid: boolean;
    workspaceManifestValid: boolean;
    worktreeOwnershipValid: boolean;
    previousProcessTerminated: boolean;
    sideEffectsReconciled: boolean;
    toolPairsReconciled: boolean;
  };
  completedWorkItemIds: string[];
  unresolvedToolCallIds: string[];
  changedFileCount: number;
  blockers: string[];
  checksum: string;
  contentStored: false;
};

export type CcmTaskRecoveryTransactionV1 = {
  schema: "ccm-task-recovery-transaction-v1";
  transactionId: string;
  status: "validating" | "committed" | "rolled_back";
  taskId: string;
  generation: number;
  previousAttempt: number;
  nextAttempt: number;
  leaseId: string;
  exactSessionId: string;
  workspaceManifestChecksum: string;
  planChecksum: string;
  contractChecksum: string;
  preflightChecksum: string;
  idempotencyKey: string;
  startedAt: string;
  completedAt?: string;
  failureReason?: string;
  checksum: string;
  contentStored: false;
};

type RecoveryOptions = {
  scope: "global" | "group" | "project";
  exactSessionId: string;
  scopeId?: string;
  idempotencyKey?: string;
  authorizationValid: boolean;
  runtimeValid?: boolean;
  currentWorkspaceChecksum?: string;
  worktreeOwnershipValid?: boolean;
  previousProcessTerminated?: boolean;
  unresolvedToolCallIds?: string[];
  completedWorkItemIds?: string[];
  changedFileCount?: number;
  enqueue?: (taskId: string, task: any) => any;
  resolveUserSession?: boolean;
};

function digest(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function unique(values: any, max = 200) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || "").trim()).filter(Boolean))].slice(0, max);
}

function taskAttempt(task: any) {
  return Math.max(0, Number(task?.execution_attempt || task?.project_main_execution?.attempt || task?.attempt || 0));
}

function taskPlanChecksum(task: any) {
  return String(
    task?.resume_checkpoint?.planChecksum
    || task?.workflow_meta?.project_main_plan?.checksum
    || task?.workflow_meta?.presentedPlan?.checksum
    || task?.plan_checksum
    || "",
  );
}

function taskContractChecksum(task: any) {
  return String(
    task?.plan_dispatch_contract?.contractChecksum
    || task?.workflow_meta?.plan_dispatch_contract?.contractChecksum
    || task?.contract_checksum
    || "",
  );
}

function taskDeclaredFiles(task: any) {
  const rows = [
    ...(Array.isArray(task?.file_changes) ? task.file_changes : []),
    ...(Array.isArray(task?.fileChanges) ? task.fileChanges : []),
    ...(Array.isArray(task?.worker_outputs) ? task.worker_outputs.flatMap((item: any) => item?.fileChanges?.files || item?.fileChanges || []) : []),
  ];
  return unique(rows.map((item: any) => item?.path || item?.file || item), 500);
}

export function captureTaskRecoveryWorkspace(task: any) {
  const explicit = String(
    task?.execution_workspace?.worktree_path
    || task?.execution_workspace?.workDir
    || task?.worktree_path
    || task?.workDir
    || task?.work_dir
    || "",
  ).trim();
  const configured = String(getWorkDirForProject(String(task?.target_project || task?.project || "")) || "").trim();
  const workDir = explicit || configured;
  if (!workDir || !fs.existsSync(workDir)) return { workDir: "", checksum: "", ownershipValid: false, changedFileCount: taskDeclaredFiles(task).length };
  try {
    const declaredFiles = unique([
      ...taskDeclaredFiles(task),
      ...parseGitStatus(workDir).map((row: any) => row?.path || row?.filePath || ""),
    ], 1_000);
    const checksum = repoStateFingerprint(captureRepoStateIdentity(workDir, declaredFiles));
    return { workDir, checksum, ownershipValid: true, changedFileCount: declaredFiles.length };
  } catch {
    return { workDir, checksum: "", ownershipValid: false, changedFileCount: taskDeclaredFiles(task).length };
  }
}

function unresolvedToolCalls(task: any) {
  const events = [
    ...(Array.isArray(task?.workEvents) ? task.workEvents : []),
    ...(Array.isArray(task?.work_events) ? task.work_events : []),
    ...listExecutions({ taskId: String(task?.id || "") }).flatMap((record: any) => record?.events || []),
  ];
  const opened = new Set<string>();
  const settled = new Set<string>();
  for (const event of events) {
    const id = String(event?.toolCallId || event?.tool_call_id || event?.data?.toolCallId || event?.data?.tool_call_id || "").trim();
    if (!id) continue;
    const kind = String(event?.eventType || event?.event_type || event?.name || event?.type || "").toLowerCase();
    if (/tool_(?:started|use|called)|tool\.started|tool_use/.test(kind)) opened.add(id);
    if (/tool_(?:completed|failed|result)|tool\.(?:completed|failed)|tool_result/.test(kind)) settled.add(id);
  }
  return [...opened].filter(id => !settled.has(id));
}

function providerRecoveryCapability(taskId: string) {
  const sessions = listTaskAgentSessions({ taskId });
  if (!sessions.length) return { nativeReady: false, providerContractValid: true, runtimeValid: true };
  let nativeReady = true;
  let providerContractValid = true;
  let runtimeValid = true;
  for (const session of sessions) {
    const runtime = getAgentRuntime(session.agentType);
    runtimeValid = runtimeValid && !!runtime;
    const contractCompatible = !session.pendingProviderContractId
      || (!!session.providerContractId && session.pendingProviderContractId === session.providerContractId);
    providerContractValid = providerContractValid && contractCompatible;
    nativeReady = nativeReady
      && session.resumeMode === "native"
      && runtime.capabilities.sessionResume === true
      && !!String(session.nativeSessionId || "").trim()
      && contractCompatible;
  }
  return { nativeReady, providerContractValid, runtimeValid };
}

export function buildTaskRecoveryPreflight(task: any, options: RecoveryOptions): CcmTaskRecoveryPreflightV1 {
  const receipt = task?.interruption_receipt || null;
  const taskId = String(task?.id || "");
  const workspace = captureTaskRecoveryWorkspace(task);
  const currentWorkspaceChecksum = String(options.currentWorkspaceChecksum || workspace.checksum || "");
  const currentPlanChecksum = taskPlanChecksum(task);
  const currentContractChecksum = taskContractChecksum(task);
  const unresolved = unique(options.unresolvedToolCallIds || unresolvedToolCalls(task));
  const completed = unique(options.completedWorkItemIds || receipt?.completed_work_item_ids || task?.resume_checkpoint?.completedWorkItemIds || []);
  const capability = providerRecoveryCapability(taskId);
  const activeRuns = listActiveAgentRuns({ taskId });
  const activeExecutions = listExecutions({ taskId }).filter((record: any) => !["succeeded", "failed", "cancelled"].includes(String(record?.state || "")));
  const previousProcessTerminated = options.previousProcessTerminated !== false
    && receipt?.process_termination_proven !== false
    && activeRuns.length === 0
    && activeExecutions.length === 0;
  const workspaceManifestValid = !!receipt?.workspace_checksum
    && !!currentWorkspaceChecksum
    && String(receipt.workspace_checksum) === currentWorkspaceChecksum;
  const planChecksumValid = !receipt?.plan_checksum || (!!currentPlanChecksum && receipt.plan_checksum === currentPlanChecksum);
  const dispatchContractValid = !receipt?.contract_checksum || (!!currentContractChecksum && receipt.contract_checksum === currentContractChecksum);
  const sideEffectsReconciled = receipt?.side_effect_state !== "uncertain" || (workspaceManifestValid && unresolved.length === 0);
  const toolPairsReconciled = unresolved.length === 0;
  const checks = {
    authorizationValid: options.authorizationValid === true,
    runtimeValid: options.runtimeValid !== false && capability.runtimeValid,
    providerContractValid: capability.providerContractValid,
    planChecksumValid,
    dispatchContractValid,
    workspaceManifestValid,
    worktreeOwnershipValid: options.worktreeOwnershipValid !== false && workspace.ownershipValid,
    previousProcessTerminated,
    sideEffectsReconciled,
    toolPairsReconciled,
  };
  const blockers: string[] = [];
  if (!checks.authorizationValid) blockers.push("authorization_invalid");
  if (!checks.runtimeValid) blockers.push("runtime_invalid");
  if (!checks.providerContractValid) blockers.push("provider_contract_drift");
  if (!checks.planChecksumValid) blockers.push("plan_checksum_drift");
  if (!checks.dispatchContractValid) blockers.push("dispatch_contract_drift");
  if (!checks.workspaceManifestValid) blockers.push(!receipt?.workspace_checksum || !currentWorkspaceChecksum ? "workspace_manifest_unavailable" : "workspace_manifest_drift");
  if (!checks.worktreeOwnershipValid) blockers.push("worktree_ownership_invalid");
  if (!checks.previousProcessTerminated) blockers.push("previous_process_still_running");
  if (!checks.sideEffectsReconciled) blockers.push("side_effects_unresolved");
  if (!checks.toolPairsReconciled) blockers.push("tool_pairs_unresolved");
  const fatalBlocker = blockers.some(code => [
    "authorization_invalid",
    "runtime_invalid",
    "provider_contract_drift",
    "plan_checksum_drift",
    "dispatch_contract_drift",
    "workspace_manifest_unavailable",
    "worktree_ownership_invalid",
    "previous_process_still_running",
  ].includes(code));
  let recoveryMode: CcmTaskRecoveryMode = blockers.length
    ? fatalBlocker ? "rejected" : "manual_reconciliation"
    : capability.nativeReady ? "native_session" : "rehydrated_attempt";
  if (!receipt || receipt.schema !== "ccm-task-interruption-receipt-v1" || receipt.recoverable !== true) recoveryMode = "rejected";
  const raw = {
    schema: "ccm-task-recovery-preflight-v1" as const,
    taskId,
    scope: options.scope,
    exactSessionId: String(options.exactSessionId || ""),
    previousAttempt: taskAttempt(task),
    nextAttempt: taskAttempt(task) + 1,
    recoveryMode,
    checks,
    completedWorkItemIds: completed,
    unresolvedToolCallIds: unresolved,
    changedFileCount: Math.max(0, Number(options.changedFileCount ?? receipt?.changed_file_count ?? workspace.changedFileCount)),
    blockers: unique(blockers, 40),
    contentStored: false as const,
  };
  return { ...raw, checksum: digest(raw) };
}

function transactionChecksum(transaction: Omit<CcmTaskRecoveryTransactionV1, "checksum">) {
  return digest(transaction);
}

function transactionCore(task: any, preflight: CcmTaskRecoveryPreflightV1, leaseId: string, idempotencyKey: string, status: CcmTaskRecoveryTransactionV1["status"] = "validating") {
  const raw: Omit<CcmTaskRecoveryTransactionV1, "checksum"> = {
    schema: "ccm-task-recovery-transaction-v1",
    transactionId: `rctx_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`,
    status,
    taskId: preflight.taskId,
    generation: Math.max(0, Number(task?.generation || task?.project_session_generation || task?.agent_communication_generation || 0)),
    previousAttempt: preflight.previousAttempt,
    nextAttempt: preflight.nextAttempt,
    leaseId,
    exactSessionId: preflight.exactSessionId,
    workspaceManifestChecksum: String(task?.interruption_receipt?.workspace_checksum || ""),
    planChecksum: String(task?.interruption_receipt?.plan_checksum || taskPlanChecksum(task)),
    contractChecksum: String(task?.interruption_receipt?.contract_checksum || taskContractChecksum(task)),
    preflightChecksum: preflight.checksum,
    idempotencyKey,
    startedAt: new Date().toISOString(),
    contentStored: false,
  };
  return { ...raw, checksum: transactionChecksum(raw) };
}

function finishTransaction(transaction: CcmTaskRecoveryTransactionV1, status: "committed" | "rolled_back", failureReason = "") {
  const raw: Omit<CcmTaskRecoveryTransactionV1, "checksum"> = {
    ...transaction,
    status,
    completedAt: new Date().toISOString(),
    ...(failureReason ? { failureReason: String(failureReason).slice(0, 500) } : {}),
  };
  delete (raw as any).checksum;
  return { ...raw, checksum: transactionChecksum(raw) };
}

export function runTaskRecoveryOrchestrator(taskInput: any, options: RecoveryOptions): any {
  const taskId = String(taskInput?.id || "").trim();
  if (!taskId) throw new Error("恢复任务缺少 taskId");
  const exactSessionId = String(options.exactSessionId || "").trim();
  if (!exactSessionId) throw new Error("恢复任务缺少精确会话 ID");
  const receiptChecksum = String(taskInput?.interruption_receipt?.checksum || "");
  const idempotencyKey = String(options.idempotencyKey || `${taskId}:${receiptChecksum}`).trim();
  const operation = acquireIdempotency({
    scope: "task-recovery",
    key: idempotencyKey,
    traceId: taskInput?.trace_id,
    leaseMs: 90_000,
    retryFailed: true,
    metadata: { task_id: taskId, scope: options.scope, exact_session_id: exactSessionId, content_stored: false },
  });
  if (!operation.acquired) {
    return {
      success: operation.record?.status === "completed" && operation.record?.result?.success === true,
      duplicate: true,
      inProgress: operation.inProgress === true,
      task: getTaskById(taskId),
      result: operation.record?.result || null,
    };
  }
  let transaction: CcmTaskRecoveryTransactionV1 | null = null;
  let leaseAcquired = false;
  try {
    let latest = getTaskById(taskId);
    if (!latest || String(latest?.interruption_receipt?.checksum || "") !== receiptChecksum) throw new Error("任务中断现场已经变化，请刷新后重试");
    if (latest?.recovery_transaction?.status === "committed" && latest?.recovery_pending !== true) {
      throw new Error("当前中断现场已经恢复，不能创建新的恢复 attempt");
    }
    const lease = acquireTaskLease(taskId, operation.traceId, 90_000);
    if (!lease.acquired) throw new Error("另一个执行仍持有任务租约，请稍后再恢复");
    leaseAcquired = true;
    if (latest?.recovery_transaction?.status === "validating") {
      const abandonedTransaction = finishTransaction(
        latest.recovery_transaction,
        "rolled_back",
        "service_restart_during_recovery_validation",
      );
      const recovered = updateTaskByIdCas(taskId,
        current => String(current?.interruption_receipt?.checksum || "") === receiptChecksum
          && String(current?.recovery_transaction?.transactionId || "") === String(latest?.recovery_transaction?.transactionId || "")
          && current?.recovery_transaction?.status === "validating",
        current => ({
          ...current,
          status: "blocked",
          acceptance_state: "recovery_required",
          auto_execute: false,
          paused: true,
          is_paused: true,
          recovery_pending: true,
          recovery_transaction: abandonedTransaction,
          status_detail: "检测到未完成的恢复事务，已安全回滚并重新核对现场",
          updated_at: new Date().toISOString(),
        }),
      );
      if (!recovered.updated) throw new Error("未完成的恢复事务状态已经变化，请刷新后重试");
      latest = recovered.task;
    }
    const preflight = buildTaskRecoveryPreflight(latest, options);
    if (preflight.recoveryMode === "manual_reconciliation" || preflight.recoveryMode === "rejected") {
      const blocked = updateTaskByIdCas(taskId,
        current => String(current?.interruption_receipt?.checksum || "") === receiptChecksum,
        current => ({
          ...current,
          status: "blocked",
          acceptance_state: "recovery_required",
          recovery_pending: true,
          recovery_preflight: preflight,
          status_detail: preflight.recoveryMode === "manual_reconciliation" ? "恢复前需要核对中断现场" : "恢复安全检查未通过",
          updated_at: new Date().toISOString(),
        }),
      );
      const result = { success: false, manualReconciliationRequired: preflight.recoveryMode === "manual_reconciliation", preflight, task: blocked.task || latest };
      failIdempotency("task-recovery", idempotencyKey, new Error(`recovery_preflight_blocked:${preflight.blockers.join(",")}`));
      releaseTaskLease(taskId, "recovery_preflight_blocked");
      leaseAcquired = false;
      return result;
    }
    const decision = buildTaskRecoveryDecision(latest, latest.interruption_receipt, {
      userRequested: true,
      workspaceChecksum: String(options.currentWorkspaceChecksum || captureTaskRecoveryWorkspace(latest).checksum || ""),
      authorizationValid: preflight.checks.authorizationValid,
      runtimeValid: preflight.checks.runtimeValid,
    });
    if (decision.mode !== "auto") throw new Error(decision.reason);
    transaction = transactionCore(latest, preflight, String(lease.lease?.lease_id || ""), idempotencyKey);
    const staged = updateTaskByIdCas(taskId,
      current => String(current?.interruption_receipt?.checksum || "") === receiptChecksum
        && !["validating", "committed"].includes(String(current?.recovery_transaction?.status || "")),
      current => {
        const next = {
          ...current,
          status: "blocked",
          acceptance_state: "recovery_validating",
          recovery_pending: true,
          recovery_preflight: preflight,
          recovery_transaction: transaction,
          status_detail: "正在核对中断现场并恢复执行",
          updated_at: new Date().toISOString(),
        };
        return next;
      },
    );
    if (!staged.updated) throw new Error("任务状态已经变化，恢复事务未能锁定");
    const userSession: any = options.resolveUserSession !== true
      ? { mode: "original_reused", originalSessionId: exactSessionId, activeSessionId: exactSessionId, created: false }
      : resolveTaskUserSession(staged.task || latest, { attempt: preflight.nextAttempt, expectedContextChecksum: String(staged.task?.task_context?.checksum || latest?.task_context?.checksum || "") });
    if (userSession.mode === "rejected" || !userSession.activeSessionId) throw new Error(userSession.error || `无法确定任务恢复会话 (${String(options.resolveUserSession)}:${String(userSession.reason || "unknown")})`);
    const activation = activateTaskAgentSessionsForRecovery(taskId, "中断恢复：已通过现场预检");
    const agentSessions = (Array.isArray(latest?.work_items) ? latest.work_items : [])
      .filter((item: any) => item?.completed !== true && String(item?.status || "").toLowerCase() !== "done")
      .slice(0, 100)
      .map((item: any) => resolveTaskAgentSessionProjection(latest, item, preflight.nextAttempt, activation.mode === "native_session" ? "native_session" : "rehydrated_session"));
    clearTaskCancellation(taskId);
    const committedTransaction = finishTransaction(transaction, "committed");
    const committed = updateTaskByIdCas(taskId,
      current => String(current?.recovery_transaction?.transactionId || "") === transaction?.transactionId,
      current => {
        const next = {
          ...current,
        status: "pending",
        acceptance_state: current.interruption_receipt?.checkpoint || "planned",
        auto_execute: true,
        is_paused: false,
        paused: false,
        recovery_pending: false,
        recovery_decision: decision,
        recovery_preflight: { ...preflight, recoveryMode: activation.mode },
        recovery_transaction: committedTransaction,
        execution_session_id: userSession.activeSessionId,
        active_execution_session_id: userSession.activeSessionId,
        recovery_user_session: { mode: userSession.mode, originalSessionId: userSession.originalSessionId || exactSessionId, activeSessionId: userSession.activeSessionId, created: userSession.created === true, contentStored: false },
        recovery_agent_sessions: agentSessions,
        execution_attempt: preflight.nextAttempt,
        resumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status_detail: activation.mode === "native_session"
          ? `第 ${preflight.nextAttempt} 次执行 · 已恢复原生 Agent 会话`
          : `第 ${preflight.nextAttempt} 次执行 · 已从签名工作单重建现场`,
        };
        const context = buildTaskContextCapsule(next, current?.task_context || null, "recovery_committed");
        return { ...next, task_context: context, task_context_revision_receipt: { revision: context.revision, checksum: context.checksum, reason: "recovery_committed", at: context.updatedAt, contentStored: false } };
      },
    );
    if (!committed.updated) throw new Error("恢复事务提交冲突");
    let queueResult: any = null;
    if (options.enqueue) {
      queueResult = options.enqueue(taskId, committed.task);
      if (queueResult?.success === false || queueResult?.queued === false) throw new Error(queueResult?.error || queueResult?.message || "恢复任务入队失败");
    }
    completeIdempotency("task-recovery", idempotencyKey, {
      success: true,
      task_id: taskId,
      next_attempt: preflight.nextAttempt,
      recovery_mode: activation.mode,
      transaction_checksum: committedTransaction.checksum,
      preflight_checksum: preflight.checksum,
    });
    return { success: true, duplicate: false, task: committed.task, userSession, agentSessions, preflight: { ...preflight, recoveryMode: activation.mode }, transaction: committedTransaction, activation, queueResult, decision };
  } catch (error: any) {
    if (transaction) {
      const rolledBack = finishTransaction(transaction, "rolled_back", error?.message || error);
      updateTaskByIdCas(taskId,
        current => String(current?.recovery_transaction?.transactionId || "") === transaction?.transactionId,
        current => ({
          ...current,
          status: "blocked",
          acceptance_state: "recovery_required",
          auto_execute: false,
          paused: true,
          is_paused: true,
          recovery_pending: true,
          recovery_transaction: rolledBack,
          status_detail: `恢复未提交：${String(error?.message || error).slice(0, 300)}`,
          updated_at: new Date().toISOString(),
        }),
      );
      suspendTaskAgentSessions({ taskId }, "恢复事务回滚");
      requestTaskCancellation(taskId, "恢复事务未提交", "task-recovery-orchestrator");
    }
    if (leaseAcquired) releaseTaskLease(taskId, "recovery_rolled_back");
    try { failIdempotency("task-recovery", idempotencyKey, error); } catch {}
    throw error;
  }
}
