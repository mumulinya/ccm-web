"use strict";
// group-compaction-engine.ts — merged from 3 part files (behavior-freeze merge).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGroupPressureAccountingSelection = buildGroupPressureAccountingSelection;
exports.normalizeHookAnchor = normalizeHookAnchor;
exports.extractHookAnchors = extractHookAnchors;
exports.buildCompactionTimeline = buildCompactionTimeline;
exports.extractJsonObject = extractJsonObject;
exports.normalizeOpenAiUrl = normalizeOpenAiUrl;
exports.normalizeAnthropicUrl = normalizeAnthropicUrl;
exports.normalizeGeminiCompactUrl = normalizeGeminiCompactUrl;
exports.callCompactionModelOnce = callCompactionModelOnce;
exports.callCompactionModel = callCompactionModel;
exports.fitCompactionPromptToTokenBudget = fitCompactionPromptToTokenBudget;
exports.isGroupCompactionPromptTooLongError = isGroupCompactionPromptTooLongError;
exports.groupCompactionMessagesByApiRound = groupCompactionMessagesByApiRound;
exports.truncateGroupCompactionHeadByApiRound = truncateGroupCompactionHeadByApiRound;
exports.buildGroupCompactionModelRequest = buildGroupCompactionModelRequest;
exports.summarizeWithModel = summarizeWithModel;
exports.buildRelevantHistoricalGroupContext = buildRelevantHistoricalGroupContext;
exports.calculateGroupProviderCalibratedContextTokens = calculateGroupProviderCalibratedContextTokens;
exports.compactGroupConversationMemory = compactGroupConversationMemory;
exports.runGroupMemoryPreservedSegmentSelfTest = runGroupMemoryPreservedSegmentSelfTest;
exports.runGroupMemoryPostCompactRecoveryAuditSelfTest = runGroupMemoryPostCompactRecoveryAuditSelfTest;
exports.runGroupMemoryCompactWarningSelfTest = runGroupMemoryCompactWarningSelfTest;
exports.runGroupMemoryCompactionSelfTest = runGroupMemoryCompactionSelfTest;
exports.runGroupMemoryModelCapacitySelfTest = runGroupMemoryModelCapacitySelfTest;
exports.runGroupApiMicrocompactNativeApplyPlanSelfTest = runGroupApiMicrocompactNativeApplyPlanSelfTest;
exports.runGroupMemoryQualityGateSelfTest = runGroupMemoryQualityGateSelfTest;
exports.runGroupMemoryMicroCompactSelfTest = runGroupMemoryMicroCompactSelfTest;
exports.runGroupMemoryTimeBasedMicroCompactSelfTest = runGroupMemoryTimeBasedMicroCompactSelfTest;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const model_call_retry_1 = require("../../system/model-call-retry");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_hooks_1 = require("./group-compaction-hooks");
const group_compaction_projections_1 = require("./group-compaction-projections");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const session_memory_window_1 = require("../../system/session-memory-window");
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
const session_summary_secondary_review_1 = require("../../system/session-summary-secondary-review");
// ===== merged from group-compaction-engine-part-01.ts =====
const GROUP_CONTEXT_FIXED_BUCKETS = ["system", "tools", "rules", "skills", "mcpTools", "subagentDefinitions"];
function buildGroupPressureAccountingSelection(triggerPayload, providerUsageBaseline, groupId, groupSessionId) {
    const triggerFixedTokens = GROUP_CONTEXT_FIXED_BUCKETS
        .reduce((sum, key) => sum + Math.max(0, Number(triggerPayload?.tokenBreakdown?.[key] || 0)), 0);
    const providerAccountingPayload = providerUsageBaseline?.valid === true
        && providerUsageBaseline.event?.token_breakdown
        && Number(providerUsageBaseline.event?.accounting_total_tokens || 0) > 0
        ? {
            schema: "ccm-model-visible-payload-accounting-v1",
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
            : (0, session_compaction_core_1.modelVisiblePayloadAccounting)(triggerPayload),
    };
}
function normalizeHookAnchor(raw, index, type = "user_requirement") {
    const text = (0, group_compaction_projections_1.compactText)(raw?.text || raw?.requirement || raw?.value || raw, 2000);
    if (!text)
        return null;
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
function extractHookAnchors(results, key, type) {
    const anchors = [];
    for (const entry of results || []) {
        const result = entry?.result || {};
        const values = [
            ...(Array.isArray(result?.[key]) ? result[key] : []),
            ...(key === "persistentRequirements" && Array.isArray(result?.mustKeep) ? result.mustKeep : []),
            ...(key === "factAnchors" && Array.isArray(result?.anchors) ? result.anchors : []),
        ];
        values.forEach((item, index) => {
            const anchor = normalizeHookAnchor(item, anchors.length + index, type);
            if (anchor)
                anchors.push(anchor);
        });
    }
    return anchors;
}
function buildCompactionTimeline(messages) {
    const userMessages = messages
        .filter((item) => item?.role === "user" && (0, group_compaction_projections_1.messageContent)(item))
        .slice(-40)
        .map((item, index) => `${(0, group_compaction_projections_1.messageIdentity)(item, index)} [用户 -> ${item?.target || "all"}] ${(0, group_compaction_projections_1.compactText)((0, group_compaction_projections_1.messageContent)(item), 1000)}`);
    const timeline = messages.slice(-80).map((item, index) => {
        const actor = item?.role === "user" ? `用户 -> ${item?.target || "all"}` : item?.agent || item?.role || "Agent";
        return `${(0, group_compaction_projections_1.messageIdentity)(item, index)} [${actor}] ${(0, group_compaction_projections_1.compactText)((0, group_compaction_projections_1.messageContent)(item), 900)}`;
    });
    return { userMessages, timeline };
}
function extractJsonObject(text) {
    const raw = String(text || "").trim();
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced)
        try {
            return JSON.parse(fenced[1].trim());
        }
        catch { }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start)
        try {
            return JSON.parse(raw.slice(start, end + 1));
        }
        catch { }
    return null;
}
function normalizeOpenAiUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/\/chat\/completions$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/chat/completions`;
    return /\/v1\//i.test(base) ? base : `${base}/v1/chat/completions`;
}
function normalizeAnthropicUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/\/v1\/messages$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/messages`;
    return /\/v1\//i.test(base) ? base : `${base}/v1/messages`;
}
function normalizeGeminiCompactUrl(value, model) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/:(?:generateContent|streamGenerateContent)(?:\?|$)/i.test(base))
        return base.replace(/:streamGenerateContent/i, ":generateContent");
    const cleanModel = String(model || "").trim().replace(/^models\//i, "");
    if (/\/models\/[^/]+$/i.test(base))
        return `${base}:generateContent`;
    if (/\/v1(?:beta)?$/i.test(base))
        return `${base}/models/${encodeURIComponent(cleanModel)}:generateContent`;
    return `${base}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
}
function useGeminiCompact(config) {
    const format = String(config?.format || "auto").toLowerCase();
    const url = String(config?.apiUrl || "").toLowerCase();
    return format === "gemini-compatible" || format === "auto" && /generativelanguage\.googleapis\.com|:generatecontent/.test(url);
}
async function callCompactionModelOnce(config, system, user, maxOutputTokens, attemptTimeoutMs) {
    const anthropic = config.format === "anthropic-compatible"
        || config.format === "auto" && String(config.apiUrl).toLowerCase().includes("anthropic")
        || /\/anthropic(?:\/|$)/i.test(String(config.apiUrl));
    const gemini = useGeminiCompact(config);
    const controller = new AbortController();
    const externalSignal = config?.compactionAbortSignal || config?.compaction_abort_signal || null;
    const abortFromExternal = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted)
        abortFromExternal();
    else
        externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
    const timeout = setTimeout(() => controller.abort(), Math.max(1_000, attemptTimeoutMs));
    let activityError = null;
    const activitySignal = typeof config.onCompactionActivity === "function" ? config.onCompactionActivity : null;
    const heartbeatMs = Math.max(25, Math.min(Number(config.compactionActivityHeartbeatMs || config.compaction_activity_heartbeat_ms || 30_000), 60_000));
    const activityInterval = activitySignal
        ? setInterval(() => {
            try {
                activitySignal({ stage: "model_summary_wait", heartbeat: true });
            }
            catch (error) {
                activityError = error;
                controller.abort();
            }
        }, heartbeatMs)
        : null;
    activityInterval?.unref?.();
    try {
        const groupId = String(config.groupId || config.group_id || "").trim();
        const groupSessionId = String(config.groupSessionId || config.group_session_id || "").trim();
        if (anthropic && groupId && groupSessionId.startsWith("gcs_")) {
            try {
                (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheState)({
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
            }
            catch { }
        }
        activitySignal?.({ stage: "model_summary_request", heartbeat: false });
        let response;
        try {
            const geminiEndpoint = gemini ? new URL(normalizeGeminiCompactUrl(config.apiUrl, config.model)) : null;
            if (geminiEndpoint && !geminiEndpoint.searchParams.has("key"))
                geminiEndpoint.searchParams.set("key", config.apiKey);
            response = await fetch(anthropic ? normalizeAnthropicUrl(config.apiUrl) : gemini ? geminiEndpoint.toString() : normalizeOpenAiUrl(config.apiUrl), {
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
        }
        catch (error) {
            if (activityError) {
                const failed = new Error(String(activityError?.message || activityError || "压缩活动回调失败"));
                failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
                throw failed;
            }
            if (externalSignal?.aborted) {
                const cancelled = new Error(String(externalSignal.reason?.message || "模型调用已由外部取消"));
                cancelled.code = "CCM_MODEL_CALL_CANCELLED";
                throw cancelled;
            }
            throw error;
        }
        const body = await response.text();
        if (activityError) {
            const failed = new Error(String(activityError?.message || activityError || "压缩活动回调失败"));
            failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
            throw failed;
        }
        if (!response.ok)
            throw new Error(`memory compact HTTP ${response.status}: ${body.slice(0, 180)}`);
        const data = JSON.parse(body);
        const content = anthropic
            ? (data?.content || []).map((part) => part?.type === "text" ? part.text : "").join("")
            : gemini
                ? (data?.candidates || []).flatMap((candidate) => candidate?.content?.parts || []).map((part) => part?.text || "").join("")
                : data?.choices?.[0]?.message?.content || "";
        const summary = extractJsonObject(content);
        if (!summary)
            throw new Error("memory compact model returned invalid JSON");
        if (groupId && groupSessionId.startsWith("gcs_")) {
            const usage = data?.usage || data?.usageMetadata || {};
            try {
                (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheUsage)({
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
            }
            catch { }
        }
        return {
            summary,
            usage: data?.usage || data?.usageMetadata || null,
            provider: anthropic ? "anthropic" : gemini ? "gemini" : "openai",
            model: String(data?.model || config.model || ""),
            responseId: String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || ""),
            stopReason: String(anthropic ? data?.stop_reason || "" : gemini ? data?.candidates?.[0]?.finishReason || "" : data?.choices?.[0]?.finish_reason || ""),
        };
    }
    finally {
        clearTimeout(timeout);
        if (activityInterval)
            clearInterval(activityInterval);
        externalSignal?.removeEventListener("abort", abortFromExternal);
    }
}
async function callCompactionModel(config, system, user, maxOutputTokens = group_compaction_receipts_1.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS) {
    const mockCall = config?.compactionModelCall || config?.compaction_model_call || config?.modelCall || config?.model_call;
    if (typeof mockCall === "function")
        return mockCall({ system, user, maxOutputTokens });
    if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model)
        return null;
    return (0, model_call_retry_1.runModelCallWithRetry)(context => callCompactionModelOnce(config, system, user, maxOutputTokens, context.attemptTimeoutMs), {
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
            }
            catch { }
            console.warn(`[模型重试] 会话压缩模型暂时失败，将执行第 ${notice.attempt + 1}/${notice.maxAttempts} 次尝试：${String(notice.error?.message || notice.error || "").slice(0, 240)}`);
        },
    });
}
function fitCompactionPromptToTokenBudget(system, user, maxInputTokens) {
    const initialTokens = (0, context_budget_1.estimateTextTokens)(system) + (0, context_budget_1.estimateTextTokens)(user);
    if (initialTokens <= maxInputTokens)
        return { user, initialTokens, finalTokens: initialTokens, clipped: false };
    let low = 256;
    let high = Math.max(low, user.length);
    let best = (0, context_budget_1.compactPreserveEdges)(user, low, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = (0, context_budget_1.compactPreserveEdges)(user, mid, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
        const tokens = (0, context_budget_1.estimateTextTokens)(system) + (0, context_budget_1.estimateTextTokens)(candidate);
        if (tokens <= maxInputTokens) {
            best = candidate;
            low = mid + 1;
        }
        else {
            high = mid - 1;
        }
    }
    const finalTokens = (0, context_budget_1.estimateTextTokens)(system) + (0, context_budget_1.estimateTextTokens)(best);
    if (finalTokens > maxInputTokens)
        throw new Error(`memory compact request cannot fit model input budget: ${finalTokens}/${maxInputTokens}`);
    return { user: best, initialTokens, finalTokens, clipped: true };
}
const GROUP_COMPACTION_MAX_PTL_RETRIES = 3;
function isGroupCompactionPromptTooLongError(error) {
    return /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|token limit|request too large/i.test(String(error?.message || error || ""));
}
function groupCompactionMessagesByApiRound(messages = []) {
    const groups = [];
    let current = [];
    for (const message of messages) {
        const content = Array.isArray(message?.content) ? message.content : [];
        const isToolResult = message?.type === "tool_result"
            || content.some((part) => part?.type === "tool_result");
        const startsUserRound = String(message?.role || "") === "user" && !isToolResult && message?.isMeta !== true;
        if (startsUserRound && current.length > 0) {
            groups.push(current);
            current = [];
        }
        current.push(message);
    }
    if (current.length > 0)
        groups.push(current);
    return groups;
}
function truncateGroupCompactionHeadByApiRound(messages = [], tokenGap = 0) {
    const groups = groupCompactionMessagesByApiRound(messages);
    if (groups.length < 2)
        return null;
    let dropCount = 0;
    if (tokenGap > 0) {
        let removedTokens = 0;
        while (dropCount < groups.length - 1 && removedTokens < tokenGap) {
            removedTokens += groups[dropCount].reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0);
            dropCount += 1;
        }
    }
    else {
        dropCount = Math.max(1, Math.floor(groups.length * 0.2));
    }
    dropCount = Math.min(dropCount, groups.length - 1);
    return {
        messages: groups.slice(dropCount).flat(),
        droppedRoundCount: dropCount,
        remainingRoundCount: groups.length - dropCount,
    };
}
function buildGroupCompactionModelRequest(messages, memory, fallback, config = {}) {
    const previous = memory?.conversationSummary || (0, group_compaction_projections_1.createEmptyConversationSummary)();
    const customInstructions = (0, group_compaction_projections_1.compactText)(config?.customInstructions || config?.custom_instructions || "", 4_000);
    const system = `你是群聊 Agent 会话压缩器。只生成 JSON，不调用工具，不创建任务，不向任何 Agent 派发。
你的摘要会替代压缩边界之前的原始消息，因此必须保真并支持主 Agent 无缝续跑。
参考 Claude Code compaction：保留用户明确要求、意图变化、技术决策、文件/代码、错误与修复、已完成、未完成、当前工作和下一步。
必须合并旧摘要，不能因为新消息覆盖仍有效的旧约束；已完成与待办冲突时，以时间较新的证据为准。
不要编造文件变更、测试或完成状态。未经验证的推测只能保留在 hypotheses，不能提升为 decisions 或 completedWork。`;
    const capacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
    const maxOutputTokens = Math.max(1_000, Math.min(group_compaction_receipts_1.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS, Number(config?.memoryCompactionMaxOutputTokens || config?.memory_compaction_max_output_tokens || group_compaction_receipts_1.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS)));
    const providerSafeInput = Math.max(8_000, capacity.contextWindow - maxOutputTokens - group_compaction_receipts_1.GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS);
    const configuredInputLimit = Number(config?.memoryCompactionMaxInputTokens || config?.memory_compaction_max_input_tokens || 0);
    const maxInputTokens = configuredInputLimit > 0
        ? Math.max(8_000, Math.min(providerSafeInput, configuredInputLimit))
        : providerSafeInput;
    let effectiveMessages = [...messages];
    let validationFallback = fallback;
    let droppedRoundCount = 0;
    let originalEstimatedInputTokens = 0;
    let payload = null;
    const buildPayload = () => {
        const summaryInputProjection = (0, group_compaction_projections_1.buildGroupCompactionSummaryInputProjection)(effectiveMessages, {
            previousSummary: previous,
            fallbackSummary: validationFallback,
            rebuildFallbackFromProjectedMessages: true,
            memory,
            stripReinjectedAttachments: config?.stripReinjectedCompactionAttachments !== false
                && config?.strip_reinjected_compaction_attachments !== false,
        });
        const timeline = buildCompactionTimeline(summaryInputProjection.messages);
        const projectedValidationFallback = (0, group_compaction_projections_1.normalizeSummary)(summaryInputProjection.fallbackSummary, (0, group_compaction_projections_1.createEmptyConversationSummary)());
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
        const estimated = (0, context_budget_1.estimateTextTokens)(system) + (0, context_budget_1.estimateTextTokens)(payload.candidateUser);
        if (attempt === 0)
            originalEstimatedInputTokens = estimated;
        if (estimated <= maxInputTokens || attempt === GROUP_COMPACTION_MAX_PTL_RETRIES)
            break;
        const truncated = truncateGroupCompactionHeadByApiRound(effectiveMessages, estimated - maxInputTokens);
        if (!truncated)
            break;
        effectiveMessages = truncated.messages;
        droppedRoundCount += truncated.droppedRoundCount;
        validationFallback = (0, group_compaction_projections_1.buildDeterministicConversationSummary)(effectiveMessages, memory, previous);
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
async function summarizeWithModel(messages, memory, fallback, config) {
    let request = null;
    let effectiveMessages = messages;
    let validationFallback = fallback;
    let ptlRetryAttempts = 0;
    for (;;) {
        request = buildGroupCompactionModelRequest(effectiveMessages, memory, validationFallback, config);
        try {
            const result = await callCompactionModel(config, request.system, request.user, request.maxOutputTokens);
            request.audit.ptlRetryAttempts = ptlRetryAttempts;
            const compactionUsage = (0, group_compaction_receipts_1.buildGroupCompactionModelUsageReceipt)({
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
                summary: result?.summary ? (0, group_compaction_projections_1.normalizeSummary)(result.summary, (0, group_compaction_projections_1.createEmptyConversationSummary)()) : null,
                requestAudit: request.audit,
                compactionUsage,
                validationFallback: request.validationFallback,
                qualityMessages: request.effectiveMessages,
            };
        }
        catch (error) {
            const truncated = isGroupCompactionPromptTooLongError(error) && ptlRetryAttempts < GROUP_COMPACTION_MAX_PTL_RETRIES
                ? truncateGroupCompactionHeadByApiRound(request.effectiveMessages)
                : null;
            if (truncated) {
                ptlRetryAttempts += 1;
                effectiveMessages = truncated.messages;
                validationFallback = (0, group_compaction_projections_1.buildDeterministicConversationSummary)(effectiveMessages, memory, memory?.conversationSummary || (0, group_compaction_projections_1.createEmptyConversationSummary)());
                continue;
            }
            request.audit.ptlRetryAttempts = ptlRetryAttempts;
            error.compactionRequestAudit = request.audit;
            error.compactionUsage = (0, group_compaction_receipts_1.buildGroupCompactionModelUsageReceipt)({
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
function buildRelevantHistoricalGroupContext(messages, boundaryIndex, query, options = {}) {
    if (boundaryIndex < 0 || !messages?.length)
        return "";
    const queryTokens = [...(0, group_compaction_projections_1.normalizedSearchTokens)(query)].slice(0, 120);
    if (!queryTokens.length)
        return "";
    const maxMessages = Math.max(1, Math.min(10, Number(options.maxMessages || 6)));
    const maxChars = Math.max(1000, Math.min(12_000, Number(options.maxChars || 6000)));
    const ranked = [];
    for (let index = 0; index <= boundaryIndex; index += 1) {
        const message = messages[index];
        const content = (0, group_compaction_projections_1.messageContent)(message);
        if (!content)
            continue;
        const corpus = content.toLowerCase();
        let score = 0;
        for (const token of queryTokens)
            if (corpus.includes(token))
                score += token.length >= 4 ? 3 : 1;
        if (!score)
            continue;
        if (message?.role === "user")
            score += 4;
        if (message?.dispatchPolicy || message?.delivery_summary || message?.receipt)
            score += 2;
        ranked.push({ index, score, message });
    }
    const selected = ranked.sort((a, b) => b.score - a.score || b.index - a.index).slice(0, maxMessages).sort((a, b) => a.index - b.index);
    if (!selected.length)
        return "";
    const lines = ["按当前任务自动回溯到的压缩前原文证据（原文优先于摘要）："];
    let used = lines[0].length;
    for (const item of selected) {
        const actor = item.message?.role === "user" ? `用户 -> ${item.message?.target || "all"}` : item.message?.agent || item.message?.role || "Agent";
        const row = `- #${(0, group_compaction_projections_1.messageIdentity)(item.message, item.index)} [${actor}] ${(0, group_compaction_projections_1.compactText)((0, group_compaction_projections_1.messageContent)(item.message), 1400)}`;
        if (used + row.length > maxChars)
            break;
        lines.push(row);
        used += row.length;
    }
    return lines.length > 1 ? lines.join("\n") : "";
}
// ===== merged from group-compaction-engine-part-02.ts =====
function assertGroupCompactionLifecycleFence(config, stage) {
    const fence = config?.compactionLifecycleFence || config?.compaction_lifecycle_fence || null;
    if (!fence)
        return null;
    const validation = (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleRuntimeFence)(fence);
    if (!validation.valid) {
        const error = new Error(`group compaction session lifecycle fence is stale at ${stage}: ${validation.issues.join(",")}`);
        error.code = "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE";
        error.compactionLifecycleStage = stage;
        error.lifecycleValidation = validation;
        throw error;
    }
    if (typeof config?.onCompactionActivity === "function")
        config.onCompactionActivity({ stage, heartbeat: false });
    return validation;
}
function calculateGroupProviderCalibratedContextTokens(estimatedActiveTokens, providerUsageBaseline) {
    const estimated = Math.max(0, Number(estimatedActiveTokens || 0));
    const correction = providerUsageBaseline?.valid === true
        ? Math.max(0, Number(providerUsageBaseline.event?.provider_observed_context_tokens || 0)
            - Number(providerUsageBaseline.event?.estimated_context_tokens || 0))
        : 0;
    return { estimatedActiveTokens: estimated, providerObservedCorrection: correction, activeTokens: estimated + correction };
}
async function compactGroupConversationMemory(input) {
    const groupId = String(input.groupId || "").trim();
    const groupSessionId = (0, group_compaction_hooks_1.exactHookLedgerSessionId)(String(input.groupSessionId || ""));
    if (!groupId || !groupSessionId)
        throw new Error("exact_group_session_required_for_group_memory_compaction");
    const messages = input.messages || [];
    const memory = input.memory || {};
    const previousState = memory.compaction || {};
    const previousVersion = Number(previousState.version || 0);
    const requiresVersionMigration = previousVersion > 0 && previousVersion < group_compaction_receipts_1.GROUP_MEMORY_COMPACTION_VERSION;
    const previousSummarySource = String(previousState.summarySource || previousState.summary_source || "").toLowerCase();
    const previousCanonicalSummary = ["model", "session-memory", "session_memory"].includes(previousSummarySource);
    const requiresCanonicalRepair = !!memory.conversationSummary && !previousCanonicalSummary;
    const requiresValidationRepair = !!input.force && String(previousState.summarySource || "") === "structured-validation-fallback";
    const requiresMetadataRepair = !!input.force && !previousState.modelMode;
    const requiresExplicitRebuild = !!input.rebuild;
    const lastBoundaryId = requiresVersionMigration || requiresCanonicalRepair || requiresValidationRepair || requiresMetadataRepair || requiresExplicitRebuild ? "" : String(previousState.lastCompactedMessageId || "");
    let summarizedThroughIndex = lastBoundaryId ? messages.findIndex((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, index) === lastBoundaryId) : -1;
    if (lastBoundaryId && summarizedThroughIndex < 0)
        summarizedThroughIndex = -1;
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const postCompactTaskStatusProjection = (0, group_compaction_projections_1.buildGroupPostCompactTaskStatusProjection)(input.activeTasks || [], {
        groupId,
        groupSessionId,
        currentTaskId: input.config?.currentTaskId || input.config?.current_task_id,
        taskStatusBudget: input.config?.postCompactReinject?.taskStatusBudget || input.config?.postCompactReinject?.task_status_budget,
        completedMaxAgeMs: input.config?.postCompactReinject?.completedMaxAgeMs || input.config?.postCompactReinject?.completed_max_age_ms,
        now,
    });
    const partialCompact = (0, group_compaction_strategy_1.resolvePartialCompactWindow)(messages, summarizedThroughIndex, {
        ...(input.config || {}),
        partialCompact: input.partialCompact || input.config?.partialCompact,
    });
    const partialSidecarSegment = partialCompact?.sidecar
        ? (0, group_compaction_projections_1.buildGroupPartialCompactSidecarSegment)({
            groupId: input.groupId,
            groupSessionId,
            messages,
            memory,
            partialCompact,
            transcriptPath: input.transcriptPath,
            config: input.config,
            postCompactTaskStatuses: postCompactTaskStatusProjection.tasks,
            activeTasks: input.activeTasks || [],
            currentTaskId: input.config?.currentTaskId || input.config?.current_task_id,
            now,
        })
        : null;
    const keepWindowOptions = {
        floorIndex: summarizedThroughIndex + 1,
        minMessages: input.config?.minKeepMessages || input.config?.min_keep_messages || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_MESSAGES,
        minTokens: input.config?.minKeepTokens || input.config?.min_keep_tokens || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_TOKENS,
        maxTokens: input.config?.maxKeepTokens || input.config?.max_keep_tokens || group_compaction_receipts_1.GROUP_COMPACT_MAX_KEEP_TOKENS,
    };
    const sharedRecentWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(messages, {
        ...keepWindowOptions,
        lastSummarizedMessageId: String(memory?.sessionMemory?.lastSummarizedMessageId
            || memory?.sessionMemory?.last_summarized_message_id
            || previousState?.sessionMemoryState?.lastExtractedMessageId
            || ""),
    });
    const groupInvariantKeepIndex = (0, group_compaction_projections_1.calculateGroupMessagesToKeepIndex)(messages, keepWindowOptions);
    const defaultKeepIndex = Math.min(sharedRecentWindow.startIndex, groupInvariantKeepIndex);
    const primaryPartialCompact = partialCompact?.enabled === true && partialCompact?.sidecar !== true;
    let keepIndex = primaryPartialCompact ? partialCompact.keepIndex : defaultKeepIndex;
    let messagesToCompact = messages.slice(summarizedThroughIndex + 1, keepIndex);
    let sourceTokens = messagesToCompact.reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0);
    let keptActiveTokens = messages.slice(keepIndex).reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0);
    const canonicalPreviousSummary = previousCanonicalSummary ? memory.conversationSummary || null : null;
    const previousSummaryTokens = (0, group_compaction_projections_1.estimateGroupTextTokens)(JSON.stringify(canonicalPreviousSummary || {}));
    const estimatedActiveTokens = sourceTokens + keptActiveTokens + previousSummaryTokens;
    const configuredProvider = String(input.config?.format || input.config?.provider || "").toLowerCase();
    const expectedProvider = configuredProvider.includes("anthropic")
        || configuredProvider === "auto" && String(input.config?.apiUrl || "").toLowerCase().includes("anthropic")
        ? "anthropic"
        : configuredProvider.includes("openai") || configuredProvider === "auto" ? "openai" : "";
    const providerUsageBaseline = (0, group_prompt_cache_break_detection_1.readGroupMainContextUsageBaseline)(groupId, groupSessionId, {
        ...(expectedProvider ? { provider: expectedProvider } : {}),
        ...(input.config?.model ? { model: String(input.config.model) } : {}),
    });
    const triggerPayload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
        scope: "group",
        sessionId: `${groupId}:${groupSessionId}`,
        system: input.config?.modelVisibleSystemContext || input.config?.model_visible_system_context || input.config?.systemPrompt || input.config?.system_prompt || null,
        tools: input.config?.modelVisibleTools || input.config?.model_visible_tools || input.config?.toolSchemas || input.config?.tool_schemas || null,
        activeSummary: canonicalPreviousSummary,
        recentMessages: messages.slice(summarizedThroughIndex + 1),
        currentRequest: input.config?.currentRequest || input.config?.current_request || null,
        recoveryContext: input.config?.recoveryContext || input.config?.recovery_context || null,
        hookResults: [],
        contextComponents: input.config?.contextComponents || input.config?.context_components || {
            rules: input.config?.modelVisibleRules || input.config?.model_visible_rules || null,
            skills: input.config?.modelVisibleSkills || input.config?.model_visible_skills || null,
            mcpTools: input.config?.modelVisibleMcpTools || input.config?.model_visible_mcp_tools || null,
            subagentDefinitions: input.config?.modelVisibleSubagentDefinitions || input.config?.model_visible_subagent_definitions || null,
        },
    });
    const pressureAccounting = buildGroupPressureAccountingSelection(triggerPayload, providerUsageBaseline, groupId, groupSessionId);
    const { triggerFixedTokens, providerAccountingPayload } = pressureAccounting;
    // A background post-turn pressure sample may not receive the main Agent's fixed
    // prompt and tool catalog. Do not let that message-only projection invalidate or
    // overwrite the last complete Provider payload accounting.
    const contextTokenMeasurement = (0, session_compaction_core_1.measureSessionContextTokens)({
        scope: "group",
        sessionId: `${groupId}:${groupSessionId}`,
        messages: messages.slice(summarizedThroughIndex + 1),
        activeSummary: canonicalPreviousSummary,
        latestProviderUsage: providerUsageBaseline?.valid === true ? {
            ...providerUsageBaseline.event,
            scope: "group",
            sessionId: `${groupId}:${groupSessionId}`,
        } : null,
        provider: expectedProvider,
        model: String(input.config?.model || ""),
        boundaryGeneration: Math.max(0, Number(previousState.boundaryGeneration || previousState.boundary_generation || 0)),
        modelVisiblePayload: pressureAccounting.measurementPayload,
    });
    if (providerAccountingPayload && triggerFixedTokens <= 0) {
        contextTokenMeasurement.activeTokens = Math.max(Number(contextTokenMeasurement.activeTokens || 0), Number(providerAccountingPayload.totalTokens || 0));
        contextTokenMeasurement.estimatedFixedTokens = Math.max(Number(contextTokenMeasurement.estimatedFixedTokens || 0), Object.entries(providerAccountingPayload.tokenBreakdown)
            .filter(([key]) => ["system", "tools", "rules", "skills", "mcpTools", "subagentDefinitions"].includes(key))
            .reduce((sum, [, value]) => sum + Math.max(0, Number(value || 0)), 0));
        contextTokenMeasurement.method = "provider_usage_plus_complete_payload_accounting";
        contextTokenMeasurement.modelVisiblePayload = null;
        contextTokenMeasurement.payloadChecksum = providerAccountingPayload.payloadChecksum;
        contextTokenMeasurement.fixedContextChecksum = providerAccountingPayload.fixedContextChecksum;
    }
    const persistedTriggerAccounting = pressureAccounting.persistedAccounting;
    const providerObservedCorrection = Math.max(0, contextTokenMeasurement.activeTokens - estimatedActiveTokens);
    const activeTokens = contextTokenMeasurement.activeTokens;
    const triggerTokens = (0, group_compaction_strategy_1.getGroupAutoCompactThreshold)(input.config);
    const activeMessageCount = messages.length - summarizedThroughIndex - 1;
    const preCompactWarning = (0, group_compaction_strategy_1.calculateGroupCompactWarningState)({
        activeTokens,
        activeMessageCount,
        autoCompactThreshold: triggerTokens,
        config: input.config,
        now,
    });
    // 落盘投影：token 计量只保留分桶与校验和。原始 measurement 仍要交给压缩钩子，
    // 所以另建投影而不是原地改写；modelVisiblePayload 内含整段 recentMessages，
    // 落盘会让单个会话文件多出数 MB，且原文可从转录恢复。
    const persistedTokenMeasurement = {
        ...contextTokenMeasurement,
        modelVisiblePayload: (0, session_compaction_core_1.modelVisiblePayloadAccounting)(contextTokenMeasurement.modelVisiblePayload),
    };
    const warningOnlyMemory = {
        ...memory,
        compaction: {
            ...(previousState || {}),
            version: group_compaction_receipts_1.GROUP_MEMORY_COMPACTION_VERSION,
            enabled: true,
            contextPressureWarning: preCompactWarning,
            compactWarning: preCompactWarning,
            lastPressureSampleAt: now,
            tokenMeasurement: persistedTokenMeasurement,
            token_measurement: persistedTokenMeasurement,
            modelVisiblePayload: persistedTriggerAccounting,
            model_visible_payload: persistedTriggerAccounting,
        },
        messageCompression: {
            ...(memory?.messageCompression || {}),
            contextPressureWarning: preCompactWarning,
        },
    };
    const shouldCompactPrimary = !!input.force
        || requiresCanonicalRepair
        || primaryPartialCompact
        || preCompactWarning.flags.isAboveAutoCompactThreshold;
    let sessionMemoryCompactSelection = null;
    let selectedSessionMemoryMarkdown = "";
    const modelCompactionMode = "model-required";
    const modelSummaryRequired = true;
    const customCompactInstructions = String(input.config?.customInstructions || input.config?.custom_instructions || "").trim();
    if (shouldCompactPrimary && messagesToCompact.length > 0 && !customCompactInstructions) {
        const selection = await (0, group_compaction_projections_1.selectGroupSessionMemoryForCompact)({
            groupId,
            groupSessionId,
            messages,
            memory,
            config: input.config,
            primaryPartialCompact,
            defaultKeepIndex,
            keepWindowOptions,
            triggerTokens,
            now,
        });
        sessionMemoryCompactSelection = selection.receipt;
        if (selection.selected === true) {
            keepIndex = selection.keepIndex;
            messagesToCompact = messages.slice(summarizedThroughIndex + 1, keepIndex);
            sourceTokens = messagesToCompact.reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0);
            keptActiveTokens = messages.slice(keepIndex).reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0);
            selectedSessionMemoryMarkdown = selection.markdown;
        }
    }
    const buildStrategyDecision = (overrides = {}) => (0, group_compaction_strategy_1.buildGroupCompactStrategyDecision)({
        groupId: input.groupId,
        messages,
        messagesToCompact,
        keptMessages: messages.slice(keepIndex),
        memory,
        startIndex: summarizedThroughIndex + 1,
        keepIndex,
        compacted: false,
        primaryCompact: shouldCompactPrimary && messagesToCompact.length > 0,
        partialCompact,
        partialSidecarSegment,
        preCompactWarning,
        activeTokens,
        activeMessageCount,
        triggerTokens,
        preCompactTokenCount: messages.reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0),
        transcriptPath: input.transcriptPath,
        force: input.force,
        now,
        ...overrides,
    });
    if ((!shouldCompactPrimary || !messagesToCompact.length) && partialSidecarSegment) {
        const compactStrategyDecision = buildStrategyDecision({
            compacted: true,
            primaryCompact: false,
            reason: partialCompact?.reason || "partial sidecar only; primary compact skipped",
        });
        const apiMicroCompactEditPlan = (0, group_compaction_projections_1.buildGroupApiMicroCompactEditPlan)(messages, {
            groupId: input.groupId,
            activeTokens,
            targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
            maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
            force: input.force,
            now,
        });
        const postCompactCleanupAudit = (0, group_compaction_projections_1.buildGroupPostCompactCleanupAudit)({
            groupId: input.groupId,
            groupSessionId,
            boundary: {
                id: partialSidecarSegment.id || "",
                type: "partial-sidecar",
                compactStrategyDecision,
                apiMicroCompactEditPlan,
                post_compact_restore: {
                    strategyDecision: compactStrategyDecision,
                    apiMicroCompactEditPlan,
                    transcriptPath: input.transcriptPath,
                    microCompact: partialSidecarSegment.microCompact || null,
                    reinjectionPlan: partialSidecarSegment.reinjectionPlan || null,
                },
            },
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            microCompact: partialSidecarSegment.microCompact || null,
            postCompactReinject: partialSidecarSegment.reinjectionPlan || null,
            transcriptPath: input.transcriptPath,
            summaryChecksum: partialSidecarSegment.summaryChecksum || "",
            partialSidecarOnly: true,
            now,
        });
        const nextMemory = (0, group_compaction_projections_1.buildPartialSidecarOnlyMemory)({
            memory,
            messages,
            partialCompact,
            partialSegment: partialSidecarSegment,
            transcriptPath: input.transcriptPath,
            now,
            compactStrategyDecision,
            postCompactCleanupAudit,
            postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
            apiMicroCompactEditPlan,
        });
        return { compacted: true, partialCompacted: true, memory: nextMemory, keepIndex, partialCompact, partialSegment: partialSidecarSegment, compactStrategyDecision, postCompactCleanupAudit, postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt, apiMicroCompactEditPlan };
    }
    if (!shouldCompactPrimary || !messagesToCompact.length) {
        const compactStrategyDecision = buildStrategyDecision({
            compacted: false,
            primaryCompact: false,
            reason: !messagesToCompact.length ? "recent window only; no eligible older messages" : "context pressure below compact threshold",
        });
        const apiMicroCompactEditPlan = (0, group_compaction_projections_1.buildGroupApiMicroCompactEditPlan)(messages, {
            groupId: input.groupId,
            activeTokens,
            targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
            maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
            force: input.force,
            now,
        });
        const nextMemory = {
            ...warningOnlyMemory,
            compaction: {
                ...(warningOnlyMemory.compaction || {}),
                compactStrategyDecision,
                apiMicroCompactEditPlan,
            },
            messageCompression: {
                ...(warningOnlyMemory.messageCompression || {}),
                compactStrategyDecision,
                apiMicroCompactEditPlan,
            },
        };
        return { compacted: false, memory: nextMemory, keepIndex, partialCompact, contextPressureWarning: preCompactWarning, compactStrategyDecision, apiMicroCompactEditPlan };
    }
    const failures = Number(previousState.consecutiveFailures || 0);
    const compactionHookRunId = `gmch_${Date.now().toString(36)}_${crypto.createHash("sha1").update(`${input.groupId || ""}:${groupSessionId}:${now}:${messages.length}`).digest("hex").slice(0, 8)}`;
    assertGroupCompactionLifecycleFence(input.config, "before_pre_compact_hooks");
    const sharedPreHookResults = await (0, session_compaction_core_1.runSessionCompactionHooks)("pre_compact", {
        scope: "group",
        groupId: input.groupId,
        sessionId: groupSessionId,
        trigger: input.force ? "manual" : "auto",
        customInstructions: customCompactInstructions,
        previousSummary: canonicalPreviousSummary,
        tokenMeasurement: contextTokenMeasurement,
    });
    const sharedHookInstructions = sharedPreHookResults
        .map((item) => String(item?.customInstructions || item?.custom_instructions || ""))
        .filter(Boolean)
        .join("\n\n");
    const preHookResults = await (0, group_compaction_hooks_1.runGroupMemoryCompactionHooks)("pre", {
        hookRunId: compactionHookRunId,
        groupId: input.groupId,
        groupSessionId,
        messages,
        messagesToCompact,
        memory,
        keepIndex,
        partialCompact,
        summarizedThroughIndex,
        sourceTokens,
        activeTokens,
        abortSignal: input.config?.compactionAbortSignal || input.config?.compaction_abort_signal || null,
    });
    const hookFactAnchors = extractHookAnchors(preHookResults, "factAnchors", "dispatch_decision");
    const hookPersistentRequirements = extractHookAnchors(preHookResults, "persistentRequirements", "user_requirement");
    const previousSummary = (0, group_compaction_projections_1.normalizeSummary)(canonicalPreviousSummary || {}, (0, group_compaction_projections_1.createEmptyConversationSummary)());
    const hookMemory = hookPersistentRequirements.length
        ? { ...memory, persistentRequirements: (0, group_compaction_projections_1.mergePersistentRequirements)(memory.persistentRequirements, hookPersistentRequirements) }
        : memory;
    const fallback = (0, group_compaction_projections_1.buildDeterministicConversationSummary)(messagesToCompact, hookMemory, previousSummary);
    let summaryValidationReference = fallback;
    let summaryQualityMessages = messagesToCompact;
    let conversationSummary = (0, group_compaction_projections_1.createEmptyConversationSummary)();
    let summarySource = "model-pending";
    let failure = "";
    let modelRequestAudit = null;
    let compactionUsage = null;
    let validation = (0, group_compaction_projections_1.validateSummaryPreservesFallback)(conversationSummary, fallback);
    let rejectedModelValidation = null;
    const lastFailureAtMs = Date.parse(String(previousState.lastFailureAt || "")) || 0;
    const retryWindowExpired = lastFailureAtMs > 0 && nowMs - lastFailureAtMs >= group_compaction_receipts_1.GROUP_COMPACT_MODEL_RETRY_MS;
    const modelCompactionEnabled = true;
    if (sessionMemoryCompactSelection?.selected === true)
        summarySource = "session-memory";
    const shouldAttemptModel = sessionMemoryCompactSelection?.selected !== true
        && modelCompactionEnabled
        && (modelSummaryRequired || failures < group_compaction_receipts_1.GROUP_COMPACT_MAX_FAILURES || retryWindowExpired);
    if (modelSummaryRequired && !shouldAttemptModel && sessionMemoryCompactSelection?.selected !== true) {
        const error = new Error("模型摘要是必需的，但当前压缩模型不可用");
        error.code = "GROUP_COMPACTION_MODEL_REQUIRED_UNAVAILABLE";
        throw error;
    }
    if (shouldAttemptModel) {
        try {
            const modelResult = await summarizeWithModel(messagesToCompact, memory, fallback, {
                ...(input.config || {}),
                groupId,
                groupSessionId,
                customInstructions: [customCompactInstructions, sharedHookInstructions].filter(Boolean).join("\n\n"),
            });
            const modelSummary = modelResult.summary;
            summaryValidationReference = (0, group_compaction_projections_1.normalizeSummary)(modelResult.validationFallback || fallback, (0, group_compaction_projections_1.createEmptyConversationSummary)());
            summaryQualityMessages = modelResult.qualityMessages || messagesToCompact;
            modelRequestAudit = modelResult.requestAudit;
            compactionUsage = modelResult.compactionUsage;
            if (modelSummary) {
                conversationSummary = modelSummaryRequired
                    ? (0, group_compaction_projections_1.normalizeSummary)(modelSummary, (0, group_compaction_projections_1.createEmptyConversationSummary)())
                    : (0, group_compaction_projections_1.mergeSafeConversationSummary)(previousSummary, fallback, modelSummary, messagesToCompact);
                summarySource = modelSummaryRequired ? "model" : "hybrid";
                validation = (0, group_compaction_projections_1.validateSummaryPreservesFallback)(conversationSummary, summaryValidationReference);
                if (!validation.pass) {
                    rejectedModelValidation = validation;
                    if (modelSummaryRequired) {
                        const error = new Error(`模型摘要未通过保真校验：${validation.missing.slice(0, 5).join("；")}`);
                        error.code = "GROUP_COMPACTION_MODEL_SUMMARY_VALIDATION_FAILED";
                        error.compactionRequestAudit = modelRequestAudit;
                        error.compactionUsage = compactionUsage;
                        throw error;
                    }
                    conversationSummary = fallback;
                    summarySource = "structured-validation-fallback";
                    validation = (0, group_compaction_projections_1.validateSummaryPreservesFallback)(conversationSummary, fallback);
                }
            }
            else if (modelSummaryRequired) {
                const error = new Error("压缩模型没有返回可用的 JSON 摘要");
                error.code = "GROUP_COMPACTION_MODEL_SUMMARY_EMPTY";
                error.compactionRequestAudit = modelRequestAudit;
                error.compactionUsage = compactionUsage;
                throw error;
            }
        }
        catch (error) {
            if (error?.code === "GROUP_COMPACTION_CANCELLED" || error?.code === "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE")
                throw error;
            modelRequestAudit = error?.compactionRequestAudit || modelRequestAudit;
            compactionUsage = error?.compactionUsage || compactionUsage;
            failure = (0, group_compaction_projections_1.compactText)(error?.message || error, 400);
            if (modelSummaryRequired) {
                error.code = error.code || "GROUP_COMPACTION_MODEL_REQUIRED_FAILED";
                error.compactionRequestAudit = modelRequestAudit;
                error.compactionUsage = compactionUsage;
                throw error;
            }
        }
    }
    assertGroupCompactionLifecycleFence(input.config, "after_compaction_model");
    if (sessionMemoryCompactSelection?.schema && sessionMemoryCompactSelection.selected !== true) {
        sessionMemoryCompactSelection = (0, group_compaction_projections_1.buildGroupSessionMemoryCompactSelectionReceipt)({
            ...sessionMemoryCompactSelection,
            selected: false,
            fallbackReason: sessionMemoryCompactSelection.fallback_reason,
            compactionApiCalled: shouldAttemptModel,
            createdAt: now,
        });
    }
    const compactedFactAnchors = (0, group_compaction_projections_1.extractFactAnchors)(messagesToCompact);
    const nextFactAnchors = (0, group_compaction_projections_1.mergeFactAnchors)(memory.factAnchors, [
        ...compactedFactAnchors,
        ...hookFactAnchors,
        ...(Array.isArray(partialSidecarSegment?.factAnchors) ? partialSidecarSegment.factAnchors : []),
    ]);
    const nextPersistentRequirements = (0, group_compaction_projections_1.mergePersistentRequirements)(memory.persistentRequirements, [
        ...(0, group_compaction_projections_1.extractPersistentRequirements)(messagesToCompact),
        ...hookPersistentRequirements,
        ...(Array.isArray(partialSidecarSegment?.persistentRequirements) ? partialSidecarSegment.persistentRequirements : []),
    ]);
    let quality = (0, group_compaction_projections_1.evaluateGroupMemorySummaryQuality)(conversationSummary, summaryValidationReference, summaryQualityMessages, memory, {
        evaluatedAt: now,
        factAnchors: nextFactAnchors,
        persistentRequirements: nextPersistentRequirements,
    });
    let downgradedByQualityGate = false;
    let qualityDowngradeReason = "";
    if (quality.downgrade_required && ["hybrid", "model"].includes(summarySource)) {
        const rejectedByQuality = {
            summarySource,
            validation,
            quality,
        };
        rejectedModelValidation = rejectedModelValidation
            ? { previous: rejectedModelValidation, qualityGate: rejectedByQuality }
            : rejectedByQuality;
        downgradedByQualityGate = true;
        qualityDowngradeReason = quality.downgrade_reason || "quality_gate_failed";
        failure = failure || qualityDowngradeReason;
        if (modelSummaryRequired) {
            const error = new Error(`模型摘要未通过质量门禁：${qualityDowngradeReason}`);
            error.code = "GROUP_COMPACTION_MODEL_SUMMARY_QUALITY_FAILED";
            error.compactionRequestAudit = modelRequestAudit;
            error.compactionUsage = compactionUsage;
            error.summaryQuality = quality;
            throw error;
        }
        conversationSummary = fallback;
        summarySource = "structured-quality-fallback";
        validation = (0, group_compaction_projections_1.validateSummaryPreservesFallback)(conversationSummary, fallback);
        quality = (0, group_compaction_projections_1.evaluateGroupMemorySummaryQuality)(conversationSummary, fallback, messagesToCompact, memory, {
            evaluatedAt: now,
            factAnchors: nextFactAnchors,
            persistentRequirements: nextPersistentRequirements,
            downgradedFrom: rejectedByQuality.summarySource,
        });
    }
    const boundaryMessage = messages[keepIndex - 1];
    const keptMessages = messages.slice(keepIndex);
    const microCompact = (0, group_compaction_projections_1.buildGroupMicroCompactPlan)(messagesToCompact, input.config?.microCompact || input.config?.groupMicroCompact || {});
    const postCompactReinject = (0, group_compaction_projections_1.buildPostCompactReinjectionPlan)(messagesToCompact, microCompact, {
        ...(input.config?.postCompactReinject || {}),
        groupId,
        groupSessionId,
        sessionMessages: messages,
        preservedMessages: keptMessages,
        taskStatuses: postCompactTaskStatusProjection.tasks,
        tasks: input.activeTasks || [],
        currentTaskId: input.config?.currentTaskId || input.config?.current_task_id,
        dynamicContextCatalog: input.config?.postCompactDynamicContextCatalog || input.config?.post_compact_dynamic_context_catalog || {},
        dynamicContextScanMode: primaryPartialCompact ? "partial" : "full",
        preCompactLoadedToolNames: [
            ...(memory?.compactBoundary?.compactMetadata?.preCompactDiscoveredTools || []),
            ...(previousState?.preCompactDiscoveredTools || []),
        ],
        invokedSkillSingleMaxTokens: input.config?.postCompactSkillPerItemMaxTokens || input.config?.post_compact_skill_per_item_max_tokens,
        invokedSkillsTotalMaxTokens: input.config?.postCompactSkillTotalMaxTokens || input.config?.post_compact_skill_total_max_tokens,
        now,
    });
    const sharedSessionStartHookResults = await (0, session_compaction_core_1.runSessionCompactionHooks)("session_start", {
        scope: "group",
        groupId: input.groupId,
        sessionId: groupSessionId,
        trigger: "compact",
        summary: sessionMemoryCompactSelection?.selected === true ? selectedSessionMemoryMarkdown : conversationSummary,
        previousSummary: canonicalPreviousSummary,
        recoveryContext: {
            reinjectionPlan: postCompactReinject,
            persistentRequirements: nextPersistentRequirements,
            factAnchors: nextFactAnchors,
            toolContinuity: memory.toolContinuity || null,
        },
    });
    const preCompactTokenCount = messages.reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0);
    let summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
    const initialMessageDigest = sessionMemoryCompactSelection?.selected === true
        ? selectedSessionMemoryMarkdown
        : (0, group_compaction_projections_1.renderConversationSummary)(conversationSummary, 14_000);
    const prePtlPostCompactPayloadBudget = (0, group_compaction_projections_1.buildGroupTruePostCompactPayloadBudget)({
        groupId: input.groupId,
        groupSessionId,
        triggerTokens,
        summaryText: initialMessageDigest,
        keptMessages,
        postCompactReinject,
        persistentRequirements: nextPersistentRequirements,
        factAnchors: nextFactAnchors,
        sessionMemory: sessionMemoryCompactSelection?.selected === true ? null : memory.sessionMemory,
        toolContinuity: memory.toolContinuity,
    });
    const prePtlPostCompactTokenCount = Number(prePtlPostCompactPayloadBudget.true_post_compact_token_count || 0);
    const ptlEmergency = (0, group_compaction_strategy_1.buildGroupPtlEmergencyPlan)({
        groupId: input.groupId,
        messages,
        messagesToCompact,
        keptMessages,
        startIndex: summarizedThroughIndex + 1,
        keepIndex,
        conversationSummary,
        triggerTokens,
        activeTokens,
        preCompactTokenCount,
        postCompactTokenCount: prePtlPostCompactTokenCount,
        contextBudget: prePtlPostCompactPayloadBudget.context_budget,
        transcriptPath: input.transcriptPath,
        config: input.config,
        now,
    });
    let messageDigest = sessionMemoryCompactSelection?.selected === true
        ? selectedSessionMemoryMarkdown
        : (0, group_compaction_projections_1.renderConversationSummary)(conversationSummary, ptlEmergency?.messageDigestMaxChars || 14_000);
    let postCompactPayloadBudget = (0, group_compaction_projections_1.buildGroupTruePostCompactPayloadBudget)({
        groupId: input.groupId,
        groupSessionId,
        triggerTokens,
        summaryText: messageDigest,
        keptMessages,
        postCompactReinject,
        persistentRequirements: nextPersistentRequirements,
        factAnchors: nextFactAnchors,
        sessionMemory: sessionMemoryCompactSelection?.selected === true ? null : memory.sessionMemory,
        toolContinuity: memory.toolContinuity,
    });
    const buildFinalModelVisiblePayload = () => (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
        scope: "group",
        sessionId: `${groupId}:${groupSessionId}`,
        system: input.config?.modelVisibleSystemContext || input.config?.model_visible_system_context || input.config?.systemPrompt || input.config?.system_prompt || null,
        tools: input.config?.modelVisibleTools || input.config?.model_visible_tools || input.config?.toolSchemas || input.config?.tool_schemas || null,
        activeSummary: sessionMemoryCompactSelection?.selected === true ? selectedSessionMemoryMarkdown : conversationSummary,
        recentMessages: keptMessages,
        currentRequest: input.config?.currentRequest || input.config?.current_request || null,
        recoveryContext: {
            ...(input.config?.recoveryContext || input.config?.recovery_context || {}),
            reinjectionPlan: postCompactReinject,
            persistentRequirements: nextPersistentRequirements,
            factAnchors: nextFactAnchors,
            sessionMemory: sessionMemoryCompactSelection?.selected === true ? null : memory.sessionMemory,
            toolContinuity: memory.toolContinuity,
        },
        hookResults: sharedSessionStartHookResults,
        contextComponents: input.config?.contextComponents || input.config?.context_components || {
            rules: input.config?.modelVisibleRules || input.config?.model_visible_rules || null,
            skills: input.config?.modelVisibleSkills || input.config?.model_visible_skills || null,
            mcpTools: input.config?.modelVisibleMcpTools || input.config?.model_visible_mcp_tools || null,
            subagentDefinitions: input.config?.modelVisibleSubagentDefinitions || input.config?.model_visible_subagent_definitions || null,
        },
    });
    let finalModelVisiblePayload = buildFinalModelVisiblePayload();
    let sharedPostCompactGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({
        modelVisiblePayload: finalModelVisiblePayload,
        threshold: triggerTokens,
    });
    postCompactPayloadBudget = {
        ...postCompactPayloadBudget,
        true_post_compact_token_count: finalModelVisiblePayload.totalTokens,
        will_retrigger_next_turn: sharedPostCompactGate.providerCallAllowed !== true,
        payload_checksum: finalModelVisiblePayload.payloadChecksum,
        model_visible_payload: (0, session_compaction_core_1.modelVisiblePayloadAccounting)(finalModelVisiblePayload),
        shared_post_compact_gate: sharedPostCompactGate,
    };
    let formalRecompaction = {
        schema: "ccm-bounded-formal-recompaction-v1",
        scope: "group",
        sessionId: `${groupId}:${groupSessionId}`,
        attempted: false,
        maxAttempts: 1,
        initialTokens: finalModelVisiblePayload.totalTokens,
        threshold: triggerTokens,
        status: "not_required",
    };
    if (sharedPostCompactGate.providerCallAllowed !== true) {
        formalRecompaction = { ...formalRecompaction, attempted: true, status: "running" };
        try {
            const retryResult = await summarizeWithModel(messagesToCompact, memory, fallback, {
                ...(input.config || {}),
                groupId,
                groupSessionId,
                customInstructions: [
                    customCompactInstructions,
                    sharedHookInstructions,
                    "这是压缩后容量门禁触发的唯一一次正式重压缩。生成明显更短的摘要，不添加新事实，并完整保留验证参考中的要求、决定、授权边界和未完成事项。",
                ].filter(Boolean).join("\n\n"),
            });
            const retrySummary = (0, group_compaction_projections_1.normalizeSummary)(retryResult.summary, (0, group_compaction_projections_1.createEmptyConversationSummary)());
            const retryReference = (0, group_compaction_projections_1.normalizeSummary)(retryResult.validationFallback || fallback, (0, group_compaction_projections_1.createEmptyConversationSummary)());
            const retryValidation = (0, group_compaction_projections_1.validateSummaryPreservesFallback)(retrySummary, retryReference);
            const retryQuality = (0, group_compaction_projections_1.evaluateGroupMemorySummaryQuality)(retrySummary, retryReference, retryResult.qualityMessages || messagesToCompact, memory, {
                evaluatedAt: now,
                factAnchors: nextFactAnchors,
                persistentRequirements: nextPersistentRequirements,
            });
            if (!retryValidation.pass || retryQuality.downgrade_required) {
                throw new Error(`群聊正式重压缩摘要校验失败：${retryValidation.missing?.slice(0, 5).join("；") || retryQuality.downgrade_reason || "quality_gate_failed"}`);
            }
            conversationSummary = retrySummary;
            summarySource = "model";
            summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
            modelRequestAudit = retryResult.requestAudit || modelRequestAudit;
            compactionUsage = retryResult.compactionUsage || compactionUsage;
            if (sessionMemoryCompactSelection?.schema) {
                sessionMemoryCompactSelection = (0, group_compaction_projections_1.buildGroupSessionMemoryCompactSelectionReceipt)({
                    ...sessionMemoryCompactSelection,
                    selected: false,
                    fallbackReason: "post_compact_formal_recompaction",
                    compactionApiCalled: true,
                    createdAt: now,
                });
            }
            selectedSessionMemoryMarkdown = "";
            messageDigest = (0, group_compaction_projections_1.renderConversationSummary)(conversationSummary, ptlEmergency?.messageDigestMaxChars || 14_000);
            postCompactPayloadBudget = (0, group_compaction_projections_1.buildGroupTruePostCompactPayloadBudget)({
                groupId: input.groupId,
                groupSessionId,
                triggerTokens,
                summaryText: messageDigest,
                keptMessages,
                postCompactReinject,
                persistentRequirements: nextPersistentRequirements,
                factAnchors: nextFactAnchors,
                sessionMemory: memory.sessionMemory,
                toolContinuity: memory.toolContinuity,
            });
            finalModelVisiblePayload = buildFinalModelVisiblePayload();
            sharedPostCompactGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({ modelVisiblePayload: finalModelVisiblePayload, threshold: triggerTokens });
            postCompactPayloadBudget = {
                ...postCompactPayloadBudget,
                true_post_compact_token_count: finalModelVisiblePayload.totalTokens,
                will_retrigger_next_turn: sharedPostCompactGate.providerCallAllowed !== true,
                payload_checksum: finalModelVisiblePayload.payloadChecksum,
                model_visible_payload: (0, session_compaction_core_1.modelVisiblePayloadAccounting)(finalModelVisiblePayload),
                shared_post_compact_gate: sharedPostCompactGate,
            };
            formalRecompaction = {
                ...formalRecompaction,
                status: sharedPostCompactGate.providerCallAllowed === true ? "passed" : "still_over_threshold",
                finalTokens: finalModelVisiblePayload.totalTokens,
                summaryValidated: true,
            };
        }
        catch (error) {
            formalRecompaction = { ...formalRecompaction, status: "failed", error: (0, group_compaction_projections_1.compactText)(error?.message || error, 500) };
        }
    }
    sharedPostCompactGate = { ...sharedPostCompactGate, formalRecompaction };
    postCompactPayloadBudget = {
        ...postCompactPayloadBudget,
        shared_post_compact_gate: sharedPostCompactGate,
        formal_recompaction: formalRecompaction,
    };
    if (sessionMemoryCompactSelection?.schema) {
        sessionMemoryCompactSelection = (0, group_compaction_projections_1.buildGroupSessionMemoryCompactSelectionReceipt)({
            ...sessionMemoryCompactSelection,
            selected: sessionMemoryCompactSelection.selected === true,
            fallbackReason: sessionMemoryCompactSelection.fallback_reason,
            compactionApiCalled: sessionMemoryCompactSelection.compaction_api_called === true,
            projectedPostCompactTokens: postCompactPayloadBudget.true_post_compact_token_count,
            createdAt: now,
        });
    }
    const postCompactTokenCount = Number(postCompactPayloadBudget.true_post_compact_token_count || 0);
    const postCompactPayloadGate = {
        schema: "ccm-group-post-compact-payload-gate-v1",
        group_id: String(input.groupId || ""),
        group_session_id: groupSessionId,
        status: postCompactPayloadBudget.will_retrigger_next_turn === true
            ? "recompact_required"
            : ptlEmergency?.engaged ? "ptl_reduced" : "ready",
        action: postCompactPayloadBudget.will_retrigger_next_turn === true
            ? "reduce_restored_context_before_child_dispatch"
            : "dispatch_ready",
        trigger_tokens: triggerTokens,
        pre_ptl_token_count: prePtlPostCompactTokenCount,
        true_post_compact_token_count: postCompactTokenCount,
        ptl_applied: ptlEmergency?.engaged === true,
        safe_render_chars: postCompactPayloadBudget.will_retrigger_next_turn === true ? 6000 : 14_000,
        payload_checksum: postCompactPayloadBudget.payload_checksum,
        model_visible_payload: (0, session_compaction_core_1.modelVisiblePayloadAccounting)(finalModelVisiblePayload),
        shared_gate: sharedPostCompactGate,
        formal_recompaction: formalRecompaction,
    };
    if (postCompactPayloadGate.status === "recompact_required") {
        const error = new Error(`群聊会话压缩后仍超过阈值：${postCompactTokenCount}/${triggerTokens}`);
        error.code = "GROUP_POST_COMPACT_THRESHOLD_EXCEEDED";
        error.postCompactPayloadGate = postCompactPayloadGate;
        throw error;
    }
    const secondaryReview = await (0, session_summary_secondary_review_1.reviewSessionSummaryIfSelected)({
        config: input.config,
        scope: "group",
        scopeId: String(input.groupId || ""),
        sessionId: groupSessionId,
        boundaryGeneration: Number(memory?.compactBoundary?.boundaryGeneration || 0) + 1,
        summary: conversationSummary,
        reference: summaryValidationReference,
        sourceMessageIds: messagesToCompact.map((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, index)),
        deterministicQuality: quality,
    });
    const postCompactWarning = (0, group_compaction_strategy_1.calculateGroupCompactWarningState)({
        activeTokens: postCompactTokenCount,
        activeMessageCount: keptMessages.length,
        autoCompactThreshold: triggerTokens,
        config: input.config,
        suppressed: postCompactPayloadGate.status !== "recompact_required",
        suppressReason: postCompactPayloadGate.status !== "recompact_required"
            ? "post_compaction_until_next_group_memory_pressure_sample"
            : "",
        now,
    });
    const reductionRatio = preCompactTokenCount > 0 ? Math.max(0, 1 - postCompactTokenCount / preCompactTokenCount) : 0;
    const pressurePercent = triggerTokens > 0 ? Math.round((activeTokens / triggerTokens) * 1000) / 10 : 0;
    const contextBudget = {
        ...postCompactPayloadBudget.context_budget,
        pre_ptl_estimated_tokens: prePtlPostCompactTokenCount,
        true_post_compact_token_count: postCompactTokenCount,
        will_retrigger_next_turn: postCompactPayloadBudget.will_retrigger_next_turn === true,
        payload_checksum: postCompactPayloadBudget.payload_checksum,
    };
    const ptlRecovery = (0, group_compaction_strategy_1.buildGroupPtlRecoveryPlan)({
        previousPtlEmergency: previousState.ptlEmergency,
        currentPtlEmergency: ptlEmergency,
        contextBudget,
        triggerTokens,
        postCompactTokenCount,
        restoredMessageDigestMaxChars: 14_000,
        summaryChecksum,
        transcriptPath: input.transcriptPath,
        config: input.config,
        now,
    });
    const effectiveContextBudget = ptlEmergency
        ? {
            ...contextBudget,
            ptl_emergency: {
                schema: ptlEmergency.schema,
                emergencyLevel: ptlEmergency.emergencyLevel,
                reason: ptlEmergency.reason,
                messageDigestMaxChars: ptlEmergency.messageDigestMaxChars,
            },
        }
        : ptlRecovery
            ? {
                ...contextBudget,
                ptl_recovery: {
                    schema: ptlRecovery.schema,
                    reason: ptlRecovery.reason,
                    restoredMessageDigestMaxChars: ptlRecovery.restoredMessageDigestMaxChars,
                    contextBudgetPressure: ptlRecovery.contextBudgetPressure,
                },
            }
            : contextBudget;
    const previousThrashCount = Number(previousState.thrashCount || 0);
    const thrashCount = reductionRatio < 0.2 ? previousThrashCount + 1 : 0;
    const health = postCompactPayloadGate.status === "recompact_required"
        ? "recompact_required"
        : ptlEmergency
            ? "ptl_emergency"
            : ptlRecovery
                ? "healthy"
                : !validation.pass || !quality.pass
                    ? quality.status === "failed" ? "failed" : "degraded"
                    : thrashCount >= 3 ? "thrashing" : "healthy";
    const preservedSegment = (0, group_compaction_projections_1.buildGroupPreservedSegment)(messages, keepIndex, {
        groupId: input.groupId,
        floorIndex: summarizedThroughIndex + 1,
        minMessages: input.config?.minKeepMessages || input.config?.min_keep_messages || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_MESSAGES,
        minTokens: input.config?.minKeepTokens || input.config?.min_keep_tokens || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_TOKENS,
        maxTokens: input.config?.maxKeepTokens || input.config?.max_keep_tokens || group_compaction_receipts_1.GROUP_COMPACT_MAX_KEEP_TOKENS,
        summaryChecksum,
        transcriptPath: input.transcriptPath,
        now,
    });
    const compactStrategyDecision = buildStrategyDecision({
        compacted: true,
        primaryCompact: true,
        keptMessages,
        microCompact,
        postCompactReinject,
        ptlEmergency,
        ptlRecovery,
        truePostCompactPayloadBudget: postCompactPayloadBudget,
        postCompactPayloadGate,
        sessionMemoryCompactSelection,
        preservedSegment,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        reason: primaryPartialCompact
            ? partialCompact?.reason || "manual partial compact selected primary boundary"
            : input.force
                ? "manual compact requested"
                : "auto compact selected session-memory style summary plus recent window",
    });
    const apiMicroCompactEditPlan = (0, group_compaction_projections_1.buildGroupApiMicroCompactEditPlan)(messages, {
        groupId: input.groupId,
        activeTokens: preCompactTokenCount,
        targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
        maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
        force: input.force,
        now,
    });
    const preCompactDiscoveredTools = Array.isArray(postCompactReinject?.dynamicContextDeltaReceipt?.loaded_tool_state?.carried_names)
        ? postCompactReinject.dynamicContextDeltaReceipt.loaded_tool_state.carried_names
        : [];
    const previousBoundary = memory?.compactBoundary?.id
        ? memory.compactBoundary
        : Array.isArray(previousState.boundaries) ? previousState.boundaries.at(-1) || null : null;
    const previousTotalMessagesSeen = Number(previousState.totalMessagesSeen || 0);
    const lineageCheckpointKnown = !!previousBoundary?.id
        && previousTotalMessagesSeen > 0
        && previousTotalMessagesSeen <= messages.length;
    const messagesSincePreviousCompact = lineageCheckpointKnown ? messages.slice(previousTotalMessagesSeen) : [];
    const turnsSincePreviousCompact = messagesSincePreviousCompact.filter((message) => {
        if (message?.isMeta === true || String(message?.role || message?.type || "") !== "user")
            return false;
        const content = message?.content ?? message?.message?.content;
        return !(Array.isArray(content) && content.length > 0 && content.every((block) => block?.type === "tool_result"));
    }).length;
    const compactTrigger = primaryPartialCompact || input.force ? "manual" : "auto";
    const boundary = {
        id: `compact-${Date.now().toString(36)}-${crypto.createHash("sha256").update(`${input.groupId || ""}\0${groupSessionId}\0${now}\0${(0, group_compaction_projections_1.messageIdentity)(boundaryMessage, keepIndex - 1)}`).digest("hex").slice(0, 10)}`,
        type: primaryPartialCompact ? "partial-up-to" : input.force ? "manual" : "auto",
        summarizedFromMessageId: (0, group_compaction_projections_1.messageIdentity)(messages[summarizedThroughIndex + 1], summarizedThroughIndex + 1),
        summarizedThroughMessageId: (0, group_compaction_projections_1.messageIdentity)(boundaryMessage, keepIndex - 1),
        summarizedMessageCount: messagesToCompact.length,
        preservedMessageIds: keptMessages.slice(-40).map((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, keepIndex + index)),
        compactMetadata: {
            trigger: compactTrigger,
            preTokens: preCompactTokenCount,
            messagesSummarized: messagesToCompact.length,
            preCompactDiscoveredTools,
            compactionUsage,
            sessionMemoryCompactSelection,
            secondaryReview,
            preservedSegment: {
                headUuid: String(preservedSegment?.headMessageId || preservedSegment?.firstPreservedMessageId || ""),
                anchorUuid: String(preservedSegment?.anchorMessageId || preservedSegment?.summaryMessageId || ""),
                tailUuid: String(preservedSegment?.tailMessageId || preservedSegment?.lastPreservedMessageId || ""),
            },
        },
        preservedSegment,
        preCompactTokenCount,
        postCompactTokenCount,
        prePtlPostCompactTokenCount,
        truePostCompactPayloadBudget: postCompactPayloadBudget,
        postCompactPayloadGate,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
        post_compact_restore: {
            strategy: "conversation_summary_recent_reinject",
            preservedMessageIds: keptMessages.slice(-20).map((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, keepIndex + index)),
            preservedSegment,
            strategyDecision: compactStrategyDecision,
            apiMicroCompactEditPlan,
            summaryChecksum,
            secondaryReview,
            preCompactDiscoveredTools,
            transcriptPath: input.transcriptPath,
            microCompact,
            reinjectionPlan: postCompactReinject,
            postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
            partialSidecarSegment,
            ptlEmergency,
            ptlRecovery,
            truePostCompactPayloadBudget: postCompactPayloadBudget,
            postCompactPayloadGate,
            compactionUsage,
            sessionMemoryCompactSelection,
            recoveryAudit: null,
            cleanupAudit: null,
        },
        context_budget: effectiveContextBudget,
        partialCompact,
        partialSidecarSegment,
        ptlEmergency,
        ptlRecovery,
        summarySource,
        modelRequestAudit,
        compactionUsage,
        sessionMemoryCompactSelection,
        quality: {
            score: quality.score,
            status: quality.status,
            driftDetected: quality.drift.detected,
            downgradedByQualityGate,
        },
        createdAt: now,
    };
    const compactLineage = (0, group_compaction_receipts_1.buildGroupCompactLineage)({
        groupId: input.groupId,
        groupSessionId,
        boundary,
        previousBoundary,
        checkpointKnown: lineageCheckpointKnown,
        turnsSincePreviousCompact,
        newMessageCountSincePreviousCompact: messagesSincePreviousCompact.length,
        trigger: compactTrigger,
        querySource: `group_main:${String(input.groupId || "")}::${groupSessionId}`,
        messagesSummarized: messagesToCompact.length,
        preCompactTokens: preCompactTokenCount,
        truePostCompactTokens: postCompactTokenCount,
        autoCompactThreshold: triggerTokens,
        willRetriggerNextTurn: postCompactPayloadBudget.will_retrigger_next_turn === true,
    });
    boundary.compactLineage = compactLineage;
    boundary.compactMetadata.compactLineage = compactLineage;
    boundary.post_compact_restore.compactLineage = compactLineage;
    const postCompactRecoveryAudit = (0, group_compaction_projections_1.buildGroupPostCompactRecoveryAudit)({
        groupId: input.groupId,
        messages,
        boundary,
        keepIndex,
        conversationSummary,
        messageDigest,
        summaryChecksum,
        transcriptPath: input.transcriptPath,
        preservedSegment,
        postCompactReinject,
        microCompact,
        contextPressureWarning: postCompactWarning,
        contextBudget: effectiveContextBudget,
        partialSidecarSegment,
        ptlEmergency,
        ptlRecovery,
        truePostCompactPayloadBudget: postCompactPayloadBudget,
        postCompactPayloadGate,
        now,
    });
    boundary.post_compact_restore.recoveryAudit = postCompactRecoveryAudit;
    assertGroupCompactionLifecycleFence(input.config, "before_post_compact_hooks");
    const postHookResults = await (0, group_compaction_hooks_1.runGroupMemoryCompactionHooks)("post", {
        hookRunId: compactionHookRunId,
        groupId: input.groupId,
        groupSessionId,
        messages,
        messagesToCompact,
        keptMessages,
        memory,
        conversationSummary,
        fallback,
        validation,
        quality,
        boundary,
        microCompact,
        postCompactReinject,
        postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
        partialCompact,
        partialSidecarSegment,
        ptlEmergency,
        ptlRecovery,
        summaryChecksum,
        compactStrategyDecision,
        truePostCompactPayloadBudget: postCompactPayloadBudget,
        postCompactPayloadGate,
        abortSignal: input.config?.compactionAbortSignal || input.config?.compaction_abort_signal || null,
    });
    await (0, session_compaction_core_1.runSessionCompactionHooks)("post_compact", {
        scope: "group",
        groupId: input.groupId,
        sessionId: groupSessionId,
        trigger: input.force ? "manual" : "auto",
        result: {
            boundary,
            summarySource,
            summaryQuality: quality,
            secondaryReview,
            postCompactPayloadGate,
        },
    });
    assertGroupCompactionLifecycleFence(input.config, "after_post_compact_hooks");
    const postCompactMessageOrderReceipt = (0, group_compaction_receipts_1.buildGroupPostCompactMessageOrderReceipt)({
        groupId: input.groupId,
        groupSessionId,
        boundary,
        summaryChecksum,
        preservedSegment,
        postCompactReinject,
        postHookResults,
        hookRunId: compactionHookRunId,
    });
    boundary.postCompactMessageOrderReceipt = postCompactMessageOrderReceipt;
    boundary.post_compact_restore.messageOrderReceipt = postCompactMessageOrderReceipt;
    const postCompactCleanupAudit = (0, group_compaction_projections_1.buildGroupPostCompactCleanupAudit)({
        groupId: input.groupId,
        groupSessionId,
        boundary,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        postCompactRecoveryAudit,
        microCompact,
        postCompactReinject,
        preservedSegment,
        transcriptPath: input.transcriptPath,
        summaryChecksum,
        hookRunId: compactionHookRunId,
        now,
    });
    boundary.post_compact_restore.cleanupAudit = postCompactCleanupAudit;
    const latestHookLedger = (0, group_compaction_hooks_1.readGroupMemoryCompactionHookLedger)(String(input.groupId || ""), groupSessionId);
    const compactTransactionReceipt = (0, group_compaction_receipts_1.buildGroupCompactTransactionReceipt)({
        groupId: input.groupId,
        groupSessionId,
        boundary,
        summaryChecksum,
        hookRunId: compactionHookRunId,
        preHookResults,
        postHookResults,
        transcriptPath: input.transcriptPath,
        createdAt: now,
    });
    boundary.compactTransactionReceipt = compactTransactionReceipt;
    boundary.post_compact_restore.compactTransactionReceipt = compactTransactionReceipt;
    const totalCompacted = requiresExplicitRebuild
        ? keepIndex
        : Math.max(Number(previousState.compactedMessageCount || 0) + messagesToCompact.length, keepIndex);
    const partialSegments = (0, group_compaction_projections_1.mergeGroupPartialCompactSegments)(previousState.partialSegments, partialSidecarSegment);
    const nextMemory = {
        ...memory,
        conversationSummary,
        factAnchors: nextFactAnchors,
        persistentRequirements: nextPersistentRequirements,
        messageDigest,
        compactBoundary: boundary,
        compaction: {
            version: group_compaction_receipts_1.GROUP_MEMORY_COMPACTION_VERSION,
            rebuiltAt: requiresExplicitRebuild ? now : String(previousState.rebuiltAt || ""),
            migratedFromVersion: requiresVersionMigration ? previousVersion : Number(previousState.migratedFromVersion || 0),
            enabled: true,
            lastCompactedMessageId: boundary.summarizedThroughMessageId,
            lastCompactedAt: now,
            boundaryGeneration: Math.max(0, Number(previousState.boundaryGeneration || previousState.boundary_generation || 0)) + 1,
            compactedMessageCount: totalCompacted,
            totalMessagesSeen: messages.length,
            preservedRecentMessages: keptMessages.length,
            preCompactTokenCount,
            postCompactTokenCount,
            prePtlPostCompactTokenCount,
            truePostCompactPayloadBudget: postCompactPayloadBudget,
            postCompactPayloadGate,
            context_budget: effectiveContextBudget,
            activeTokensBeforeCompact: activeTokens,
            contextTokenMeasurement: {
                ...contextTokenMeasurement,
                method: contextTokenMeasurement.method,
                estimatedActiveTokens,
                providerObservedCorrection,
                providerUsageEventId: String(providerUsageBaseline.event?.event_id || ""),
            },
            triggerTokens,
            pressurePercent,
            contextPressureWarning: postCompactWarning,
            compactWarning: postCompactWarning,
            preCompactWarning,
            postCompactRecoveryAudit,
            postCompactCleanupAudit,
            summarySource,
            modelMode: sessionMemoryCompactSelection?.selected === true
                ? "session-memory-reused"
                : modelSummaryRequired ? "model-required" : modelCompactionEnabled ? "hybrid-opt-in" : "session-memory-first",
            modelAttempted: shouldAttemptModel,
            modelRequestAudit,
            ptlRecoveryAttempts: Number(modelRequestAudit?.ptlRetryAttempts || 0),
            compactionUsage,
            sessionMemoryCompactSelection,
            summaryChecksum,
            compactTransactionReceipt,
            postCompactMessageOrderReceipt,
            compactLineage,
            deterministicFactsPreserved: true,
            validation,
            qualityGateVersion: quality.schema,
            quality,
            downgradedByQualityGate,
            qualityDowngradeReason,
            driftDetected: quality.drift.detected,
            microCompact,
            postCompactReinject,
            preCompactDiscoveredTools,
            postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
            partialCompact,
            partialSegments,
            lastPartialCompactedAt: partialSidecarSegment ? now : String(previousState.lastPartialCompactedAt || ""),
            lastPartialSegmentId: partialSidecarSegment?.id || String(previousState.lastPartialSegmentId || ""),
            ptlEmergency,
            ptlRecovery,
            preservedSegment,
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            hookResults: {
                pre: [...sharedPreHookResults, ...preHookResults].slice(-20),
                sessionStart: sharedSessionStartHookResults.slice(-20),
                post: postHookResults.slice(-20),
            },
            hookLedger: {
                schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
                hookRunId: compactionHookRunId,
                file: latestHookLedger.file,
                stats: latestHookLedger.stats,
                recentEntries: (Array.isArray(latestHookLedger.entries) ? latestHookLedger.entries : [])
                    .filter((entry) => entry.hook_run_id === compactionHookRunId)
                    .slice(-20),
            },
            rejectedModelValidation,
            reductionRatio,
            thrashCount,
            health,
            consecutiveFailures: ["model", "session-memory"].includes(summarySource) ? 0 : Math.min(group_compaction_receipts_1.GROUP_COMPACT_MAX_FAILURES, failures + (failure ? 1 : 0)),
            lastFailure: modelCompactionEnabled ? failure : "",
            lastFailureAt: modelCompactionEnabled ? (failure ? now : String(previousState.lastFailureAt || "")) : "",
            nextModelRetryAt: modelCompactionEnabled && failure && failures + 1 >= group_compaction_receipts_1.GROUP_COMPACT_MAX_FAILURES
                ? new Date(nowMs + group_compaction_receipts_1.GROUP_COMPACT_MODEL_RETRY_MS).toISOString()
                : "",
            transcriptPath: input.transcriptPath,
            boundaries: [...(Array.isArray(previousState.boundaries) ? previousState.boundaries : []), boundary].slice(-8),
        },
        messageCompression: {
            enabled: true,
            strategy: "cc-session-memory-v3+micro-compact",
            totalMessages: messages.length,
            compressedMessages: totalCompacted,
            recentMessages: keptMessages.length,
            recentLimit: keptMessages.length,
            olderLimit: totalCompacted,
            preCompactTokenCount,
            postCompactTokenCount,
            prePtlPostCompactTokenCount,
            truePostCompactPayloadBudget: postCompactPayloadBudget,
            postCompactPayloadGate,
            microCompactTokensFreed: microCompact.tokensFreed,
            partialCompact,
            partialSegments: partialSegments.slice(-group_compaction_receipts_1.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT),
            ptlEmergency,
            ptlRecovery,
            preservedSegment,
            postCompactRecoveryAudit,
            postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            postCompactCleanupAudit,
            compactTransactionReceipt,
            postCompactMessageOrderReceipt,
            compactLineage,
            compactionUsage,
            sessionMemoryCompactSelection,
            contextPressureWarning: postCompactWarning,
            lastCompressedAt: now,
        },
    };
    return { compacted: true, memory: nextMemory, boundary, keepIndex, contextPressureWarning: postCompactWarning, preCompactWarning, postCompactRecoveryAudit, postCompactCleanupAudit, postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt, compactStrategyDecision, apiMicroCompactEditPlan, compactTransactionReceipt, postCompactMessageOrderReceipt, compactLineage, compactionUsage, sessionMemoryCompactSelection, truePostCompactPayloadBudget: postCompactPayloadBudget, postCompactPayloadGate };
}
// ===== merged from group-compaction-engine-part-03.ts =====
async function runGroupMemoryPreservedSegmentSelfTest() {
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
    const keepIndex = (0, group_compaction_projections_1.calculateGroupMessagesToKeepIndex)(messages, { minMessages: 1, minTokens: 1, maxTokens: 5000 });
    const segment = (0, group_compaction_projections_1.buildGroupPreservedSegment)(messages, keepIndex, {
        minMessages: 1,
        minTokens: 1,
        maxTokens: 5000,
        summaryChecksum: "preserved-segment-selftest",
        transcriptPath: "preserved-segment-raw.json",
        now: "2026-07-07T00:00:00.000Z",
    });
    const result = await compactGroupConversationMemory({
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
async function runGroupMemoryPostCompactRecoveryAuditSelfTest() {
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
    const result = await compactGroupConversationMemory({
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
    const checkById = new Map((audit.checks || []).map((check) => [check.id, check]));
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
function runGroupMemoryCompactWarningSelfTest() {
    return require("./group-memory-compaction-self-tests").runGroupMemoryCompactWarningSelfTest();
}
function runGroupMemoryCompactionSelfTest() {
    return require("./group-memory-compaction-self-tests").runGroupMemoryCompactionSelfTest();
}
function runGroupMemoryModelCapacitySelfTest() {
    return require("./group-memory-compaction-self-tests").runGroupMemoryModelCapacitySelfTest();
}
function runGroupApiMicrocompactNativeApplyPlanSelfTest() {
    return require("./group-memory-compaction-self-tests").runGroupApiMicrocompactNativeApplyPlanSelfTest();
}
function runGroupMemoryQualityGateSelfTest() {
    return require("./group-memory-compaction-self-tests").runGroupMemoryQualityGateSelfTest();
}
function runGroupMemoryMicroCompactSelfTest() {
    return require("./group-memory-compaction-self-tests").runGroupMemoryMicroCompactSelfTest();
}
function runGroupMemoryTimeBasedMicroCompactSelfTest() {
    return require("./group-memory-compaction-self-tests").runGroupMemoryTimeBasedMicroCompactSelfTest();
}
//# sourceMappingURL=group-compaction-engine.js.map