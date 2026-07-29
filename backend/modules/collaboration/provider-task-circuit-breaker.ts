export const PROVIDER_TASK_CIRCUIT_SCHEMA = "ccm-provider-task-circuit-v1";
export const PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS = [
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
] as const;

export type ProviderTaskCircuit = {
  schema: typeof PROVIDER_TASK_CIRCUIT_SCHEMA;
  state: "open" | "closed";
  failureClass: "llm-error";
  consecutiveFailures: number;
  openedAt: string;
  retryAfter: string;
  cooldownMs: number;
  reason: string;
  modelAttempts: number;
  providerElapsedMs: number;
  closedAt?: string;
  closeReason?: string;
};

function timestampMs(value: any) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveInteger(value: any, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

export function readTaskProviderCircuit(task: any): ProviderTaskCircuit | null {
  const value = task?.provider_circuit;
  if (!value || value.schema !== PROVIDER_TASK_CIRCUIT_SCHEMA) return null;
  if (!["open", "closed"].includes(String(value.state || ""))) return null;
  return value as ProviderTaskCircuit;
}

export function getTaskProviderCircuitGate(task: any, nowMs = Date.now()) {
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

export function openTaskProviderCircuit(
  task: any,
  failure: any = {},
  options: { nowMs?: number; reason?: string } = {},
): ProviderTaskCircuit {
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const previous = readTaskProviderCircuit(task);
  const previousOpenedAt = timestampMs(previous?.openedAt);
  const keepFailureStreak = previous?.failureClass === "llm-error"
    && previousOpenedAt > 0
    && nowMs - previousOpenedAt <= 24 * 60 * 60_000;
  const consecutiveFailures = keepFailureStreak
    ? positiveInteger(previous?.consecutiveFailures, 1) + 1
    : 1;
  const cooldownMs = PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS[
    Math.min(consecutiveFailures - 1, PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS.length - 1)
  ];
  const openedAt = new Date(nowMs).toISOString();
  const retryAfter = new Date(nowMs + cooldownMs).toISOString();
  return {
    schema: PROVIDER_TASK_CIRCUIT_SCHEMA,
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

export function closeTaskProviderCircuit(task: any, reason = "Provider 调用恢复", nowMs = Date.now()): ProviderTaskCircuit | null {
  const previous = readTaskProviderCircuit(task);
  if (!previous || previous.state !== "open") return previous;
  return {
    ...previous,
    state: "closed",
    closedAt: new Date(nowMs).toISOString(),
    closeReason: String(reason || "Provider 调用恢复").slice(0, 300),
  };
}

export function formatTaskProviderCircuitMessage(circuit: ProviderTaskCircuit | null) {
  if (!circuit) return "主 Agent Provider 暂不可用";
  const attempts = positiveInteger(circuit.modelAttempts, 5);
  return `主 Agent Provider 已耗尽 ${attempts} 次尝试，任务进入冷却；${circuit.retryAfter} 后允许重新执行`;
}

export function runProviderTaskCircuitSelfTest() {
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
