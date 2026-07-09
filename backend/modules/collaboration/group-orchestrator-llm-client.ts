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
  apiMicrocompactNativeApplyPlan?: any;
  api_microcompact_native_apply_plan?: any;
  apiMicrocompactNativeApplyTelemetry?: any;
  api_microcompact_native_apply_telemetry?: any;
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
  const canApply = plan?.nativeApplyReady === true
    && plan?.mode === "native_api_context_management"
    && !!contextManagement;
  if (!canApply) {
    return { applied: false, plan, requestPatch, body: bodyObj, headers };
  }
  const nextBody = {
    ...bodyObj,
    ...(requestPatch.body || {}),
    context_management: contextManagement,
  };
  const nextHeaders = appendCsvHeader({ ...headers }, "anthropic-beta", betaHeaders);
  return { applied: true, plan, requestPatch, body: nextBody, headers: nextHeaders };
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

function recordApiMicrocompactNativeAdapterTelemetry(options: LlmCallOptions, input: any = {}) {
  const plan = getApiMicrocompactNativeApplyPlan(options);
  if (!plan?.schema) return null;
  try {
    const api = require("./memory");
    if (typeof api.recordGroupApiMicrocompactNativeApplyAdapterTelemetry !== "function") return null;
    return api.recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
      ...getApiMicrocompactNativeTelemetryOptions(options),
      apiMicrocompactNativeApplyPlan: plan,
      telemetrySource: "native_request_adapter",
      ...input,
    });
  } catch {
    return null;
  }
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
    const patched = applyApiMicrocompactNativeRequestPatch({
      model: config.model,
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature ?? resolveTemperature(config, 0.2),
      system,
      messages: userMessages,
    }, {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    }, options);
    const sentAt = new Date().toISOString();
    let response: any = null;
    try {
      response = await fetch(endpoint, {
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
      ok: response.ok,
      error: response.ok ? "" : `HTTP ${response.status}`,
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

export async function runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest() {
  const groupId = `group-orchestrator-api-microcompact-native-adapter-selftest-${process.pid}-${Date.now()}`;
  const taskId = `task-${groupId}`;
  const executionId = `execution-${groupId}`;
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
    targetProject: "api",
    activeTokens: 220000,
    force: true,
    now: "2026-07-08T09:00:00.000Z",
  });
  const nativePlan = compactionApi.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId,
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
    now: "2026-07-08T09:01:00.000Z",
  });
  const ledgerFile = memoryApi.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId);
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
          return JSON.stringify({ content: [{ type: "text", text: "adapter ok" }] });
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
        targetProject: "api",
        taskId,
        executionId,
      },
    });
    const ledger = memoryApi.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId);
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
    for (const file of [ledgerFile, `${ledgerFile}.bak`]) {
      try { if (file && require("fs").existsSync(file)) require("fs").unlinkSync(file); } catch {}
    }
  }
}
