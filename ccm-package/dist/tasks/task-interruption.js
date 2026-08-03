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
exports.buildTaskInterruptionReceipt = buildTaskInterruptionReceipt;
exports.interruptTaskExecution = interruptTaskExecution;
exports.buildTaskRecoveryDecision = buildTaskRecoveryDecision;
exports.resumeInterruptedTaskExecution = resumeInterruptedTaskExecution;
const crypto = __importStar(require("crypto"));
const execution_kernel_1 = require("../agents/execution-kernel");
const agent_sessions_resume_1 = require("./agent-sessions-resume");
const agent_sessions_purge_1 = require("./agent-sessions-purge");
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function receiptChecksum(receipt) {
    return checksum(receipt);
}
function recoveryChecksum(receipt) {
    return checksum(receipt);
}
function sessionProjection(taskId) {
    return (0, agent_sessions_resume_1.listTaskAgentSessions)({ taskId }).map((session) => ({
        task_agent_session_id: String(session.id || ""),
        native_session_id: String(session.nativeSessionId || ""),
        agent_type: String(session.agentType || ""),
        project: String(session.project || ""),
        resume_mode: String(session.resumeMode || "scratchpad"),
        turn_count: Math.max(0, Number(session.turnCount || 0)),
    }));
}
function transientReason(reason) {
    return ["temporary_network", "provider_overload", "service_restart", "lease_lost"].includes(reason);
}
function buildTaskInterruptionReceipt(input) {
    const taskId = String(input.task?.id || input.task?.task_id || "").trim();
    if (!taskId)
        throw new Error("任务中断缺少任务 ID");
    const reasonCode = input.reasonCode || "unknown";
    const sideEffectState = input.sideEffectState || "uncertain";
    const sessions = sessionProjection(taskId);
    const nativeIdentityProven = sessions.every(row => row.resume_mode !== "native" || !!row.native_session_id);
    const recoverable = reasonCode !== "unknown" && input.processTerminationProven !== false;
    const autoResumeAllowed = recoverable
        && transientReason(reasonCode)
        && sideEffectState !== "uncertain"
        && nativeIdentityProven;
    const raw = {
        schema: "ccm-task-interruption-receipt-v1",
        version: 1,
        receipt_id: `tir_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
        task_id: taskId,
        reason_code: reasonCode,
        reason: String(input.reason || "任务执行已中断").slice(0, 500),
        actor: String(input.actor || "ccm").slice(0, 120),
        checkpoint: String(input.checkpoint || input.task?.acceptance_state || input.task?.status || "unknown").slice(0, 120),
        execution_attempt: Math.max(0, Number(input.task?.execution_attempt || input.task?.project_main_execution?.attempt || 0)),
        workspace_checksum: String(input.workspaceChecksum || input.task?.workspace_snapshot_checksum || input.task?.workspace_evidence?.checksum || ""),
        task_agent_sessions: sessions,
        side_effect_state: sideEffectState,
        recoverable,
        auto_resume_allowed: autoResumeAllowed,
        interrupted_at: new Date().toISOString(),
    };
    return { ...raw, checksum: receiptChecksum(raw) };
}
function interruptTaskExecution(input) {
    const taskId = String(input.task?.id || input.task?.task_id || "").trim();
    const reason = String(input.reason || "任务执行已中断");
    const cancellation = (0, execution_kernel_1.requestTaskCancellation)(taskId, reason, String(input.actor || "ccm-interruption"));
    const suspendedSessions = (0, agent_sessions_purge_1.suspendTaskAgentSessions)({ taskId }, reason);
    const receipt = buildTaskInterruptionReceipt({
        ...input,
        processTerminationProven: cancellation.killedProcesses >= 0 && cancellation.externalRunnerRequests >= 0,
    });
    return { receipt, cancellation, suspendedSessions };
}
function buildTaskRecoveryDecision(task, receiptInput, options = {}) {
    const receipt = receiptInput || task?.interruption_receipt || null;
    const taskId = String(task?.id || receipt?.task_id || "");
    const checks = {
        receipt_valid: !!receipt && receipt.schema === "ccm-task-interruption-receipt-v1" && receipt.task_id === taskId && receipt.checksum === receiptChecksum({ ...receipt, checksum: undefined }),
        task_recoverable: receipt?.recoverable === true,
        side_effect_known: receipt?.side_effect_state !== "uncertain",
        workspace_unchanged: !receipt?.workspace_checksum || !options.workspaceChecksum || receipt.workspace_checksum === options.workspaceChecksum,
        authorization_valid: options.authorizationValid !== false,
        runtime_valid: options.runtimeValid !== false,
        native_identity_valid: Array.isArray(receipt?.task_agent_sessions) && receipt.task_agent_sessions.every(row => row.resume_mode !== "native" || !!row.native_session_id),
    };
    let mode = "reject";
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
            && checks.native_identity_valid;
        if (!safetyReady) {
            mode = "manual";
            reasonCode = "safety_revalidation_required";
            reason = "源码、权限、运行时、原生会话或副作用状态需要用户确认。";
        }
        else if (options.userRequested || receipt?.auto_resume_allowed) {
            mode = options.userRequested ? "auto" : "auto";
            reasonCode = options.userRequested ? "user_confirmed_resume" : "safe_automatic_resume";
            reason = "中断证据完整，可以沿用原任务和子 Agent 会话继续。";
        }
        else {
            mode = "manual";
            reasonCode = "user_confirmation_required";
            reason = "该中断需要用户明确恢复。";
        }
    }
    const raw = {
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
function resumeInterruptedTaskExecution(task, options = {}) {
    const decision = buildTaskRecoveryDecision(task, task?.interruption_receipt || null, { ...options, userRequested: options.userRequested === true });
    if (decision.mode !== "auto")
        return { resumed: false, decision, reopenedSessions: [] };
    const taskId = String(task?.id || "");
    (0, execution_kernel_1.clearTaskCancellation)(taskId);
    const reopenedSessions = (0, agent_sessions_resume_1.reopenTaskAgentSessions)(taskId, "中断恢复：继续原任务和原生 Agent 会话");
    return { resumed: true, decision, reopenedSessions };
}
//# sourceMappingURL=task-interruption.js.map