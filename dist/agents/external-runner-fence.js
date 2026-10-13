"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertExternalRunnerLease = assertExternalRunnerLease;
exports.authorizeExternalRunnerLaunch = authorizeExternalRunnerLaunch;
exports.renewExternalRunnerLease = renewExternalRunnerLease;
exports.blockUnconfirmedExternalRunner = blockUnconfirmedExternalRunner;
const agent_run_store_1 = require("./agent-run-store");
const crypto_1 = require("crypto");
const agent_execution_coordinator_1 = require("./agent-execution-coordinator");
const db_1 = require("../core/db");
/** Validate the persisted launch identity at the consumer, immediately before
 * spawning. Publishing a request is not permission to run it indefinitely. */
function assertExternalRunnerLease(request) {
    const runId = String(request.run_id || request.agentRunId || "");
    if (!runId) {
        const taskId = String(request.task_id || request.taskId || "");
        if (taskId && (0, db_1.loadTasks)().some(task => task.id === taskId && task.dispatch_profile_snapshot)) {
            throw Object.assign(new Error("外部 Runner 新执行请求缺少 run_id"), { code: "CCM_RUN_IDENTITY_MISMATCH" });
        }
        return null; // Unmaterialized legacy requests remain readable.
    }
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    const identities = {
        run_id: run?.runId, trace_id: run?.traceId, task_id: run?.taskId,
        attempt_id: run?.attemptId, runtime_id: run?.runtimeId,
        task_agent_session_id: run?.taskAgentSessionId,
        native_session_id: run?.nativeSessionId,
    };
    const frozenTask = run && (0, db_1.loadTasks)().find(task => task.id === run.taskId)?.dispatch_profile_snapshot;
    if (frozenTask && [...Object.keys(identities), "lease_id"].some(key => !Object.prototype.hasOwnProperty.call(request, key) || typeof request[key] !== "string")) {
        throw Object.assign(new Error("外部 Runner 新执行请求缺少完整 Run 身份"), { code: "CCM_RUN_IDENTITY_MISMATCH" });
    }
    if (!run || Object.entries(identities).some(([key, expected]) => request[key] !== undefined && request[key] !== expected)) {
        throw Object.assign(new Error("外部 Runner 请求身份与 Run 不一致"), { code: "CCM_RUN_IDENTITY_MISMATCH" });
    }
    if (!run.leaseOwnerId || run.leaseOwnerId !== request.leaseOwnerId || run.leaseId !== (request.lease_id || request.leaseId)
        || Date.parse(run.leaseExpiresAt || "") <= Date.now() || ["paused", "recovery_required", "succeeded", "failed", "cancelled"].includes(run.status)) {
        throw Object.assign(new Error("外部 Runner 已失去执行租约，禁止启动或绑定结果"), { code: "CCM_RUN_LEASE_LOST" });
    }
    return run;
}
function authorizeExternalRunnerLaunch(request) {
    const run = assertExternalRunnerLease(request);
    if (run) {
        (0, agent_execution_coordinator_1.markPersistentAgentExecutionStarted)(run.runId, run.leaseId);
        const consumerId = (0, crypto_1.randomUUID)();
        const event = (0, agent_run_store_1.appendAgentRunEvent)(run.runId, { eventType: "runner.consumer_claimed", message: "外部 Runner 唯一消费当前租约",
            payload: { consumerId, requestId: String(request.id || ""), pid: process.pid }, idempotencyKey: `runner-consumer:${run.runId}:${run.leaseId}` });
        if (event.payload?.consumerId !== consumerId)
            throw Object.assign(new Error("该执行租约已被另一个 Runner 消费，禁止重复启动"), { code: "CCM_RUN_ALREADY_ACTIVE" });
    }
    return run;
}
function renewExternalRunnerLease(request, ttlMs) {
    const run = assertExternalRunnerLease(request);
    if (!run)
        return;
    const heartbeat = (0, agent_run_store_1.heartbeatAgentRunLease)(run.runId, request.leaseOwnerId, request.lease_id || request.leaseId, ttlMs);
    if (!heartbeat.renewed)
        throw Object.assign(new Error("外部 Runner 租约续期失败"), { code: "CCM_RUN_LEASE_LOST" });
}
/** Timeout is not evidence of process exit. Keep ownership/evidence available
 * for inspection and cancellation; do not make a new automatic attempt. */
function blockUnconfirmedExternalRunner(request, reason) {
    const runId = String(request.run_id || request.agentRunId || "");
    const run = runId && (0, agent_run_store_1.getAgentRun)(runId);
    if (run && !["succeeded", "failed", "cancelled"].includes(run.status)
        && run.leaseId === (request.lease_id || request.leaseId)) {
        (0, agent_execution_coordinator_1.markPersistentAgentExecutionRecoveryRequired)(run.runId, reason, { code: "runner_exit_unconfirmed" });
    }
    // Cancellation is a request, never a claim that the remote process exited.
    require("./execution-kernel").requestTaskCancellation(String(request.task_id || request.taskId || run?.taskId || ""), reason, "runner-supervisor");
}
//# sourceMappingURL=external-runner-fence.js.map