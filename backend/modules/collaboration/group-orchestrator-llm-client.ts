import * as http from "http";
import * as https from "https";
import {
  ModelCallRetryNotice,
  runModelCallWithRetry,
  UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS,
  UNIFIED_MODEL_TOTAL_TIMEOUT_MS,
} from "../../system/model-call-retry";
import { recordProviderNativeCompactExecutionReceipt } from "./provider-native-compact-execution-receipt";
import { verifyGroupApiMicrocompactNativeApplyPlan } from "./group-memory-compaction";
import { notifyGroupPromptCacheDeletion, recordGroupPromptCacheState } from "./group-prompt-cache-break-detection";

export type LlmChatMessage = {
  role: string;
  content: any;
};

export type LlmTokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reported: boolean;
  directInputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
};

export type LlmCallOptions = {
  messages: LlmChatMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  defaultTimeoutMs?: number;
  timeoutMs?: number;
  stream?: boolean;
  reasoningEffort?: "low" | "medium" | "high" | "off";
  httpErrorPrefix?: string;
  invalidJsonMessage?: string;
  apiMicrocompactNativeApplyPlan?: any;
  api_microcompact_native_apply_plan?: any;
  apiMicrocompactNativeApplyTelemetry?: any;
  api_microcompact_native_apply_telemetry?: any;
  promptCacheTracking?: any;
  prompt_cache_tracking?: any;
  onUsage?: (usage: LlmTokenUsage) => void;
  onDelta?: (delta: string) => void;
  retry?: boolean;
  retryAttempts?: number;
  retryBaseDelayMs?: number;
  retryTotalTimeoutMs?: number;
  retryScope?: string;
  onRetry?: (notice: ModelCallRetryNotice) => void;
};

function finiteTokenCount(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function normalizeLlmTokenUsage(value: any, provider: "openai" | "anthropic" = "openai"): LlmTokenUsage {
  const usage = value && typeof value === "object" ? value : {};
  const outputTokens = Math.max(
    finiteTokenCount(usage.output_tokens),
    finiteTokenCount(usage.outputTokens),
    finiteTokenCount(usage.completion_tokens),
    finiteTokenCount(usage.completionTokens),
  );
  const directInputTokens = Math.max(
    finiteTokenCount(usage.input_tokens),
    finiteTokenCount(usage.inputTokens),
    finiteTokenCount(usage.prompt_tokens),
    finiteTokenCount(usage.promptTokens),
  );
  const cacheCreationTokens = provider === "anthropic"
    ? Math.max(finiteTokenCount(usage.cache_creation_input_tokens), finiteTokenCount(usage.cacheCreationInputTokens))
    : 0;
  const cacheReadTokens = provider === "anthropic"
    ? Math.max(finiteTokenCount(usage.cache_read_input_tokens), finiteTokenCount(usage.cacheReadInputTokens))
    : 0;
  // Anthropic reports uncached input and cache buckets separately. Keep
  // inputTokens as the direct-input component so the shared CC-style
  // measurement can add each bucket exactly once.
  const inputTokens = directInputTokens;
  const reported = inputTokens > 0 || cacheCreationTokens > 0 || cacheReadTokens > 0 || outputTokens > 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + cacheCreationTokens + cacheReadTokens + outputTokens,
    reported,
    directInputTokens,
    cacheCreationInputTokens: cacheCreationTokens,
    cacheReadInputTokens: cacheReadTokens,
  };
}

function reportTokenUsage(options: LlmCallOptions, usage: LlmTokenUsage) {
  try { options.onUsage?.(usage); } catch {}
}

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

export function resolveLlmTimeoutMs(config: any, defaultTimeoutMs: number, callTimeoutMs?: number) {
  const scopedTimeout = Number(callTimeoutMs);
  if (Number.isFinite(scopedTimeout) && scopedTimeout > 0) return Math.max(5000, scopedTimeout);
  return Math.max(5000, Number(config.timeoutMs) || defaultTimeoutMs);
}

function resolveTemperature(config: any, fallback: number) {
  return Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : fallback;
}

const REASONING_EFFORTS = new Set(["low", "medium", "high"]);
const ANTHROPIC_THINKING_BUDGETS: Record<string, number> = {
  low: 1024,
  medium: 4096,
  high: 16000,
};

export function resolveReasoningEffort(config: any) {
  const effort = String(config?.reasoningEffort ?? config?.reasoning_effort ?? "off").trim().toLowerCase();
  return REASONING_EFFORTS.has(effort) ? effort : "off";
}

export function buildOpenAiReasoningFields(config: any) {
  const effort = resolveReasoningEffort(config);
  if (effort === "off") return {};
  // Chat Completions historically used flat reasoning_effort; GPT-5 / many relays
  // also accept (or only honor) the nested Responses-style reasoning.effort.
  // Send both with lowercase values — OpenAI enums are lowercase, not "High".
  return {
    reasoning_effort: effort,
    reasoning: { effort },
  };
}

