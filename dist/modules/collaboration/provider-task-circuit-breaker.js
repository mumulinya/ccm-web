"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS = exports.PROVIDER_TASK_CIRCUIT_SCHEMA = void 0;
exports.readTaskProviderCircuit = readTaskProviderCircuit;
exports.getTaskProviderCircuitGate = getTaskProviderCircuitGate;
exports.openTaskProviderCircuit = openTaskProviderCircuit;
exports.closeTaskProviderCircuit = closeTaskProviderCircuit;
exports.formatTaskProviderCircuitMessage = formatTaskProviderCircuitMessage;
exports.runProviderTaskCircuitSelfTest = runProviderTaskCircuitSelfTest;
exports.PROVIDER_TASK_CIRCUIT_SCHEMA = "ccm-provider-task-circuit-v1";
exports.PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS = [
    5 * 60_000,
    15 * 60_000,
    30 * 60_000,
    60 * 60_000,
];
function timestampMs(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
}
function positiveInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}
function readTaskProviderCircuit(task) {
    const value = task?.provider_circuit;
    if (!value || value.schema !== exports.PROVIDER_TASK_CIRCUIT_SCHEMA)
        return null;
    if (!["open", "closed"].includes(String(value.state || "")))
        return null;
    return value;
}
function getTaskProviderCircuitGate(task, nowMs = Date.now()) {
    const circuit = readTaskProviderCircuit(task);
    const retryAfterMs = timestampMs(circuit?.retryAfter);
    const blocked = circuit?.state === "open" && retryAfterMs > nowMs;
    return {
        blocked,
        circuit,
        retryAfterMs,
        remainingMs: blocked ? Math.max(1, retryAfterMs - nowMs) : 0,
    };
}
function openTaskProviderCircuit(task, failure = {}, options = {}) {
    const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
    const previous = readTaskProviderCircuit(task);
    const previousOpenedAt = timestampMs(previous?.openedAt);
    const keepFailureStreak = previous?.failureClass === "llm-error"
        && previousOpenedAt > 0
        && nowMs - previousOpenedAt <= 24 * 60 * 60_000;
    const consecutiveFailures = keepFailureStreak
        ? positiveInteger(previous?.consecutiveFailures, 1) + 1
        : 1;
    const cooldownMs = exports.PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS[Math.min(consecutiveFailures - 1, exports.PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS.length - 1)];
    const openedAt = new Date(nowMs).toISOString();
    const retryAfter = new Date(nowMs + cooldownMs).toISOString();
    return {
        schema: exports.PROVIDER_TASK_CIRCUIT_SCHEMA,
        state: "open",
        failureClass: "llm-error",
        consecutiveFailures,
        openedAt,
        retryAfter,
        cooldownMs,
        reason: String(options.reason || "主 Agent Provider 重试已耗尽").slice(0, 500),
        modelAttempts: positiveInteger(failure?.attempts, 1),
        providerElapsedMs: positiveInteger(failure?.elapsedMs),
    };
}
function closeTaskProviderCircuit(task, reason = "Provider 调用恢复", nowMs = Date.now()) {
    const previous = readTaskProviderCircuit(task);
    if (!previous || previous.state !== "open")
        return previous;
    return {
        ...previous,
        state: "closed",
        closedAt: new Date(nowMs).toISOString(),
        closeReason: String(reason || "Provider 调用恢复").slice(0, 300),
    };
}
function formatTaskProviderCircuitMessage(circuit) {
    if (!circuit)
        return "主 Agent Provider 暂不可用";
    const attempts = positiveInteger(circuit.modelAttempts, 5);
    return `主 Agent Provider 已耗尽 ${attempts} 次尝试，任务进入冷却；${circuit.retryAfter} 后允许重新执行`;
}
function runProviderTaskCircuitSelfTest() {
    const nowMs = Date.parse("2026-07-27T00:00:00.000Z");
    const first = openTaskProviderCircuit({}, { attempts: 5, elapsedMs: 180_000 }, { nowMs });
    const firstGate = getTaskProviderCircuitGate({ provider_circuit: first }, nowMs + 1);
    const expiredGate = getTaskProviderCircuitGate({ provider_circuit: first }, nowMs + first.cooldownMs + 1);
    const second = openTaskProviderCircuit({ provider_circuit: first }, { attempts: 3 }, { nowMs: nowMs + first.cooldownMs + 1 });
    const closed = closeTaskProviderCircuit({ provider_circuit: second }, "selftest", nowMs + second.cooldownMs + 2);
    const checks = {
        firstFailureUsesFiveMinuteCooldown: first.cooldownMs === 5 * 60_000,
        openCircuitBlocksQueue: firstGate.blocked === true,
        expiredCircuitAllowsHalfOpenAttempt: expiredGate.blocked === false,
        repeatedFailureEscalatesCooldown: second.cooldownMs === 15 * 60_000 && second.consecutiveFailures === 2,
        successfulAttemptClosesCircuit: closed?.state === "closed",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-task-circuit-breaker.js.map