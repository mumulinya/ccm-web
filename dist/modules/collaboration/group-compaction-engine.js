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
exports.createGroupSessionCompactionAdapter = createGroupSessionCompactionAdapter;
exports.buildGroupPressureAccountingSelection = buildGroupPressureAccountingSelection;
exports.normalizeHookAnchor = normalizeHookAnchor;
exports.extractHookAnchors = extractHookAnchors;
exports.buildCompactionTimeline = buildCompactionTimeline;
exports.extractJsonObject = extractJsonObject;
exports.fitCompactionPromptToTokenBudget = fitCompactionPromptToTokenBudget;
exports.isGroupCompactionPromptTooLongError = isGroupCompactionPromptTooLongError;
exports.groupCompactionMessagesByApiRound = groupCompactionMessagesByApiRound;
exports.truncateGroupCompactionHeadByApiRound = truncateGroupCompactionHeadByApiRound;
exports.buildGroupCompactionModelRequest = buildGroupCompactionModelRequest;
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
const unified_session_compaction_model_1 = require("../../system/unified-session-compaction-model");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_hooks_1 = require("./group-compaction-hooks");
const group_compaction_projections_1 = require("./group-compaction-projections");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const session_execution_ledger_1 = require("../../system/session-execution-ledger");
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
const unified_session_compaction_1 = require("../../system/unified-session-compaction");
const unified_session_compaction_adapters_1 = require("../../system/unified-session-compaction-adapters");
const rolling_session_memory_1 = require("../../system/rolling-session-memory");
const canonical_context_accounting_1 = require("../../system/canonical-context-accounting");
const manual_session_compaction_1 = require("../../system/manual-session-compaction");
// ===== merged from group-compaction-engine-part-01.ts =====
const GROUP_CONTEXT_FIXED_BUCKETS = ["system", "tools", "rules", "skills", "mcpTools", "subagentDefinitions"];
function createGroupSessionCompactionAdapter(input) {
    return (0, unified_session_compaction_adapters_1.createUnifiedScopeAdapter)({
        load: async () => ({ scope: "group", exactSessionId: `${input.groupId}:${input.sessionId}`, ...(await input.load()) }),
        acquire: input.acquire,
        commit: input.commit,
        failure: input.failure,
        validate: input.validate,
    });
}
function buildGroupPressureAccountingSelection(triggerPayload, providerUsageBaseline, groupId, groupSessionId) {
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
    return (0, unified_session_compaction_model_1.extractJsonObject)(text);
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
    const previous = memory?.unifiedSessionSummary || (0, group_compaction_projections_1.createEmptyConversationSummary)();
    const customInstructions = (0, group_compaction_projections_1.compactText)(config?.customInstructions || config?.custom_instructions || "", 4_000);
    const system = `You are the CCM group-Agent conversation compactor. Return JSON only. Do not call tools, create tasks, or dispatch to any Agent.
The summary replaces messages before the compaction boundary, so preserve facts accurately and allow the main Agent to continue without a context break.
Follow Claude Code-style compaction: preserve explicit user requirements, intent changes, technical decisions, files and code references, errors and fixes, completed work, unfinished work, current work, and next steps.
Merge the previous summary and do not let new messages erase still-valid constraints. When completed work conflicts with a todo, prefer newer evidence.
Never invent file changes, tests, or completion. Keep unverified speculation only in hypotheses; never promote it to decisions or completedWork.`;
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
function groupCompactionSourceChecksum(messages, memory) {
    return crypto.createHash("sha256").update(JSON.stringify({
        messages: (Array.isArray(messages) ? messages : []).map((item) => String(item?.id || item?.messageId || "")),
        boundary: String(memory?.unifiedSessionCompaction?.receiptChecksum || memory?.unifiedSessionCompaction?.summaryChecksum || ""),
        workers: (Array.isArray(memory?.workerLedger) ? memory.workerLedger : []).map((item) => String(item?.taskId || item?.task_id || item?.id || "")).slice(-64),
    })).digest("hex");
}
function buildUnifiedCompactionReferenceForMock(messages, memory) {
    const text = (Array.isArray(messages) ? messages : []).map((item) => String(item?.content || "")).join("\n");
    const files = [...text.matchAll(/(?:src|backend|frontend)[\\/][A-Za-z0-9_.\\/-]+/g)].map(match => match[0]);
    return {
        primaryRequest: String(memory?.goal || messages?.find((item) => item?.role === "user")?.content || "").slice(0, 1600),
        userRequests: (messages || []).filter((item) => item?.role === "user").slice(0, 20).map((item) => String(item.content || "").slice(0, 1000)),
        keyOutcomes: (messages || []).filter((item) => item?.role === "assistant").slice(-20).map((item) => String(item.content || "").slice(0, 1000)),
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
async function runUnifiedGroupConversationMemory(input) {
    const groupId = String(input.groupId || "").trim();
    const groupSessionId = (0, group_compaction_hooks_1.exactHookLedgerSessionId)(String(input.groupSessionId || ""));
    if (!groupId || !groupSessionId)
        throw new Error("exact_group_session_required_for_group_memory_compaction");
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const memory = input.memory || {};
    const config = input.config || {};
    const generation = Number(memory?.unifiedSessionCompaction?.boundaryGeneration || 0);
    const canonical = (0, canonical_context_accounting_1.readCanonicalContextAccounting)("group", String(input.group?.id || input.groupId || input.scopeId || ""), groupSessionId);
    const request = (0, manual_session_compaction_1.normalizeManualCompactionRequest)(input.compactionRequest || input.partialCompact || {
        mode: "full",
        trigger: input.force ? "manual" : "auto",
        customInstructions: config.customInstructions || config.custom_instructions,
    }, {
        scope: "group",
        exactSessionId: `${groupId}:${groupSessionId}`,
        generation,
        payloadChecksum: String(canonical?.payloadChecksum || ""),
    });
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
            const sessionMemoryCursor = String(currentMemory.sessionMemory?.lastSummarizedMessageId || currentMemory.sessionMemory?.updateCadence?.lastExtractionMessageId || "");
            const sessionMemoryCursorIndex = sessionMemoryCursor
                ? currentMessages.findIndex((message) => String(message?.id || message?.uuid || message?.messageId || "") === sessionMemoryCursor)
                : -1;
            const rollingSessionMemory = currentMemory.sessionMemory?.rollingSessionMemory?.schema === "ccm-rolling-session-memory-v1"
                ? currentMemory.sessionMemory.rollingSessionMemory
                : currentMemory.sessionMemory?.modelExtracted === true
                    && currentMemory.sessionMemory?.hasSummary === true
                    && sessionMemoryCursorIndex >= 0
                    && currentMemory.conversationSummary
                    ? (0, rolling_session_memory_1.buildCcmRollingSessionMemoryV1)({
                        scope: "group",
                        exactSessionId: `${groupId}:${groupSessionId}`,
                        generation: Number(state.boundaryGeneration || 0),
                        summary: currentMemory.conversationSummary,
                        messages: currentMessages.slice(0, sessionMemoryCursorIndex + 1),
                        cadence: {
                            totalTokens: currentMemory.sessionMemory?.updateCadence?.tokensAtLastExtraction,
                            toolCallsSinceLastExtraction: currentMemory.sessionMemory?.updateCadence?.toolCallsSinceLastExtraction,
                        },
                        provider: currentMemory.sessionMemory?.modelExtractionReceipt?.provider,
                        model: currentMemory.sessionMemory?.modelExtractionReceipt?.model,
                    })
                    : null;
            return {
                scope: "group",
                exactSessionId: `${groupId}:${groupSessionId}`,
                messages: currentMessages,
                executionEvents: Array.isArray(currentMemory.executionEvents) ? currentMemory.executionEvents : [],
                activeSummary: currentMemory.unifiedSessionSummary || null,
                rollingSessionMemory,
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
            if (groupCompactionSourceChecksum(input.messages, input.memory) !== acquiredChecksum)
                throw new Error("group_compaction_fence_stale");
        },
        commit: (result, fence) => {
            assertGroupCompactionLifecycleFence(config, "commit_unified");
            if (groupCompactionSourceChecksum(input.messages, input.memory) !== fence.checksum)
                throw new Error("group_compaction_commit_fence_stale");
            const summary = result.fullCompaction.summary;
            if (!summary || summary.schema !== "ccm-unified-session-summary-v1")
                throw new Error("group_compaction_summary_missing");
            const summarizedMessageCount = result.partialCompaction?.direction === "from" ? 0 : result.preservedRecentWindow.startIndex;
            const summarizedThroughMessageId = summarizedMessageCount > 0
                ? String(result.snapshot.messages[Math.max(0, summarizedMessageCount - 1)]?.id || "")
                : "";
            const preservedRecentMessageIds = (result.partialCompaction?.preservedMessageIds || result.preservedRecentWindow.messages.map((item) => String(item?.id || ""))).map(String);
            const state = (0, unified_session_compaction_1.buildUnifiedSessionCompactionStateV1)({ receipt: result.receipt, summaryQuality: result.summaryQuality, microCompact: result.microCompact, recoveryContext: result.recoveryContext, triggerReason: input.force ? "manual" : "request_preflight", summarizedThroughMessageId, summarizedMessageCount, preservedRecentMessageIds, compactionMode: result.compactionMode, partialCompaction: result.partialCompaction });
            input.memory.unifiedSessionSummary = summary;
            input.memory.unifiedSessionCompaction = state;
            input.memory.unifiedRecoveryContext = result.recoveryContext;
            input.memory.unifiedSessionBoundary = {
                id: `unified-compact-${result.receipt.checksum.slice(0, 16)}`,
                type: input.force ? "manual" : "auto",
                summarizedMessageCount,
                summarizedThroughMessageId,
                preservedMessageIds: preservedRecentMessageIds,
                preservedRecentMessageIds,
                compactionMode: result.compactionMode || "full",
                partialCompaction: result.partialCompaction || null,
                compactMetadata: { trigger: input.force ? "manual" : "auto", mode: result.compactionMode || "full" },
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
        ? async (request) => {
            const reference = buildUnifiedCompactionReferenceForMock(messages, memory);
            return configuredMock({ ...request, user: `保真校验参考（最终摘要必须由模型生成并完整覆盖这些事实）：\n${JSON.stringify(reference)}\n\n本次被压缩区间内的全部用户消息\n${request.user}` });
        }
        : (request) => (0, unified_session_compaction_model_1.callUnifiedCompactionModel)(config, request.system, request.user, request.maxOutputTokens, {
            beforeRequest: ({ provider, model }) => { config.onCompactionActivity?.({ stage: "model_summary_request", provider, model, heartbeat: false }); },
        }));
    const engine = (0, unified_session_compaction_1.createUnifiedSessionCompactionEngine)({
        adapter,
        config,
        force: input.force || request.mode === "partial",
        reason: input.reason || (input.force ? "manual" : "request_preflight"),
        customInstructions: request.customInstructions || config.customInstructions || config.custom_instructions,
        request,
        modelCall,
        buildProjection: (snapshot) => (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
            scope: "group",
            sessionId: `${groupId}:${groupSessionId}`,
            system: config.modelVisibleSystemContext || config.model_visible_system_context || config.systemPrompt || config.system_prompt || null,
            tools: config.modelVisibleTools || config.model_visible_tools || null,
            activeSummary: snapshot.activeSummary,
            recentMessages: (0, session_execution_ledger_1.mergeConversationWithExecution)(snapshot.messages, snapshot.executionEvents),
            currentRequest: config.currentRequest || config.current_request || null,
            recoveryContext: snapshot.recoveryContext,
            hookResults: [],
            contextComponents: snapshot.contextComponents,
            mainAgentContextEnvelope: config.modelVisiblePayload?.mainAgentContextEnvelope || config.model_visible_payload?.mainAgentContextEnvelope,
            mainAgentCapabilityDirectory: config.modelVisiblePayload?.mainAgentCapabilityDirectory || config.model_visible_payload?.mainAgentCapabilityDirectory,
        }),
        buildPostCompactPayload: ({ summary, preservedTimeline, recoveryContext, snapshot }) => (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
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
            mainAgentContextEnvelope: config.modelVisiblePayload?.mainAgentContextEnvelope || config.model_visible_payload?.mainAgentContextEnvelope,
            mainAgentCapabilityDirectory: config.modelVisiblePayload?.mainAgentCapabilityDirectory || config.model_visible_payload?.mainAgentCapabilityDirectory,
        }),
        measure: (payload) => Number(payload?.totalTokens || (0, context_budget_1.estimateTextTokens)(JSON.stringify(payload || {}))),
        qualityReference: () => ({ authorizationBoundaries: [], fileReferences: [], verificationEvidence: [], pendingWork: [], sourceMessageIds: [] }),
        signal: config.compactionAbortSignal || config.compaction_abort_signal,
        compactionRunId: config.compactionRunId || config.compaction_run_id || config.compactionActivityOperationId || config.compaction_activity_operation_id,
        onLifecycle: (update) => {
            // The unified engine is the authority for deciding whether compaction
            // is actually required.  Forward its lifecycle only after that decision
            // so request-preflight measurement alone never creates a visible row.
            config.onCompactionLifecycle?.(update);
        },
    });
    let compacted;
    try {
        compacted = await engine.run();
    }
    catch (error) {
        // Keep the public group runner's failure projection stable while the
        // unified engine remains the only lifecycle implementation.
        if (error?.code === "CCM_UNIFIED_COMPACTION_POST_GATE_FAILED") {
            error.code = "GROUP_POST_COMPACT_THRESHOLD_EXCEEDED";
            const gate = error.postCompactGate || {};
            error.postCompactPayloadGate = {
                status: "recompact_required",
                action: "reduce_restored_context_before_child_dispatch",
                true_post_compact_token_count: Number(gate.afterTokens || 0),
                trigger_tokens: Number(gate.threshold || 0),
                formal_recompaction: { attempted: true, maxAttempts: 1 },
            };
        }
        throw error;
    }
    const displayMemory = { ...input.memory };
    return {
        success: true,
        compacted: compacted.compacted,
        reason: compacted.reason,
        memory: displayMemory,
        keepIndex: compacted.preservedRecentWindow.startIndex,
        messagesToCompact: compacted.partialCompaction
            ? messages.filter((message, index) => compacted.partialCompaction.summarizedMessageIds.includes(String(message?.id || message?.uuid || message?.messageId || `message-${index}`)))
            : messages.slice(0, compacted.preservedRecentWindow.startIndex),
        keptMessages: compacted.preservedRecentWindow.messages,
        boundary: compacted.compacted ? (input.memory.unifiedSessionBoundary || {
            id: `unified-compact-${compacted.receipt.checksum.slice(0, 16)}`,
            type: input.force ? "manual" : "auto",
            preservedMessageIds: compacted.preservedRecentWindow.messages.map((item) => String(item?.id || "")),
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
        compactionMode: compacted.compactionMode || "full",
        partialCompaction: compacted.partialCompaction || null,
        contentStored: false,
    };
}
async function compactGroupConversationMemory(input) {
    return runUnifiedGroupConversationMemory(input);
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
            && result.memory?.unifiedSessionCompaction?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
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
    const unifiedRecoveryAudit = result.memory?.unifiedSessionCompaction?.postCompactRecoveryAudit || {};
    const checkById = new Map((audit.checks || []).map((check) => [check.id, check]));
    const candidateCounts = audit.candidateCounts || {};
    const candidateTotal = ["files", "skills", "verification", "blockers"].reduce((sum, key) => sum + Number(candidateCounts[key] || 0), 0);
    const checks = {
        compacted: result.compacted === true,
        auditRecordedInCompaction: audit.schema === "ccm-post-compact-recovery-audit-v1" && audit.status === "pass" && audit.pass === true,
        auditRecordedInBoundary: boundaryAudit.schema === "ccm-post-compact-recovery-audit-v1" && boundaryAudit.summaryChecksum === audit.summaryChecksum,
        auditRecordedInUnifiedCompaction: unifiedRecoveryAudit.schema === "ccm-post-compact-recovery-audit-v1",
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