function callReasoningConfig(config: any, options: LlmCallOptions) {
  const effort = String(options.reasoningEffort || "").trim().toLowerCase();
  return effort ? { ...config, reasoningEffort: effort, reasoning_effort: effort } : config;
}

function streamDeltaText(value: any) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map(item => typeof item === "string" ? item : String(item?.text || item?.content || "")).join("");
}

function emitStreamDelta(options: LlmCallOptions, value: any) {
  const delta = streamDeltaText(value);
  if (!delta) return "";
  options.onDelta?.(delta);
  return delta;
}

function markStreamInterrupted(error: any, emitted: boolean) {
  if (!emitted) return error;
  const normalized = error instanceof Error ? error : new Error(String(error || "模型流式响应中断"));
  (normalized as any).code = "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA";
  return normalized;
}

export function parseOpenAiStreamText(text: string) {
  const raw = String(text || "");
  if (!/^\s*(?:data:|event:)/m.test(raw)) return null;
  let content = "";
  let usage: any = null;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event = JSON.parse(payload);
      const choice = event?.choices?.[0];
      content += streamDeltaText(choice?.delta?.content ?? choice?.message?.content ?? "");
      if (event?.usage) usage = event.usage;
    } catch {}
  }
  return { content, usage };
}

export function buildAnthropicThinkingFields(config: any) {
  const effort = resolveReasoningEffort(config);
  if (effort === "off") return {};
  return {
    thinking: {
      type: "enabled",
      budget_tokens: ANTHROPIC_THINKING_BUDGETS[effort] || ANTHROPIC_THINKING_BUDGETS.medium,
    },
  };
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

function nativeHttpRequest(endpoint: string | URL, init: any = {}, redirectCount = 0): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = endpoint instanceof URL ? endpoint : new URL(String(endpoint));
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(url, {
      method: init.method || "GET",
      headers: init.headers || {},
      signal: init.signal,
    }, response => {
      const status = Number(response.statusCode || 0);
      const location = String(response.headers.location || "");
      if (location && [301, 302, 303, 307, 308].includes(status) && init.redirect !== "manual" && redirectCount < 5) {
        response.resume();
        const redirected = new URL(location, url);
        const nextInit = [301, 302, 303].includes(status) && String(init.method || "GET").toUpperCase() !== "GET"
          ? { ...init, method: "GET", body: undefined }
          : init;
        nativeHttpRequest(redirected, nextInit, redirectCount + 1).then(resolve, reject);
        return;
      }
      response.on("error", reject);
      let buffered: Promise<Buffer> | null = null;
      const readAll = () => {
        if (!buffered) {
          buffered = (async () => {
            const chunks: Buffer[] = [];
            for await (const chunk of response) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
          })();
        }
        return buffered;
      };
      resolve({
        ok: status >= 200 && status < 300,
        status,
        url: url.toString(),
        body: response,
        headers: {
          get(name: string) {
            const value = response.headers[String(name || "").toLowerCase()];
            return Array.isArray(value) ? value.join(", ") : String(value || "");
          },
        },
        async text() { return (await readAll()).toString("utf-8"); },
        async arrayBuffer() {
          const body = await readAll();
          return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
        },
      });
    });
    request.on("error", reject);
    if (init.body !== undefined && init.body !== null) request.write(init.body);
    request.end();
  });
}

async function* responseTextChunks(response: any): AsyncGenerator<string> {
  const body = response?.body;
  const decoder = new TextDecoder();
  if (body?.getReader) {
    const reader = body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        if (text) yield text;
      }
      const tail = decoder.decode();
      if (tail) yield tail;
    } finally {
      try { reader.releaseLock?.(); } catch {}
    }
    return;
  }
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    for await (const value of body) {
      const bytes = typeof value === "string" ? Buffer.from(value) : value;
      const text = decoder.decode(bytes, { stream: true });
      if (text) yield text;
    }
    const tail = decoder.decode();
    if (tail) yield tail;
    return;
  }
  const text = await response.text();
  if (text) yield text;
}

