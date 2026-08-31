"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOREGROUND_MODEL_MAX_ATTEMPTS = exports.FOREGROUND_MODEL_MAX_RETRIES = void 0;
exports.providerRetryCountFromError = providerRetryCountFromError;
exports.isProviderUnavailableError = isProviderUnavailableError;
exports.modelRequestFailureEvidence = modelRequestFailureEvidence;
exports.classifyModelFailure = classifyModelFailure;
exports.modelProviderFailurePresentation = modelProviderFailurePresentation;
exports.FOREGROUND_MODEL_MAX_RETRIES = 5;
exports.FOREGROUND_MODEL_MAX_ATTEMPTS = exports.FOREGROUND_MODEL_MAX_RETRIES + 1;
function providerRetryCountFromError(error) {
    const explicit = Number(error?.providerRetryCount ?? error?.provider_retry_count ?? error?.retryCount ?? error?.retry_count);
    if (Number.isFinite(explicit) && explicit >= 0)
        return Math.min(exports.FOREGROUND_MODEL_MAX_RETRIES, Math.floor(explicit));
    const attempts = Number(error?.attempts ?? error?.completedAttempts ?? error?.completed_attempts);
    if (Number.isFinite(attempts) && attempts > 0)
        return Math.min(exports.FOREGROUND_MODEL_MAX_RETRIES, Math.max(0, Math.floor(attempts) - 1));
    return 0;
}
function isProviderUnavailableError(error) {
    const source = `${String(error?.code || "")} ${String(error?.message || error || "")} ${String(error?.lastErrorCode || "")}`;
    return /CCM_MODEL_RETRY_EXHAUSTED|HTTP\s*(?:429|50[0234]|529)|service temporarily unavailable|timeout|timed out|ECONNRESET|ECONNREFUSED|EPIPE|模型服务.*不可用|大模型.*不可用|provider.*unavailable|模型返回空响应|empty (?:model )?response|overloaded/i.test(source);
}
function nonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function modelRequestFailureEvidence(error) {
    const recorded = error?.providerRequestEvidence || {};
    const requestDispatchCount = Math.max(nonNegative(error?.requestDispatchCount), nonNegative(recorded?.requestDispatchCount));
    const responseStartedCount = Math.max(nonNegative(error?.responseStartedCount), nonNegative(recorded?.responseStartedCount));
    const retryCount = providerRetryCountFromError(error);
    const attemptCount = Math.max(nonNegative(error?.attemptCount), nonNegative(error?.attempts), nonNegative(recorded?.attemptCount), requestDispatchCount, requestDispatchCount > 0 ? retryCount + 1 : 0);
    return {
        attemptCount,
        retryCount,
        requestDispatchCount,
        responseStartedCount,
        providerRequestIdPresent: error?.providerRequestIdPresent === true || recorded?.providerRequestIdPresent === true,
        contentStored: false,
    };
}
function classifyModelFailure(error, evidence = modelRequestFailureEvidence(error)) {
    const code = String(error?.code || "");
    if (code === "CCM_MODEL_CALL_CANCELLED")
        return "user_cancelled";
    if (evidence.requestDispatchCount < 1)
        return "preparation_failed";
    if (evidence.responseStartedCount < 1)
        return "connection_timeout";
    return "provider_error";
}
function modelProviderFailurePresentation(error) {
    const evidence = modelRequestFailureEvidence(error);
    const retryCount = evidence.retryCount;
    const failureKind = classifyModelFailure(error, evidence);
    const timeout = /CCM_MODEL_ATTEMPT_TIMEOUT|timeout|timed out/i.test(`${String(error?.code || "")} ${String(error?.message || error || "")} ${String(error?.lastErrorCode || "")}`);
    const text = failureKind === "user_cancelled"
        ? "本次模型处理已停止。"
        : failureKind === "preparation_failed"
            ? "模型请求准备失败，请重试。"
            : failureKind === "connection_timeout"
                ? timeout
                    ? retryCount > 0
                        ? `连接模型服务超时，已重试 ${retryCount} 次，仍未收到响应。`
                        : "连接模型服务超时，未收到响应。"
                    : retryCount > 0
                        ? `无法连接模型服务，已重试 ${retryCount} 次。`
                        : "无法连接模型服务，请稍后重试。"
                : retryCount > 0
                    ? `模型服务暂时不可用，已重试 ${retryCount} 次，请稍后重试。`
                    : "模型服务返回错误，请稍后重试。";
    return {
        unavailable: failureKind === "connection_timeout" || failureKind === "provider_error",
        presentable: true,
        failureKind,
        ...evidence,
        retryCount,
        maxRetries: Math.max(0, Number(error?.maxAttempts || 0) - 1) || exports.FOREGROUND_MODEL_MAX_RETRIES,
        text,
    };
}
//# sourceMappingURL=model-retry-presentation.js.map