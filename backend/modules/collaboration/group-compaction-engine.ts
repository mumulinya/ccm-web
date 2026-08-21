// group-compaction-engine.ts — merged from 3 part files (behavior-freeze merge).

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  CCM_DIR,
} from "../../core/utils";
import {
  loadSkills,
  SKILL_PACKAGES_DIR,
} from "../../core/db";
import {
  isCcmInternalSkillName,
} from "../../skills/internal-skill-catalog";
import {
  buildContextBudget,
  compactPreserveEdges,
  estimateTextTokens,
  getAutoCompactThreshold,
  microCompactText,
} from "../../system/context-budget";
import {
  runModelCallWithRetry,
} from "../../system/model-call-retry";
import { callUnifiedCompactionModel } from "../../system/unified-session-compaction-model";
import {
  resolveTrustedModelContextCapacity,
} from "./model-capability-cache";
import {
  readGroupSessionMemoryExtractionState,
  waitForGroupSessionMemoryExtraction,
} from "./group-session-memory-extraction";
import {
  inspectGroupSessionMemoryTemplateState,
} from "./group-session-memory-customization";
import {
  recordGroupPromptCacheState,
  recordGroupPromptCacheUsage,
  readGroupMainContextUsageBaseline,
} from "./group-prompt-cache-break-detection";
import {
  ConversationSummary,
  FactAnchor,
  GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS,
  GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS,
  GROUP_COMPACT_MAX_FAILURES,
  GROUP_COMPACT_MAX_KEEP_TOKENS,
  GROUP_COMPACT_MIN_KEEP_MESSAGES,
  GROUP_COMPACT_MIN_KEEP_TOKENS,
  GROUP_COMPACT_MODEL_RETRY_MS,
  GROUP_MEMORY_COMPACTION_VERSION,
  GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT,
  buildGroupCompactLineage,
  buildGroupCompactTransactionReceipt,
  buildGroupCompactionModelUsageReceipt,
  buildGroupPostCompactMessageOrderReceipt,
} from "./group-compaction-receipts";
import {
  exactHookLedgerSessionId,
  readGroupMemoryCompactionHookLedger,
  runGroupMemoryCompactionHooks,
} from "./group-compaction-hooks";
import {
  buildDeterministicConversationSummary,
  buildGroupApiMicroCompactEditPlan,
  buildGroupCompactionSummaryInputProjection,
  buildGroupMicroCompactPlan,
  buildGroupPartialCompactSidecarSegment,
  buildGroupPostCompactCleanupAudit,
  buildGroupPostCompactRecoveryAudit,
  buildGroupPostCompactTaskStatusProjection,
  buildGroupPreservedSegment,
  buildGroupSessionMemoryCompactSelectionReceipt,
  buildGroupTruePostCompactPayloadBudget,
  buildPartialSidecarOnlyMemory,
  buildPostCompactReinjectionPlan,
  calculateGroupMessagesToKeepIndex,
  compactText,
  createEmptyConversationSummary,
  estimateGroupMessageTokens,
  estimateGroupTextTokens,
  evaluateGroupMemorySummaryQuality,
  extractFactAnchors,
  extractPersistentRequirements,
  mergeFactAnchors,
  mergeGroupPartialCompactSegments,
  mergePersistentRequirements,
  mergeSafeConversationSummary,
  messageContent,
  messageIdentity,
  normalizeSummary,
  normalizedSearchTokens,
  renderConversationSummary,
  selectGroupSessionMemoryForCompact,
  validateSummaryPreservesFallback,
} from "./group-compaction-projections";
import {
  buildGroupCompactStrategyDecision,
  buildGroupPtlEmergencyPlan,
  buildGroupPtlRecoveryPlan,
  calculateGroupCompactWarningState,
  getGroupAutoCompactThreshold,
  resolveGroupModelContextCapacity,
  resolvePartialCompactWindow,
} from "./group-compaction-strategy";
import {
  buildModelVisiblePayloadSnapshot,
  buildSessionPostCompactGate,
  measureSessionContextTokens,
  modelVisiblePayloadAccounting,
  runSessionCompactionHooks,
} from "../../system/session-compaction-core";
import {
  calculateSessionMemoryKeepWindow,
} from "../../system/session-memory-window";
import { mergeConversationWithExecution } from "../../system/session-execution-ledger";
import {
  validateGroupSessionLifecycleRuntimeFence,
} from "./group-session-lifecycle-head";
import { reviewSessionSummaryIfSelected } from "../../system/session-summary-secondary-review";
import { buildUnifiedCompactionReceipt, buildUnifiedSessionCompactionStateV1, buildUnifiedRecoveryContext, orchestrateUnifiedCompaction, createUnifiedSessionCompactionEngine } from "../../system/unified-session-compaction";
import { createUnifiedScopeAdapter } from "../../system/unified-session-compaction-adapters";
import type { UnifiedCompactionResult } from "../../system/unified-session-compaction-types";

// ===== merged from group-compaction-engine-part-01.ts =====

const GROUP_CONTEXT_FIXED_BUCKETS = ["system", "tools", "rules", "skills", "mcpTools", "subagentDefinitions"];

export function createGroupSessionCompactionAdapter(input: {
  groupId: string;
  sessionId: string;
  load: () => Promise<any> | any;
  commit: (result: UnifiedCompactionResult, fence: any) => Promise<void> | void;
  acquire?: () => Promise<any> | any;
  failure?: (error: unknown, fence: any) => Promise<void> | void;
  validate?: (fence: any, snapshot: any) => Promise<void> | void;
}) {
  return createUnifiedScopeAdapter({
    load: async () => ({ scope: "group", exactSessionId: `${input.groupId}:${input.sessionId}`, ...(await input.load()) }),
    acquire: input.acquire,
    commit: input.commit,
    failure: input.failure,
    validate: input.validate,
  });
}