async function consumeSseJson(response: any, onPayload: (payload: any) => void) {
  let lineBuffer = "";
  let dataLines: string[] = [];
  let rawText = "";
  let payloadCount = 0;
  const flush = () => {
    if (!dataLines.length) return false;
    const payloadText = dataLines.join("\n").trim();
    dataLines = [];
    if (!payloadText || payloadText === "[DONE]") return payloadText === "[DONE]";
    onPayload(JSON.parse(payloadText));
    payloadCount += 1;
    return false;
  };
  for await (const chunk of responseTextChunks(response)) {
    rawText += chunk;
    lineBuffer += chunk;
    while (true) {
      const newline = lineBuffer.indexOf("\n");
      if (newline < 0) break;
      const line = lineBuffer.slice(0, newline).replace(/\r$/, "");
      lineBuffer = lineBuffer.slice(newline + 1);
      if (!line) {
        if (flush()) return;
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
  }
  const finalLine = lineBuffer.replace(/\r$/, "");
  if (finalLine.startsWith("data:")) dataLines.push(finalLine.slice(5).trimStart());
  flush();
  if (payloadCount === 0 && rawText.trim()) {
    onPayload(JSON.parse(rawText));
  }
}

export async function fetchWithNodeHttpFallback(endpoint: string | URL, init: any = {}) {
  try {
    return await fetch(endpoint, init);
  } catch (fetchError: any) {
    if (init.signal?.aborted) throw fetchError;
    try {
      return await nativeHttpRequest(endpoint, init);
    } catch (nativeError: any) {
      const fetchCause = fetchError?.cause?.message || fetchError?.cause?.code || fetchError?.message || String(fetchError);
      const nativeCause = nativeError?.message || String(nativeError);
      throw new Error(`网络请求失败：${fetchCause}；原生 HTTP/HTTPS 重试失败：${nativeCause}`);
    }
  }
}

function getApiMicrocompactNativeApplyPlan(options: LlmCallOptions) {
  return options.apiMicrocompactNativeApplyPlan || options.api_microcompact_native_apply_plan || null;
}

function getApiMicrocompactNativeTelemetryOptions(options: LlmCallOptions) {
  return options.apiMicrocompactNativeApplyTelemetry || options.api_microcompact_native_apply_telemetry || {};
}

function getHeaderKey(headers: Record<string, string>, name: string) {
  const wanted = name.toLowerCase();
  return Object.keys(headers).find(key => key.toLowerCase() === wanted) || name;
}

function appendCsvHeader(headers: Record<string, string>, name: string, values: string[]) {
  const cleanValues = values.map(value => String(value || "").trim()).filter(Boolean);
  if (!cleanValues.length) return headers;
  const key = getHeaderKey(headers, name);
  const existing = String(headers[key] || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  headers[key] = Array.from(new Set([...existing, ...cleanValues])).join(",");
  return headers;
}

function applyApiMicrocompactNativeRequestPatch(bodyObj: any, headers: Record<string, string>, options: LlmCallOptions) {
  const plan = getApiMicrocompactNativeApplyPlan(options);
  const requestPatch = plan?.requestPatch || plan?.request_patch || null;
  const contextManagement = requestPatch?.body?.context_management;
  const betaHeaders = Array.isArray(requestPatch?.beta_headers || requestPatch?.betaHeaders)
    ? (requestPatch.beta_headers || requestPatch.betaHeaders).map((item: any) => String(item || "").trim()).filter(Boolean)
    : [];
  const verification = verifyGroupApiMicrocompactNativeApplyPlan(plan || {});
  const canApply = plan?.nativeApplyReady === true
    && plan?.mode === "native_api_context_management"
    && verification.valid
    && !!contextManagement;
  if (!canApply) {
    return { applied: false, plan, requestPatch, verification, body: bodyObj, headers };
  }
  const nextBody = {
    ...bodyObj,
    ...(requestPatch.body || {}),
    context_management: contextManagement,
  };
  const nextHeaders = appendCsvHeader({ ...headers }, "anthropic-beta", betaHeaders);
  return { applied: true, plan, requestPatch, verification, body: nextBody, headers: nextHeaders };
}

function responseHeader(response: any, name: string) {
  try { return String(response?.headers?.get?.(name) || ""); } catch { return ""; }
}

function providerRequestId(response: any) {
  return responseHeader(response, "request-id")
    || responseHeader(response, "x-request-id")
    || responseHeader(response, "anthropic-request-id")
    || responseHeader(response, "x-anthropic-request-id");
}

function recordAnthropicPromptCacheState(config: any, options: LlmCallOptions, body: any, headers: Record<string, string>) {
  const tracking = options.promptCacheTracking || options.prompt_cache_tracking || null;
  const groupId = String(tracking?.groupId || tracking?.group_id || "").trim();
  const groupSessionId = String(tracking?.groupSessionId || tracking?.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) return null;
  const betaHeader = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === "anthropic-beta")?.[1] || "";
  try {
    return recordGroupPromptCacheState({
      ...tracking,
      groupId,
      groupSessionId,
      provider: "anthropic",
      model: config.model,
      system: body?.system || "",
      toolSchemas: body?.tools || tracking?.toolSchemas || tracking?.tool_schemas || [],
      betaHeaders: String(betaHeader).split(",").map(value => value.trim()).filter(Boolean),
      cachedMicrocompactEnabled: !!body?.context_management,
      extraBodyParams: tracking?.extraBodyParams || tracking?.extra_body_params || {},
    });
  } catch {
    return null;
  }
}

function recordApiMicrocompactNativeAdapterTelemetry(options: LlmCallOptions, input: any = {}) {
  const plan = getApiMicrocompactNativeApplyPlan(options);
  if (!plan?.schema) return null;
  const nativeInput = {
    ...getApiMicrocompactNativeTelemetryOptions(options),
    apiMicrocompactNativeApplyPlan: plan,
    telemetrySource: "native_request_adapter",
    transport: plan?.executor?.transport || "anthropic_api",
    ...input,
  };
  let executionReceipt: any = null;
  let cacheDeletionNotification: any = null;
  try {
    executionReceipt = recordProviderNativeCompactExecutionReceipt(nativeInput);
  } catch {}
  const appliedReceipt = executionReceipt?.receipt;
  if (executionReceipt?.verification?.valid === true
    && appliedReceipt?.status === "native_applied"
    && appliedReceipt?.strong_proof === true
    && appliedReceipt?.provider_outcome_verified === true
    && Number(appliedReceipt?.applied_edit_count || 0) >= 1
    && Number(appliedReceipt?.cleared_input_tokens || 0) > 0
    && String(appliedReceipt?.group_session_id || "").startsWith("gcs_")) {
    try { cacheDeletionNotification = notifyGroupPromptCacheDeletion({ executionReceipt: appliedReceipt }); } catch {}
  }
  try {
    const api = require("./memory");
    if (typeof api.recordGroupApiMicrocompactNativeApplyAdapterTelemetry !== "function") return { executionReceipt, cacheDeletionNotification };
    const requestTelemetry = api.recordGroupApiMicrocompactNativeApplyAdapterTelemetry(nativeInput);
    return { executionReceipt, requestTelemetry, cacheDeletionNotification };
  } catch {
    return { executionReceipt, cacheDeletionNotification };
  }
}

async function callOpenAiCompatibleChatOnce(config: any, options: LlmCallOptions) {
  const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
  assertLlmConfig(config, endpoint);
  const streaming = options.stream === true || typeof options.onDelta === "function";
  let emitted = false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveLlmTimeoutMs(config, options.defaultTimeoutMs || 30000, options.timeoutMs));
  try {
    const response = await fetchWithNodeHttpFallback(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: options.temperature ?? resolveTemperature(config, 0.2),
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        ...(streaming ? { stream: true } : {}),
        ...buildOpenAiReasoningFields(callReasoningConfig(config, options)),
        messages: options.messages,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
    }
    if (streaming) {
      let content = "";
      let usage: any = null;
      await consumeSseJson(response, event => {
        const choice = event?.choices?.[0];
        const delta = emitStreamDelta(options, choice?.delta?.content ?? choice?.message?.content ?? "");
        if (delta) {
          emitted = true;
          content += delta;
        }
        if (event?.usage) usage = event.usage;
      });
      if (!content.trim()) throw new Error("模型返回空响应");
      reportTokenUsage(options, normalizeLlmTokenUsage(usage, "openai"));
      return content;
    }
    const text = await response.text();
    const data = JSON.parse(text);
    const content = String(data?.choices?.[0]?.message?.content || "");
    if (!content.trim()) throw new Error("模型返回空响应");
    reportTokenUsage(options, normalizeLlmTokenUsage(data?.usage, "openai"));
    return content;
  } catch (error: any) {
    throw markStreamInterrupted(error, emitted);
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropicCompatibleChatOnce(config: any, options: LlmCallOptions) {
  const endpoint = normalizeAnthropicMessagesUrl(config.apiUrl);
  assertLlmConfig(config, endpoint);
  const streaming = options.stream === true || typeof options.onDelta === "function";
  let emitted = false;

  const messages = options.messages || [];
  const system = options.system ?? (messages.find((m: any) => m.role === "system")?.content || "");
  const userMessages = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveLlmTimeoutMs(config, options.defaultTimeoutMs || 30000, options.timeoutMs));
  try {
    const patched = applyApiMicrocompactNativeRequestPatch({
      model: config.model,
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature ?? resolveTemperature(config, 0.2),
      system,
      messages: userMessages,
      ...(streaming ? { stream: true } : {}),
      ...buildAnthropicThinkingFields(callReasoningConfig(config, options)),
    }, {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    }, options);
    recordAnthropicPromptCacheState(config, options, patched.body, patched.headers);
    const sentAt = new Date().toISOString();
    let response: any = null;
    try {
      response = await fetchWithNodeHttpFallback(endpoint, {
        method: "POST",
        headers: patched.headers,
        body: JSON.stringify(patched.body),
        signal: controller.signal,
      });
    } catch (error: any) {
      recordApiMicrocompactNativeAdapterTelemetry(options, {
        requestPatch: patched.requestPatch,
        requestBody: patched.body,
        headers: patched.headers,
        provider: "anthropic",
        model: config.model,
        endpoint,
        method: "POST",
        sentAt,
        ok: false,
        error: error?.message || String(error),
      });
      throw error;
    }
    if (!response.ok) {
      const text = await response.text();
      recordApiMicrocompactNativeAdapterTelemetry(options, {
        requestPatch: patched.requestPatch,
        requestBody: patched.body,
        headers: patched.headers,
        provider: "anthropic",
        model: config.model,
        endpoint,
        method: "POST",
        responseStatus: response.status,
        requestId: providerRequestId(response),
        sentAt,
        ok: false,
        error: `HTTP ${response.status}`,
      });
      throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
    }
    if (streaming) {
      let content = "";
      let usage: any = {};
      await consumeSseJson(response, event => {
        if (event?.usage) {
          usage = { ...usage, ...event.usage };
        }
        if (event?.type === "message_start" && event?.message?.usage) {
          usage = { ...usage, ...event.message.usage };
        }
        if (event?.type === "message_delta" && event?.usage) {
          usage = { ...usage, ...event.usage };
        }
        const textDelta = Array.isArray(event?.content)
          ? event.content.map((part: any) => part?.type === "text" ? part.text : "").join("")
          : event?.type === "content_block_start" && event?.content_block?.type === "text"
          ? event.content_block.text
          : event?.type === "content_block_delta" && event?.delta?.type === "text_delta"
          ? event.delta.text
          : "";
        const delta = emitStreamDelta(options, textDelta);
        if (delta) {
          emitted = true;
          content += delta;
        }
      });
      recordApiMicrocompactNativeAdapterTelemetry(options, {
        requestPatch: patched.requestPatch,
        requestBody: patched.body,
        headers: patched.headers,
        provider: "anthropic",
        model: config.model,
        endpoint,
        method: "POST",
        responseStatus: response.status,
        requestId: providerRequestId(response),
        responseBody: { type: "stream", content_length: content.length, usage },
        sentAt,
        ok: true,
      });
      if (!content.trim()) throw new Error("模型返回空响应");
      reportTokenUsage(options, normalizeLlmTokenUsage(usage, "anthropic"));
      return content;
    }
    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch (error: any) {
      recordApiMicrocompactNativeAdapterTelemetry(options, {
        requestPatch: patched.requestPatch,
        requestBody: patched.body,
        headers: patched.headers,
        provider: "anthropic",
        model: config.model,
        endpoint,
        method: "POST",
        responseStatus: response.status,
        requestId: providerRequestId(response),
        sentAt,
        ok: true,
        responseParseError: error?.message || String(error),
      });
      throw error;
    }
    recordApiMicrocompactNativeAdapterTelemetry(options, {
      requestPatch: patched.requestPatch,
      requestBody: patched.body,
      headers: patched.headers,
      provider: "anthropic",
      model: config.model,
      endpoint,
      method: "POST",
      responseStatus: response.status,
      requestId: providerRequestId(response),
      responseBody: data,
      sentAt,
      ok: true,
    });
    const content = (data?.content || [])
      .map((part: any) => part?.type === "text" ? part.text : "")
      .join("")
      .trim();
    if (!content) throw new Error("模型返回空响应");
    reportTokenUsage(options, normalizeLlmTokenUsage(data?.usage, "anthropic"));
    return content;
  } catch (error: any) {
    throw markStreamInterrupted(error, emitted);
  } finally {
    clearTimeout(timeout);
  }
}

function retryOptions(config: any, options: LlmCallOptions, fallbackScope: string) {
  const configuredTimeoutMs = resolveLlmTimeoutMs(config, options.defaultTimeoutMs || UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS, options.timeoutMs);
  return {
    attempts: options.retryAttempts,
    attemptTimeoutMs: Math.min(UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS, configuredTimeoutMs),
    baseDelayMs: options.retryBaseDelayMs,
    totalTimeoutMs: options.retryTotalTimeoutMs || UNIFIED_MODEL_TOTAL_TIMEOUT_MS,
    scope: options.retryScope || fallbackScope,
    onRetry: options.onRetry || ((notice: ModelCallRetryNotice) => {
      const message = String(notice.error?.message || notice.error || "temporary model error").slice(0, 240);
      console.warn(`[模型重试] ${options.retryScope || fallbackScope} 暂时失败，将执行第 ${notice.attempt + 1}/${notice.maxAttempts} 次尝试：${message}`);
    }),
  };
}

export async function callOpenAiCompatibleChat(config: any, options: LlmCallOptions) {
  if (options.retry === false) return callOpenAiCompatibleChatOnce(config, options);
  return runModelCallWithRetry(
    context => callOpenAiCompatibleChatOnce(config, { ...options, timeoutMs: context.attemptTimeoutMs, retry: false }),
    retryOptions(config, options, "OpenAI-compatible model call"),
  );
}

export async function callAnthropicCompatibleChat(config: any, options: LlmCallOptions) {
  if (options.retry === false) return callAnthropicCompatibleChatOnce(config, options);
  return runModelCallWithRetry(
    context => callAnthropicCompatibleChatOnce(config, { ...options, timeoutMs: context.attemptTimeoutMs, retry: false }),
    retryOptions(config, options, "Anthropic-compatible model call"),
  );
}

export async function callOpenAiCompatibleJson(config: any, options: LlmCallOptions) {
  if (options.retry === false) {
    const content = await callOpenAiCompatibleChatOnce(config, options);
    const parsed = extractJsonObject(content);
    if (!parsed) throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
    return parsed;
  }
  return runModelCallWithRetry(async context => {
    let usage: LlmTokenUsage | null = null;
    const content = await callOpenAiCompatibleChatOnce(config, {
      ...options,
      retry: false,
      timeoutMs: context.attemptTimeoutMs,
      onUsage: value => { usage = value; },
    });
    const parsed = extractJsonObject(content);
    if (!parsed) throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
    if (usage) reportTokenUsage(options, usage);
    return parsed;
  }, retryOptions(config, options, "OpenAI-compatible JSON model call"));
}

export async function callAnthropicCompatibleJson(config: any, options: LlmCallOptions) {
  if (options.retry === false) {
    const content = await callAnthropicCompatibleChatOnce(config, options);
    const parsed = extractJsonObject(content);
    if (!parsed) throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
    return parsed;
  }
  return runModelCallWithRetry(async context => {
    let usage: LlmTokenUsage | null = null;
    const content = await callAnthropicCompatibleChatOnce(config, {
      ...options,
      retry: false,
      timeoutMs: context.attemptTimeoutMs,
      onUsage: value => { usage = value; },
    });
    const parsed = extractJsonObject(content);
    if (!parsed) throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
    if (usage) reportTokenUsage(options, usage);
    return parsed;
  }, retryOptions(config, options, "Anthropic-compatible JSON model call"));
}

export async function runLlmTokenUsageSelfTest() {
  const originalFetch = (globalThis as any).fetch;
  let openAiUsage: LlmTokenUsage | null = null;
  let anthropicUsage: LlmTokenUsage | null = null;
  try {
    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "" },
      async text() {
        return JSON.stringify({
          choices: [{ message: { content: "openai ok" } }],
          usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
        });
      },
    });
    const openAiContent = await callOpenAiCompatibleChat({
      apiUrl: "https://example.com/v1",
      apiKey: "selftest-key",
      model: "selftest-model",
    }, {
      messages: [{ role: "user", content: "selftest" }],
      onUsage: usage => { openAiUsage = usage; },
    });

    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "" },
      async text() {
        return JSON.stringify({
          content: [{ type: "text", text: "anthropic ok" }],
          usage: {
            input_tokens: 100,
            cache_creation_input_tokens: 20,
            cache_read_input_tokens: 300,
            output_tokens: 40,
          },
        });
      },
    });
    const anthropicContent = await callAnthropicCompatibleChat({
      apiUrl: "https://example.com/v1",
      apiKey: "selftest-key",
      model: "selftest-model",
    }, {
      messages: [{ role: "user", content: "selftest" }],
      onUsage: usage => { anthropicUsage = usage; },
    });

    const checks = {
      openAiContentPreserved: openAiContent === "openai ok",
      openAiInputTokensCaptured: openAiUsage?.inputTokens === 120,
      openAiOutputTokensCaptured: openAiUsage?.outputTokens === 30,
      anthropicContentPreserved: anthropicContent === "anthropic ok",
      anthropicDirectInputTokensCaptured: anthropicUsage?.inputTokens === 100,
      anthropicCacheTokensCaptured: anthropicUsage?.cacheCreationInputTokens === 20 && anthropicUsage?.cacheReadInputTokens === 300,
      anthropicTotalIncludesCacheTokens: anthropicUsage?.totalTokens === 460,
      anthropicOutputTokensCaptured: anthropicUsage?.outputTokens === 40,
    };
    return { pass: Object.values(checks).every(Boolean), checks, openAiUsage, anthropicUsage };
  } finally {
    (globalThis as any).fetch = originalFetch;
  }
}

