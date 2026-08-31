"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveContextCompactionTrigger = resolveContextCompactionTrigger;
exports.publishContextCompactionLifecycle = publishContextCompactionLifecycle;
const user_visible_agent_events_1 = require("./user-visible-agent-events");
/** `force` is also used for pressure recovery; only an authoritative manual
 * reason may be projected as a user `/compact` operation. */
function resolveContextCompactionTrigger(input = {}) {
    const reason = String(input.reason || "").toLowerCase();
    if (input.promptTooLong === true || /prompt[_ -]?too[_ -]?long|context[_ -]?length/.test(reason))
        return "prompt_too_long";
    if (input.force === true && /manual|slash|user|command|compact[_ -]?request/.test(reason))
        return "manual";
    return "automatic";
}
function safe(value, max = 240) {
    return String(value || "").trim().slice(0, max);
}
function eventId(runId) {
    return `context-compaction:${safe(runId, 120)}`;
}
function triggerLabel(trigger, state) {
    if (state === "running")
        return "正在压缩上下文";
    if (state === "failed")
        return "上下文压缩失败";
    if (state === "cancelled")
        return "上下文压缩已取消";
    return trigger === "manual" ? "上下文已手动压缩" : "上下文已自动压缩";
}
function publishContextCompactionLifecycle(input, update) {
    const runId = safe(input.compactionRunId, 120);
    if (!runId || !input.scopeId || !input.exactSessionId)
        return null;
    const state = update.state;
    const event = {
        eventId: eventId(runId),
        scope: input.scope,
        scopeId: safe(input.scopeId),
        exactSessionId: safe(input.exactSessionId),
        ...(safe(update.turnId || input.turnId) ? { turnId: safe(update.turnId || input.turnId) } : {}),
        ...(safe(update.taskId || input.taskId) ? { taskId: safe(update.taskId || input.taskId) } : {}),
        ...(Number.isFinite(Number(update.generation ?? input.generation)) ? { generation: Math.max(0, Number(update.generation ?? input.generation)) } : {}),
        ...(Number.isFinite(Number(update.attempt ?? input.attempt)) ? { attempt: Math.max(1, Number(update.attempt ?? input.attempt)) } : {}),
        ...(safe(update.anchorMessageId || input.anchorMessageId) ? { anchorMessageId: safe(update.anchorMessageId || input.anchorMessageId) } : {}),
        eventType: "context_compaction",
        display: {
            title: triggerLabel(input.trigger, state),
            summary: state === "completed"
                ? (Number.isFinite(Number(update.beforeTokens)) && Number.isFinite(Number(update.afterTokens)) ? `已完成上下文整理：${Math.max(0, Number(update.beforeTokens))} → ${Math.max(0, Number(update.afterTokens))} tokens` : "已完成上下文整理，继续当前任务")
                : state === "failed" ? `上下文整理未完成${safe(update.errorCode) ? `：${safe(update.errorCode, 80)}` : ""}` : state === "cancelled" ? "本次上下文整理已取消" : "正在整理已完成的旧上下文，完成后继续当前任务",
            status: state === "running" ? "running" : state === "failed" ? "failed" : state === "cancelled" ? "waiting" : "success",
            ...(Number.isFinite(Number(update.beforeTokens)) ? { beforeTokens: Math.max(0, Number(update.beforeTokens)) } : {}),
            ...(Number.isFinite(Number(update.afterTokens)) ? { afterTokens: Math.max(0, Number(update.afterTokens)) } : {}),
        },
        detail: {
            contextCompaction: {
                schema: "ccm-visible-context-compaction-v1",
                compactionRunId: runId,
                trigger: input.trigger,
                mode: update.mode || input.mode || "full",
                state,
                stage: safe(update.stage, 120),
                ...(Number.isFinite(Number(update.beforeTokens)) ? { beforeTokens: Math.max(0, Number(update.beforeTokens)) } : {}),
                ...(Number.isFinite(Number(update.afterTokens)) ? { afterTokens: Math.max(0, Number(update.afterTokens)) } : {}),
                revision: Date.now(),
                ...(state === "running" ? { startedAt: new Date().toISOString() } : { completedAt: new Date().toISOString() }),
                contentStored: false,
            },
        },
        visibility: "transcript",
        contentStored: false,
    };
    return (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)(event);
}
//# sourceMappingURL=context-compaction-lifecycle.js.map