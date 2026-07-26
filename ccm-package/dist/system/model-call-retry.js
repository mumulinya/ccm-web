"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIFIED_MODEL_TOTAL_TIMEOUT_MS = exports.UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS = exports.UNIFIED_MODEL_MAX_ATTEMPTS = void 0;
exports.shouldRetryModelCallError = shouldRetryModelCallError;
exports.runModelCallWithRetry = runModelCallWithRetry;
exports.runModelCallRetrySelfTest = runModelCallRetrySelfTest;
exports.UNIFIED_MODEL_MAX_ATTEMPTS = 5;
exports.UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS = 30_000;
exports.UNIFIED_MODEL_TOTAL_TIMEOUT_MS = 180_000;
const RETRYABLE_HTTP_STATUS = new Set([408, 409, 425, 429]);
const NON_RETRYABLE_HTTP_STATUS = new Set([400, 401, 403, 404, 405, 410, 413, 415, 422]);
function errorText(error) {
    return String(error?.message || error || "unknown model error").trim();
}
function httpStatus(error) {
    const direct = Number(error?.status || error?.statusCode || 0);
    if (direct >= 100 && direct <= 599)
        return direct;
    return Number(errorText(error).match(/\bHTTP\s+(\d{3})\b/i)?.[1] || 0);
}
function shouldRetryModelCallError(error) {
    if ([
        "CCM_MODEL_CALL_CANCELLED",
        "CCM_MODEL_CALL_ACTIVITY_FAILED",
        "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA",
    ].includes(String(error?.code || "")))
        return false;
    const status = httpStatus(error);
    if (NON_RETRYABLE_HTTP_STATUS.has(status))
        return false;
    if (RETRYABLE_HTTP_STATUS.has(status) || status >= 500)
        return true;
    const message = errorText(error).toLowerCase();
    if (/api (?:url|key)|模型未配置|model.+not configured|统一模型已关闭|上下文过大|安全上限|context.+(?:too large|limit)|权限|授权/.test(message)) {
        return false;
    }
    if (/aborterror|aborted|timeout|timed out|econnreset|econnrefused|enotfound|eai_again|etimedout|fetch failed|network|网络请求失败|socket|connection|overload|unavailable|temporar|模型返回空响应|empty (?:model )?response|无效 json|有效 json|json parse|unexpected token/.test(message)) {
        return true;
    }
    return status === 0;
}
function compactError(error) {
    return errorText(error)
        .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/ig, "$1[REDACTED]")
        .replace(/((?:api[_ -]?key|x-api-key)\s*[:=]\s*)[^\s,;]+/ig, "$1[REDACTED]")
        .slice(0, 360);
}
function sleep(ms) {
    return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}
async function withTimeout(operation, timeoutMs, scope) {
    let timer = null;
    const timeout = new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${scope} timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
        return await Promise.race([operation, timeout]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
async function runModelCallWithRetry(call, options = {}) {
    const maxAttempts = Math.max(1, Math.min(exports.UNIFIED_MODEL_MAX_ATTEMPTS, Math.floor(Number(options.attempts) || exports.UNIFIED_MODEL_MAX_ATTEMPTS)));
    const configuredAttemptTimeoutMs = Math.max(1_000, Number(options.attemptTimeoutMs) || exports.UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS);
    const totalTimeoutMs = Math.max(configuredAttemptTimeoutMs, Number(options.totalTimeoutMs) || exports.UNIFIED_MODEL_TOTAL_TIMEOUT_MS);
    const baseDelayMs = Math.max(0, Math.min(5_000, Number(options.baseDelayMs ?? 500)));
    const scope = String(options.scope || "model call").trim() || "model call";
    const shouldRetry = options.shouldRetry || shouldRetryModelCallError;
    const startedAt = Date.now();
    let lastError = null;
    let completedAttempts = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const elapsedMs = Date.now() - startedAt;
        const remainingMs = totalTimeoutMs - elapsedMs;
        if (remainingMs <= 0)
            break;
        const attemptTimeoutMs = Math.max(1, Math.min(configuredAttemptTimeoutMs, remainingMs));
        completedAttempts = attempt;
        try {
            return await withTimeout(call({ attempt, maxAttempts, attemptTimeoutMs, elapsedMs }), attemptTimeoutMs + 250, scope);
        }
        catch (error) {
            lastError = error;
            if (!shouldRetry(error))
                throw error;
            if (attempt >= maxAttempts)
                break;
            const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), Math.max(0, totalTimeoutMs - (Date.now() - startedAt)));
            options.onRetry?.({ attempt, maxAttempts, attemptTimeoutMs, elapsedMs: Date.now() - startedAt, delayMs, error });
            await sleep(delayMs);
        }
    }
    const elapsedMs = Date.now() - startedAt;
    throw new Error(`${scope}失败：已完成 ${completedAttempts} 次尝试，总耗时 ${elapsedMs}ms；最后错误：${compactError(lastError)}`);
}
async function runModelCallRetrySelfTest() {
    let transientCalls = 0;
    const transient = await runModelCallWithRetry(async () => {
        transientCalls += 1;
        if (transientCalls < 5)
            throw new Error("HTTP 503 temporary unavailable");
        return "ok";
    }, { baseDelayMs: 0, attemptTimeoutMs: 1_000, totalTimeoutMs: 10_000 });
    let permanentCalls = 0;
    let permanentRejected = false;
    try {
        await runModelCallWithRetry(async () => {
            permanentCalls += 1;
            throw new Error("HTTP 401 unauthorized");
        }, { baseDelayMs: 0, attemptTimeoutMs: 1_000, totalTimeoutMs: 10_000 });
    }
    catch {
        permanentRejected = true;
    }
    const checks = {
        transientUsesFiveAttempts: transient === "ok" && transientCalls === 5,
        permanentFailureStopsImmediately: permanentRejected && permanentCalls === 1,
        timeoutIsRetryable: shouldRetryModelCallError(new Error("AbortError: request timeout")),
        invalidJsonIsRetryable: shouldRetryModelCallError(new Error("模型未返回有效 JSON")),
        missingKeyIsPermanent: !shouldRetryModelCallError(new Error("主 Agent API Key 未配置")),
        emittedStreamDoesNotRetry: !shouldRetryModelCallError(Object.assign(new Error("socket closed"), { code: "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA" })),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=model-call-retry.js.map