"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchAutomationDefinitionOccurrence = dispatchAutomationDefinitionOccurrence;
exports.startAutomationScheduler = startAutomationScheduler;
exports.stopAutomationScheduler = stopAutomationScheduler;
exports.automationSchedulerStatus = automationSchedulerStatus;
const schedule_expression_1 = require("./schedule-expression");
const automation_definition_service_1 = require("./automation-definition-service");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const collaboration_1 = require("../collaboration/collaboration");
const agent_routine_store_1 = require("../../agents/agent-routine-store");
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
    const routineRun = (0, agent_routine_store_1.createAgentRoutineRun)({
        routineId,
        scheduleWindowId: occurrenceId,
        triggerType: "cron",
        catchUp: String(definition.catch_up_policy || "skip") !== "skip",
    });
    if (routineRun.status !== "queued")
        return { queued: false, duplicate: true, routineRun };
    const concurrencyPolicy = String(definition.concurrency_policy || "queue_one");
    const priorActive = (0, agent_routine_store_1.listAgentRoutineRuns)(routineId).some(item => item.routineRunId !== routineRun.routineRunId && ["queued", "running"].includes(item.status));
    if (priorActive && concurrencyPolicy === "allow_one") {
        (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { status: "skipped" });
        return { queued: false, skipped: true, reason: "allow_one", routineRun };
    }
    if (priorActive && concurrencyPolicy === "queue_one") {
        (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { status: "coalesced" });
        return { queued: false, coalesced: true, reason: "queue_one", routineRun };
    }
    const lease = (0, reliability_ledger_1.acquireIdempotency)({ scope: "automation-definition-schedule", key: occurrenceId,
        leaseMs: 10 * 60 * 1000,
        metadata: { definition_id: definition.definition_id, revision: definition.revision, occurrence_id: occurrenceId },
    });
    if (!lease.acquired) {
        (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { status: "skipped" });
        return { queued: false, skipped: true, reason: "idempotency", routineRun };
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
            automation_scheduled_for: now.toISOString(),
            dispatch_policy: definition.execution_policy?.dispatch,
            verification_policy: definition.execution_policy?.verification,
            workspace_policy: definition.execution_policy?.workspace,
            approval_policy: definition.execution_policy?.approval,
            auto_execute: true,
        });
        const runId = String(task.active_run_id || task.task_run?.run_id || task.run_id || "");
        (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { runId, status: runId ? "running" : "skipped" });
        const queued = runId ? (0, collaboration_1.enqueueTask)(task.id, ctx, runId) : { queued: false };
        const finalStatus = queued?.queued ? "running" : "failed";
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
async function tick(ctx, now = new Date()) {
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