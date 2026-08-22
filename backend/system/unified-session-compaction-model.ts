import { callAnthropicCompatibleChat, callOpenAiCompatibleChat } from "../modules/collaboration/group-orchestrator-llm-client";
import { normalizeOpenAiResponsesUrl } from "./openai-responses-transport";
import { runModelCallWithRetry } from "./model-call-retry";

export type UnifiedCompactionModelAudit = {
  beforeRequest?: (input: { provider: string; model: string; system: string }) => void | Promise<void>;
  afterResponse?: (input: { provider: string; model: string; responseId: string; usage: any }) => void | Promise<void>;
};

export function extractUnifiedCompactionJson(text: string) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  return null;
}

export function normalizeUnifiedOpenAiUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/chat/completions`;
}

export { normalizeOpenAiResponsesUrl };

export function normalizeUnifiedAnthropicUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/v1\/messages$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/messages`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/messages`;
}

export function normalizeUnifiedGeminiUrl(value: string, model: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/(?::generateContent|:streamGenerateContent)(?:\?|$)/i.test(base)) return base.replace(/:streamGenerateContent/i, ":generateContent");
  const cleanModel = String(model || "").trim().replace(/^models\//i, "");
  if (/\/models\/[^/]+$/i.test(base)) return `${base}:generateContent`;
  if (/\/v1(?:beta)?$/i.test(base)) return `${base}/models/${encodeURIComponent(cleanModel)}:generateContent`;
  return `${base}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
}

function isGemini(config: any) {
  const format = String(config?.format || "auto").toLowerCase();
  const url = String(config?.apiUrl || "").toLowerCase();
  return format === "gemini-compatible" || format === "auto" && /generativelanguage\.googleapis\.com|:generatecontent/.test(url);
}

function isAnthropic(config: any) {
  return config?.format === "anthropic-compatible"
    || config?.format === "auto" && String(config?.apiUrl || "").toLowerCase().includes("anthropic")
    || /\/anthropic(?:\/|$)/i.test(String(config?.apiUrl || ""));
}