export async function runLlmStreamingSelfTest() {
  const originalFetch = (globalThis as any).fetch;
  const encoder = new TextEncoder();
  const createResponse = (chunks: string[], onClosed: () => void) => ({
    ok: true,
    status: 200,
    headers: { get: () => "text/event-stream" },
    body: new ReadableStream({
      start(controller) {
        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            controller.enqueue(encoder.encode(chunk));
            if (index === chunks.length - 1) {
              setTimeout(() => {
                onClosed();
                controller.close();
              }, 5);
            }
          }, index * 5);
        });
      },
    }),
    async text() { return ""; },
  });
  try {
    const openAiDeltas: string[] = [];
    let openAiClosed = false;
    let openAiDeltaBeforeClose = false;
    let openAiUsage: LlmTokenUsage | null = null;
    (globalThis as any).fetch = async () => createResponse([
      "data: {\"choices\":[{\"delta\":{\"content\":\"你\"}}]}\n",
      "\ndata: {\"choices\":[{\"delta\":{\"content\":\"好\"}}],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":2}}\n\n",
      "data: [DONE]\n\n",
    ], () => { openAiClosed = true; });
    const openAiContent = await callOpenAiCompatibleChat({
      apiUrl: "https://example.com/v1",
      apiKey: "selftest-key",
      model: "selftest-model",
    }, {
      messages: [{ role: "user", content: "selftest" }],
      stream: true,
      retry: false,
      onDelta: delta => {
        openAiDeltas.push(delta);
        if (!openAiClosed) openAiDeltaBeforeClose = true;
      },
      onUsage: usage => { openAiUsage = usage; },
    });

    const anthropicDeltas: string[] = [];
    let anthropicClosed = false;
    let anthropicDeltaBeforeClose = false;
    let anthropicUsage: LlmTokenUsage | null = null;
    (globalThis as any).fetch = async () => createResponse([
      "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":12}}}\n\n",
      "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"流\"}}\n\n",
      "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"式\"}}\n\n",
      "event: message_delta\ndata: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":2}}\n\n",
    ], () => { anthropicClosed = true; });
    const anthropicContent = await callAnthropicCompatibleChat({
      apiUrl: "https://example.com/v1",
      apiKey: "selftest-key",
      model: "selftest-model",
    }, {
      messages: [{ role: "user", content: "selftest" }],
      stream: true,
      retry: false,
      onDelta: delta => {
        anthropicDeltas.push(delta);
        if (!anthropicClosed) anthropicDeltaBeforeClose = true;
      },
      onUsage: usage => { anthropicUsage = usage; },
    });

    let interruptedCalls = 0;
    let interruptedErrorCode = "";
    (globalThis as any).fetch = async () => {
      interruptedCalls += 1;
      return {
        ok: true,
        status: 200,
        headers: { get: () => "text/event-stream" },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode("data: {\"choices\":[{\"delta\":{\"content\":\"已\"}}]}\n\n"));
            setTimeout(() => controller.error(new Error("socket closed during stream")), 5);
          },
        }),
        async text() { return ""; },
      };
    };
    try {
      await callOpenAiCompatibleChat({
        apiUrl: "https://example.com/v1",
        apiKey: "selftest-key",
        model: "selftest-model",
      }, {
        messages: [{ role: "user", content: "selftest" }],
        stream: true,
        retryAttempts: 5,
        retryBaseDelayMs: 0,
        onDelta: () => {},
      });
    } catch (error: any) {
      interruptedErrorCode = String(error?.code || "");
    }

    const checks = {
      openAiContent: openAiContent === "你好",
      openAiDeltas: openAiDeltas.join("") === "你好" && openAiDeltas.length === 2,
      openAiIncremental: openAiDeltaBeforeClose,
      openAiUsage: openAiUsage?.inputTokens === 10 && openAiUsage?.outputTokens === 2,
      anthropicContent: anthropicContent === "流式",
      anthropicDeltas: anthropicDeltas.join("") === "流式" && anthropicDeltas.length === 2,
      anthropicIncremental: anthropicDeltaBeforeClose,
      anthropicUsage: anthropicUsage?.inputTokens === 12 && anthropicUsage?.outputTokens === 2,
      interruptedStreamDoesNotRetry: interruptedCalls === 1 && interruptedErrorCode === "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    (globalThis as any).fetch = originalFetch;
  }
}

