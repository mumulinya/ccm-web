"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentConversationAttemptBinding = currentConversationAttemptBinding;
exports.withConversationAttemptScope = withConversationAttemptScope;
exports.confirmConversationPauseAtBoundary = confirmConversationPauseAtBoundary;
exports.runWithConversationAttempt = runWithConversationAttempt;
exports.bindConversationMessage = bindConversationMessage;
exports.bindConversationLedgerEvent = bindConversationLedgerEvent;
exports.conversationAttemptId = conversationAttemptId;
exports.attemptConflict = attemptConflict;
exports.requireConversationAttempt = requireConversationAttempt;
exports.validateConversationMutation = validateConversationMutation;
exports.conversationTurnActions = conversationTurnActions;
exports.projectConversationMutationResult = projectConversationMutationResult;
exports.bindConversationAttemptResponse = bindConversationAttemptResponse;
exports.projectConversationAttemptEvent = projectConversationAttemptEvent;
exports.failConversationAttemptResponse = failConversationAttemptResponse;
exports.validateConversationSettlement = validateConversationSettlement;
const async_hooks_1 = require("async_hooks");
const conversation_event_journal_1 = require("./conversation-event-journal");
const attemptContext = new async_hooks_1.AsyncLocalStorage();
function currentConversationAttemptBinding(scope, conversationId) {
    const binding = attemptContext.getStore()?.binding;
    return binding?.scope === scope && binding.conversation_id === conversationId ? binding : undefined;
}
// Each entrypoint owns a fresh context. In particular, request event listeners
// and queue drains must never leak identity into their caller or sibling work.
function withConversationAttemptScope(callback) {
    return ((...args) => attemptContext.run({}, () => callback(...args)));
}
function createBinding(store, input) {
    const turn = store.getInternal(String(input.id));
    if (!turn || turn.scope !== input.scope || turn.conversation_id !== input.conversation_id || turn.status !== "sending")
        throw attemptConflict();
    requireConversationAttempt(turn, input, true);
    return { id: turn.id, attempt_id: conversationAttemptId(turn), scope: turn.scope,
        conversation_id: turn.conversation_id, current: () => store.getInternal(turn.id),
        pauseAtBoundary: (checkpoint) => store.pauseAtBoundary(turn.id, conversationAttemptId(turn), checkpoint) };
}
function confirmConversationPauseAtBoundary(binding, checkpoint) {
    if (binding?.current()?.status !== "pausing")
        return;
    binding.pauseAtBoundary(checkpoint);
    throw Object.assign(new Error("会话已在安全边界暂停"), { code: "CONVERSATION_PAUSED" });
}
function runWithConversationAttempt(store, turn, callback) {
    const binding = createBinding(store, { ...turn, attempt_id: conversationAttemptId(turn) });
    return attemptContext.run({ binding }, callback);
}
function bindConversationMessage(message, scope, conversationId) {
    const context = attemptContext.getStore()?.binding;
    if (!context || context.scope !== scope || context.conversation_id !== conversationId || message?.attempt_id)
        return message;
    return { ...message, conversation_turn_id: context.id, attempt_id: context.attempt_id };
}
function bindConversationLedgerEvent(input) {
    const context = attemptContext.getStore()?.binding;
    if (!context || input?.attempt_id)
        return input;
    const conversationId = ["project", "group"].includes(input?.scope)
        ? `${input.scopeId}:${input.exactSessionId}` : input?.exactSessionId;
    if (input?.scope !== context.scope || conversationId !== context.conversation_id)
        return input;
    const eventId = input?.eventId || input?.event_id;
    return { ...input, conversation_turn_id: context.id, attempt_id: context.attempt_id,
        ...(eventId ? { eventId: `${context.attempt_id}:${eventId}` } : {}) };
}
// A turn keeps its identity across retries; its execution authority does not.
// The persisted counters also give legacy records a deterministic identity.
function conversationAttemptId(turn) {
    return `${String(turn.id)}:${Math.max(0, Number(turn.retry_count || 0))}:${Math.max(0, Number(turn.recovery_count || 0))}`;
}
function attemptConflict(message = "这次执行已经失效，请刷新会话后重试") {
    return Object.assign(new Error(message), { code: "CONVERSATION_ATTEMPT_CONFLICT", statusCode: 409 });
}
function requireConversationAttempt(turn, input, required = false) {
    if (!turn)
        throw attemptConflict();
    const expected = String(input?.attempt_id || "");
    if ((required && !expected) || (expected && expected !== conversationAttemptId(turn)))
        throw attemptConflict();
    if (input?.lease_id && input.lease_id !== turn.lease_id)
        throw attemptConflict();
}
function validateConversationMutation(store, pathname, input) {
    if (!input?.id || !["claim", "settle", "control", "retry", "heartbeat", "defer"].includes(pathname.split("/").pop() || ""))
        return;
    const turn = store.getInternal(String(input.id));
    if (!turn)
        throw attemptConflict();
    requireConversationAttempt(turn, input, true);
}
function conversationTurnActions(turn, canMutate = true) {
    if (!canMutate || turn.metadata?.dismissed_by_user || turn.kind !== "user_message")
        return [];
    switch (turn.status) {
        case "failed": return ["retry"];
        case "paused":
        case "interrupted": return ["resume"];
        case "sending":
        case "resuming": return ["pause"];
        default: return [];
    }
}
function projectConversationMutationResult(store, result, principal) {
    const turn = result?.turn?.id ? store.getInternal(result.turn.id) : null;
    if (!turn || turn.kind !== "user_message")
        return result;
    const canMutate = principal?.kind !== "browser" || principal.role === "admin"
        || !turn.owner_id || turn.owner_id === principal.userId;
    return { ...result, turn: { ...result.turn, canMutate, available_actions: conversationTurnActions(turn, canMutate) } };
}
const bindings = new WeakMap();
function bindConversationAttemptResponse(res, store, input) {
    if (!input.id)
        return;
    const binding = createBinding(store, input);
    bindings.set(res, binding);
    (0, conversation_event_journal_1.captureConversationSse)(res, binding.id, binding.attempt_id);
    const context = attemptContext.getStore();
    if (context)
        context.binding = binding;
}
function projectConversationAttemptEvent(res, event) {
    const binding = bindings.get(res);
    if (!binding)
        return event;
    const current = binding.current();
    if (!current || conversationAttemptId(current) !== binding.attempt_id
        || ["paused", "interrupted", "cancelled"].includes(current.status))
        return null;
    for (const candidate of [event, event?.event]) {
        if (candidate?.attempt_id && candidate.attempt_id !== binding.attempt_id)
            return null;
        if (candidate?.conversation_turn_id && candidate.conversation_turn_id !== binding.id)
            return null;
    }
    const identity = { conversation_turn_id: binding.id, attempt_id: binding.attempt_id };
    return { ...event, ...identity, ...(event.event ? { event: { ...event.event, ...identity } } : {}) };
}
function failConversationAttemptResponse(res, error) {
    if (res.writableEnded || res.destroyed)
        return;
    if (error?.code === 'CONVERSATION_PAUSED') {
        if (!res.headersSent)
            res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' });
        res.end();
        return;
    }
    const payload = { error: error?.message || "消息处理失败", code: error?.code || "CONVERSATION_REQUEST_FAILED" };
    if (!res.headersSent) {
        res.writeHead(Number(error?.statusCode || 500), { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(payload));
        return;
    }
    const event = projectConversationAttemptEvent(res, { type: "error", text: payload.error, code: payload.code });
    if (event)
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
}
// Executing callbacks may survive a pause/settlement, but cannot settle again.
function validateConversationSettlement(turn, input) {
    requireConversationAttempt(turn, input);
    if (["completed", "applied", "failed", "cancelled"].includes(turn.status)) {
        if (turn.status === input.status)
            return true;
        throw attemptConflict("已结束的执行不能被较晚的回调改写");
    }
    if (["paused", "interrupted", "needs_route"].includes(turn.status) && input.status !== "cancelled")
        throw attemptConflict();
    return false;
}
//# sourceMappingURL=conversation-attempt.js.map