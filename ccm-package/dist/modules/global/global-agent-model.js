"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callLlm = callLlm;
exports.shouldRetryGlobalModelError = shouldRetryGlobalModelError;
exports.callGlobalModelWithRetry = callGlobalModelWithRetry;
exports.runGlobalModelRetrySelfTest = runGlobalModelRetrySelfTest;
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const model_call_retry_1 = require("../../system/model-call-retry");
const global_agent_test_agent_display_1 = require("./global-agent-test-agent-display");
async function callLlm(config, messages, options = {}) {
    const requestBytes = Buffer.byteLength(JSON.stringify(messages));
    const maxRequestBytes = 512 * 1024;
    if (requestBytes > maxRequestBytes) {
        throw new Error(`统一大模型请求上下文过大：${requestBytes} bytes，安全上限 ${maxRequestBytes} bytes`);
    }
    if ((0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)) {
        const system = messages.find(message => message.role === "system")?.content || "";
        const userMessages = messages
            .filter(message => message.role !== "system")
            .map(message => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
        }));
        return (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, {
            system,
            messages: userMessages,
            maxTokens: 2000,
            temperature: 0.3,
            defaultTimeoutMs: 60_000,
            httpErrorPrefix: "统一大模型 API 调用失败:",
            onUsage: options.onUsage,
            stream: typeof options.onDelta === "function",
            onDelta: options.onDelta,
            providerContextCache: options.providerContextCache,
            onProviderContextCache: options.onProviderContextCache,
            retryProfile: options.retryProfile,
            signal: options.signal,
            onRetry: options.onRetry,
        });
    }
    return (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, {
        messages,
        temperature: 0.3,
        defaultTimeoutMs: 60_000,
        httpErrorPrefix: "统一大模型 API 调用失败:",
        onUsage: options.onUsage,
        stream: typeof options.onDelta === "function",
        onDelta: options.onDelta,
        providerContextCache: options.providerContextCache,
        onProviderContextCache: options.onProviderContextCache,
        retryProfile: options.retryProfile,
        signal: options.signal,
        onRetry: options.onRetry,
    });
}
function shouldRetryGlobalModelError(error) {
    return (0, model_call_retry_1.shouldRetryModelCallError)(error);
}
async function callGlobalModelWithRetry(config, messages, options = {}) {
    if (!options.call)
        return callLlm(config, messages, {
            onUsage: options.onUsage,
            onDelta: options.onDelta,
            providerContextCache: options.providerContextCache,
            onProviderContextCache: options.onProviderContextCache,
            retryProfile: options.retryProfile,
            signal: options.signal,
            onRetry: options.onRetry,
        });
    const call = options.call;
    return (0, model_call_retry_1.runModelCallWithRetry)(() => call(config, messages), {
        profile: options.retryProfile || "long_running_task",
        attempts: options.attempts,
        baseDelayMs: options.delayMs,
        signal: options.signal,
        scope: "全局 Agent 模型调用",
        onRetry: options.onRetry || (notice => console.warn(`[全局 Agent] 统一大模型调用暂时失败，正在重试（${notice.attempt + 1}/${notice.maxAttempts}）：${(0, global_agent_test_agent_display_1.compactPetText)(notice.error?.message || notice.error, 240)}`)),
    });
}
async function runGlobalModelRetrySelfTest() {
    let transientCalls = 0;
    const transient = await callGlobalModelWithRetry({}, [], {
        attempts: 2,
        delayMs: 0,
        call: async () => {
            transientCalls += 1;
            if (transientCalls === 1)
                throw new Error("统一大模型 API 调用失败: HTTP 503 - temporary");
            return "ok";
        },
    });
    let permanentCalls = 0;
    let permanentRejected = false;
    try {
        await callGlobalModelWithRetry({}, [], {
            attempts: 2,
            delayMs: 0,
            call: async () => {
                permanentCalls += 1;
                throw new Error("统一大模型 API 调用失败: HTTP 400 - invalid request");
            },
        });
    }
    catch {
        permanentRejected = true;
    }
    const checks = {
        transientFailureRetriesOnce: transient === "ok" && transientCalls === 2,
        permanentClientErrorDoesNotRetry: permanentRejected && permanentCalls === 1,
        openAiBaseUrlUsesV1Endpoint: (0, group_orchestrator_llm_client_1.normalizeChatCompletionsUrl)("https://provider.example") === "https://provider.example/v1/chat/completions",
        anthropicBaseUrlUsesV1Endpoint: (0, group_orchestrator_llm_client_1.normalizeAnthropicMessagesUrl)("https://provider.example") === "https://provider.example/v1/messages",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=global-agent-model.js.map