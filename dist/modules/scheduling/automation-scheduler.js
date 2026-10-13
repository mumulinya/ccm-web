"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchAutomationDefinitionOccurrence = dispatchAutomationDefinitionOccurrence;
exports.drainDeferredAutomationWindows = drainDeferredAutomationWindows;
exports.startAutomationScheduler = startAutomationScheduler;
exports.stopAutomationScheduler = stopAutomationScheduler;
exports.automationSchedulerStatus = automationSchedulerStatus;
const schedule_expression_1 = require("./schedule-expression");
const automation_definition_service_1 = require("./automation-definition-service");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const collaboration_1 = require("../collaboration/collaboration");
const agent_routine_store_1 = require("../../agents/agent-routine-store");
const agent_routine_store_2 = require("../../agents/agent-routine-store");
let timer = null;
let tickInFlight = null;
async function dispatchAutomationDefinitionOccurrence(ctx, definition, now, occurrenceId = `automation:${definition.definition_id}:${(0, schedule_expression_1.minuteKey)(now, String(definition.timezone || "Asia/Shanghai"))}`) {
    if (!definition || definition.enabled === false || definition.deleted_at)
        return { queued: false, skipped: true, reason: "disabled" };
    const schedule = String(definition.schedule || "").trim();
    if (!schedule)
        return { queued: false, skipped: true, reason: "missing_schedule" };
    const routineId = String(definition.routine_id || definition.definition_id);
    (0, agent_routine_store_1.upsertAgentRoutine)({
        routineId,
        name: String(definition.name || definition.definition_id),
        agentId: String(definition.agent_id || "automation-agent"),
        scope: String(definition.target?.type || "project"),
        scopeId: String(definition.target?.id || ""),
        schedule,
        triggerType: "cron",
        catchUpPolicy: String(definition.catch_up_policy || "skip"),
        concurrencyPolicy: String(definition.concurrency_policy || "queue_one"),
        enabled: definition.enabled !== false,
        payload: { definitionId: definition.definition_id, revision: definition.revision },
    });
    const window = (0, agent_routine_store_1.reserveAgentRoutineWindow)({
        routineId,
        scheduleWindowId: occurrenceId,
        triggerType: "cron",
        catchUp: String(definition.catch_up_policy || "skip") !== "skip",
        scheduledFor: now.toISOString(),
        concurrencyPolicy: String(definition.concurrency_policy || "queue_one"),
    });
    const routineRun = window.run;
    if (!window.created)
        return { queued: false, duplicate: true, routineRun };
    if (routineRun.status === "coalesced")
        return { queued: false, coalesced: true, reason: "queue_one", routineRun };
    if (routineRun.status !== "queued")
        return { queued: false, skipped: true, reason: "concurrency", routineRun };
    return dispatchReservedAutomationWindow(ctx, definition, now, routineRun);
}
function dispatchReservedAutomationWindow(ctx, definition, now, routineRun) {
    const occurrenceId = routineRun.scheduleWindowId;
    const lease = (0, reliability_ledger_1.acquireIdempotency)({ scope: "automation-definition-schedule", key: occurrenceId,
        leaseMs: 10 * 60 * 1000,
        metadata: { definition_id: definition.definition_id, revision: definition.revision, occurrence_id: occurrenceId },
    });
    if (!lease.acquired) {
        return { queued: false, duplicate: true, reason: "idempotency", routineRun };
    }
    try {
        const target = definition.target || { type: "project", id: "", exact_session_id: "" };
        const task = (0, collaboration_1.createTask)({
            title: definition.name,
            description: definition.goal,
            business_goal: definition.goal,
            scope: definition.scope,
            target_project: target.type === "project" ? target.id : "",
            group_id: target.type === "group" ? target.id : null,
            assign_type: target.type,
            exact_session_id: target.exact_session_id || "",
            source_channel: "automation",
            request_origin: "automation",
            origin: "automation",
            client_message_id: occurrenceId,
            idempotency_key: occurrenceId,
            automation_definition: definition,
            automation_definition_id: definition.definition_id,
            automation_definition_revision: definition.revision,
            automation_occurrence_id: occurrenceId,
            automation_routine_run_id: routineRun.routineRunId,
            automation_scheduled_for: now.toISOString(),
            dispatch_policy: definition.execution_policy?.dispatch,
            verification_policy: definition.execution_policy?.verification,
            workspace_policy: definition.execution_policy?.workspace,
            approval_policy: definition.execution_policy?.approval,
            auto_execute: true,
        });
        // The legacy task_run identifier is not the authoritative AgentRun. The
        // Coordinator binds the routine window to the real run when execution
        // starts; enqueue the task without copying the legacy id into the
        // routine ledger.
        const queued = (0, collaboration_1.enqueueTask)(task.id, ctx, "");
        const runId = "";
        (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { status: queued?.queued ? "queued" : "failed" });
        // The scheduler only creates the task queue entry. The Coordinator is
        // the authority that binds this routine window to a real AgentRun and
        // changes it to running.
        const finalStatus = queued?.queued ? "queued" : "failed";
        const finalRoutineRun = (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { runId, status: finalStatus });
        (0, reliability_ledger_1.completeIdempotency)("automation-definition-schedule", occurrenceId, { success: !!queued?.queued, task_id: task.id, run_id: runId, routine_run_id: routineRun.routineRunId });
        return { queued: !!queued?.queued, task, routineRun: finalRoutineRun };
    }
    catch (error) {
        (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { status: "failed" });
        (0, reliability_ledger_1.failIdempotency)("automation-definition-schedule", occurrenceId, error);
        console.error("[AutomationDefinition][Scheduler]", definition.definition_id, error?.message || error);
        return { queued: false, failed: true, error, routineRun };
    }
}
async function drainDeferredAutomationWindows(ctx) {
    const results = [];
    const tasks = require('../../core/task-query').listAutomationTasks();
    for (const definition of (0, automation_definition_service_1.listAutomationDefinitions)()) {
        if (definition.enabled === false || definition.deleted_at)
            continue;
        const routineId = String(definition.routine_id || definition.definition_id);
        // A crash after reservation but before Task creation leaves a queued
        // window. Retry only that same occurrence; its durable idempotency lease
        // protects another live scheduler until it expires.
        const orphan = (0, agent_routine_store_2.listAgentRoutineRuns)(routineId).find(row => row.status === "queued" && !row.runId
            && !tasks.some(task => task.automation_routine_run_id === row.routineRunId));
        const run = orphan || (definition.concurrency_policy === "queue_one" ? (0, agent_routine_store_1.claimDeferredAgentRoutineWindow)(routineId) : null);
        if (run)
            results.push(dispatchReservedAutomationWindow(ctx, definition, new Date((0, agent_routine_store_1.getAgentRoutineWindowTime)(run)), run));
    }
    return results;
}
async function tick(ctx, now = new Date()) {
    await drainDeferredAutomationWindows(ctx);
    for (const definition of (0, automation_definition_service_1.listAutomationDefinitions)()) {
        if (!definition || definition.enabled === false || definition.deleted_at)
            continue;
        const schedule = String(definition.schedule || "").trim();
        if (!schedule)
            continue;
        let due = false;
        try {
            due = (0, schedule_expression_1.matchesCron)(schedule, now, String(definition.timezone || "Asia/Shanghai"));
        }
        catch {
            due = false;
        }
        if (!due)
            continue;
        await dispatchAutomationDefinitionOccurrence(ctx, definition, now);
    }
}
function startAutomationScheduler(ctx) {
    stopAutomationScheduler();
    const run = () => {
        if (tickInFlight)
            return tickInFlight;
        tickInFlight = tick(ctx).finally(() => { tickInFlight = null; });
        return tickInFlight;
    };
    void run().catch(error => console.error("[Automation] 调度失败", error?.message || error));
    timer = setInterval(() => void run().catch(error => console.error("[Automation] 调度失败", error?.message || error)), 30 * 1000);
    console.log("[Automation] 自动化定义调度器已启动");
}
function stopAutomationScheduler() {
    if (timer)
        clearInterval(timer);
    timer = null;
}
function automationSchedulerStatus() {
    return { running: !!timer, tick_in_progress: !!tickInFlight, interval_ms: 30 * 1000 };
}
//# sourceMappingURL=automation-scheduler.js.map