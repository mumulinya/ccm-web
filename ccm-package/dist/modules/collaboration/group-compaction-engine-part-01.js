"use strict";
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
exports.normalizeHookAnchor = normalizeHookAnchor;
exports.extractHookAnchors = extractHookAnchors;
exports.buildCompactionTimeline = buildCompactionTimeline;
exports.extractJsonObject = extractJsonObject;
exports.normalizeOpenAiUrl = normalizeOpenAiUrl;
exports.normalizeAnthropicUrl = normalizeAnthropicUrl;
exports.callCompactionModel = callCompactionModel;
exports.fitCompactionPromptToTokenBudget = fitCompactionPromptToTokenBudget;
exports.isGroupCompactionPromptTooLongError = isGroupCompactionPromptTooLongError;
exports.groupCompactionMessagesByApiRound = groupCompactionMessagesByApiRound;
exports.truncateGroupCompactionHeadByApiRound = truncateGroupCompactionHeadByApiRound;
exports.buildGroupCompactionModelRequest = buildGroupCompactionModelRequest;
exports.summarizeWithModel = summarizeWithModel;
exports.buildRelevantHistoricalGroupContext = buildRelevantHistoricalGroupContext;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_projections_1 = require("./group-compaction-projections");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
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
async function callCompactionModel(config, system, user, maxOutputTokens = group_compaction_receipts_1.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS) {
    const mockCall = config?.compactionModelCall || config?.compaction_model_call || config?.modelCall || config?.model_call;
    if (typeof mockCall === "function")
        return mockCall({ system, user, maxOutputTokens });
    if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model)
        return null;
    const anthropic = config.format === "anthropic-compatible"
        || config.format === "auto" && String(config.apiUrl).toLowerCase().includes("anthropic")
        || /\/anthropic(?:\/|$)/i.test(String(config.apiUrl));
    const controller = new AbortController();
    const externalSignal = config?.compactionAbortSignal || config?.compaction_abort_signal || null;
    const abortFromExternal = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted)
        abortFromExternal();
    else
        externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
    const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Math.min(Number(config.timeoutMs) || 90_000, 120_000)));
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
        }
        catch (error) {
            if (activityError)
                throw activityError;
            if (externalSignal?.aborted && externalSignal.reason)
                throw externalSignal.reason;
            throw error;
        }
        const body = await response.text();
        if (activityError)
            throw activityError;
        if (!response.ok)
            throw new Error(`memory compact HTTP ${response.status}: ${body.slice(0, 180)}`);
        const data = JSON.parse(body);
        const content = anthropic
            ? (data?.content || []).map((part) => part?.type === "text" ? part.text : "").join("")
            : data?.choices?.[0]?.message?.content || "";
        if (groupId && groupSessionId.startsWith("gcs_")) {
            const usage = data?.usage || {};
            try {
                (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheUsage)({
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
            }
            catch { }
        }
        return {
            summary: extractJsonObject(content),
            usage: data?.usage || null,
            provider: anthropic ? "anthropic" : "openai",
            model: String(data?.model || config.model || ""),
            responseId: String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || ""),
            stopReason: String(anthropic ? data?.stop_reason || "" : data?.choices?.[0]?.finish_reason || ""),
        };
    }
    finally {
        clearTimeout(timeout);
        if (activityInterval)
            clearInterval(activityInterval);
        externalSignal?.removeEventListener("abort", abortFromExternal);
    }
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
不要编造文件变更、测试或完成状态。`;
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
{"primaryRequest":"","userMessages":[],"keyConcepts":[],"filesAndCode":[],"errorsAndFixes":[],"decisions":[],"completedWork":[],"pendingTasks":[],"currentWork":"","nextStep":"","participantState":[],"taskStates":[]}`;
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
        if (/(错误|失败|阻塞|error|failed|blocked|\.(?:ts|js|vue|java|py|go|rs)\b)/i.test(content))
            score += 1;
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
//# sourceMappingURL=group-compaction-engine-part-01.js.map