"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureTaskRecoveryWorkspace = captureTaskRecoveryWorkspace;
exports.buildTaskRecoveryPreflight = buildTaskRecoveryPreflight;
exports.runTaskRecoveryOrchestrator = runTaskRecoveryOrchestrator;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const db_1 = require("../core/db");
const utils_1 = require("../core/utils");
const execution_kernel_1 = require("../agents/execution-kernel");
const runtime_1 = require("../agents/runtime");
const unified_evidence_registry_1 = require("../system/unified-evidence-registry");
const reliability_ledger_1 = require("../system/reliability-ledger");
const agent_sessions_resume_1 = require("./agent-sessions-resume");
const agent_sessions_purge_1 = require("./agent-sessions-purge");
const task_interruption_1 = require("./task-interruption");
const task_recovery_sessions_1 = require("./task-recovery-sessions");
const task_context_1 = require("./task-context");
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function unique(values, max = 200) {
    return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || "").trim()).filter(Boolean))].slice(0, max);
}
function taskAttempt(task) {
    return Math.max(0, Number(task?.execution_attempt || task?.project_main_execution?.attempt || task?.attempt || 0));
}
function taskPlanChecksum(task) {
    return String(task?.resume_checkpoint?.planChecksum
        || task?.workflow_meta?.project_main_plan?.checksum
        || task?.workflow_meta?.presentedPlan?.checksum
        || task?.plan_checksum
        || "");
}
function taskContractChecksum(task) {
    return String(task?.plan_dispatch_contract?.contractChecksum
        || task?.workflow_meta?.plan_dispatch_contract?.contractChecksum
        || task?.contract_checksum
        || "");
}
function taskDeclaredFiles(task) {
    const rows = [
        ...(Array.isArray(task?.file_changes) ? task.file_changes : []),
        ...(Array.isArray(task?.fileChanges) ? task.fileChanges : []),
        ...(Array.isArray(task?.worker_outputs) ? task.worker_outputs.flatMap((item) => item?.fileChanges?.files || item?.fileChanges || []) : []),
    ];
    return unique(rows.map((item) => item?.path || item?.file || item), 500);
}
function captureTaskRecoveryWorkspace(task) {
    const explicit = String(task?.execution_workspace?.worktree_path
        || task?.execution_workspace?.workDir
        || task?.worktree_path
        || task?.workDir
        || task?.work_dir
        || "").trim();
    const configured = String((0, utils_1.getWorkDirForProject)(String(task?.target_project || task?.project || "")) || "").trim();
    const workDir = explicit || configured;
    if (!workDir || !fs.existsSync(workDir))
        return { workDir: "", checksum: "", ownershipValid: false, changedFileCount: taskDeclaredFiles(task).length };
    try {
        const declaredFiles = unique([
            ...taskDeclaredFiles(task),
            ...(0, utils_1.parseGitStatus)(workDir).map((row) => row?.path || row?.filePath || ""),
        ], 1_000);
        const checksum = (0, unified_evidence_registry_1.repoStateFingerprint)((0, unified_evidence_registry_1.captureRepoStateIdentity)(workDir, declaredFiles));
        return { workDir, checksum, ownershipValid: true, changedFileCount: declaredFiles.length };
    }
    catch {
        return { workDir, checksum: "", ownershipValid: false, changedFileCount: taskDeclaredFiles(task).length };
    }
}
function unresolvedToolCalls(task) {
    const events = [
        ...(Array.isArray(task?.workEvents) ? task.workEvents : []),
        ...(Array.isArray(task?.work_events) ? task.work_events : []),
        ...(0, execution_kernel_1.listExecutions)({ taskId: String(task?.id || "") }).flatMap((record) => record?.events || []),
    ];
    const opened = new Set();
    const settled = new Set();
    for (const event of events) {
        const id = String(event?.toolCallId || event?.tool_call_id || event?.data?.toolCallId || event?.data?.tool_call_id || "").trim();
        if (!id)
            continue;
        const kind = String(event?.eventType || event?.event_type || event?.name || event?.type || "").toLowerCase();
        if (/tool_(?:started|use|called)|tool\.started|tool_use/.test(kind))
            opened.add(id);
        if (/tool_(?:completed|failed|result)|tool\.(?:completed|failed)|tool_result/.test(kind))
            settled.add(id);
    }
    return [...opened].filter(id => !settled.has(id));
}
function providerRecoveryCapability(taskId) {
    const sessions = (0, agent_sessions_resume_1.listTaskAgentSessions)({ taskId });
    if (!sessions.length)
        return { nativeReady: false, providerContractValid: true, runtimeValid: true };
    let nativeReady = true;
    let providerContractValid = true;
    let runtimeValid = true;
    for (const session of sessions) {
        const runtime = (0, runtime_1.getAgentRuntime)(session.agentType);
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
function buildTaskRecoveryPreflight(task, options) {
    const receipt = task?.interruption_receipt || null;
    const taskId = String(task?.id || "");
    const workspace = captureTaskRecoveryWorkspace(task);
    const currentWorkspaceChecksum = String(options.currentWorkspaceChecksum || workspace.checksum || "");
    const currentPlanChecksum = taskPlanChecksum(task);
    const currentContractChecksum = taskContractChecksum(task);
    const unresolved = unique(options.unresolvedToolCallIds || unresolvedToolCalls(task));
    const completed = unique(options.completedWorkItemIds || receipt?.completed_work_item_ids || task?.resume_checkpoint?.completedWorkItemIds || []);
    const capability = providerRecoveryCapability(taskId);
    const activeRuns = (0, execution_kernel_1.listActiveAgentRuns)({ taskId });
    const activeExecutions = (0, execution_kernel_1.listExecutions)({ taskId }).filter((record) => !["succeeded", "failed", "cancelled"].includes(String(record?.state || "")));
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
    const blockers = [];
    if (!checks.authorizationValid)
        blockers.push("authorization_invalid");
    if (!checks.runtimeValid)
        blockers.push("runtime_invalid");
    if (!checks.providerContractValid)
        blockers.push("provider_contract_drift");
    if (!checks.planChecksumValid)
        blockers.push("plan_checksum_drift");
    if (!checks.dispatchContractValid)
        blockers.push("dispatch_contract_drift");
    if (!checks.workspaceManifestValid)
        blockers.push(!receipt?.workspace_checksum || !currentWorkspaceChecksum ? "workspace_manifest_unavailable" : "workspace_manifest_drift");
    if (!checks.worktreeOwnershipValid)
        blockers.push("worktree_ownership_invalid");
    if (!checks.previousProcessTerminated)
        blockers.push("previous_process_still_running");
    if (!checks.sideEffectsReconciled)
        blockers.push("side_effects_unresolved");
    if (!checks.toolPairsReconciled)
        blockers.push("tool_pairs_unresolved");
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
    let recoveryMode = blockers.length
        ? fatalBlocker ? "rejected" : "manual_reconciliation"
        : capability.nativeReady ? "native_session" : "rehydrated_attempt";
    if (!receipt || receipt.schema !== "ccm-task-interruption-receipt-v1" || receipt.recoverable !== true)
        recoveryMode = "rejected";
    const raw = {
        schema: "ccm-task-recovery-preflight-v1",
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
        contentStored: false,
    };
    return { ...raw, checksum: digest(raw) };
}
function transactionChecksum(transaction) {
    return digest(transaction);
}
function transactionCore(task, preflight, leaseId, idempotencyKey, status = "validating") {
    const raw = {
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
function finishTransaction(transaction, status, failureReason = "") {
    const raw = {
        ...transaction,
        status,
        completedAt: new Date().toISOString(),
        ...(failureReason ? { failureReason: String(failureReason).slice(0, 500) } : {}),
    };
    delete raw.checksum;
    return { ...raw, checksum: transactionChecksum(raw) };
}
function runTaskRecoveryOrchestrator(taskInput, options) {
    const taskId = String(taskInput?.id || "").trim();
    if (!taskId)
        throw new Error("恢复任务缺少 taskId");
    const exactSessionId = String(options.exactSessionId || "").trim();
    if (!exactSessionId)
        throw new Error("恢复任务缺少精确会话 ID");
    const receiptChecksum = String(taskInput?.interruption_receipt?.checksum || "");
    const idempotencyKey = String(options.idempotencyKey || `${taskId}:${receiptChecksum}`).trim();
    const operation = (0, reliability_ledger_1.acquireIdempotency)({
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
            task: (0, db_1.getTaskById)(taskId),
            result: operation.record?.result || null,
        };
    }
    let transaction = null;
    let leaseAcquired = false;
    try {
        let latest = (0, db_1.getTaskById)(taskId);
        if (!latest || String(latest?.interruption_receipt?.checksum || "") !== receiptChecksum)
            throw new Error("任务中断现场已经变化，请刷新后重试");
        if (latest?.recovery_transaction?.status === "committed" && latest?.recovery_pending !== true) {
            throw new Error("当前中断现场已经恢复，不能创建新的恢复 attempt");
        }
        const lease = (0, reliability_ledger_1.acquireTaskLease)(taskId, operation.traceId, 90_000);
        if (!lease.acquired)
            throw new Error("另一个执行仍持有任务租约，请稍后再恢复");
        leaseAcquired = true;
        if (latest?.recovery_transaction?.status === "validating") {
            const abandonedTransaction = finishTransaction(latest.recovery_transaction, "rolled_back", "service_restart_during_recovery_validation");
            const recovered = (0, db_1.updateTaskByIdCas)(taskId, current => String(current?.interruption_receipt?.checksum || "") === receiptChecksum
                && String(current?.recovery_transaction?.transactionId || "") === String(latest?.recovery_transaction?.transactionId || "")
                && current?.recovery_transaction?.status === "validating", current => ({
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
            }));
            if (!recovered.updated)
                throw new Error("未完成的恢复事务状态已经变化，请刷新后重试");
            latest = recovered.task;
        }
        const preflight = buildTaskRecoveryPreflight(latest, options);
        if (preflight.recoveryMode === "manual_reconciliation" || preflight.recoveryMode === "rejected") {
            const blocked = (0, db_1.updateTaskByIdCas)(taskId, current => String(current?.interruption_receipt?.checksum || "") === receiptChecksum, current => ({
                ...current,
                status: "blocked",
                acceptance_state: "recovery_required",
                recovery_pending: true,
                recovery_preflight: preflight,
                status_detail: preflight.recoveryMode === "manual_reconciliation" ? "恢复前需要核对中断现场" : "恢复安全检查未通过",
                updated_at: new Date().toISOString(),
            }));
            const result = { success: false, manualReconciliationRequired: preflight.recoveryMode === "manual_reconciliation", preflight, task: blocked.task || latest };
            (0, reliability_ledger_1.failIdempotency)("task-recovery", idempotencyKey, new Error(`recovery_preflight_blocked:${preflight.blockers.join(",")}`));
            (0, reliability_ledger_1.releaseTaskLease)(taskId, "recovery_preflight_blocked");
            leaseAcquired = false;
            return result;
        }
        const decision = (0, task_interruption_1.buildTaskRecoveryDecision)(latest, latest.interruption_receipt, {
            userRequested: true,
            workspaceChecksum: String(options.currentWorkspaceChecksum || captureTaskRecoveryWorkspace(latest).checksum || ""),
            authorizationValid: preflight.checks.authorizationValid,
            runtimeValid: preflight.checks.runtimeValid,
        });
        if (decision.mode !== "auto")
            throw new Error(decision.reason);
        transaction = transactionCore(latest, preflight, String(lease.lease?.lease_id || ""), idempotencyKey);
        const staged = (0, db_1.updateTaskByIdCas)(taskId, current => String(current?.interruption_receipt?.checksum || "") === receiptChecksum
            && !["validating", "committed"].includes(String(current?.recovery_transaction?.status || "")), current => {
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
        });
        if (!staged.updated)
            throw new Error("任务状态已经变化，恢复事务未能锁定");
        const userSession = options.resolveUserSession !== true
            ? { mode: "original_reused", originalSessionId: exactSessionId, activeSessionId: exactSessionId, created: false }
            : (0, task_recovery_sessions_1.resolveTaskUserSession)(staged.task || latest, { attempt: preflight.nextAttempt, expectedContextChecksum: String(staged.task?.task_context?.checksum || latest?.task_context?.checksum || "") });
        if (userSession.mode === "rejected" || !userSession.activeSessionId)
            throw new Error(userSession.error || `无法确定任务恢复会话 (${String(options.resolveUserSession)}:${String(userSession.reason || "unknown")})`);
        const activation = (0, agent_sessions_resume_1.activateTaskAgentSessionsForRecovery)(taskId, "中断恢复：已通过现场预检");
        const agentSessions = (Array.isArray(latest?.work_items) ? latest.work_items : [])
            .filter((item) => item?.completed !== true && String(item?.status || "").toLowerCase() !== "done")
            .slice(0, 100)
            .map((item) => (0, task_recovery_sessions_1.resolveTaskAgentSessionProjection)(latest, item, preflight.nextAttempt, activation.mode === "native_session" ? "native_session" : "rehydrated_session"));
        (0, execution_kernel_1.clearTaskCancellation)(taskId);
        const committedTransaction = finishTransaction(transaction, "committed");
        const committed = (0, db_1.updateTaskByIdCas)(taskId, current => String(current?.recovery_transaction?.transactionId || "") === transaction?.transactionId, current => {
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
            const context = (0, task_context_1.buildTaskContextCapsule)(next, current?.task_context || null, "recovery_committed");
            return { ...next, task_context: context, task_context_revision_receipt: { revision: context.revision, checksum: context.checksum, reason: "recovery_committed", at: context.updatedAt, contentStored: false } };
        });
        if (!committed.updated)
            throw new Error("恢复事务提交冲突");
        let queueResult = null;
        if (options.enqueue) {
            queueResult = options.enqueue(taskId, committed.task);
            if (queueResult?.success === false || queueResult?.queued === false)
                throw new Error(queueResult?.error || queueResult?.message || "恢复任务入队失败");
        }
        (0, reliability_ledger_1.completeIdempotency)("task-recovery", idempotencyKey, {
            success: true,
            task_id: taskId,
            next_attempt: preflight.nextAttempt,
            recovery_mode: activation.mode,
            transaction_checksum: committedTransaction.checksum,
            preflight_checksum: preflight.checksum,
        });
        return { success: true, duplicate: false, task: committed.task, userSession, agentSessions, preflight: { ...preflight, recoveryMode: activation.mode }, transaction: committedTransaction, activation, queueResult, decision };
    }
    catch (error) {
        if (transaction) {
            const rolledBack = finishTransaction(transaction, "rolled_back", error?.message || error);
            (0, db_1.updateTaskByIdCas)(taskId, current => String(current?.recovery_transaction?.transactionId || "") === transaction?.transactionId, current => ({
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
            }));
            (0, agent_sessions_purge_1.suspendTaskAgentSessions)({ taskId }, "恢复事务回滚");
            (0, execution_kernel_1.requestTaskCancellation)(taskId, "恢复事务未提交", "task-recovery-orchestrator");
        }
        if (leaseAcquired)
            (0, reliability_ledger_1.releaseTaskLease)(taskId, "recovery_rolled_back");
        try {
            (0, reliability_ledger_1.failIdempotency)("task-recovery", idempotencyKey, error);
        }
        catch { }
        throw error;
    }
}
//# sourceMappingURL=task-recovery-orchestrator.js.map