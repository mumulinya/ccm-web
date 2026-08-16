export const UNIFIED_MODEL_MAX_ATTEMPTS = 5;
export const UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS = 30_000;
export const UNIFIED_MODEL_TOTAL_TIMEOUT_MS = 180_000;

export type ModelRetryProfileId =
  | "interactive_first_turn"
  | "agent_orchestration"
  | "long_running_task"
  | "background_auxiliary";

export type ModelRetryProfileV1 = {
  schema: "ccm-model-retry-profile-v1";
  id: ModelRetryProfileId;
  maxAttempts: number;
  attemptTimeoutMs: number;
  totalTimeoutMs: number;
};

const RETRY_PROFILES: Record<ModelRetryProfileId, Omit<ModelRetryProfileV1, "attemptTimeoutMs"> & { attemptTimeoutCapMs: number }> = {
  // Fast HTTP failures still retry immediately. The attempt cap must also cover a
  // healthy streaming completion: gpt-class replies of ~4k tokens commonly take
  // 70–90s. The previous 60s cap aborted those in-flight streams and surfaced
  // “模型这次没有完成回复”, while the provider continued and billed the full turn.
  interactive_first_turn: { schema: "ccm-model-retry-profile-v1", id: "interactive_first_turn", maxAttempts: 2, attemptTimeoutCapMs: 180_000, totalTimeoutMs: 180_000 },
  agent_orchestration: { schema: "ccm-model-retry-profile-v1", id: "agent_orchestration", maxAttempts: 3, attemptTimeoutCapMs: 180_000, totalTimeoutMs: 180_000 },
  long_running_task: { schema: "ccm-model-retry-profile-v1", id: "long_running_task", maxAttempts: 5, attemptTimeoutCapMs: 360_000, totalTimeoutMs: 360_000 },
  background_auxiliary: { schema: "ccm-model-retry-profile-v1", id: "background_auxiliary", maxAttempts: 1, attemptTimeoutCapMs: 30_000, totalTimeoutMs: 30_000 },
};

export function resolveModelRetryProfile(
  id: ModelRetryProfileId = "long_running_task",
  configuredAttemptTimeoutMs = UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS,
): ModelRetryProfileV1 {
  const source = RETRY_PROFILES[id] || RETRY_PROFILES.long_running_task;
  return {
    schema: source.schema,
    id: source.id,
    maxAttempts: source.maxAttempts,
    attemptTimeoutMs: Math.max(1_000, Math.min(source.attemptTimeoutCapMs, Number(configuredAttemptTimeoutMs) || UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS)),
    totalTimeoutMs: source.totalTimeoutMs,
  };
}

export type ModelCallRetryContext = {
  attempt: number;
  maxAttempts: number;
  attemptTimeoutMs: number;
  elapsedMs: number;
  signal: AbortSignal;
  profile: ModelRetryProfileId;
};

export type ModelCallRetryNotice = Omit<ModelCallRetryContext, "signal"> & {
  delayMs: number;
  error: any;
};

export type ModelCallRetryOptions = {
  profile?: ModelRetryProfileId;
  attempts?: number;
  attemptTimeoutMs?: number;
  totalTimeoutMs?: number;
  baseDelayMs?: number;
  scope?: string;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (notice: ModelCallRetryNotice) => void;
  signal?: AbortSignal;
};

const RETRYABLE_HTTP_STATUS = new Set([408, 409, 425, 429]);
const NON_RETRYABLE_HTTP_STATUS = new Set([400, 401, 403, 404, 405, 410, 413, 415, 422]);

function errorText(error: any) {
  return String(error?.message || error || "unknown model error").trim();
}

function httpStatus(error: any) {
  const direct = Number(error?.status || error?.statusCode || 0);
  if (direct >= 100 && direct <= 599) return direct;
  return Number(errorText(error).match(/\bHTTP\s+(\d{3})\b/i)?.[1] || 0);
}

