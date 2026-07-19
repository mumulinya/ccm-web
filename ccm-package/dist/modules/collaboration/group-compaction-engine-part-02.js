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
exports.calculateGroupProviderCalibratedContextTokens = calculateGroupProviderCalibratedContextTokens;
exports.compactGroupConversationMemory = compactGroupConversationMemory;
const crypto = __importStar(require("crypto"));
const session_compaction_core_1 = require("../../system/session-compaction-core");
const session_memory_window_1 = require("../../system/session-memory-window");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_hooks_1 = require("./group-compaction-hooks");
const group_compaction_projections_1 = require("./group-compaction-projections");
const group_compaction_strategy_1 = require("./group-compaction-strategy");
const group_compaction_engine_part_01_1 = require("./group-compaction-engine-part-01");
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
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
    });
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
        modelVisiblePayload: triggerPayload,
    });
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
    const warningOnlyMemory = {
        ...memory,
        compaction: {
            ...(previousState || {}),
            version: group_compaction_receipts_1.GROUP_MEMORY_COMPACTION_VERSION,
            enabled: true,
            contextPressureWarning: preCompactWarning,
            compactWarning: preCompactWarning,
            lastPressureSampleAt: now,
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
    const hookFactAnchors = (0, group_compaction_engine_part_01_1.extractHookAnchors)(preHookResults, "factAnchors", "dispatch_decision");
    const hookPersistentRequirements = (0, group_compaction_engine_part_01_1.extractHookAnchors)(preHookResults, "persistentRequirements", "user_requirement");
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
            const modelResult = await (0, group_compaction_engine_part_01_1.summarizeWithModel)(messagesToCompact, memory, fallback, {
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
    const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
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
    const finalModelVisiblePayload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
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
    });
    const sharedPostCompactGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({
        modelVisiblePayload: finalModelVisiblePayload,
        threshold: triggerTokens,
    });
    postCompactPayloadBudget = {
        ...postCompactPayloadBudget,
        true_post_compact_token_count: finalModelVisiblePayload.totalTokens,
        will_retrigger_next_turn: sharedPostCompactGate.providerCallAllowed !== true,
        payload_checksum: finalModelVisiblePayload.payloadChecksum,
        model_visible_payload: finalModelVisiblePayload,
        shared_post_compact_gate: sharedPostCompactGate,
    };
    if (sessionMemoryCompactSelection?.selected === true && postCompactPayloadBudget.will_retrigger_next_turn === true) {
        const error = new Error(`群聊 Session Memory 压缩后仍超过阈值：${Number(postCompactPayloadBudget.true_post_compact_token_count || 0)}/${triggerTokens}`);
        error.code = "GROUP_SESSION_MEMORY_POST_COMPACT_THRESHOLD_EXCEEDED";
        error.sessionMemoryCompactSelection = sessionMemoryCompactSelection;
        throw error;
    }
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
        model_visible_payload: finalModelVisiblePayload,
        shared_gate: sharedPostCompactGate,
    };
    if (postCompactPayloadGate.status === "recompact_required") {
        const error = new Error(`群聊会话压缩后仍超过阈值：${postCompactTokenCount}/${triggerTokens}`);
        error.code = "GROUP_POST_COMPACT_THRESHOLD_EXCEEDED";
        error.postCompactPayloadGate = postCompactPayloadGate;
        throw error;
    }
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
//# sourceMappingURL=group-compaction-engine-part-02.js.map