export async function runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest() {
  const groupId = `group-orchestrator-api-microcompact-native-adapter-selftest-${process.pid}-${Date.now()}`;
  const groupSessionId = `gcs-${groupId}`;
  const taskId = `task-${groupId}`;
  const executionId = `execution-${groupId}`;
  const runnerRequestId = `runner-${groupId}`;
  const memoryApi = require("./memory");
  const compactionApi = require("./group-memory-compaction");
  const editPlan = compactionApi.buildGroupApiMicroCompactEditPlan([
    {
      id: "adapter-telemetry-thinking",
      role: "assistant",
      content: [{ type: "thinking", thinking: "ADAPTER_TELEMETRY_THINKING" }],
    },
    {
      id: "adapter-telemetry-tool",
      role: "assistant",
      content: [{ type: "tool_use", id: "adapter-read", name: "Read", input: { file_path: "src/adapter.ts" } }],
    },
    {
      id: "adapter-telemetry-tool-result",
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "adapter-read", content: "adapter result" }],
    },
  ], {
    groupId,
    groupSessionId,
    targetProject: "api",
    activeTokens: 220000,
    force: true,
    now: "2026-07-08T09:00:00.000Z",
  });
  const nativePlan = compactionApi.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId,
    groupSessionId,
    targetProject: "api",
    agentType: "anthropic-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    betaHeaders: ["context-management-2025-06-27"],
    sessionBinding: {
      schema: "ccm-child-agent-memory-session-binding-v1",
      binding_id: `csm-${groupId}`,
      task_agent_session_id: `tas-${groupId}`,
      native_session_id: `native-${groupId}`,
    },
    memoryContextSnapshotId: `snapshot-${groupId}`,
    memoryContextSnapshotChecksum: `snapshot-checksum-${groupId}`,
    executionId,
    runnerRequestId,
    now: "2026-07-08T09:01:00.000Z",
  });
  const ledgerFile = memoryApi.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, groupSessionId);
  const executionReceiptApi = require("./provider-native-compact-execution-receipt");
  const executionReceiptFile = executionReceiptApi.getProviderNativeCompactExecutionReceiptLedgerFile(groupId, groupSessionId);
  const originalFetch = (globalThis as any).fetch;
  let captured: any = null;
  try {
    (globalThis as any).fetch = async (url: any, init: any = {}) => {
      captured = {
        url: String(url || ""),
        headers: init.headers || {},
        body: JSON.parse(String(init.body || "{}")),
      };
      return {
        ok: true,
        status: 200,
        headers: {
          get(name: string) {
            return String(name || "").toLowerCase().includes("request-id") ? "req-api-microcompact-adapter-selftest" : "";
          },
        },
        async text() {
          return JSON.stringify({
            content: [{ type: "text", text: "adapter ok" }],
            context_management: {
              applied_edits: [{ type: "clear_tool_uses_20250919", cleared_tool_uses: 4, cleared_input_tokens: 24000 }],
            },
          });
        },
      };
    };
    const content = await callAnthropicCompatibleChat({
      apiUrl: "https://api.anthropic.com/v1",
      apiKey: "selftest-key",
      model: "claude-selftest",
      timeoutMs: 5000,
    }, {
      messages: [{ role: "user", content: "adapter telemetry selftest" }],
      apiMicrocompactNativeApplyPlan: nativePlan,
      apiMicrocompactNativeApplyTelemetry: {
        groupId,
        groupSessionId,
        targetProject: "api",
        taskId,
        executionId,
        runnerRequestId,
        taskAgentSessionId: nativePlan.task_agent_session_id,
        nativeSessionId: nativePlan.native_session_id,
        memoryContextSnapshotId: nativePlan.memory_context_snapshot_id,
        memoryContextSnapshotChecksum: nativePlan.memory_context_snapshot_checksum,
      },
    });
    const ledger = memoryApi.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, groupSessionId);
    const executionReceiptLedger = executionReceiptApi.readProviderNativeCompactExecutionReceiptLedger(groupId, groupSessionId);
    const executionReceipt = executionReceiptLedger.entries?.at(-1);
    const entry = (ledger.entries || []).find((item: any) => item.task_id === taskId);
    const checks = {
      modelReturned: content === "adapter ok",
      requestBodyIncludesContextManagement: !!captured?.body?.context_management
        && captured.body.context_management.edits?.length === editPlan.editCount,
      requestHeaderIncludesBeta: String(captured?.headers?.["anthropic-beta"] || captured?.headers?.["Anthropic-Beta"] || "").includes("context-management-2025-06-27"),
      ledgerRecordedAdapterTelemetry: entry?.telemetry_source === "native_request_adapter"
        && entry?.telemetry_status === "matched_contract"
        && entry?.request_patch_checksum === nativePlan.requestPatchChecksum,
      ledgerBindsSessionAndSnapshot: entry?.task_agent_session_id === nativePlan.task_agent_session_id
        && entry?.memory_context_snapshot_id === nativePlan.memory_context_snapshot_id,
      platformExecutionReceiptIsStrong: executionReceipt?.status === "native_applied"
        && executionReceipt?.strong_proof === true
        && executionReceipt?.provider_outcome_verified === true
        && executionReceipt?.applied_edit_count === 1
        && executionReceipt?.execution_id === executionId
        && executionReceipt?.runner_request_id === runnerRequestId,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      captured: {
        hasContextManagement: !!captured?.body?.context_management,
        beta: captured?.headers?.["anthropic-beta"] || captured?.headers?.["Anthropic-Beta"] || "",
      },
      entry: entry ? {
        telemetryStatus: entry.telemetry_status,
        telemetrySource: entry.telemetry_source,
        requestPatchChecksum: entry.request_patch_checksum,
      } : null,
    };
  } finally {
    (globalThis as any).fetch = originalFetch;
    for (const file of [ledgerFile, `${ledgerFile}.bak`, executionReceiptFile, `${executionReceiptFile}.bak`]) {
      try { if (file && require("fs").existsSync(file)) require("fs").unlinkSync(file); } catch {}
    }
  }
}
