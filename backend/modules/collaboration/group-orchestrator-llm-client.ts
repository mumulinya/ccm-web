export type LlmChatMessage = {
  role: string;
  content: string;
};

type LlmCallOptions = {
  messages: LlmChatMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  defaultTimeoutMs?: number;
  httpErrorPrefix?: string;
  invalidJsonMessage?: string;
};

export function normalizeChatCompletionsUrl(apiUrl: string) {
  const base = String(apiUrl || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  if (/\/v1\//i.test(base)) return base;
  return `${base}/v1/chat/completions`;
}

export function normalizeAnthropicMessagesUrl(apiUrl: string) {
  const base = String(apiUrl || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  if (/\/v1\/messages$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/messages`;
  if (/\/v1\//i.test(base)) return base;
  return `${base}/v1/messages`;
}

export function shouldUseAnthropic(config: any) {
  const format = String(config.format || "auto");
  const apiUrl = String(config.apiUrl || "").toLowerCase();
  return format === "anthropic-compatible"
    || format === "auto" && apiUrl.includes("anthropic")
    || format === "openai-compatible" && /\/anthropic(?:\/|$)/i.test(apiUrl);
}

export function extractJsonObject(text: string) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return null;
}

function resolveTimeoutMs(config: any, defaultTimeoutMs: number) {
  return Math.max(5000, Number(config.timeoutMs) || defaultTimeoutMs);
}

function resolveTemperature(config: any, fallback: number) {
  return Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : fallback;
}

function assertLlmConfig(config: any, endpoint: string) {
  if (!endpoint) throw new Error("主 Agent API URL 未配置");
  if (!config.apiKey) throw new Error("主 Agent API Key 未配置");
  if (!config.model) throw new Error("主 Agent 模型未配置");
}

function formatHttpError(prefix: string, status: number, text: string) {
  const detail = String(text || "").slice(0, 300);
  return detail ? `${prefix} HTTP ${status}: ${detail}` : `${prefix} HTTP ${status}`;
}

export async function callOpenAiCompatibleChat(config: any, options: LlmCallOptions) {
  const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
  assertLlmConfig(config, endpoint);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(config, options.defaultTimeoutMs || 30000));
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: options.temperature ?? resolveTemperature(config, 0.2),
        messages: options.messages,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
    }
    const data = JSON.parse(text);
    return String(data?.choices?.[0]?.message?.content || "");
  } finally {
    clearTimeout(timeout);
  }
}

export async function callAnthropicCompatibleChat(config: any, options: LlmCallOptions) {
  const endpoint = normalizeAnthropicMessagesUrl(config.apiUrl);
  assertLlmConfig(config, endpoint);

  const messages = options.messages || [];
  const system = options.system ?? (messages.find((m: any) => m.role === "system")?.content || "");
  const userMessages = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(config, options.defaultTimeoutMs || 30000));
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature ?? resolveTemperature(config, 0.2),
        system,
        messages: userMessages,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
    }
    const data = JSON.parse(text);
    return (data?.content || [])
      .map((part: any) => part?.type === "text" ? part.text : "")
      .join("")
      .trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOpenAiCompatibleJson(config: any, options: LlmCallOptions) {
  const content = await callOpenAiCompatibleChat(config, options);
  const parsed = extractJsonObject(content);
  if (!parsed) throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
  return parsed;
}

export async function callAnthropicCompatibleJson(config: any, options: LlmCallOptions) {
  const content = await callAnthropicCompatibleChat(config, options);
  const parsed = extractJsonObject(content);
  if (!parsed) throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
  return parsed;
}
