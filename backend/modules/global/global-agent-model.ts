import { callAnthropicCompatibleChat, callNativeAgentTurn, callOpenAiCompatibleChat, normalizeAnthropicMessagesUrl, normalizeChatCompletionsUrl, shouldUseAnthropic } from "../collaboration/group-orchestrator-llm-client";
import { ModelRetryProfileId, runModelCallWithRetry, shouldRetryModelCallError } from "../../system/model-call-retry";
import { compactPetText } from "./global-agent-test-agent-display";

export async function callLlm(
  config: any,
  messages: any[],
  options: {
    onUsage?: (usage: any) => void;
    onDelta?: (delta: string) => void;
    providerContextCache?: any;
    onProviderContextCache?: (receipt: any) => void;
    retryProfile?: ModelRetryProfileId;
    signal?: AbortSignal;
    onRetry?: (notice: any) => void;
    maxTokens?: number;
    nativeTools?: any[];
    nativeToolReference?: boolean;
    onProviderAgentTurn?: (turn: any) => void;
  } = {},
): Promise<string> {
  const requestBytes = Buffer.byteLength(JSON.stringify(messages));
  const maxRequestBytes = 512 * 1024;
  if (requestBytes > maxRequestBytes) {
    throw new Error(`统一大模型请求上下文过大：${requestBytes} bytes，安全上限 ${maxRequestBytes} bytes`);
  }

  if (options.nativeTools?.length) {
    const turn = await callNativeAgentTurn(config, {
      messages,
      nativeTools: options.nativeTools,
      nativeToolReference: options.nativeToolReference,
      maxTokens: options.maxTokens || 4096,
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
      onProviderAgentTurn: options.onProviderAgentTurn,
    });
    if (turn.toolCalls.length) {
      return JSON.stringify({
        state: "investigate",
        message: turn.text,
        tool: { name: turn.toolCalls[0].name, arguments: turn.toolCalls[0].arguments },
        tools: turn.toolCalls,
      });
    }
    return JSON.stringify({ state: "answer", message: turn.text, tool: null });
  }

  if (shouldUseAnthropic(config)) {
    const system = messages.find(message => message.role === "system")?.content || "";
    const userMessages = messages
      .filter(message => message.role !== "system")
      .map(message => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));
    return callAnthropicCompatibleChat(config, {
      system,
      messages: userMessages,
      maxTokens: options.maxTokens || 2000,
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

  return callOpenAiCompatibleChat(config, {
    messages,
    temperature: 0.3,
    maxTokens: options.maxTokens || 2000,
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

export function shouldRetryGlobalModelError(error: any) {
  return shouldRetryModelCallError(error);
}

export async function callGlobalModelWithRetry(config: any, messages: any[], options: {
  attempts?: number;
  delayMs?: number;
  onUsage?: (usage: any) => void;
  onDelta?: (delta: string) => void;
  providerContextCache?: any;
  onProviderContextCache?: (receipt: any) => void;
  retryProfile?: ModelRetryProfileId;
  signal?: AbortSignal;
  onRetry?: (notice: any) => void;
  call?: (config: any, messages: any[]) => Promise<string>;
} = {}) {
  if (!options.call) return callLlm(config, messages, {
    onUsage: options.onUsage,
    onDelta: options.onDelta,
    providerContextCache: options.providerContextCache,
    onProviderContextCache: options.onProviderContextCache,
    retryProfile: options.retryProfile,
    signal: options.signal,
    onRetry: options.onRetry,
  });
  const call = options.call;
  return runModelCallWithRetry(
    () => call(config, messages),
    {
      profile: options.retryProfile || "long_running_task",
      attempts: options.attempts,
      baseDelayMs: options.delayMs,
      signal: options.signal,
      scope: "全局 Agent 模型调用",
      onRetry: options.onRetry || (notice => console.warn(`[全局 Agent] 统一大模型调用暂时失败，正在重试（${notice.attempt + 1}/${notice.maxAttempts}）：${compactPetText(notice.error?.message || notice.error, 240)}`)),
    },
  );
}

export async function runGlobalModelRetrySelfTest() {
  let transientCalls = 0;
  const transient = await callGlobalModelWithRetry({}, [], {
    attempts: 2,
    delayMs: 0,
    call: async () => {
      transientCalls += 1;
      if (transientCalls === 1) throw new Error("统一大模型 API 调用失败: HTTP 503 - temporary");
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
  } catch {
    permanentRejected = true;
  }
  const checks = {
    transientFailureRetriesOnce: transient === "ok" && transientCalls === 2,
    permanentClientErrorDoesNotRetry: permanentRejected && permanentCalls === 1,
    openAiBaseUrlUsesV1Endpoint: normalizeChatCompletionsUrl("https://provider.example") === "https://provider.example/v1/chat/completions",
    anthropicBaseUrlUsesV1Endpoint: normalizeAnthropicMessagesUrl("https://provider.example") === "https://provider.example/v1/messages",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
