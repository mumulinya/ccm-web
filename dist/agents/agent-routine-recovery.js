"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectMissedRoutineWindows = selectMissedRoutineWindows;
exports.recoverAgentRoutineRuns = recoverAgentRoutineRuns;
const automation_definition_service_1 = require("../modules/scheduling/automation-definition-service");
const schedule_expression_1 = require("../modules/scheduling/schedule-expression");
const automation_scheduler_1 = require("../modules/scheduling/automation-scheduler");
const agent_routine_store_1 = require("./agent-routine-store");
const text = (value) => String(value ?? "").trim();
const MAX_CATCH_UP_MINUTES = 7 * 24 * 60;
function scheduleWindow(definition, date) {
    const timezone = text(definition?.timezone) || "Asia/Shanghai";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `automation:${text(definition.definition_id)}:${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}
function latestRunStart(runs) {
    const latest = runs
        .filter(run => run && run.createdAt)
        .sort((a, b) => Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt)))[0];
    if (!latest)
        return null;
    const stamp = Date.parse(String(latest.createdAt));
    return Number.isFinite(stamp) ? new Date(stamp) : null;
}
function selectMissedRoutineWindows(definition, latestRunCreatedAt, now = new Date()) {
    const startStamp = latestRunCreatedAt ? Date.parse(String(latestRunCreatedAt)) + 60_000 : NaN;
    if (!Number.isFinite(startStamp))
        return [];
    const cursor = new Date(Math.max(startStamp, now.getTime() - MAX_CATCH_UP_MINUTES * 60_000));
    const matches = [];
    for (let i = 0; cursor <= now && i <= MAX_CATCH_UP_MINUTES; i += 1) {
        try {
            if ((0, schedule_expression_1.matchesCron)(String(definition?.schedule || ""), cursor, String(definition?.timezone || "Asia/Shanghai")))
                matches.push(new Date(cursor));
        }
        catch {
            break;
        }
        cursor.setMinutes(cursor.getMinutes() + 1);
    }
    return matches;
}
/**
 * Replays missed cron windows after a service restart. The routine store is
 * the source of truth for windows already observed; dispatch itself remains
 * idempotent, so a recovery pass can safely overlap the normal scheduler.
 */
async function recoverAgentRoutineRuns(ctx, now = new Date()) {
    const definitions = (0, automation_definition_service_1.listAutomationDefinitions)().filter(definition => definition && definition.enabled !== false && !definition.deleted_at);
    const routines = (0, agent_routine_store_1.listAgentRoutines)();
    const summary = { checked: 0, recovered: 0, skipped: 0, failed: 0, windows: 0 };
    for (const routine of routines) {
        const definition = definitions.find(item => text(item.routine_id || item.definition_id) === routine.routineId);
        if (!definition)
            continue;
        const policy = text(routine.catchUpPolicy || definition.catch_up_policy || "skip").toLowerCase();
        if (!policy || policy === "skip" || policy === "none") {
            summary.skipped += 1;
            continue;
        }
        summary.checked += 1;
        const runs = (0, agent_routine_store_1.listAgentRoutineRuns)(routine.routineId);
        const start = latestRunStart(runs);
        if (!start) {
            summary.skipped += 1;
            continue;
        }
        const matches = selectMissedRoutineWindows(definition, start.toISOString(), now);
        if (!matches.length) {
            summary.skipped += 1;
            continue;
        }
        const selected = policy === "catch_up_once" || policy === "once" ? matches.slice(-1) : matches;
        for (const occurrence of selected) {
            summary.windows += 1;
            try {
                const result = await (0, automation_scheduler_1.dispatchAutomationDefinitionOccurrence)(ctx, definition, occurrence, scheduleWindow(definition, occurrence));
                if (result?.queued || result?.coalesced || result?.duplicate)
                    summary.recovered += 1;
                else if (result?.failed)
                    summary.failed += 1;
                else
                    summary.skipped += 1;
            }
            catch {
                summary.failed += 1;
            }
        }
    }
    return summary;
}
//# sourceMappingURL=agent-routine-recovery.js.map