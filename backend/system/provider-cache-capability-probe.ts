import * as crypto from "crypto";
import {
  callAnthropicCompatibleChat,
  callOpenAiCompatibleChat,
  shouldUseAnthropic,
} from "../modules/collaboration/group-orchestrator-llm-client";
import {
  ProviderCacheCapabilityStatus,
  providerCacheCapabilityIdentity,
  readProviderCacheCapabilityState,
  recordProviderCacheCapabilityEvidence,
} from "./provider-cache-capability-registry";

export type ProviderCacheProbeReceiptV1 = {
  schema: "ccm-provider-cache-probe-receipt-v1";
  version: 1;
  id: string;
  identityChecksum: string;
  status: ProviderCacheCapabilityStatus;
  providerCallCount: number;
  firstCallOk: boolean;
  secondCallOk: boolean;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  backendMetrics: { checked: boolean; verified: boolean; kind: string; reason: string };
  preservedConfirmed: boolean;
  reason: string;
  checkedAt: string;
  contentStored: false;
  checksum: string;
};

type ProbeCallResult = { content?: string; usage?: any };
type ProbeCaller = (config: any, request: any) => Promise<ProbeCallResult>;

function digest(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

function receiptChecksum(value: any) {
  const copy = { ...(value || {}) };
  delete copy.checksum;
  return digest(copy);
}

function cacheReadTokens(usage: any) {
  return Math.max(0, Number(usage?.cacheReadInputTokens || usage?.cache_read_input_tokens || usage?.cachedTokens || usage?.cached_tokens || 0));
}

function cacheCreationTokens(usage: any) {
  return Math.max(0, Number(usage?.cacheCreationInputTokens || usage?.cache_creation_input_tokens || 0));
}

function classifyProbeError(error: any): { status: ProviderCacheCapabilityStatus; reason: string } {
  const reason = String(error?.message || error || "provider_probe_failed").replace(/[\r\n\t]+/g, " ").trim().slice(0, 500);
  const explicitFieldRejection = /HTTP\s+(400|404|422).*?(prompt[_ -]?cache|cache[_ -]?(control|reference|edits?)|context[_ -]?management|cached[_ -]?content)|(?:unknown|unsupported|unrecognized|invalid).*?(cache|context_management|prompt_cache)/i.test(reason);
  if (explicitFieldRejection) return { status: "unsupported", reason };
  if (/HTTP\s+(408|425|429|5\d\d)|abort|timeout|timed out|ECONN|ENOTFOUND|fetch failed|socket/i.test(reason)) return { status: "degraded", reason };
  return { status: "unproven", reason };
}

function stableProbeMessages() {
  const stablePrefix = Array.from({ length: 160 }, (_, index) => `CCM cache capability probe stable line ${String(index + 1).padStart(3, "0")}: immutable prefix verification only.`).join("\n");
  return {
    system: `You are checking whether the configured provider reports prompt-prefix cache usage. Reply with OK only.\n${stablePrefix}`,
    messages: [{ role: "user", content: "Reply with OK only." }],
  };
}

async function defaultProbeCaller(config: any, request: any): Promise<ProbeCallResult> {
  let usage: any = null;
  const options = {
    system: request.system,
    messages: request.messages,
    maxTokens: 8,
    temperature: 0,
    timeoutMs: Math.min(20_000, Math.max(5_000, Number(config.timeoutMs || 15_000))),
    defaultTimeoutMs: 15_000,
    retry: false,
    providerContextCache: request.providerContextCache,
    onUsage: (value: any) => { usage = value; },
    httpErrorPrefix: "缓存能力探测失败",
  };
  const content = shouldUseAnthropic(config)
    ? await callAnthropicCompatibleChat(config, options)
    : await callOpenAiCompatibleChat(config, { ...options, messages: [{ role: "system", content: request.system }, ...request.messages], system: undefined });
  return { content, usage };
}

function metricsUrl(config: any) {
  const kind = String(config?.inferenceBackendKind || "remote_api");
  if (!['vllm', 'sglang'].includes(kind)) return "";
  const metricsPath = String(config?.metricsPath || "").trim();
  if (!metricsPath || !metricsPath.startsWith("/") || metricsPath.startsWith("//")) return "";
  try {
    const base = new URL(String(config.apiUrl || ""));
    return new URL(metricsPath, `${base.protocol}//${base.host}`).toString();
  } catch {
    return "";
  }
}

async function inspectBackendMetrics(config: any, fetchImpl: typeof fetch) {
  const url = metricsUrl(config);
  const kind = String(config?.inferenceBackendKind || "remote_api");
  if (!url) return { checked: false, verified: false, kind, reason: "metrics_not_configured" };
  try {
    const response = await fetchImpl(url, { method: "GET", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return { checked: true, verified: false, kind, reason: `metrics_http_${response.status}` };
    const text = (await response.text()).slice(0, 2_000_000);
    const verified = kind === "vllm"
      ? /vllm[:_].*(?:prefix_cache|cache_hit)|prefix_cache_(?:hits|queries)/i.test(text)
      : /(?:radix|prefix)[_:].*cache|cache_hit_rate/i.test(text);
    return { checked: true, verified, kind, reason: verified ? "backend_cache_metric_present" : "backend_cache_metric_absent" };
  } catch (error: any) {
    return { checked: true, verified: false, kind, reason: String(error?.message || error || "metrics_failed").slice(0, 240) };
  }
}

export async function probeProviderCacheCapability(config: any, options: { caller?: ProbeCaller; fetchImpl?: typeof fetch } = {}) {
  const identity = providerCacheCapabilityIdentity(config);
  const caller = options.caller || defaultProbeCaller;
  const messages = stableProbeMessages();
  const providerContextCache = {
    scope: "other",
    scopeId: "provider-cache-capability",
    sessionId: `cache-probe-${identity.identityChecksum.slice(0, 24)}`,
    generation: 1,
    boundaryGeneration: 0,
    source: "provider_cache_capability_probe",
  };
  const probeConfig = {
    ...config,
    reasoningEffort: "off",
    providerContextCacheMode: "native",
    providerNativeCacheEnabled: true,
    providerCacheProbeInProgress: true,
  };
  let providerCallCount = 0;
  let firstCallOk = false;
  let secondCallOk = false;
  let firstUsage: any = null;
  let secondUsage: any = null;
  let status: ProviderCacheCapabilityStatus = "unproven";
  let reason = "provider_accepted_requests_without_cache_usage_receipt";
  try {
    providerCallCount += 1;
    const first = await caller(probeConfig, { ...messages, providerContextCache });
    firstCallOk = !!String(first.content || "").trim();
    firstUsage = first.usage || null;
    if (!firstCallOk) throw new Error("模型返回了空响应");
    providerCallCount += 1;
    const second = await caller(probeConfig, { ...messages, providerContextCache });
    secondCallOk = !!String(second.content || "").trim();
    secondUsage = second.usage || null;
    if (!secondCallOk) throw new Error("模型返回了空响应");
    if (cacheReadTokens(secondUsage) > 0) {
      status = "confirmed";
      reason = "second_request_reported_cached_input_tokens";
    }
  } catch (error: any) {
    const classified = classifyProbeError(error);
    status = classified.status;
    reason = classified.reason;
  }
  const backendMetrics = await inspectBackendMetrics(config, options.fetchImpl || fetch);
  const recorded = recordProviderCacheCapabilityEvidence(config, {
    status,
    providerCallCount,
    cacheReadInputTokens: cacheReadTokens(secondUsage),
    cacheCreationInputTokens: cacheCreationTokens(firstUsage) + cacheCreationTokens(secondUsage),
    backendMetricsVerified: backendMetrics.verified,
    reason,
  });
  const checkedAt = new Date().toISOString();
  const receipt: ProviderCacheProbeReceiptV1 = {
    schema: "ccm-provider-cache-probe-receipt-v1",
    version: 1,
    id: `pcpr_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`,
    identityChecksum: identity.identityChecksum,
    status,
    providerCallCount,
    firstCallOk,
    secondCallOk,
    cacheReadInputTokens: cacheReadTokens(secondUsage),
    cacheCreationInputTokens: cacheCreationTokens(firstUsage) + cacheCreationTokens(secondUsage),
    backendMetrics,
    preservedConfirmed: recorded.preservedConfirmed,
    reason,
    checkedAt,
    contentStored: false,
    checksum: "",
  };
  receipt.checksum = receiptChecksum(receipt);
  return {
    success: firstCallOk || status === "unsupported",
    connection: { success: firstCallOk || status === "unsupported", providerCallCount, checkedAt },
    receipt,
    capability: readProviderCacheCapabilityState(config),
  };
}

export async function runProviderCacheCapabilityProbeSelfTest() {
  const base = { apiUrl: "https://mock.example/v1", format: "openai-compatible", model: "mock", providerNativeCacheFamily: "openai" };
  let calls = 0;
  const confirmed = await probeProviderCacheCapability(base, {
    caller: async () => ({ content: "OK", usage: ++calls === 2 ? { cacheReadInputTokens: 2048 } : { cacheCreationInputTokens: 2048 } }),
  });
  calls = 0;
  const degraded = await probeProviderCacheCapability({ ...base, model: "mock-degraded" }, {
    caller: async () => { calls += 1; throw new Error("HTTP 503 temporary"); },
  });
  calls = 0;
  const unsupported = await probeProviderCacheCapability({ ...base, model: "mock-unsupported" }, {
    caller: async () => { calls += 1; throw new Error("HTTP 400 unknown prompt_cache_key field"); },
  });
  const checks = {
    confirmedNeedsRealCachedTokens: confirmed.receipt.status === "confirmed" && confirmed.receipt.cacheReadInputTokens === 2048,
    confirmedUsesExactlyTwoCalls: confirmed.receipt.providerCallCount === 2,
    networkFailureStopsAfterOneCall: degraded.receipt.status === "degraded" && degraded.receipt.providerCallCount === 1,
    explicitFieldRejectionUnsupported: unsupported.receipt.status === "unsupported" && unsupported.receipt.providerCallCount === 1,
    receiptsContainNoPrompt: !JSON.stringify([confirmed.receipt, degraded.receipt, unsupported.receipt]).includes("stable line"),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
