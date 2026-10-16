"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileAgentRunSupervisor = reconcileAgentRunSupervisor;
exports.startAgentRunSupervisor = startAgentRunSupervisor;
exports.stopAgentRunSupervisor = stopAgentRunSupervisor;
exports.inspectAgentRun = inspectAgentRun;
const agent_run_store_1 = require("./agent-run-store");
const agent_heartbeat_coordinator_1 = require("./agent-heartbeat-coordinator");
const agent_execution_coordinator_1 = require("./agent-execution-coordinator");
const agent_supervisor_candidates_1 = require("./agent-supervisor-candidates");
const performance_monitor_1 = require("../system/performance-monitor");
const perf_hooks_1 = require("perf_hooks");
let timer = null;
let inFlight = null;
function ageMs(value) {
    const at = Date.parse(String(value || ""));
    return Number.isFinite(at) ? Math.max(0, Date.now() - at) : 0;
}
function reconcileAgentRunSupervisor(options = {}) {
    if (inFlight)
        return inFlight;
    inFlight = (0, performance_monitor_1.measureAsyncPerformance)('background.run_supervisor', () => scanSupervisor(options)).finally(() => { inFlight = null; });
    return inFlight;
}
async function scanSupervisor(options = {}) {
    const startingTimeoutMs = Math.max(10_000, Number(options.startingTimeoutMs || 120_000));
    const runningTimeoutMs = Math.max(startingTimeoutMs, Number(options.runningTimeoutMs || 4 * 60 * 60_000));
    const lease = (0, agent_run_store_1.expireAgentRunLeases)();
    let startingTimedOut = 0;
    let runningTimedOut = 0;
    let recoveryChecked = 0;
    let recoverySucceeded = 0;
    let recoveryBlocked = 0;
    let after = '';
    while (true) {
        const ids = (0, agent_supervisor_candidates_1.supervisorCandidatePage)(after);
        if (!ids.length)
            break;
        after = ids[ids.length - 1];
        let batchStarted = perf_hooks_1.performance.now();
        for (const id of ids) {
            if (perf_hooks_1.performance.now() - batchStarted >= 10) {
                await new Promise(resolve => setImmediate(resolve));
                batchStarted = perf_hooks_1.performance.now();
            }
            const run = (0, agent_run_store_1.getAgentRun)(id);
            if (run?.scope === 'review_agent')
                continue; // Review jobs resume their immutable input through the review runner.
            if (!run)
                continue;
            if (["succeeded", "failed", "cancelled", "recovering"].includes(run.status))
                continue;
            if (run.status === "starting" && ageMs(run.updatedAt) > startingTimeoutMs) {
                const next = (0, agent_run_store_1.transitionAgentRun)(run.runId, "failed", "AgentRun 启动超时", { error: { code: "startup_timeout" }, eventType: "run.startup_timeout" });
                if (next?.status === "failed")
                    startingTimedOut += 1;
            }
            else if (run.status === "running" && ageMs(run.lastHeartbeatAt || run.updatedAt) > runningTimeoutMs) {
                const next = (0, agent_run_store_1.transitionAgentRun)(run.runId, "recovery_required", "AgentRun 心跳超时，等待恢复", { error: { code: "heartbeat_timeout" }, eventType: "run.heartbeat_timeout" });
                if (next?.status === "recovery_required")
                    runningTimedOut += 1;
            }
            if (run.status === "recovery_required" && options.autoRecover !== false) {
                recoveryChecked += 1;
                try {
                    // The Coordinator owns resume inspection, evidence validation, Run
                    // transition and recovery Wake creation. Supervisor only schedules
                    // the durable recovery attempt and records its outcome.
                    const resumed = await (0, agent_execution_coordinator_1.startPersistentAgentExecution)({
                        agentId: run.agentId, scope: run.scope, scopeId: run.scopeId, taskId: run.taskId, traceId: run.traceId,
                        reason: "resume", triggerType: "resume", idempotencyKey: `supervisor-resume:${run.runId}:${run.leaseVersion}:${run.updatedAt}`,
                        runId: run.runId, runtimeId: run.runtimeId, attemptId: run.attemptId, executionId: run.executionId,
                        taskAgentSessionId: run.taskAgentSessionId, nativeSessionId: run.nativeSessionId,
                        workspacePath: run.workspacePath, worktreeId: run.worktreeId, parentRunId: run.parentRunId,
                        runtimeVersionSnapshot: run.runtimeVersionSnapshot, source: "startup_recovery",
                    });
                    if (resumed.mode === "resumed")
                        recoverySucceeded += 1;
                    else {
                        appendRecoveryBlockedEvent(run.runId, resumed.reason || "resume_blocked");
                        recoveryBlocked += 1;
                    }
                }
                catch (error) {
                    appendRecoveryBlockedEvent(run.runId, error?.message || "resume_inspection_failed");
                    recoveryBlocked += 1;
                }
            }
        }
        await new Promise(resolve => setImmediate(resolve));
    }
    return { ...lease, startingTimedOut, runningTimedOut, recoveryChecked, recoverySucceeded, recoveryBlocked,
        ...(options.includeMetrics ? { metrics: (0, agent_heartbeat_coordinator_1.heartbeatMetrics)() } : {}) };
}
function appendRecoveryBlockedEvent(runId, reason) {
    try {
        (0, agent_run_store_1.transitionAgentRun)(runId, "recovery_required", "恢复检查未通过，保持阻塞等待人工处理", {
            eventType: "run.recovery_blocked",
            error: { code: "recovery_inspection_failed", reason: String(reason || "unknown") },
            idempotencyKey: `recovery-blocked:${runId}:${String(reason || "unknown")}`,
        });
    }
    catch { }
}
function startAgentRunSupervisor(options = {}) {
    if (timer)
        return { started: false, alreadyRunning: true };
    const intervalMs = Math.max(5_000, Number(options.intervalMs || 30_000));
    timer = setInterval(() => {
        void reconcileAgentRunSupervisor(options).catch((error) => { console.warn(`[AgentRun] Supervisor 巡检失败：${error?.message || error}`); });
    }, intervalMs);
    timer.unref?.();
    return { started: true, intervalMs };
}
function stopAgentRunSupervisor() {
    if (!timer)
        return false;
    clearInterval(timer);
    timer = null;
    return true;
}
function inspectAgentRun(runId) {
    return (0, agent_run_store_1.getAgentRun)(runId);
}
//# sourceMappingURL=agent-run-supervisor.js.map