export async function callUnifiedCompactionModelOnce(config: any, system: string, user: string, maxOutputTokens: number, attemptTimeoutMs: number, audit: UnifiedCompactionModelAudit = {}) {
  const anthropic = isAnthropic(config);
  const gemini = isGemini(config);
  const provider = anthropic ? "anthropic" : gemini ? "gemini" : String(config?.format || "openai");
  const controller = new AbortController();
  const externalSignal: AbortSignal | null = config?.compactionAbortSignal || config?.compaction_abort_signal || null;
  const abortFromExternal = () => controller.abort((externalSignal as any)?.reason);
  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  const timeout = setTimeout(() => controller.abort(), Math.max(1_000, attemptTimeoutMs));
  let activityError: any = null;
  const activitySignal = typeof config?.onCompactionActivity === "function" ? config.onCompactionActivity : null;
  const heartbeatMs = Math.max(25, Math.min(Number(config?.compactionActivityHeartbeatMs || config?.compaction_activity_heartbeat_ms || 30_000), 60_000));
  const heartbeat = activitySignal ? setInterval(() => {
    try { activitySignal({ stage: "model_summary_wait", heartbeat: true }); }
    catch (error) { activityError = error; controller.abort(); }
  }, heartbeatMs) : null;
  heartbeat?.unref?.();
  try {
    await audit.beforeRequest?.({ provider, model: String(config?.model || ""), system });
    activitySignal?.({ stage: "model_summary_request", heartbeat: false });
    let usage: any = null;
    let responseMetadata: any = null;
    try {
      const call = anthropic ? callAnthropicCompatibleChat : callOpenAiCompatibleChat;
      const content = await call(config, {
        system,
        messages: [{ role: "user", content: user }],
        maxTokens: maxOutputTokens,
        temperature: 0.1,
        defaultTimeoutMs: attemptTimeoutMs,
        timeoutMs: attemptTimeoutMs,
        retry: false,
        signal: controller.signal,
        onUsage: value => { usage = value; },
        onResponseMetadata: value => { responseMetadata = value; },
      });
      if (activityError) {
        const failed: any = new Error(String(activityError?.message || activityError || "Compaction activity callback failed"));
        failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
        throw failed;
      }
      if (externalSignal?.aborted) {
        const cancelled: any = new Error(String((externalSignal as any).reason?.message || "Compaction model call cancelled"));
        cancelled.code = "CCM_MODEL_CALL_CANCELLED";
        throw cancelled;
      }
      const summary = extractUnifiedCompactionJson(content);
      if (!summary) throw new Error("Session compaction model returned invalid JSON");
      const responseId = String(responseMetadata?.responseId || "");
      await audit.afterResponse?.({ provider: String(responseMetadata?.provider || provider), model: String(responseMetadata?.model || config.model || ""), responseId, usage });
      return { summary, usage, provider: String(responseMetadata?.provider || provider), model: String(responseMetadata?.model || config.model || ""), responseId, stopReason: String(responseMetadata?.status || "") };
    } catch (error) {
      if (activityError) {
        const failed: any = new Error(String(activityError?.message || activityError || "Compaction activity callback failed"));
        failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
        throw failed;
      }
      if (externalSignal?.aborted) {
        const cancelled: any = new Error(String((externalSignal as any).reason?.message || "Compaction model call cancelled"));
        cancelled.code = "CCM_MODEL_CALL_CANCELLED";
        throw cancelled;
      }
      throw error;
    }
  } finally {
    clearTimeout(timeout);
    if (heartbeat) clearInterval(heartbeat);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

export async function callUnifiedCompactionModel(config: any, system: string, user: string, maxOutputTokens = 16_000, audit: UnifiedCompactionModelAudit = {}) {
  const mockCall = config?.compactionModelCall || config?.compaction_model_call || config?.modelCall || config?.model_call;
  if (typeof mockCall === "function") return mockCall({ system, user, maxOutputTokens });
  if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model) return null;
  return runModelCallWithRetry(
    context => callUnifiedCompactionModelOnce(config, system, user, maxOutputTokens, context.attemptTimeoutMs, audit),
    {
      scope: "session memory compaction model call",
      baseDelayMs: config.modelRetryBaseDelayMs ?? config.model_retry_base_delay_ms,
      onRetry: notice => {
        try { config.onCompactionActivity?.({ stage: "model_summary_retry", heartbeat: false, attempt: notice.attempt + 1, maxAttempts: notice.maxAttempts }); } catch {}
        console.warn(`[model retry] session compaction attempt ${notice.attempt + 1}/${notice.maxAttempts}: ${String(notice.error?.message || notice.error || "").slice(0, 240)}`);
      },
    },
  );
}

// Compatibility-shaped adapters for non-session callers.  The transport and
// retry policy above are the single implementation; callers must not create
// their own provider-specific compaction requests.
export async function callCompactionModelOnce(
  config: any,
  system: string,
  user: string,
  maxOutputTokens: number,
  attemptTimeoutMs: number,
) {
  return callUnifiedCompactionModelOnce(config, system, user, maxOutputTokens, attemptTimeoutMs, {
    beforeRequest: ({ provider, model }) => {
      try { config?.onCompactionActivity?.({ stage: "model_summary_request", provider, model, heartbeat: false }); } catch {}
    },
  });
}

export async function callCompactionModel(config: any, system: string, user: string, maxOutputTokens = 16_000) {
  return callUnifiedCompactionModel(config, system, user, maxOutputTokens, {
    beforeRequest: ({ provider, model }) => {
      try { config?.onCompactionActivity?.({ stage: "model_summary_request", provider, model, heartbeat: false }); } catch {}
    },
  });
}

export const extractJsonObject = extractUnifiedCompactionJson;
