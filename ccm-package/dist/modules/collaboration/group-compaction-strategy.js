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
exports.buildGroupCompactWindowInvariants = buildGroupCompactWindowInvariants;
exports.buildGroupCompactStrategyDecision = buildGroupCompactStrategyDecision;
exports.resolvePartialCompactWindow = resolvePartialCompactWindow;
exports.buildGroupPtlEmergencyPlan = buildGroupPtlEmergencyPlan;
exports.buildGroupPtlRecoveryPlan = buildGroupPtlRecoveryPlan;
exports.getGroupAutoCompactThreshold = getGroupAutoCompactThreshold;
exports.resolveGroupModelContextCapacity = resolveGroupModelContextCapacity;
exports.getGroupEffectiveContextWindow = getGroupEffectiveContextWindow;
exports.calculateGroupCompactWarningState = calculateGroupCompactWarningState;
const crypto = __importStar(require("crypto"));
const model_capability_cache_1 = require("./model-capability-cache");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_projections_1 = require("./group-compaction-projections");
function buildGroupCompactWindowInvariants(input = {}) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const startIndex = Math.max(0, Math.min(messages.length, Number(input.startIndex || 0)));
    const keepIndex = Math.max(startIndex, Math.min(messages.length, Number(input.keepIndex ?? messages.length)));
    const compactedMessages = Array.isArray(input.messagesToCompact)
        ? input.messagesToCompact
        : messages.slice(startIndex, keepIndex);
    const keptMessages = Array.isArray(input.keptMessages)
        ? input.keptMessages
        : messages.slice(keepIndex);
    const compactedRefs = (0, group_compaction_projections_1.collectWindowBlockRefs)(compactedMessages, startIndex);
    const keptRefs = (0, group_compaction_projections_1.collectWindowBlockRefs)(keptMessages, keepIndex);
    const missingToolUses = [...keptRefs.toolResultIds].filter(id => !keptRefs.toolUseIds.has(id) && compactedRefs.toolUseIds.has(id));
    const splitThinkingMessageIds = [...keptRefs.thinkingMessageIds].filter(id => compactedRefs.thinkingMessageIds.has(id));
    const firstKeptTaskId = (0, group_compaction_projections_1.groupMessageTaskId)(keptMessages[0]);
    const previousTaskId = keepIndex > startIndex ? (0, group_compaction_projections_1.groupMessageTaskId)(messages[keepIndex - 1]) : "";
    const noSplitTaskTransactions = !firstKeptTaskId || firstKeptTaskId !== previousTaskId;
    const preservedSegment = input.preservedSegment || {};
    const preservedCount = Number(preservedSegment.preservedMessageCount || keptMessages.length || 0);
    const preservedTokens = Number(preservedSegment.preservedTokenEstimate || keptMessages.reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0));
    const minTokens = Number(preservedSegment.minTokens || input.minTokens || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_TOKENS);
    const minMessages = Number(preservedSegment.minTextBlockMessages || input.minMessages || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_MESSAGES);
    return {
        noSplitTaskTransactions,
        noSplitToolResultPairs: missingToolUses.length === 0,
        noSplitThinkingBlocks: splitThinkingMessageIds.length === 0,
        preservedRecentWindowRecorded: preservedSegment?.schema === "ccm-group-preserved-segment-v1" || keptMessages.length > 0,
        preservedTokenFloorSatisfied: preservedTokens >= Math.min(minTokens, Math.max(1, preservedTokens)),
        preservedMessageFloorSatisfied: preservedCount >= Math.min(minMessages, Math.max(1, preservedCount)),
        missingToolUseIds: missingToolUses.slice(0, 12),
        splitThinkingMessageIds: splitThinkingMessageIds.slice(0, 12),
        firstKeptTaskId,
        previousTaskId,
        compactedBlockCount: compactedRefs.rows.length,
        keptBlockCount: keptRefs.rows.length,
    };
}
function buildGroupCompactStrategyDecision(input = {}) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const keepIndex = Math.max(0, Math.min(messages.length, Number(input.keepIndex ?? messages.length)));
    const startIndex = Math.max(0, Math.min(keepIndex, Number(input.startIndex ?? Math.max(0, keepIndex - (Array.isArray(input.messagesToCompact) ? input.messagesToCompact.length : 0)))));
    const messagesToCompact = Array.isArray(input.messagesToCompact) ? input.messagesToCompact : messages.slice(startIndex, keepIndex);
    const keptMessages = Array.isArray(input.keptMessages) ? input.keptMessages : messages.slice(keepIndex);
    const partialCompact = input.partialCompact || null;
    const microCompact = input.microCompact || null;
    const ptlEmergency = input.ptlEmergency || null;
    const ptlRecovery = input.ptlRecovery || null;
    const compacted = input.compacted === true;
    const primaryCompact = input.primaryCompact !== false && messagesToCompact.length > 0;
    const preCompactTokenCount = Number(input.preCompactTokenCount || input.activeTokens || 0);
    const postCompactTokenEstimate = Number(input.postCompactTokenCount || input.postCompactTokenEstimate || 0);
    const triggerTokens = Number(input.triggerTokens || input.autoCompactThreshold || 0);
    const tokenPressurePercent = triggerTokens > 0
        ? Math.round((Number(input.activeTokens || preCompactTokenCount || 0) / triggerTokens) * 1000) / 10
        : null;
    const reasons = [];
    let mode = "normal_compact";
    if (!compacted) {
        mode = messagesToCompact.length <= 0 ? "recent_window_only" : "skip_below_threshold";
        reasons.push(messagesToCompact.length <= 0 ? "no eligible older messages beyond preserved window" : "below auto compact pressure threshold");
    }
    else if (input.sessionMemoryCompactSelection?.selected === true) {
        mode = "session_memory_reuse";
        reasons.push("verified exact-session Session Memory reused without a compaction API call");
    }
    else if (ptlEmergency?.engaged) {
        mode = "ptl_emergency";
        reasons.push(ptlEmergency.reason || "post compact token pressure still too high");
    }
    else if (ptlRecovery?.recovered) {
        mode = "ptl_recovery";
        reasons.push(ptlRecovery.reason || "previous PTL emergency recovered");
    }
    else if (partialCompact?.enabled && partialCompact?.sidecar === true && !primaryCompact) {
        mode = "partial_sidecar";
        reasons.push(partialCompact.reason || "manual partial sidecar keeps raw transcript unchanged");
    }
    else if (partialCompact?.enabled && partialCompact?.sidecar !== true) {
        mode = "partial_compact";
        reasons.push(partialCompact.reason || "manual partial compact selected a primary boundary");
    }
    else if (microCompact?.timeBased?.triggered || Number(microCompact?.compactedMessageCount || 0) > 0 || Number(microCompact?.tokensFreed || 0) > 0) {
        mode = "micro_compact";
        reasons.push(microCompact?.timeBased?.triggered ? "time based micro compact assisted primary summary" : "large agent output micro compact assisted primary summary");
    }
    else {
        reasons.push(input.force ? "manual compact requested" : input.reason || "auto compact selected session-memory style summary plus recent window");
    }
    if (input.force)
        reasons.push("force=true");
    if (input.preCompactWarning?.level)
        reasons.push(`pressure=${input.preCompactWarning.level}`);
    const preservedSegment = input.preservedSegment || (messages.length
        ? (0, group_compaction_projections_1.buildGroupPreservedSegment)(messages, keepIndex, {
            floorIndex: startIndex,
            summaryChecksum: input.summaryChecksum || "",
            transcriptPath: input.transcriptPath || "",
            now: input.now,
        })
        : null);
    const invariants = buildGroupCompactWindowInvariants({
        messages,
        messagesToCompact,
        keptMessages,
        startIndex,
        keepIndex,
        preservedSegment,
    });
    const base = {
        schema: "ccm-group-compact-strategy-decision-v1",
        version: group_compaction_receipts_1.GROUP_COMPACT_STRATEGY_DECISION_VERSION,
        decisionId: String(input.decisionId || `gcsd_${crypto.createHash("sha1").update([
            input.groupId || "",
            input.now || "",
            mode,
            startIndex,
            keepIndex,
            messages.length,
            input.summaryChecksum || "",
        ].join(":")).digest("hex").slice(0, 16)}`),
        groupId: String(input.groupId || ""),
        mode,
        strategy: "cc-session-memory-v3-compatible",
        compacted,
        primaryCompact,
        reason: (0, group_compaction_projections_1.compactText)(input.reason || reasons.filter(Boolean).join("; "), 700),
        reasons: reasons.filter(Boolean).map(item => (0, group_compaction_projections_1.compactText)(item, 240)).slice(0, 8),
        startIndex,
        keepIndex,
        activeMessageCount: Number(input.activeMessageCount ?? Math.max(0, messages.length - startIndex)),
        messagesToSummarize: messagesToCompact.length,
        keptMessages: keptMessages.length,
        summarizedFromMessageId: messagesToCompact.length ? (0, group_compaction_projections_1.messageIdentity)(messagesToCompact[0], startIndex) : "",
        summarizedThroughMessageId: messagesToCompact.length ? (0, group_compaction_projections_1.messageIdentity)(messagesToCompact[messagesToCompact.length - 1], keepIndex - 1) : "",
        firstKeptMessageId: keptMessages.length ? (0, group_compaction_projections_1.messageIdentity)(keptMessages[0], keepIndex) : "",
        lastKeptMessageId: keptMessages.length ? (0, group_compaction_projections_1.messageIdentity)(keptMessages[keptMessages.length - 1], messages.length - 1) : "",
        preCompactTokenCount,
        postCompactTokenEstimate,
        truePostCompactPayloadBudget: input.truePostCompactPayloadBudget || input.true_post_compact_payload_budget || null,
        postCompactPayloadGate: input.postCompactPayloadGate || input.post_compact_payload_gate || null,
        activeTokensBeforeCompact: Number(input.activeTokens || preCompactTokenCount || 0),
        triggerTokens,
        tokenPressurePercent,
        reductionRatio: preCompactTokenCount > 0 && postCompactTokenEstimate > 0
            ? Math.round(Math.max(0, 1 - postCompactTokenEstimate / preCompactTokenCount) * 1000) / 1000
            : null,
        sessionMemoryAvailable: input.sessionMemoryAvailable === true || !!input.sessionMemory?.schema || !!input.memory?.sessionMemory?.schema,
        sessionMemoryCompactSelection: input.sessionMemoryCompactSelection || null,
        preservedSegment,
        microCompact: microCompact ? {
            schema: microCompact.schema || "",
            recordCount: Number(microCompact.recordCount || 0),
            compactedMessageCount: Number(microCompact.compactedMessageCount || 0),
            tokensFreed: Number(microCompact.tokensFreed || 0),
            timeBasedTriggered: microCompact.timeBased?.triggered === true,
            timeBasedClearedCount: Number(microCompact.timeBased?.clearedCount || 0),
        } : null,
        partialCompact: partialCompact ? {
            requested: partialCompact.requested === true,
            enabled: partialCompact.enabled === true,
            sidecar: partialCompact.sidecar === true,
            direction: partialCompact.direction || "",
            reason: partialCompact.reason || "",
            selectedMessageId: partialCompact.selectedMessageId || "",
            summarizedThroughMessageId: partialCompact.summarizedThroughMessageId || "",
        } : null,
        ptlEmergency: ptlEmergency ? {
            engaged: ptlEmergency.engaged === true,
            emergencyLevel: ptlEmergency.emergencyLevel || "",
            reason: ptlEmergency.reason || "",
            messageDigestMaxChars: Number(ptlEmergency.messageDigestMaxChars || 0),
        } : null,
        ptlRecovery: ptlRecovery ? {
            recovered: ptlRecovery.recovered === true,
            reason: ptlRecovery.reason || "",
            restoredMessageDigestMaxChars: Number(ptlRecovery.restoredMessageDigestMaxChars || 0),
            contextBudgetPressure: ptlRecovery.contextBudgetPressure ?? null,
        } : null,
        transcriptPath: String(input.transcriptPath || ""),
        summaryChecksum: String(input.summaryChecksum || ""),
        invariants,
        invariantPass: Object.entries(invariants)
            .filter(([, value]) => typeof value === "boolean")
            .every(([, value]) => value === true),
        createdAt: input.now || new Date().toISOString(),
    };
    return {
        ...base,
        decisionChecksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 24),
    };
}
function resolvePartialCompactWindow(messages, previousBoundaryIndex, options = {}) {
    const request = options?.partialCompact || options?.groupPartialCompact || null;
    if (!request)
        return null;
    const startIndex = Math.max(0, Math.min(messages.length, previousBoundaryIndex + 1));
    const direction = String(request.direction || request.mode || "up_to").toLowerCase().replace(/[-\s]+/g, "_");
    const selectedMessageId = (0, group_compaction_projections_1.compactText)(request.messageId || request.throughMessageId || request.untilMessageId || "", 240);
    const base = {
        schema: "ccm-group-partial-compact-v1",
        version: group_compaction_receipts_1.GROUP_PARTIAL_COMPACT_VERSION,
        requested: true,
        enabled: false,
        supported: false,
        direction,
        startIndex,
        keepIndex: startIndex,
        selectedIndex: -1,
        selectedMessageId,
        sidecar: false,
        reason: (0, group_compaction_projections_1.compactText)(request.reason || "", 500),
    };
    if (!messages.length)
        return { ...base, reason: base.reason || "empty_messages" };
    let selectedIndex = -1;
    if (selectedMessageId) {
        selectedIndex = messages.findIndex((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, index) === selectedMessageId);
    }
    const rawIndex = request.index ?? request.messageIndex ?? request.throughIndex ?? request.untilIndex;
    const numericIndex = Number(rawIndex);
    if (selectedIndex < 0 && Number.isFinite(numericIndex) && numericIndex >= 0 && numericIndex < messages.length) {
        selectedIndex = Math.trunc(numericIndex);
    }
    const findRangeIndex = (idKeys, indexKeys, fallback = -1) => {
        for (const key of idKeys) {
            const id = (0, group_compaction_projections_1.compactText)(request[key], 240);
            if (!id)
                continue;
            const found = messages.findIndex((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, index) === id);
            if (found >= 0)
                return found;
        }
        for (const key of indexKeys) {
            const value = Number(request[key]);
            if (Number.isFinite(value) && value >= 0 && value < messages.length)
                return Math.trunc(value);
        }
        return fallback;
    };
    if (direction === "range" || direction === "from") {
        const rangeStart = findRangeIndex(["fromMessageId", "startMessageId", "messageId"], ["fromIndex", "startIndex", "index", "messageIndex"], selectedIndex);
        const rangeEnd = direction === "from"
            ? findRangeIndex(["throughMessageId", "untilMessageId", "toMessageId", "endMessageId"], ["throughIndex", "untilIndex", "toIndex", "endIndex"], messages.length - 1)
            : findRangeIndex(["throughMessageId", "untilMessageId", "toMessageId", "endMessageId", "messageId"], ["throughIndex", "untilIndex", "toIndex", "endIndex", "index", "messageIndex"], selectedIndex);
        if (rangeStart < 0 || rangeEnd < 0)
            return { ...base, reason: base.reason || "selected_message_not_found" };
        if (rangeEnd < rangeStart) {
            return {
                ...base,
                supported: true,
                selectedIndex: rangeStart,
                selectedMessageId: (0, group_compaction_projections_1.messageIdentity)(messages[rangeStart], rangeStart),
                sidecar: true,
                reason: base.reason || "invalid_range_end_before_start",
            };
        }
        return {
            ...base,
            enabled: true,
            supported: true,
            sidecar: true,
            primaryWindow: false,
            direction,
            selectedIndex: rangeStart,
            selectedMessageId: (0, group_compaction_projections_1.messageIdentity)(messages[rangeStart], rangeStart),
            rangeStartIndex: rangeStart,
            rangeEndIndex: rangeEnd,
            summarizedFromMessageId: (0, group_compaction_projections_1.messageIdentity)(messages[rangeStart], rangeStart),
            summarizedThroughMessageId: (0, group_compaction_projections_1.messageIdentity)(messages[rangeEnd], rangeEnd),
            summarizedMessageCount: rangeEnd - rangeStart + 1,
            keepIndex: startIndex,
            rawTranscriptUnmodified: true,
            reason: base.reason || `manual_partial_compact_${direction}_sidecar`,
        };
    }
    if (selectedIndex < 0)
        return { ...base, reason: base.reason || "selected_message_not_found" };
    const actualSelectedId = (0, group_compaction_projections_1.messageIdentity)(messages[selectedIndex], selectedIndex);
    if (direction !== "up_to") {
        return {
            ...base,
            selectedIndex,
            selectedMessageId: actualSelectedId,
            reason: base.reason || `unsupported_direction_${direction}`,
        };
    }
    if (selectedIndex < startIndex) {
        return {
            ...base,
            selectedIndex,
            selectedMessageId: actualSelectedId,
            reason: base.reason || "selected_message_before_current_boundary",
        };
    }
    const keepIndex = selectedIndex + 1;
    return {
        ...base,
        enabled: true,
        supported: true,
        direction: "up_to",
        keepIndex,
        selectedIndex,
        selectedMessageId: actualSelectedId,
        summarizedFromMessageId: messages[startIndex] ? (0, group_compaction_projections_1.messageIdentity)(messages[startIndex], startIndex) : "",
        summarizedThroughMessageId: actualSelectedId,
        preservedLaterMessageCount: Math.max(0, messages.length - keepIndex),
        reason: base.reason || "manual_partial_compact_up_to",
    };
}
function buildGroupPtlEmergencyPlan(input) {
    const config = input.config || {};
    const explicitlyEnabled = config.ptlEmergency === true
        || config.groupPtlEmergency === true
        || config.memoryPtlEmergency === true;
    const triggerTokens = Number(input.triggerTokens || 0);
    const postCompactTokenCount = Number(input.postCompactTokenCount || 0);
    const postRatio = triggerTokens > 0 ? postCompactTokenCount / triggerTokens : 0;
    const pressure = Number(input.contextBudget?.pressure || 0);
    const shouldEngage = explicitlyEnabled || postRatio >= 0.95 || pressure >= 100;
    if (!shouldEngage)
        return null;
    const emergencyLevel = explicitlyEnabled
        ? "forced"
        : postRatio >= 1 || pressure >= 100
            ? "critical"
            : "high";
    const messageDigestMaxChars = emergencyLevel === "critical" ? 6000 : emergencyLevel === "high" ? 8000 : 7000;
    const compactedIds = (input.messagesToCompact || []).map((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, Number(input.startIndex || 0) + index));
    const condensedMessageIds = compactedIds.length > 50
        ? [...compactedIds.slice(0, 24), ...compactedIds.slice(-24)]
        : compactedIds;
    const reason = explicitlyEnabled
        ? "forced_by_config"
        : pressure >= 100
            ? "context_budget_pressure_exhausted"
            : "post_compact_tokens_near_trigger";
    return {
        schema: "ccm-group-ptl-emergency-v1",
        version: group_compaction_receipts_1.GROUP_PTL_EMERGENCY_VERSION,
        engaged: true,
        emergencyLevel,
        reason,
        activeTokensBeforeCompact: Number(input.activeTokens || 0),
        triggerTokens,
        preCompactTokenCount: Number(input.preCompactTokenCount || 0),
        postCompactTokenCount,
        postCompactRatio: Math.round(postRatio * 1000) / 1000,
        contextBudgetPressure: pressure,
        summaryRenderMaxChars: messageDigestMaxChars,
        messageDigestMaxChars,
        rawTranscriptPath: input.transcriptPath,
        rawTranscriptUnmodified: true,
        compactedRange: {
            fromMessageId: input.messagesToCompact?.length
                ? (0, group_compaction_projections_1.messageIdentity)(input.messagesToCompact[0], Number(input.startIndex || 0))
                : "",
            throughMessageId: input.messagesToCompact?.length
                ? (0, group_compaction_projections_1.messageIdentity)(input.messagesToCompact[input.messagesToCompact.length - 1], Number(input.keepIndex || 1) - 1)
                : "",
            messageCount: input.messagesToCompact?.length || 0,
        },
        condensedMessageIds,
        omittedCondensedMessageIds: Math.max(0, compactedIds.length - condensedMessageIds.length),
        preservedRecentMessageIds: (input.keptMessages || []).slice(-40).map((message, index) => (0, group_compaction_projections_1.messageIdentity)(message, Number(input.keepIndex || 0) + Math.max(0, (input.keptMessages || []).length - 40) + index)),
        safeguards: [
            "raw_transcript_retained",
            "deterministic_summary_fallback",
            "quality_gate_checked",
            "fact_anchor_recovery",
            "typed_memory_recall_available",
        ],
        createdAt: input.now || new Date().toISOString(),
    };
}
function buildGroupPtlRecoveryPlan(input = {}) {
    const previous = input.previousPtlEmergency || input.previous_ptl_emergency || null;
    if (!previous?.engaged)
        return null;
    if (input.currentPtlEmergency?.engaged)
        return null;
    const config = input.config || {};
    const pressure = Number(input.contextBudget?.pressure || 0);
    const triggerTokens = Number(input.triggerTokens || previous.triggerTokens || 0);
    const postCompactTokenCount = Number(input.postCompactTokenCount || 0);
    const postRatio = triggerTokens > 0 ? postCompactTokenCount / triggerTokens : 0;
    const pressureThreshold = Math.max(20, Math.min(95, Number(config.ptlRecoveryPressure || config.ptl_recovery_pressure || 72)));
    const ratioThreshold = Math.max(0.2, Math.min(0.95, Number(config.ptlRecoveryRatio || config.ptl_recovery_ratio || 0.82)));
    const explicitlyForced = config.ptlRecover === true || config.ptlRecovery === true || config.groupPtlRecovery === true;
    const safe = explicitlyForced || (pressure <= pressureThreshold && postRatio <= ratioThreshold && input.contextBudget?.compact_recommended !== true);
    if (!safe)
        return null;
    return {
        schema: "ccm-group-ptl-recovery-v1",
        version: group_compaction_receipts_1.GROUP_PTL_RECOVERY_VERSION,
        recovered: true,
        reason: explicitlyForced ? "forced_by_config" : "context_pressure_back_in_safe_band",
        previousEmergencyLevel: previous.emergencyLevel || "",
        previousEmergencyReason: previous.reason || "",
        previousMessageDigestMaxChars: Number(previous.messageDigestMaxChars || previous.summaryRenderMaxChars || 0),
        restoredMessageDigestMaxChars: Number(input.restoredMessageDigestMaxChars || 14_000),
        triggerTokens,
        postCompactTokenCount,
        postCompactRatio: Math.round(postRatio * 1000) / 1000,
        contextBudgetPressure: pressure,
        pressureThreshold,
        ratioThreshold,
        summaryChecksum: input.summaryChecksum || "",
        rawTranscriptPath: input.transcriptPath || previous.rawTranscriptPath || "",
        rawTranscriptUnmodified: true,
        recoveredAt: input.now || new Date().toISOString(),
    };
}
function getGroupAutoCompactThreshold(config = {}) {
    const capacity = resolveGroupModelContextCapacity(config);
    const configuredThreshold = Number(config?.modelAutoCompactTokenLimit
        || config?.model_auto_compact_token_limit
        || config?.memoryAutoCompactTokenLimit
        || config?.memory_auto_compact_token_limit
        || 0);
    if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
        return Math.max(18_000, Math.min(Math.floor(configuredThreshold), capacity.effectiveContextWindow - group_compaction_receipts_1.GROUP_MANUAL_COMPACT_BUFFER_TOKENS));
    }
    return Math.max(18_000, capacity.effectiveContextWindow - group_compaction_receipts_1.GROUP_AUTOCOMPACT_BUFFER_TOKENS);
}
function resolveGroupModelContextCapacity(config = {}) {
    const capabilities = config?.modelCapabilities || config?.model_capabilities || {};
    const providerCapability = Number(capabilities?.max_input_tokens || capabilities?.context_window || 0) > 0
        ? {
            source: "explicit_provider_capability",
            contextWindow: Number(capabilities.max_input_tokens || capabilities.context_window),
            maxOutputTokens: Number(capabilities.max_output_tokens || group_compaction_receipts_1.GROUP_CONTEXT_RESERVED_TOKENS),
            verified: capabilities.verified === true,
            checkedAt: capabilities.checked_at || capabilities.checkedAt,
            expiresAt: capabilities.expires_at || capabilities.expiresAt,
            evidenceId: capabilities.evidence_id || capabilities.evidenceId,
        }
        : null;
    const capacity = (0, model_capability_cache_1.resolveTrustedModelContextCapacity)({
        provider: config?.provider || config?.agentProvider || config?.format || "group-main-agent",
        model: config?.model || "",
        modelContextWindow: config?.modelContextWindow
            || config?.model_context_window
            || config?.memoryContextWindowTokens
            || config?.contextWindowTokens
            || process.env.CCM_GROUP_CONTEXT_WINDOW_TOKENS,
        modelMaxOutputTokens: config?.modelMaxOutputTokens
            || config?.model_max_output_tokens
            || config?.maxOutputTokens,
        capacityCheckedAt: config?.modelCapacityCheckedAt || config?.model_capacity_checked_at,
        providerCapability,
        nativeExecutorReceipt: config?.nativeModelCapabilityReceipt || config?.native_model_capability_receipt,
    });
    const legacyReserve = Number(config?.memoryReservedTokens || config?.memory_reserved_tokens || 0);
    if (!(legacyReserve > 0))
        return capacity;
    const reservedOutputTokens = Math.min(capacity.contextWindow - 16_000, Math.max(0, legacyReserve));
    const effectiveContextWindow = Math.max(18_000, capacity.contextWindow - reservedOutputTokens);
    return {
        ...capacity,
        reservedOutputTokens,
        effectiveContextWindow,
        autoCompactBufferTokens: group_compaction_receipts_1.GROUP_AUTOCOMPACT_BUFFER_TOKENS,
        autoCompactThreshold: Math.max(18_000, effectiveContextWindow - group_compaction_receipts_1.GROUP_AUTOCOMPACT_BUFFER_TOKENS),
        reserveSource: "legacy_user_setting",
    };
}
function getGroupEffectiveContextWindow(config = {}) {
    return resolveGroupModelContextCapacity(config).effectiveContextWindow;
}
function calculateGroupCompactWarningState(input = {}) {
    const config = input.config || {};
    const tokenUsage = Math.max(0, Number(input.activeTokens ?? input.tokenUsage ?? input.token_usage ?? 0));
    const effectiveContextWindow = Number(input.effectiveContextWindow || input.effective_context_window || getGroupEffectiveContextWindow(config));
    const autoCompactThreshold = Math.max(1, Number(input.autoCompactThreshold || input.auto_compact_threshold || getGroupAutoCompactThreshold(config)));
    const warningBufferTokens = Number(config.groupWarningBufferTokens || config.warningBufferTokens || group_compaction_receipts_1.GROUP_WARNING_BUFFER_TOKENS);
    const errorBufferTokens = Number(config.groupErrorBufferTokens || config.errorBufferTokens || group_compaction_receipts_1.GROUP_ERROR_BUFFER_TOKENS);
    const manualCompactBufferTokens = Number(config.groupManualCompactBufferTokens || config.manualCompactBufferTokens || group_compaction_receipts_1.GROUP_MANUAL_COMPACT_BUFFER_TOKENS);
    const warningThreshold = Math.max(0, autoCompactThreshold - warningBufferTokens);
    const errorThreshold = Math.max(0, autoCompactThreshold - errorBufferTokens);
    const blockingOverride = Number(config.groupBlockingLimitTokens || config.blockingLimitTokens || process.env.CCM_GROUP_BLOCKING_LIMIT_TOKENS || 0);
    const blockingThreshold = blockingOverride > 0
        ? blockingOverride
        : Math.max(0, effectiveContextWindow - manualCompactBufferTokens);
    const percentLeft = Math.max(0, Math.round(((autoCompactThreshold - tokenUsage) / autoCompactThreshold) * 100));
    const isAboveWarningThreshold = tokenUsage >= warningThreshold;
    const isAboveErrorThreshold = tokenUsage >= errorThreshold;
    const isAboveAutoCompactThreshold = tokenUsage >= autoCompactThreshold;
    const isAtBlockingLimit = tokenUsage >= blockingThreshold;
    const suppressed = input.suppressed === true || input.suppress === true;
    const level = suppressed
        ? "suppressed"
        : isAtBlockingLimit
            ? "blocking"
            : isAboveAutoCompactThreshold
                ? "auto_compact"
                : isAboveErrorThreshold
                    ? "error"
                    : isAboveWarningThreshold
                        ? "warning"
                        : "ok";
    const recommendation = suppressed
        ? "suppress_warning_until_next_pressure_sample"
        : isAtBlockingLimit
            ? "block_new_context_until_compacted_or_ptl_recovered"
            : isAboveAutoCompactThreshold
                ? "auto_compact_now"
                : isAboveWarningThreshold
                    ? "compact_soon_or_reduce_raw_context"
                    : "continue";
    return {
        schema: "ccm-group-compact-warning-v1",
        version: 1,
        tokenUsage,
        activeMessageCount: Number(input.activeMessageCount || input.active_message_count || 0),
        percentLeft,
        level,
        recommendation,
        suppressed,
        suppressReason: suppressed ? (0, group_compaction_projections_1.compactText)(input.suppressReason || input.suppress_reason || "post_compaction_warning_suppression", 240) : "",
        thresholds: {
            effectiveContextWindow,
            autoCompactThreshold,
            warningThreshold,
            errorThreshold,
            blockingThreshold,
            autoCompactBufferTokens: group_compaction_receipts_1.GROUP_AUTOCOMPACT_BUFFER_TOKENS,
            warningBufferTokens,
            errorBufferTokens,
            manualCompactBufferTokens,
        },
        flags: {
            isAboveWarningThreshold,
            isAboveErrorThreshold,
            isAboveAutoCompactThreshold,
            isAtBlockingLimit,
        },
        createdAt: input.now || new Date().toISOString(),
    };
}
//# sourceMappingURL=group-compaction-strategy.js.map