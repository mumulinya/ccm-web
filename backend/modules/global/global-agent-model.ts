import { callAnthropicCompatibleChat, callOpenAiCompatibleChat, normalizeAnthropicMessagesUrl, normalizeChatCompletionsUrl, shouldUseAnthropic } from "../collaboration/group-orchestrator-llm-client";
import { shouldRetryModelCallError } from "../../system/model-call-retry";
import { compactPetText } from "./global-agent-test-agent-display";

export async function callLlm(
  config: any,
  messages: any[],
  options: { onUsage?: (usage: any) => void; onDelta?: (delta: string) => void } = {},
): Promise<string> {
  const requestBytes = Buffer.byteLength(JSON.stringify(messages));
  const maxRequestBytes = 512 * 1024;
  if (requestBytes > maxRequestBytes) {
    throw new Error(`统一大模型请求上下文过大：${requestBytes} bytes，安全上限 ${maxRequestBytes} bytes`);
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
      maxTokens: 2000,
      temperature: 0.3,
      defaultTimeoutMs: 60_000,
      httpErrorPrefix: "统一大模型 API 调用失败:",
      onUsage: options.onUsage,
      stream: typeof options.onDelta === "function",
      onDelta: options.onDelta,
    });
  }

  return callOpenAiCompatibleChat(config, {
    messages,
    temperature: 0.3,
    defaultTimeoutMs: 60_000,
    httpErrorPrefix: "统一大模型 API 调用失败:",
    onUsage: options.onUsage,
    stream: typeof options.onDelta === "function",
    onDelta: options.onDelta,
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
  call?: (config: any, messages: any[]) => Promise<string>;
} = {}) {
  if (!options.call) return callLlm(config, messages, { onUsage: options.onUsage, onDelta: options.onDelta });
  const attempts = Math.max(1, Math.min(5, Number(options.attempts || 5)));
  const delayMs = Math.max(0, Math.min(5_000, Number(options.delayMs ?? 500)));
  const call = options.call;
  let lastError: any = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await call(config, messages);
    } catch (error: any) {
      lastError = error;
      if (attempt >= attempts || !shouldRetryGlobalModelError(error)) throw error;
      console.warn(`[全局 Agent] 统一大模型调用暂时失败，正在重试（${attempt + 1}/${attempts}）：${compactPetText(error?.message || error, 240)}`);
      if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
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
