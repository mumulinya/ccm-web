// 自动压缩熔断策略：错误分级、冷却半开、展示态推导。
// 独立叶模块，供 circuit-breaker 台账与调度侧共用，避免向超大文件追加逻辑。

export const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_POLICY_VERSION = 1;

export const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_COOLDOWN_MS = Math.max(
  30_000,
  Number(process.env.CCM_GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_COOLDOWN_MS || 10 * 60_000)
);

export const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_MAX_BACKOFF_STEPS = 4;

export type AutoCompactFailureMode = "transient" | "structural" | "cancelled";

const CANCELLED_PATTERN = /GROUP_COMPACTION_CANCELLED|compaction_cancelled/i;

// 结构性失败重试不会自愈（会话身份、契约、校验和不匹配），不参与冷却半开。
const STRUCTURAL_PATTERN = /exact_group_session_required|session_lifecycle_stale|lifecycle_fence|_schema_invalid|schema_invalid|checksum_invalid|checksum_mismatch|legacy_default_session_rejected|_contract_|invariant/i;

export function classifyAutoCompactFailure(error: any): { failureMode: AutoCompactFailureMode; errorClass: string; countsTowardCircuit: boolean } {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  const probe = `${code}\n${message}`;
  if (CANCELLED_PATTERN.test(probe)) {
    return { failureMode: "cancelled", errorClass: code || "CompactionCancelled", countsTowardCircuit: false };
  }
  if (STRUCTURAL_PATTERN.test(probe)) {
    return { failureMode: "structural", errorClass: code || error?.name || "StructuralError", countsTowardCircuit: true };
  }
  return { failureMode: "transient", errorClass: code || error?.name || "Error", countsTowardCircuit: true };
}

export function autoCompactCircuitCooldownMs(openCount: number, cooldownMs = GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_COOLDOWN_MS) {
  const steps = Math.max(0, Math.min(GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_MAX_BACKOFF_STEPS, Number(openCount || 1) - 1));
  return Math.max(1_000, Math.floor(cooldownMs * Math.pow(2, steps)));
}

function timeMs(value: any) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 判断本次调度是否放行。持久化状态只有 closed/open；half_open 是读取时按冷却推导的
 * 一次性试探，避免改动台账 schema 版本导致历史文件校验失败。
 */
export function evaluateAutoCompactCircuitAdmission(ledger: any = {}, options: any = {}) {
  const nowMs = Number(options.nowMs || Date.now());
  const cooldownBaseMs = Number(options.cooldownMs || GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_COOLDOWN_MS);
  const state = String(ledger?.state || "closed");
  const failureMode: AutoCompactFailureMode = ["transient", "structural", "cancelled"].includes(String(ledger?.failure_mode || ""))
    ? ledger.failure_mode
    : "transient";
  const openCount = Math.max(1, Number(ledger?.open_count || 1));
  const cooldownMs = autoCompactCircuitCooldownMs(openCount, cooldownBaseMs);
  const referenceMs = timeMs(ledger?.last_failure_at) || timeMs(ledger?.opened_at);
  const elapsedMs = referenceMs > 0 ? Math.max(0, nowMs - referenceMs) : Number.POSITIVE_INFINITY;
  const retryAtMs = referenceMs > 0 ? referenceMs + cooldownMs : 0;

  if (ledger?.blocked !== true && state === "closed") {
    return {
      schema: "ccm-group-memory-auto-compact-circuit-admission-v1",
      allowed: true,
      effectiveState: "closed",
      probe: false,
      failureMode,
      reason: "circuit_closed",
      cooldownMs,
      elapsedMs,
      retryAt: retryAtMs ? new Date(retryAtMs).toISOString() : "",
    };
  }

  // 台账损坏/跨会话污染只能人工重置，自动试探会掩盖问题。
  if (state === "fail_closed") {
    return {
      schema: "ccm-group-memory-auto-compact-circuit-admission-v1",
      allowed: false,
      effectiveState: "fail_closed",
      probe: false,
      failureMode,
      reason: "auto_compact_circuit_fail_closed_requires_manual_reset",
      cooldownMs,
      elapsedMs,
      retryAt: "",
    };
  }

  if (failureMode === "structural") {
    return {
      schema: "ccm-group-memory-auto-compact-circuit-admission-v1",
      allowed: false,
      effectiveState: "open",
      probe: false,
      failureMode,
      reason: "auto_compact_circuit_open_structural_requires_manual_reset",
      cooldownMs,
      elapsedMs,
      retryAt: "",
    };
  }

  if (elapsedMs >= cooldownMs) {
    return {
      schema: "ccm-group-memory-auto-compact-circuit-admission-v1",
      allowed: true,
      effectiveState: "half_open",
      probe: true,
      failureMode,
      reason: "auto_compact_circuit_half_open_probe",
      cooldownMs,
      elapsedMs,
      retryAt: retryAtMs ? new Date(retryAtMs).toISOString() : "",
    };
  }

  return {
    schema: "ccm-group-memory-auto-compact-circuit-admission-v1",
    allowed: false,
    effectiveState: "open",
    probe: false,
    failureMode,
    reason: "auto_compact_circuit_open_cooling_down",
    cooldownMs,
    elapsedMs,
    retryAt: retryAtMs ? new Date(retryAtMs).toISOString() : "",
  };
}

/**
 * 展示态：把「真正阻断调度的硬熔断」与「模型摘要降级的软计数」分开，
 * 供 API 与前端使用，避免二者互相冒充。
 */
export function buildAutoCompactCircuitDisplayState(input: any = {}) {
  const hardLedger = input.autoCompactCircuitBreaker || input.auto_compact_circuit_breaker || {};
  const hardFailures = Math.max(0, Number(hardLedger.consecutiveFailures ?? hardLedger.consecutive_failures ?? 0));
  const hardLimit = Math.max(1, Number(hardLedger.maxConsecutiveFailures ?? hardLedger.max_consecutive_failures ?? 3));
  // 部分台账（如 finalDispatchReactiveCompactCircuitBreaker）只记计数不记状态，
  // 这里按计数补齐，避免硬熔断被当成 closed。
  const hardState = String(hardLedger.state || (hardFailures >= hardLimit ? "open" : "closed"));
  const admission = evaluateAutoCompactCircuitAdmission(
    {
      state: hardState,
      failure_mode: hardLedger.failureMode || hardLedger.failure_mode,
      open_count: hardLedger.openCount ?? hardLedger.open_count,
      opened_at: hardLedger.openedAt || hardLedger.opened_at,
      last_failure_at: hardLedger.lastFailureAt || hardLedger.last_failure_at,
      blocked: hardState !== "closed",
    },
    { nowMs: input.nowMs }
  );
  const softFailures = Math.max(0, Number(input.summaryFallbackFailures || 0));
  const softLimit = Math.max(1, Number(input.summaryFallbackLimit || 3));
  return {
    schema: "ccm-group-memory-auto-compact-circuit-display-v1",
    // 硬熔断：自动压缩已被阻断
    circuitOpen: hardState === "open" || hardState === "fail_closed",
    circuitState: hardState,
    circuitEffectiveState: admission.effectiveState,
    circuitFailureMode: admission.failureMode,
    circuitConsecutiveFailures: hardFailures,
    circuitAutoRetryAt: admission.retryAt,
    circuitRequiresManualReset: !admission.allowed && !admission.retryAt,
    // 软降级：压缩成功但摘要回退到确定性算法
    summaryDegraded: softFailures >= softLimit,
    summaryFallbackFailures: softFailures,
    summaryFallbackLimit: softLimit,
  };
}
