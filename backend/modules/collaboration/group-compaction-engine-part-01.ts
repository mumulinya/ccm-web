// Behavior-freeze split from group-compaction-engine.ts (part 1/3).
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { loadSkills, SKILL_PACKAGES_DIR } from "../../core/db";
import { isCcmInternalSkillName } from "../../skills/internal-skill-catalog";
import { buildContextBudget, compactPreserveEdges, estimateTextTokens, getAutoCompactThreshold, microCompactText } from "../../system/context-budget";
import { resolveTrustedModelContextCapacity } from "./model-capability-cache";
import {
  readGroupSessionMemoryExtractionState,
  waitForGroupSessionMemoryExtraction,
} from "./group-session-memory-extraction";
import { inspectGroupSessionMemoryTemplateState } from "./group-session-memory-customization";
import { recordGroupPromptCacheState, recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";

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

export async function callCompactionModel(config: any, system: string, user: string, maxOutputTokens = GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS) {
  const mockCall = config?.compactionModelCall || config?.compaction_model_call || config?.modelCall || config?.model_call;
  if (typeof mockCall === "function") return mockCall({ system, user, maxOutputTokens });
  if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model) return null;
  const anthropic = config.format === "anthropic-compatible"
    || config.format === "auto" && String(config.apiUrl).toLowerCase().includes("anthropic")
    || /\/anthropic(?:\/|$)/i.test(String(config.apiUrl));
  const controller = new AbortController();
  const externalSignal: AbortSignal | null = config?.compactionAbortSignal || config?.compaction_abort_signal || null;
  const abortFromExternal = () => controller.abort((externalSignal as any)?.reason);
  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Math.min(Number(config.timeoutMs) || 90_000, 120_000)));
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
      response = await fetch(anthropic ? normalizeAnthropicUrl(config.apiUrl) : normalizeOpenAiUrl(config.apiUrl), {
      method: "POST",
      headers: anthropic
        ? { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
        : { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
      body: JSON.stringify(anthropic ? {
        model: config.model,
        max_tokens: maxOutputTokens,
        temperature: 0.1,
        system,
        messages: [{ role: "user", content: user }],
      } : {
        model: config.model,
        max_tokens: maxOutputTokens,
        temperature: 0.1,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: controller.signal,
      });
    } catch (error) {
      if (activityError) throw activityError;
      if (externalSignal?.aborted && (externalSignal as any).reason) throw (externalSignal as any).reason;
      throw error;
    }
    const body = await response.text();
    if (activityError) throw activityError;
    if (!response.ok) throw new Error(`memory compact HTTP ${response.status}: ${body.slice(0, 180)}`);
    const data = JSON.parse(body);
    const content = anthropic
      ? (data?.content || []).map((part: any) => part?.type === "text" ? part.text : "").join("")
      : data?.choices?.[0]?.message?.content || "";
    if (groupId && groupSessionId.startsWith("gcs_")) {
      const usage = data?.usage || {};
      try {
        recordGroupPromptCacheUsage({
          groupId,
          groupSessionId,
          source: "group_main_compact",
          provider: anthropic ? "anthropic" : "openai",
          model: String(data?.model || config.model || ""),
          requestId: String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || ""),
          usage: {
            directInputTokens: Number(usage.input_tokens || usage.prompt_tokens || 0),
            cacheCreationInputTokens: Number(usage.cache_creation_input_tokens || 0),
            cacheReadInputTokens: Number(usage.cache_read_input_tokens || 0),
            outputTokens: Number(usage.output_tokens || usage.completion_tokens || 0),
          },
        });
      } catch {}
    }
    return {
      summary: extractJsonObject(content),
      usage: data?.usage || null,
      provider: anthropic ? "anthropic" : "openai",
      model: String(data?.model || config.model || ""),
      responseId: String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || ""),
      stopReason: String(anthropic ? data?.stop_reason || "" : data?.choices?.[0]?.finish_reason || ""),
    };
  } finally {
    clearTimeout(timeout);
    if (activityInterval) clearInterval(activityInterval);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
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
  const system = `你是群聊 Agent 会话压缩器。只生成 JSON，不调用工具，不创建任务，不向任何 Agent 派发。
你的摘要会替代压缩边界之前的原始消息，因此必须保真并支持主 Agent 无缝续跑。
参考 Claude Code compaction：保留用户明确要求、意图变化、技术决策、文件/代码、错误与修复、已完成、未完成、当前工作和下一步。
必须合并旧摘要，不能因为新消息覆盖仍有效的旧约束；已完成与待办冲突时，以时间较新的证据为准。
不要编造文件变更、测试或完成状态。`;
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
{"primaryRequest":"","userMessages":[],"keyConcepts":[],"filesAndCode":[],"errorsAndFixes":[],"decisions":[],"completedWork":[],"pendingTasks":[],"currentWork":"","nextStep":"","participantState":[],"taskStates":[]}`;
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
    if (/(错误|失败|阻塞|error|failed|blocked|\.(?:ts|js|vue|java|py|go|rs)\b)/i.test(content)) score += 1;
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