export function buildGroupPressureAccountingSelection(triggerPayload: any, providerUsageBaseline: any, groupId: string, groupSessionId: string) {
  const triggerFixedTokens = GROUP_CONTEXT_FIXED_BUCKETS
    .reduce((sum, key) => sum + Math.max(0, Number(triggerPayload?.tokenBreakdown?.[key] || 0)), 0);
  const providerAccountingPayload = providerUsageBaseline?.valid === true
    && providerUsageBaseline.event?.token_breakdown
    && Number(providerUsageBaseline.event?.accounting_total_tokens || 0) > 0
    ? {
        schema: "ccm-model-visible-payload-accounting-v2",
        scope: "group",
        sessionId: `${groupId}:${groupSessionId}`,
        tokenBreakdown: { ...providerUsageBaseline.event.token_breakdown },
        totalTokens: Number(providerUsageBaseline.event.accounting_total_tokens || 0),
        payloadChecksum: String(providerUsageBaseline.event.payload_checksum || ""),
        fixedContextChecksum: String(providerUsageBaseline.event.fixed_context_checksum || ""),
        contentStored: false,
      }
    : null;
  const useProviderAccounting = !!providerAccountingPayload && triggerFixedTokens <= 0;
  return {
    triggerFixedTokens,
    providerAccountingPayload,
    measurementPayload: useProviderAccounting ? null : triggerPayload,
    persistedAccounting: useProviderAccounting
      ? providerAccountingPayload
      : modelVisiblePayloadAccounting(triggerPayload),
  };
}

export function normalizeHookAnchor(raw: any, index: number, type: FactAnchor["type"] = "user_requirement"): FactAnchor | null {
  const text = compactText(raw?.text || raw?.requirement || raw?.value || raw, 2000);
  if (!text) return null;
  const messageId = String(raw?.messageId || raw?.message_id || `hook-${index}`);
  return {
    id: String(raw?.id || `${messageId}:${type}`),
    type: String(raw?.type || type) === "dispatch_decision" ? "dispatch_decision" : "user_requirement",
    messageId,
    text,
    timestamp: String(raw?.timestamp || raw?.time || ""),
    checksum: crypto.createHash("sha256").update(`${type}\n${text}`).digest("hex").slice(0, 16),
  };
}

export function extractHookAnchors(results: any[], key: string, type: FactAnchor["type"]) {
  const anchors: FactAnchor[] = [];
  for (const entry of results || []) {
    const result = entry?.result || {};
    const values = [
      ...(Array.isArray(result?.[key]) ? result[key] : []),
      ...(key === "persistentRequirements" && Array.isArray(result?.mustKeep) ? result.mustKeep : []),
      ...(key === "factAnchors" && Array.isArray(result?.anchors) ? result.anchors : []),
    ];
    values.forEach((item, index) => {
      const anchor = normalizeHookAnchor(item, anchors.length + index, type);
      if (anchor) anchors.push(anchor);
    });
  }
  return anchors;
}

export function buildCompactionTimeline(messages: any[]) {
  const userMessages = messages
    .filter((item: any) => item?.role === "user" && messageContent(item))
    .slice(-40)
    .map((item: any, index: number) => `${messageIdentity(item, index)} [用户 -> ${item?.target || "all"}] ${compactText(messageContent(item), 1000)}`);
  const timeline = messages.slice(-80).map((item: any, index: number) => {
    const actor = item?.role === "user" ? `用户 -> ${item?.target || "all"}` : item?.agent || item?.role || "Agent";
    return `${messageIdentity(item, index)} [${actor}] ${compactText(messageContent(item), 900)}`;
  });
  return { userMessages, timeline };
}

export function extractJsonObject(text: string) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  return null;
}

export function normalizeOpenAiUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/chat/completions`;
}

export function normalizeAnthropicUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/v1\/messages$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/messages`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/messages`;
}

export function normalizeGeminiCompactUrl(value: string, model: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/:(?:generateContent|streamGenerateContent)(?:\?|$)/i.test(base)) return base.replace(/:streamGenerateContent/i, ":generateContent");
  const cleanModel = String(model || "").trim().replace(/^models\//i, "");
  if (/\/models\/[^/]+$/i.test(base)) return `${base}:generateContent`;
  if (/\/v1(?:beta)?$/i.test(base)) return `${base}/models/${encodeURIComponent(cleanModel)}:generateContent`;
  return `${base}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
}

function useGeminiCompact(config: any) {
  const format = String(config?.format || "auto").toLowerCase();
  const url = String(config?.apiUrl || "").toLowerCase();
  return format === "gemini-compatible" || format === "auto" && /generativelanguage\.googleapis\.com|:generatecontent/.test(url);
}