export function shouldRetryModelCallError(error: any) {
  if ([
    "CCM_MODEL_CALL_CANCELLED",
    "CCM_MODEL_CALL_ACTIVITY_FAILED",
    "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA",
  ].includes(String(error?.code || ""))) return false;
  const status = httpStatus(error);
  if (NON_RETRYABLE_HTTP_STATUS.has(status)) return false;
  if (RETRYABLE_HTTP_STATUS.has(status) || status >= 500) return true;

  const message = errorText(error).toLowerCase();
  if (/api (?:url|key)|模型未配置|model.+not configured|统一模型已关闭|上下文过大|安全上限|context.+(?:too large|limit)|权限|授权/.test(message)) {
    return false;
  }
  if (/aborterror|aborted|timeout|timed out|econnreset|econnrefused|enotfound|eai_again|etimedout|fetch failed|network|网络请求失败|socket|connection|overload|unavailable|temporar|模型返回空响应|empty (?:model )?response|无效 json|有效 json|json parse|unexpected token/.test(message)) {
    return true;
  }
  return status === 0;
}

function compactError(error: any) {
  return errorText(error)
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/ig, "$1[REDACTED]")
    .replace(/((?:api[_ -]?key|x-api-key)\s*[:=]\s*)[^\s,;]+/ig, "$1[REDACTED]")
    .slice(0, 360);
}

function cancellationError(reason?: any) {
  const error: any = new Error(String(reason?.message || reason || "模型调用已取消"));
  error.code = "CCM_MODEL_CALL_CANCELLED";
  return error;
}

function abortableSleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(cancellationError(signal.reason));
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(cancellationError(signal?.reason));
    };
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function retryAfterMs(error: any) {
  const direct = Number(error?.retryAfterMs || error?.retry_after_ms || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const seconds = Number(error?.retryAfter || error?.retry_after || 0);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 0;
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  scope: string,
  parentSignal?: AbortSignal,
) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parentSignal?.reason || cancellationError());
  if (parentSignal?.aborted) throw cancellationError(parentSignal.reason);
  parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  const timer = setTimeout(() => controller.abort(Object.assign(new Error(`${scope} timeout after ${timeoutMs}ms`), { code: "CCM_MODEL_ATTEMPT_TIMEOUT" })), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error: any) {
    if (parentSignal?.aborted) throw cancellationError(parentSignal.reason);
    if (controller.signal.aborted && error?.code !== "CCM_MODEL_CALL_CANCELLED") {
      const timeoutError: any = new Error(`${scope} timeout after ${timeoutMs}ms`);
      timeoutError.code = "CCM_MODEL_ATTEMPT_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

export async function runModelCallWithRetry<T>(
  call: (context: ModelCallRetryContext) => Promise<T>,
  options: ModelCallRetryOptions = {},
): Promise<T> {
  const configuredTimeout = Math.max(1_000, Number(options.attemptTimeoutMs) || UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS);
  const profile = resolveModelRetryProfile(options.profile || "long_running_task", configuredTimeout);
  const maxAttempts = Math.max(1, Math.min(
    profile.maxAttempts,
    Math.floor(Number(options.attempts) || profile.maxAttempts),
  ));
  const configuredAttemptTimeoutMs = profile.attemptTimeoutMs;
  const requestedTotal = Number(options.totalTimeoutMs);
  const totalTimeoutMs = Math.max(1_000, Math.min(profile.totalTimeoutMs, Number.isFinite(requestedTotal) && requestedTotal > 0 ? requestedTotal : profile.totalTimeoutMs));
  const baseDelayMs = Math.max(0, Math.min(5_000, Number(options.baseDelayMs ?? 500)));
  const scope = String(options.scope || "model call").trim() || "model call";
  const shouldRetry = options.shouldRetry || shouldRetryModelCallError;
  const startedAt = Date.now();
  let lastError: any = null;
  let completedAttempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options.signal?.aborted) throw cancellationError(options.signal.reason);
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = totalTimeoutMs - elapsedMs;
    if (remainingMs <= 0) break;
    const attemptTimeoutMs = Math.max(1, Math.min(configuredAttemptTimeoutMs, remainingMs));
    completedAttempts = attempt;
    try {
      return await withTimeout(
        signal => call({ attempt, maxAttempts, attemptTimeoutMs, elapsedMs, signal, profile: profile.id }),
        attemptTimeoutMs,
        scope,
        options.signal,
      );
    } catch (error: any) {
      lastError = error;
      if (!shouldRetry(error)) {
        if (error && typeof error === "object") {
          error.attempts = Number(error.attempts) || attempt;
          error.maxAttempts = Number(error.maxAttempts) || maxAttempts;
          error.elapsedMs = Number(error.elapsedMs) || (Date.now() - startedAt);
          error.attemptTimeoutMs = Number(error.attemptTimeoutMs) || configuredAttemptTimeoutMs;
          error.totalTimeoutMs = Number(error.totalTimeoutMs) || totalTimeoutMs;
        }
        throw error;
      }
      if (attempt >= maxAttempts) break;
      const remainingBudgetMs = Math.max(0, totalTimeoutMs - (Date.now() - startedAt));
      const delayMs = Math.min(Math.max(baseDelayMs * 2 ** (attempt - 1), retryAfterMs(error)), remainingBudgetMs);
      options.onRetry?.({ attempt, maxAttempts, attemptTimeoutMs, elapsedMs: Date.now() - startedAt, profile: profile.id, delayMs, error });
      await abortableSleep(delayMs, options.signal);
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const exhaustedError: any = new Error(`${scope}失败：已完成 ${completedAttempts} 次尝试，总耗时 ${elapsedMs}ms；最后错误：${compactError(lastError)}`);
  exhaustedError.code = "CCM_MODEL_RETRY_EXHAUSTED";
  exhaustedError.attempts = completedAttempts;
  exhaustedError.maxAttempts = maxAttempts;
  exhaustedError.elapsedMs = elapsedMs;
  exhaustedError.attemptTimeoutMs = configuredAttemptTimeoutMs;
  exhaustedError.totalTimeoutMs = totalTimeoutMs;
  exhaustedError.lastErrorCode = String(lastError?.code || "");
  exhaustedError.retryProfile = profile.id;
  exhaustedError.retryable = true;
  throw exhaustedError;
}

export async function runModelCallRetrySelfTest() {
  let transientCalls = 0;
  const transient = await runModelCallWithRetry(async () => {
    transientCalls += 1;
    if (transientCalls < 5) throw new Error("HTTP 503 temporary unavailable");
    return "ok";
  }, { baseDelayMs: 0, attemptTimeoutMs: 1_000, totalTimeoutMs: 10_000 });

  let permanentCalls = 0;
  let permanentRejected = false;
  try {
    await runModelCallWithRetry(async () => {
      permanentCalls += 1;
      throw new Error("HTTP 401 unauthorized");
    }, { baseDelayMs: 0, attemptTimeoutMs: 1_000, totalTimeoutMs: 10_000 });
  } catch {
    permanentRejected = true;
  }

  const checks = {
    transientUsesFiveAttempts: transient === "ok" && transientCalls === 5,
    permanentFailureStopsImmediately: permanentRejected && permanentCalls === 1,
    timeoutIsRetryable: shouldRetryModelCallError(new Error("AbortError: request timeout")),
    invalidJsonIsRetryable: shouldRetryModelCallError(new Error("模型未返回有效 JSON")),
    missingKeyIsPermanent: !shouldRetryModelCallError(new Error("主 Agent API Key 未配置")),
    emittedStreamDoesNotRetry: !shouldRetryModelCallError(Object.assign(new Error("socket closed"), { code: "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA" })),
    interactiveFirstTurnHonorsConfiguredTimeout: resolveModelRetryProfile("interactive_first_turn", 120_000).attemptTimeoutMs === 120_000,
    orchestrationHonorsConfiguredTimeout: resolveModelRetryProfile("agent_orchestration", 120_000).attemptTimeoutMs === 120_000,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