export async function callCompactionModelOnce(config: any, system: string, user: string, maxOutputTokens: number, attemptTimeoutMs: number) {
  const anthropic = config.format === "anthropic-compatible"
    || config.format === "auto" && String(config.apiUrl).toLowerCase().includes("anthropic")
    || /\/anthropic(?:\/|$)/i.test(String(config.apiUrl));
  const gemini = useGeminiCompact(config);
  const controller = new AbortController();
  const externalSignal: AbortSignal | null = config?.compactionAbortSignal || config?.compaction_abort_signal || null;
  const abortFromExternal = () => controller.abort((externalSignal as any)?.reason);
  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  const timeout = setTimeout(() => controller.abort(), Math.max(1_000, attemptTimeoutMs));
  let activityError: any = null;
  const activitySignal = typeof config.onCompactionActivity === "function" ? config.onCompactionActivity : null;
  const heartbeatMs = Math.max(25, Math.min(Number(config.compactionActivityHeartbeatMs || config.compaction_activity_heartbeat_ms || 30_000), 60_000));
  const activityInterval = activitySignal
    ? setInterval(() => {
      try { activitySignal({ stage: "model_summary_wait", heartbeat: true }); }
      catch (error) { activityError = error; controller.abort(); }
    }, heartbeatMs)
    : null;
  activityInterval?.unref?.();
  try {
    const groupId = String(config.groupId || config.group_id || "").trim();
    const groupSessionId = String(config.groupSessionId || config.group_session_id || "").trim();
    if (anthropic && groupId && groupSessionId.startsWith("gcs_")) {
      try {
        recordGroupPromptCacheState({
          groupId,
          groupSessionId,
          source: "group_main_compact",
          provider: "anthropic",
          model: config.model,
          system,
          toolSchemas: [],
          betaHeaders: [],
          cachedMicrocompactEnabled: false,
        });
      } catch {}
    }
    activitySignal?.({ stage: "model_summary_request", heartbeat: false });
    let response: any;
    try {
      const geminiEndpoint = gemini ? new URL(normalizeGeminiCompactUrl(config.apiUrl, config.model)) : null;
      if (geminiEndpoint && !geminiEndpoint.searchParams.has("key")) geminiEndpoint.searchParams.set("key", config.apiKey);
      response = await fetch(anthropic ? normalizeAnthropicUrl(config.apiUrl) : gemini ? geminiEndpoint!.toString() : normalizeOpenAiUrl(config.apiUrl), {
      method: "POST",
      headers: anthropic
        ? { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
        : gemini ? { "Content-Type": "application/json" }
          : { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
      body: JSON.stringify(anthropic ? {
        model: config.model,
        max_tokens: maxOutputTokens,
        temperature: 0.1,
        system,
        messages: [{ role: "user", content: user }],
      } : gemini ? {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens, temperature: 0.1 },
      } : {
        model: config.model,
        max_tokens: maxOutputTokens,
        temperature: 0.1,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: controller.signal,
      });
    } catch (error) {
      if (activityError) {
        const failed: any = new Error(String(activityError?.message || activityError || "压缩活动回调失败"));
        failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
        throw failed;
      }
      if (externalSignal?.aborted) {
        const cancelled: any = new Error(String((externalSignal as any).reason?.message || "模型调用已由外部取消"));
        cancelled.code = "CCM_MODEL_CALL_CANCELLED";
        throw cancelled;
      }
      throw error;
    }
    const body = await response.text();
    if (activityError) {
      const failed: any = new Error(String(activityError?.message || activityError || "压缩活动回调失败"));
      failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
      throw failed;
    }
    if (!response.ok) throw new Error(`memory compact HTTP ${response.status}: ${body.slice(0, 180)}`);
    const data = JSON.parse(body);
    const content = anthropic
      ? (data?.content || []).map((part: any) => part?.type === "text" ? part.text : "").join("")
      : gemini
        ? (data?.candidates || []).flatMap((candidate: any) => candidate?.content?.parts || []).map((part: any) => part?.text || "").join("")
        : data?.choices?.[0]?.message?.content || "";
    const summary = extractJsonObject(content);
    if (!summary) throw new Error("memory compact model returned invalid JSON");
    if (groupId && groupSessionId.startsWith("gcs_")) {
      const usage = data?.usage || data?.usageMetadata || {};
      try {
        recordGroupPromptCacheUsage({
          groupId,
          groupSessionId,
          source: "group_main_compact",
          provider: anthropic ? "anthropic" : gemini ? "gemini" : "openai",
          model: String(data?.model || config.model || ""),
          requestId: String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || ""),
          usage: {
            directInputTokens: Number(usage.input_tokens || usage.prompt_tokens || usage.promptTokenCount || 0),
            cacheCreationInputTokens: Number(usage.cache_creation_input_tokens || 0),
            cacheReadInputTokens: Number(usage.cache_read_input_tokens || usage.cachedContentTokenCount || 0),
            outputTokens: Number(usage.output_tokens || usage.completion_tokens || usage.candidatesTokenCount || 0),
          },
        });
      } catch {}
    }
    return {
      summary,
      usage: data?.usage || data?.usageMetadata || null,
      provider: anthropic ? "anthropic" : gemini ? "gemini" : "openai",
      model: String(data?.model || config.model || ""),
      responseId: String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || ""),
      stopReason: String(anthropic ? data?.stop_reason || "" : gemini ? data?.candidates?.[0]?.finishReason || "" : data?.choices?.[0]?.finish_reason || ""),
    };
  } finally {
    clearTimeout(timeout);
    if (activityInterval) clearInterval(activityInterval);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

export async function callCompactionModel(config: any, system: string, user: string, maxOutputTokens = GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS) {
  return callUnifiedCompactionModel(config, system, user, maxOutputTokens, {
    beforeRequest: ({ provider, model }) => { config?.onCompactionActivity?.({ stage: "model_summary_request", provider, model, heartbeat: false }); },
  });
  /* Legacy transport retained below only for source-level replay fixtures. */
  const mockCall = config?.compactionModelCall || config?.compaction_model_call || config?.modelCall || config?.model_call;
  if (typeof mockCall === "function") return mockCall({ system, user, maxOutputTokens });
  if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model) return null;
  return runModelCallWithRetry(
    context => callCompactionModelOnce(config, system, user, maxOutputTokens, context.attemptTimeoutMs),
    {
      scope: "session memory compaction model call",
      baseDelayMs: config.modelRetryBaseDelayMs ?? config.model_retry_base_delay_ms,
      onRetry: notice => {
        try {
          config.onCompactionActivity?.({
            stage: "model_summary_retry",
            heartbeat: false,
            attempt: notice.attempt + 1,
            maxAttempts: notice.maxAttempts,
          });
        } catch {}
        console.warn(`[模型重试] 会话压缩模型暂时失败，将执行第 ${notice.attempt + 1}/${notice.maxAttempts} 次尝试：${String(notice.error?.message || notice.error || "").slice(0, 240)}`);
      },
    },
  );
}

export function fitCompactionPromptToTokenBudget(system: string, user: string, maxInputTokens: number) {
  const initialTokens = estimateTextTokens(system) + estimateTextTokens(user);
  if (initialTokens <= maxInputTokens) return { user, initialTokens, finalTokens: initialTokens, clipped: false };
  let low = 256;
  let high = Math.max(low, user.length);
  let best = compactPreserveEdges(user, low, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = compactPreserveEdges(user, mid, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
    const tokens = estimateTextTokens(system) + estimateTextTokens(candidate);
    if (tokens <= maxInputTokens) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const finalTokens = estimateTextTokens(system) + estimateTextTokens(best);
  if (finalTokens > maxInputTokens) throw new Error(`memory compact request cannot fit model input budget: ${finalTokens}/${maxInputTokens}`);
  return { user: best, initialTokens, finalTokens, clipped: true };
}

const GROUP_COMPACTION_MAX_PTL_RETRIES = 3;

export function isGroupCompactionPromptTooLongError(error: any) {
  return /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|token limit|request too large/i.test(String(error?.message || error || ""));
}

export function groupCompactionMessagesByApiRound(messages: any[] = []) {
  const groups: any[][] = [];
  let current: any[] = [];
  for (const message of messages) {
    const content = Array.isArray(message?.content) ? message.content : [];
    const isToolResult = message?.type === "tool_result"
      || content.some((part: any) => part?.type === "tool_result");
    const startsUserRound = String(message?.role || "") === "user" && !isToolResult && message?.isMeta !== true;
    if (startsUserRound && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(message);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

export function truncateGroupCompactionHeadByApiRound(messages: any[] = [], tokenGap = 0) {
  const groups = groupCompactionMessagesByApiRound(messages);
  if (groups.length < 2) return null;
  let dropCount = 0;
  if (tokenGap > 0) {
    let removedTokens = 0;
    while (dropCount < groups.length - 1 && removedTokens < tokenGap) {
      removedTokens += groups[dropCount].reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
      dropCount += 1;
    }
  } else {
    dropCount = Math.max(1, Math.floor(groups.length * 0.2));
  }
  dropCount = Math.min(dropCount, groups.length - 1);
  return {
    messages: groups.slice(dropCount).flat(),
    droppedRoundCount: dropCount,
    remainingRoundCount: groups.length - dropCount,
  };
}

export function buildGroupCompactionModelRequest(messages: any[], memory: any, fallback: ConversationSummary, config: any = {}) {
  const previous = memory?.conversationSummary || createEmptyConversationSummary();
  const customInstructions = compactText(config?.customInstructions || config?.custom_instructions || "", 4_000);
  const system = `You are the CCM group-Agent conversation compactor. Return JSON only. Do not call tools, create tasks, or dispatch to any Agent.
The summary replaces messages before the compaction boundary, so preserve facts accurately and allow the main Agent to continue without a context break.
Follow Claude Code-style compaction: preserve explicit user requirements, intent changes, technical decisions, files and code references, errors and fixes, completed work, unfinished work, current work, and next steps.
Merge the previous summary and do not let new messages erase still-valid constraints. When completed work conflicts with a todo, prefer newer evidence.
Never invent file changes, tests, or completion. Keep unverified speculation only in hypotheses; never promote it to decisions or completedWork.`;
  const capacity = resolveGroupModelContextCapacity(config);
  const maxOutputTokens = Math.max(1_000, Math.min(
    GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS,
    Number(config?.memoryCompactionMaxOutputTokens || config?.memory_compaction_max_output_tokens || GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS)
  ));
  const providerSafeInput = Math.max(8_000, capacity.contextWindow - maxOutputTokens - GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS);
  const configuredInputLimit = Number(config?.memoryCompactionMaxInputTokens || config?.memory_compaction_max_input_tokens || 0);
  const maxInputTokens = configuredInputLimit > 0
    ? Math.max(8_000, Math.min(providerSafeInput, configuredInputLimit))
    : providerSafeInput;
  let effectiveMessages = [...messages];
  let validationFallback = fallback;
  let droppedRoundCount = 0;
  let originalEstimatedInputTokens = 0;
  let payload: any = null;
  const buildPayload = () => {
    const summaryInputProjection = buildGroupCompactionSummaryInputProjection(effectiveMessages, {
      previousSummary: previous,
      fallbackSummary: validationFallback,
      rebuildFallbackFromProjectedMessages: true,
      memory,
      stripReinjectedAttachments: config?.stripReinjectedCompactionAttachments !== false
        && config?.strip_reinjected_compaction_attachments !== false,
    });
    const timeline = buildCompactionTimeline(summaryInputProjection.messages);
    const projectedValidationFallback = normalizeSummary(summaryInputProjection.fallbackSummary, createEmptyConversationSummary());
    const candidateUser = `旧结构化摘要：
${JSON.stringify(summaryInputProjection.previousSummary)}

保真校验参考（最终摘要必须由模型生成并完整覆盖这些事实）：
${JSON.stringify(projectedValidationFallback)}
${customInstructions ? `\n用户本次 /compact 的附加要求：\n${customInstructions}\n` : ""}
本次被压缩区间内的全部用户消息（已做长度保护）：
${timeline.userMessages.join("\n") || "无"}

本次被压缩区间的近期时间线：
${timeline.timeline.join("\n") || "无"}

返回以下 JSON，不要 Markdown：
{"primaryRequest":"","userMessages":[],"hypotheses":[],"keyConcepts":[],"filesAndCode":[],"errorsAndFixes":[],"decisions":[],"completedWork":[],"pendingTasks":[],"currentWork":"","nextStep":"","participantState":[],"taskStates":[]}`;
    return { summaryInputProjection, projectedValidationFallback, candidateUser };
  };
  for (let attempt = 0; attempt <= GROUP_COMPACTION_MAX_PTL_RETRIES; attempt += 1) {
    payload = buildPayload();
    const estimated = estimateTextTokens(system) + estimateTextTokens(payload.candidateUser);
    if (attempt === 0) originalEstimatedInputTokens = estimated;
    if (estimated <= maxInputTokens || attempt === GROUP_COMPACTION_MAX_PTL_RETRIES) break;
    const truncated = truncateGroupCompactionHeadByApiRound(effectiveMessages, estimated - maxInputTokens);
    if (!truncated) break;
    effectiveMessages = truncated.messages;
    droppedRoundCount += truncated.droppedRoundCount;
    validationFallback = buildDeterministicConversationSummary(effectiveMessages, memory, previous);
  }
  validationFallback = payload.projectedValidationFallback;
  const fitted = fitCompactionPromptToTokenBudget(system, payload.candidateUser, maxInputTokens);
  return {
    system,
    user: fitted.user,
    maxOutputTokens,
    effectiveMessages,
    validationFallback,
    audit: {
      schema: "ccm-group-compaction-model-request-budget-v1",
      modelCapacity: capacity,
      maxInputTokens,
      maxOutputTokens,
      estimatedInputTokensBefore: originalEstimatedInputTokens || fitted.initialTokens,
      estimatedInputTokensAfterRoundDrops: fitted.initialTokens,
      estimatedInputTokens: fitted.finalTokens,
      withinBudget: fitted.finalTokens <= maxInputTokens,
      clipped: fitted.clipped,
      sourceMessageCount: messages.length,
      effectiveSourceMessageCount: effectiveMessages.length,
      droppedApiRoundCount: droppedRoundCount,
      recentTimelineMessageLimit: 80,
      userMessageLimit: 40,
      sourceStrategy: droppedRoundCount > 0
        ? "drop_oldest_complete_api_rounds_then_preserve_recent_evidence"
        : "deterministic_full_history_aggregate_plus_bounded_recent_evidence",
      rawTranscriptPreserved: true,
      customInstructionsApplied: !!customInstructions,
      summaryInputProjection: payload.summaryInputProjection.receipt,
    },
  };
}

export async function summarizeWithModel(messages: any[], memory: any, fallback: ConversationSummary, config: any) {
  let request: any = null;
  let effectiveMessages = messages;
  let validationFallback = fallback;
  let ptlRetryAttempts = 0;
  for (;;) {
    request = buildGroupCompactionModelRequest(effectiveMessages, memory, validationFallback, config);
    try {
      const result = await callCompactionModel(config, request.system, request.user, request.maxOutputTokens);
      request.audit.ptlRetryAttempts = ptlRetryAttempts;
    const compactionUsage = buildGroupCompactionModelUsageReceipt({
      groupId: config?.groupId || config?.group_id || "",
      groupSessionId: config?.groupSessionId || config?.group_session_id || "",
      usage: result?.usage,
      provider: result?.provider || (config?.format === "anthropic-compatible" ? "anthropic" : "openai"),
      model: result?.model || config?.model || "",
      responseId: result?.responseId || "",
      stopReason: result?.stopReason || "",
      requestAudit: request.audit,
      status: result?.usage ? "reported" : "unreported",
    });
    return {
      summary: result?.summary ? normalizeSummary(result.summary, createEmptyConversationSummary()) : null,
      requestAudit: request.audit,
      compactionUsage,
      validationFallback: request.validationFallback,
      qualityMessages: request.effectiveMessages,
    };
    } catch (error: any) {
      const truncated = isGroupCompactionPromptTooLongError(error) && ptlRetryAttempts < GROUP_COMPACTION_MAX_PTL_RETRIES
        ? truncateGroupCompactionHeadByApiRound(request.effectiveMessages)
        : null;
      if (truncated) {
        ptlRetryAttempts += 1;
        effectiveMessages = truncated.messages;
        validationFallback = buildDeterministicConversationSummary(effectiveMessages, memory, memory?.conversationSummary || createEmptyConversationSummary());
        continue;
      }
      request.audit.ptlRetryAttempts = ptlRetryAttempts;
      error.compactionRequestAudit = request.audit;
      error.compactionUsage = buildGroupCompactionModelUsageReceipt({
        groupId: config?.groupId || config?.group_id || "",
        groupSessionId: config?.groupSessionId || config?.group_session_id || "",
        provider: config?.format === "anthropic-compatible" ? "anthropic" : "openai",
        model: config?.model || "",
        requestAudit: request.audit,
        status: "failed",
      });
      throw error;
    }
  }
}

export function buildRelevantHistoricalGroupContext(messages: any[], boundaryIndex: number, query: string, options: any = {}) {
  if (boundaryIndex < 0 || !messages?.length) return "";
  const queryTokens = [...normalizedSearchTokens(query)].slice(0, 120);
  if (!queryTokens.length) return "";
  const maxMessages = Math.max(1, Math.min(10, Number(options.maxMessages || 6)));
  const maxChars = Math.max(1000, Math.min(12_000, Number(options.maxChars || 6000)));
  const ranked: Array<{ index: number; score: number; message: any }> = [];
  for (let index = 0; index <= boundaryIndex; index += 1) {
    const message = messages[index];
    const content = messageContent(message);
    if (!content) continue;
    const corpus = content.toLowerCase();
    let score = 0;
    for (const token of queryTokens) if (corpus.includes(token)) score += token.length >= 4 ? 3 : 1;
    if (!score) continue;
    if (message?.role === "user") score += 4;
    if (message?.dispatchPolicy || message?.delivery_summary || message?.receipt) score += 2;
    ranked.push({ index, score, message });
  }
  const selected = ranked.sort((a, b) => b.score - a.score || b.index - a.index).slice(0, maxMessages).sort((a, b) => a.index - b.index);
  if (!selected.length) return "";
  const lines = ["按当前任务自动回溯到的压缩前原文证据（原文优先于摘要）："];
  let used = lines[0].length;
  for (const item of selected) {
    const actor = item.message?.role === "user" ? `用户 -> ${item.message?.target || "all"}` : item.message?.agent || item.message?.role || "Agent";
    const row = `- #${messageIdentity(item.message, item.index)} [${actor}] ${compactText(messageContent(item.message), 1400)}`;
    if (used + row.length > maxChars) break;
    lines.push(row);
    used += row.length;
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

// ===== merged from group-compaction-engine-part-02.ts =====

function assertGroupCompactionLifecycleFence(config: any, stage: string) {
  const fence = config?.compactionLifecycleFence || config?.compaction_lifecycle_fence || null;
  if (!fence) return null;
  const validation = validateGroupSessionLifecycleRuntimeFence(fence);
  if (!validation.valid) {
    const error: any = new Error(`group compaction session lifecycle fence is stale at ${stage}: ${validation.issues.join(",")}`);
    error.code = "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE";
    error.compactionLifecycleStage = stage;
    error.lifecycleValidation = validation;
    throw error;
  }
  if (typeof config?.onCompactionActivity === "function") config.onCompactionActivity({ stage, heartbeat: false });
  return validation;
}

export function calculateGroupProviderCalibratedContextTokens(estimatedActiveTokens: number, providerUsageBaseline: any) {
  const estimated = Math.max(0, Number(estimatedActiveTokens || 0));
  const correction = providerUsageBaseline?.valid === true
    ? Math.max(0,
      Number(providerUsageBaseline.event?.provider_observed_context_tokens || 0)
      - Number(providerUsageBaseline.event?.estimated_context_tokens || 0))
    : 0;
  return { estimatedActiveTokens: estimated, providerObservedCorrection: correction, activeTokens: estimated + correction };
}

function groupCompactionSourceChecksum(messages: any[], memory: any) {
  return crypto.createHash("sha256").update(JSON.stringify({
    messages: (Array.isArray(messages) ? messages : []).map((item: any) => String(item?.id || item?.messageId || "")),
    boundary: String(memory?.unifiedSessionCompaction?.receiptChecksum || memory?.unifiedSessionCompaction?.summaryChecksum || ""),
    workers: (Array.isArray(memory?.workerLedger) ? memory.workerLedger : []).map((item: any) => String(item?.taskId || item?.task_id || item?.id || "")).slice(-64),
  })).digest("hex");
}

function buildUnifiedCompactionReferenceForMock(messages: any[], memory: any) {
  const text = (Array.isArray(messages) ? messages : []).map((item: any) => String(item?.content || "")).join("\n");
  const files = [...text.matchAll(/(?:src|backend|frontend)[\\/][A-Za-z0-9_.\\/-]+/g)].map(match => match[0]);
  return {
    primaryRequest: String(memory?.goal || messages?.find((item: any) => item?.role === "user")?.content || "").slice(0, 1600),
    userRequests: (messages || []).filter((item: any) => item?.role === "user").slice(0, 20).map((item: any) => String(item.content || "").slice(0, 1000)),
    keyOutcomes: (messages || []).filter((item: any) => item?.role === "assistant").slice(-20).map((item: any) => String(item.content || "").slice(0, 1000)),
    userAnchors: [],
    feedback: [],
    authorization: [],
    decisions: [],
    references: [],
    unresolved: [],
    errors: [],
    filesAndResources: files,
    missionIds: [],
    latestOutcome: String(messages?.at(-1)?.content || "").slice(0, 1600),
  };
}

async function runUnifiedGroupConversationMemory(input: any) {
  const groupId = String(input.groupId || "").trim();
  const groupSessionId = exactHookLedgerSessionId(String(input.groupSessionId || ""));
  if (!groupId || !groupSessionId) throw new Error("exact_group_session_required_for_group_memory_compaction");
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const memory = input.memory || {};
  const config = input.config || {};
  let acquiredChecksum = "";
  const adapter = createGroupSessionCompactionAdapter({
    groupId,
    sessionId: groupSessionId,
    acquire: () => {
      assertGroupCompactionLifecycleFence(config, "before_unified_engine");
      acquiredChecksum = groupCompactionSourceChecksum(messages, memory);
      return { scope: "group", exactSessionId: `${groupId}:${groupSessionId}`, generation: Number(memory?.unifiedSessionCompaction?.boundaryGeneration || 0), checksum: acquiredChecksum, acquiredAt: new Date().toISOString() };
    },
    load: () => {
      const currentMessages = Array.isArray(input.messages) ? input.messages : [];
      const currentMemory = input.memory || {};
      const state = currentMemory.unifiedSessionCompaction || {};
      return {
        scope: "group",
        exactSessionId: `${groupId}:${groupSessionId}`,
        messages: currentMessages,
        executionEvents: Array.isArray(currentMemory.executionEvents) ? currentMemory.executionEvents : [],
        activeSummary: currentMemory.unifiedSessionSummary || null,
        previousState: state,
        boundaryGeneration: Number(state.boundaryGeneration || 0),
        compactionFloorIndex: Number(state.summarizedMessageCount || 0),
        recoveryContext: {
          permissionBoundary: `group:${groupId}`,
          taskBindings: (Array.isArray(currentMemory.workerLedger) ? currentMemory.workerLedger : []).slice(-64),
          planBindings: currentMemory.planBindings || [],
          members: currentMemory.members || currentMemory.memberState || [],
          parallelState: currentMemory.parallelState || currentMemory.parallel || null,
          factAnchors: currentMemory.factAnchors || [],
          postCompactReinject: config.postCompactReinject || config.post_compact_reinject || null,
        },
        contextComponents: config.contextComponents || config.context_components || {},
      };
    },
    validate: () => {
      assertGroupCompactionLifecycleFence(config, "before_unified_commit");
      if (groupCompactionSourceChecksum(input.messages, input.memory) !== acquiredChecksum) throw new Error("group_compaction_fence_stale");
    },
    commit: (result, fence) => {
      assertGroupCompactionLifecycleFence(config, "commit_unified");
      if (groupCompactionSourceChecksum(input.messages, input.memory) !== fence.checksum) throw new Error("group_compaction_commit_fence_stale");
      const summary = result.fullCompaction.summary;
      if (!summary || summary.schema !== "ccm-unified-session-summary-v1") throw new Error("group_compaction_summary_missing");
      const state = buildUnifiedSessionCompactionStateV1({ receipt: result.receipt, summaryQuality: result.summaryQuality, microCompact: result.microCompact, recoveryContext: result.recoveryContext, triggerReason: input.force ? "manual" : "automatic", summarizedThroughMessageId: result.preservedRecentWindow.messages[0]?.id || "", summarizedMessageCount: result.preservedRecentWindow.startIndex, preservedRecentMessageIds: result.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")) });
      input.memory.unifiedSessionSummary = summary;
      input.memory.unifiedSessionCompaction = state;
      input.memory.unifiedRecoveryContext = result.recoveryContext;
      input.memory.unifiedSessionBoundary = {
        id: `unified-compact-${result.receipt.checksum.slice(0, 16)}`,
        type: input.force ? "manual" : "auto",
        summarizedMessageCount: result.preservedRecentWindow.startIndex,
        summarizedThroughMessageId: String(result.snapshot.messages[Math.max(0, result.preservedRecentWindow.startIndex - 1)]?.id || ""),
        preservedMessageIds: result.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")),
        preservedRecentMessageIds: result.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")),
        compactMetadata: { trigger: input.force ? "manual" : "auto" },
        checksum: result.receipt.checksum,
        contentStored: false,
      };
      input.memory.updatedAt = new Date().toISOString();
    },
    failure: (_error) => {
      // Failure is recorded by the group lifecycle ledger; never mutate the
      // caller's in-memory snapshot after a failed transaction.
    },
  });
  const configuredMock = config.compactionModelCall || config.compaction_model_call;
  const modelCall = config.modelCall || config.model_call || (typeof configuredMock === "function"
    ? async (request: any) => {
      const reference = buildUnifiedCompactionReferenceForMock(messages, memory);
      return configuredMock({ ...request, user: `保真校验参考（最终摘要必须由模型生成并完整覆盖这些事实）：\n${JSON.stringify(reference)}\n\n本次被压缩区间内的全部用户消息\n${request.user}` });
    }
    : (request: any) => callUnifiedCompactionModel(config, request.system, request.user, request.maxOutputTokens, {
    beforeRequest: ({ provider, model }) => { config.onCompactionActivity?.({ stage: "model_summary_request", provider, model, heartbeat: false }); },
    }));
  const engine = createUnifiedSessionCompactionEngine({
    adapter,
    config,
    force: input.force,
    reason: input.force ? "manual" : "automatic",
    customInstructions: config.customInstructions || config.custom_instructions,
    modelCall,
    buildProjection: (snapshot: any) => buildModelVisiblePayloadSnapshot({
      scope: "group",
      sessionId: `${groupId}:${groupSessionId}`,
      system: config.modelVisibleSystemContext || config.model_visible_system_context || config.systemPrompt || config.system_prompt || null,
      tools: config.modelVisibleTools || config.model_visible_tools || null,
      activeSummary: snapshot.activeSummary,
      recentMessages: mergeConversationWithExecution(snapshot.messages, snapshot.executionEvents),
      currentRequest: config.currentRequest || config.current_request || null,
      recoveryContext: snapshot.recoveryContext,
      hookResults: [],
      contextComponents: snapshot.contextComponents,
    }),
    buildPostCompactPayload: ({ summary, preservedTimeline, recoveryContext, snapshot }: any) => buildModelVisiblePayloadSnapshot({
      scope: "group",
      sessionId: `${groupId}:${groupSessionId}`,
      system: config.modelVisibleSystemContext || config.model_visible_system_context || null,
      tools: config.modelVisibleTools || config.model_visible_tools || null,
      activeSummary: summary,
      recentMessages: preservedTimeline,
      currentRequest: config.currentRequest || config.current_request || null,
      recoveryContext: {
        ...recoveryContext,
        postCompactReinject: snapshot?.recoveryContext?.postCompactReinject || config.postCompactReinject || config.post_compact_reinject || null,
      },
      hookResults: [],
      contextComponents: config.contextComponents || config.context_components || {},
    }),
    measure: (payload: any) => Number(payload?.totalTokens || estimateTextTokens(JSON.stringify(payload || {}))),
    qualityReference: () => ({ authorizationBoundaries: [], fileReferences: [], verificationEvidence: [], pendingWork: [], sourceMessageIds: [] }),
  });
  let compacted: any;
  try {
    compacted = await engine.run();
  } catch (error: any) {
    // Keep the public group runner's failure projection stable while the
    // unified engine remains the only lifecycle implementation.
    if (error?.code === "CCM_UNIFIED_COMPACTION_POST_GATE_FAILED") {
      error.code = "GROUP_POST_COMPACT_THRESHOLD_EXCEEDED";
      const gate = error.postCompactGate || {};
      error.postCompactPayloadGate = {
        status: "recompact_required",
        action: "reduce_restored_context_before_child_dispatch",
        true_post_compact_token_count: Number(gate.afterTokens || 0),
        trigger_tokens: Number(gate.threshold || config.modelAutoCompactTokenLimit || config.model_auto_compact_token_limit || 0),
        formal_recompaction: { attempted: true, maxAttempts: 1 },
      };
    }
    throw error;
  }
  const displayMemory = {
    ...input.memory,
    compaction: {
      summarySource: compacted.receipt.summarySource,
      quality: { pass: compacted.summaryQuality?.valid !== false },
      rawTranscriptPreserved: true,
    },
  };
  return {
    success: true,
    compacted: compacted.compacted,
    reason: compacted.reason,
    memory: displayMemory,
    keepIndex: compacted.preservedRecentWindow.startIndex,
    messagesToCompact: messages.slice(0, compacted.preservedRecentWindow.startIndex),
    keptMessages: compacted.preservedRecentWindow.messages,
    boundary: compacted.compacted ? (input.memory.unifiedSessionBoundary || {
      id: `unified-compact-${compacted.receipt.checksum.slice(0, 16)}`,
      type: input.force ? "manual" : "auto",
      preservedMessageIds: compacted.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")),
      summarizedThroughMessageId: messages[Math.max(0, compacted.preservedRecentWindow.startIndex - 1)]?.id || "",
      summaryChecksum: compacted.summaryChecksum,
      summarizedMessageCount: compacted.preservedRecentWindow.startIndex,
      compactMetadata: { trigger: input.force ? "manual" : "auto" },
    }) : null,
    // The unified receipt is authoritative. Legacy compact-head persistence
    // is intentionally not invoked for the unified lifecycle.
    compactTransactionReceipt: null,
    compactStrategyDecision: { reason: compacted.compacted ? "unified session compaction" : "below compact threshold", strategy: "cc_two_stage" },
    unifiedSessionSummary: compacted.fullCompaction.summary,
    unifiedSessionCompaction: compacted.receipt,
    contentStored: false,
  };
}

export async function compactGroupConversationMemory(input: {
  groupId: string;
  groupSessionId?: string;
  messages: any[];
  memory: any;
  config?: any;
  transcriptPath: string;
  force?: boolean;
  rebuild?: boolean;
  partialCompact?: any;
  activeTasks?: any[];
}) {
  return runUnifiedGroupConversationMemory(input);
}

// ===== merged from group-compaction-engine-part-03.ts =====

export async function runGroupMemoryPreservedSegmentSelfTest() {
  const messages = [
    ...Array.from({ length: 24 }, (_, index) => ({
      id: `ps-old-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      target: index % 2 === 0 ? "coordinator" : undefined,
      agent: index % 2 === 1 ? "worker" : undefined,
      content: `preserved segment old message ${index} ${"上下文".repeat(40)}`,
    })),
    {
      id: "ps-task-user",
      role: "user",
      target: "coordinator",
      task_id: "preserved-task",
      content: "必须保留 PRESERVED_SEGMENT_SENTINEL，给 api 子 Agent 继续处理 src/preserved.ts。",
    },
    {
      id: "ps-task-result",
      role: "assistant",
      agent: "api",
      receipt: { status: "failed", taskId: "preserved-task", summary: "PRESERVED_SEGMENT_SENTINEL 仍需继续修复" },
      content: "api 回执：PRESERVED_SEGMENT_SENTINEL 失败，src/preserved.ts 还需要继续处理。",
    },
  ];
  const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 1, minTokens: 1, maxTokens: 5000 });
  const segment = buildGroupPreservedSegment(messages, keepIndex, {
    minMessages: 1,
    minTokens: 1,
    maxTokens: 5000,
    summaryChecksum: "preserved-segment-selftest",
    transcriptPath: "preserved-segment-raw.json",
    now: "2026-07-07T00:00:00.000Z",
  });
  const result: any = await compactGroupConversationMemory({
    groupId: "preserved-segment-self-test",
    groupSessionId: "gcs_preserved_segment_selftest",
    messages,
    memory: { goal: "preserved segment selftest", compaction: {} },
    transcriptPath: "preserved-segment-raw.json",
    force: true,
    config: { minKeepMessages: 1, minKeepTokens: 1, maxKeepTokens: 5000 },
  });
  const boundarySegment = result.boundary?.preservedSegment || {};
  const checks = {
    keepIndexExpandedToTaskStart: keepIndex === 24 && messages[keepIndex]?.id === "ps-task-user",
    taskTransactionProtected: segment.protectedTaskTransaction === true
      && segment.firstPreservedMessageId === "ps-task-user"
      && segment.lastPreservedMessageId === "ps-task-result",
    segmentRecordsBudget: segment.preservedTokenEstimate > 0
      && segment.minTextBlockMessages === 1
      && segment.maxTokens === 5000,
    compactBoundaryCarriesSegment: result.compacted === true
      && boundarySegment.schema === "ccm-group-preserved-segment-v1"
      && boundarySegment.firstPreservedMessageId === "ps-task-user"
      && boundarySegment.lastPreservedMessageId === "ps-task-result",
    postCompactRestoreCarriesSegment: result.boundary?.post_compact_restore?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    memoryCarriesSegment: result.memory?.compaction?.preservedSegment?.schema === "ccm-group-preserved-segment-v1"
      && result.memory?.messageCompression?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    rawTranscriptUntouched: messages[24].content.includes("PRESERVED_SEGMENT_SENTINEL") && messages.length === 26,
  };
  return { pass: Object.values(checks).every(Boolean), checks, keepIndex, segment, boundarySegment };
}

export async function runGroupMemoryPostCompactRecoveryAuditSelfTest() {
  const messages = Array.from({ length: 46 }, (_, index) => ({
    id: `audit-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "audit-worker" : undefined,
    task_id: index >= 10 && index <= 18 ? "audit-task" : undefined,
    content: index === 0
      ? "必须保留 RECOVERY_AUDIT_SENTINEL_20260707，压缩后子 Agent 仍要拿到恢复审计。"
      : index === 11
        ? "audit-worker 修改 src/recovery-audit.ts，执行 npm run check passed。"
        : `恢复审计测试消息 ${index} src/audit-${index}.ts ${"上下文".repeat(160)}`,
    receipt: index === 11 ? {
      status: "done",
      taskId: "audit-task",
      summary: "完成 recovery audit",
      filesChanged: ["src/recovery-audit.ts"],
      verification: ["npm run check passed"],
    } : undefined,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "post-compact-recovery-audit-self-test",
    groupSessionId: "gcs_post_compact_recovery_selftest",
    messages,
    memory: { goal: "压缩后恢复审计自测" },
    config: { memoryCompactionUseModel: false, minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 3200 },
    transcriptPath: "post-compact-recovery-audit-raw.json",
    force: true,
  });
  const audit = result.memory?.compaction?.postCompactRecoveryAudit || {};
  const boundaryAudit = result.boundary?.post_compact_restore?.recoveryAudit || {};
  const messageCompressionAudit = result.memory?.messageCompression?.postCompactRecoveryAudit || {};
  const checkById = new Map<string, any>((audit.checks || []).map((check: any) => [check.id, check]));
  const candidateCounts = audit.candidateCounts || {};
  const candidateTotal = ["files", "skills", "verification", "blockers"].reduce((sum, key) => sum + Number(candidateCounts[key] || 0), 0);
  const checks = {
    compacted: result.compacted === true,
    auditRecordedInCompaction: audit.schema === "ccm-post-compact-recovery-audit-v1" && audit.status === "pass" && audit.pass === true,
    auditRecordedInBoundary: boundaryAudit.schema === "ccm-post-compact-recovery-audit-v1" && boundaryAudit.summaryChecksum === audit.summaryChecksum,
    auditRecordedInMessageCompression: messageCompressionAudit.schema === "ccm-post-compact-recovery-audit-v1",
    boundaryRangeResolvable: checkById.get("boundary_range_resolvable")?.pass === true
      && checkById.get("compact_window_matches_keep_index")?.pass === true,
    rawTranscriptRecoverable: checkById.get("raw_transcript_path_recorded")?.pass === true
      && audit.transcriptPath === "post-compact-recovery-audit-raw.json",
    preservedAndReinjectReady: checkById.get("preserved_segment_recorded")?.pass === true
      && checkById.get("post_compact_reinject_plan_recorded")?.pass === true
      && candidateTotal > 0,
    warningSuppressedAfterCompact: checkById.get("post_compact_warning_suppressed")?.pass === true,
    childAgentActionSafe: audit.action === "safe_to_inject_child_agent_memory_packet"
      && String(audit.cleanupPolicy?.childAgentIsolation || "").includes("child_agent"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return { pass: Object.values(checks).every(Boolean), checks, audit };
}

export function runGroupMemoryCompactWarningSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryCompactWarningSelfTest();
}

export function runGroupMemoryCompactionSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryCompactionSelfTest();
}

export function runGroupMemoryModelCapacitySelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryModelCapacitySelfTest();
}

export function runGroupApiMicrocompactNativeApplyPlanSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupApiMicrocompactNativeApplyPlanSelfTest();
}

export function runGroupMemoryQualityGateSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryQualityGateSelfTest();
}

export function runGroupMemoryMicroCompactSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryMicroCompactSelfTest();
}

export function runGroupMemoryTimeBasedMicroCompactSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryTimeBasedMicroCompactSelfTest();
}
