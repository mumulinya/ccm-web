"use strict";
// Behavior-freeze split from group-memory-context.ts (part 5/5).
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.buildChildParentSessionContextProjection = buildChildParentSessionContextProjection;
exports.buildChildParentSessionContextPacket = buildChildParentSessionContextPacket;
exports.buildGroupContextPacket = buildGroupContextPacket;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const session_memory_window_1 = require("../../system/session-memory-window");
const group_memory_compaction_1 = require("./group-memory-compaction");
const storage_1 = require("./storage");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
const group_memory_context_part_01_1 = require("./group-memory-context-part-01");
function childParentSessionMessageContent(message) {
    const value = message?.content ?? message?.message?.content ?? message?.text ?? "";
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value || "");
    }
}
function renderChildParentSessionMessages(messages) {
    return (messages || []).map((message, index) => {
        const id = String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
        const role = String(message?.role || message?.type || "message");
        const actor = role === "user" ? "用户" : String(message?.agent || message?.target || role || "Agent");
        const timestamp = String(message?.timestamp || message?.created_at || message?.createdAt || "");
        return `[#${id}${timestamp ? ` ${timestamp}` : ""}] [${role}:${actor}]\n${childParentSessionMessageContent(message)}`;
    }).join("\n\n");
}
function buildChildParentSessionContextProjection(messagesInput, memory, options = {}) {
    const id = String(options.groupId || options.group_id || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "");
    if (!id || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_child_parent_context");
    const messages = (Array.isArray(messagesInput) ? messagesInput : [])
        .filter((message) => !String(message?.content || "").startsWith("📤"));
    const summarySource = String(memory?.compaction?.summarySource || memory?.compaction?.summary_source || "").toLowerCase();
    const canonicalSummary = ["model", "session-memory", "session_memory"].includes(summarySource)
        && !!memory?.conversationSummary;
    const boundaryIndex = canonicalSummary ? (0, group_memory_shared_1.getCompactBoundaryIndex)(memory, messages) : -1;
    const recentWindow = canonicalSummary ? (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(messages, {
        floorIndex: Math.max(0, boundaryIndex + 1),
        lastSummarizedMessageId: String(memory?.sessionMemory?.lastSummarizedMessageId
            || memory?.sessionMemory?.last_summarized_message_id
            || memory?.compaction?.sessionMemoryState?.lastExtractedMessageId
            || ""),
    }) : {
        startIndex: 0,
        preservedTokenCount: messages.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0),
        preservedMessageCount: messages.length,
        preservedTextMessageCount: messages.filter((message) => childParentSessionMessageContent(message).trim()).length,
    };
    const visibleMessages = canonicalSummary ? messages.slice(recentWindow.startIndex) : messages;
    const summaryText = canonicalSummary ? JSON.stringify(memory.conversationSummary, null, 2) : "";
    const renderedMessages = renderChildParentSessionMessages(visibleMessages);
    const mode = canonicalSummary ? "canonical_summary_recent_raw" : "precompact_full_raw";
    const rendered = [
        "【当前精确群聊会话连续性】",
        `- scope=${id}::${groupSessionId}`,
        `- mode=${mode}`,
        `- raw_transcript_preserved=true；本段不使用本地摘要、固定消息条数或字符截断。`,
        canonicalSummary ? `- 正式摘要来源=${summarySource}；boundary_index=${boundaryIndex}` : "- 尚未发生正式模型压缩，以下为当前会话全部模型可见原文。",
        summaryText ? `\n【正式模型摘要】\n${summaryText}` : "",
        `\n【${canonicalSummary ? "压缩后近期完整原文" : "压缩前完整会话原文"} · ${visibleMessages.length}/${messages.length} 条】\n${renderedMessages || "（当前会话暂无文本消息）"}`,
    ].filter(Boolean).join("\n");
    return {
        schema: "ccm-child-parent-session-context-v1",
        version: 1,
        groupId: id,
        groupSessionId,
        mode,
        canonicalSummary,
        summarySource: canonicalSummary ? summarySource : "",
        summaryChecksum: String(memory?.compaction?.summaryChecksum || memory?.compactBoundary?.summaryChecksum || ""),
        boundaryGeneration: Number(memory?.compaction?.boundaryGeneration || memory?.compactBoundary?.generation || 0),
        totalMessageCount: messages.length,
        visibleMessageCount: visibleMessages.length,
        visibleMessageIds: visibleMessages.map((message, index) => String(message?.id || message?.uuid || message?.messageId || `message-${index}`)),
        visibleMessageTokens: visibleMessages.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0),
        renderedTokens: (0, context_budget_1.estimateTextTokens)(rendered),
        transcriptChecksum: crypto.createHash("sha256").update(JSON.stringify(messages.map((message) => ({ id: message?.id || message?.uuid || "", role: message?.role || "", content: childParentSessionMessageContent(message) })))).digest("hex"),
        recentWindow,
        rendered,
    };
}
function buildChildParentSessionContextPacket(groupId, options = {}) {
    const id = String(groupId || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(id));
    if (!id || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_child_parent_context");
    return buildChildParentSessionContextProjection((0, storage_1.getGroupMessages)(id, groupSessionId), (0, group_memory_storage_1.loadGroupMemory)(id, groupSessionId), { groupId: id, groupSessionId });
}
function buildGroupContextPacket(groupId, options = {}) {
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || 12));
    const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || 30));
    const fullCount = Math.max(3, Number(options.fullCount || options.full_count || 5));
    const allMessages = (0, storage_1.getGroupMessages)(groupId, groupSessionId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const resumePreparation = (0, group_memory_context_part_01_1.prepareGroupMemoryResumeProjection)(groupId, groupSessionId, allMessages, (0, group_memory_storage_1.loadGroupMemory)(groupId, groupSessionId), {
        groupSessionId,
        recentLimit,
        olderLimit
    });
    const snapshotMemory = resumePreparation.memory;
    const resumeProjection = resumePreparation.projection || {};
    const rawRecentMessages = resumeProjection.useProjection === true
        ? (resumeProjection.projectedMessages || [])
        : allMessages.slice(-recentLimit);
    const timeBasedMicrocompactConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)(options.compactionConfig || options.compaction_config || {});
    const timeBasedToolResultProjection = (0, group_memory_compaction_1.buildGroupTimeBasedToolResultProjection)(rawRecentMessages, {
        groupId,
        groupSessionId,
        querySource: "group_main_thread:context_packet",
        enabled: options.timeBasedMicrocompactEnabled ?? options.time_based_microcompact_enabled ?? timeBasedMicrocompactConfig.timeBasedMicrocompactEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        keepRecent: options.timeBasedMicrocompactKeepRecent || options.time_based_microcompact_keep_recent || timeBasedMicrocompactConfig.timeBasedMicrocompactKeepRecent,
        now: options.now
    });
    const mainCompactEpoch = (0, group_memory_compaction_1.buildGroupCompactEpoch)(String(snapshotMemory.compactBoundary?.boundaryId
        || snapshotMemory.compactBoundary?.boundary_id
        || snapshotMemory.compaction?.boundaryId
        || snapshotMemory.compaction?.boundary_id
        || ""));
    const timeBasedThinkingProjection = (0, group_memory_compaction_1.buildGroupTimeBasedThinkingProjection)(timeBasedToolResultProjection.messages, {
        groupId,
        groupSessionId,
        compactEpoch: mainCompactEpoch,
        querySource: "group_main_thread:context_packet",
        enabled: options.timeBasedThinkingClearEnabled ?? options.time_based_thinking_clear_enabled ?? timeBasedMicrocompactConfig.timeBasedThinkingClearEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        priorReceipt: snapshotMemory.compaction?.timeBasedThinkingProjection || snapshotMemory.messageCompression?.timeBasedThinkingProjection || null,
        isRedactThinkingActive: options.isRedactThinkingActive === true || options.is_redact_thinking_active === true,
        now: options.now
    });
    const recentMessages = timeBasedThinkingProjection.messages;
    const olderMessages = resumeProjection.useProjection === true
        ? allMessages.slice(0, Number(resumeProjection.omittedMessageCount || 0))
        : allMessages.slice(0, Math.max(0, allMessages.length - recentLimit));
    const fallbackDigest = (0, group_memory_shared_1.buildCompressedGroupMessageDigest)(olderMessages, olderLimit);
    const digest = snapshotMemory.messageDigest || fallbackDigest;
    const compression = {
        enabled: true,
        strategy: snapshotMemory.messageCompression?.strategy || "cc-session-memory-v3-sync",
        recentLimit,
        olderLimit,
        totalMessages: allMessages.length,
        compressedMessages: snapshotMemory.messageCompression?.compressedMessages ?? olderMessages.length,
        recentMessages: recentMessages.length,
        preCompactTokenCount: snapshotMemory.messageCompression?.preCompactTokenCount || 0,
        postCompactTokenCount: snapshotMemory.messageCompression?.postCompactTokenCount || 0,
        lastCompressedAt: new Date().toISOString()
    };
    const memory = (0, group_memory_storage_1.saveGroupMemory)(groupId, {
        ...snapshotMemory,
        messageDigest: digest,
        compaction: {
            ...(snapshotMemory.compaction || {}),
            ...(timeBasedToolResultProjection.applied ? { timeBasedToolResultProjection: timeBasedToolResultProjection.receipt } : {}),
            ...(timeBasedThinkingProjection.shouldPersist ? { timeBasedThinkingProjection: timeBasedThinkingProjection.receipt } : {})
        },
        messageCompression: {
            ...compression,
            ...(timeBasedToolResultProjection.applied ? { timeBasedToolResultProjection: timeBasedToolResultProjection.receipt } : {}),
            ...(timeBasedThinkingProjection.shouldPersist ? { timeBasedThinkingProjection: timeBasedThinkingProjection.receipt } : {})
        }
    }, groupSessionId, {
        sessionMemoryCadenceDecision: snapshotMemory.sessionMemory?.updateCadence || null
    });
    const sections = [(0, group_memory_context_part_01_1.buildGroupMemoryContext)(memory)];
    if (resumeProjection.schema) {
        const resumeBaseline = resumePreparation.resumeBaseline || snapshotMemory.compaction?.resumeEffectiveTokenBaseline || null;
        sections.push([
            "会话恢复投影：",
            `- status=${resumeProjection.status || "unknown"}; verified=${resumeProjection.verified === true}; recovered=${resumePreparation.recovered === true}; raw=${allMessages.length}; prefix_omitted=${resumeProjection.omittedMessageCount || 0}; snip_omitted=${resumeProjection.snipOmittedMessageCount || 0}; projected=${resumeProjection.projectedMessageCount || recentMessages.length}`,
            `- boundary=${resumeProjection.boundary?.boundaryId || "none"}; journal=${resumeProjection.journal?.file || "none"}; proof=${resumePreparation.proof?.proofId || "none"}`,
            resumeProjection.roundTripConsistency?.schema
                ? `- round_trip status=${resumeProjection.roundTripConsistency.status || "unknown"}; expected=${resumeProjection.roundTripConsistency.expectedActiveMessageCount || 0}; actual=${resumeProjection.roundTripConsistency.actualActiveMessageCount || 0}; delta=${resumeProjection.roundTripConsistency.delta || 0}; checksum=${resumeProjection.roundTripConsistency.checksum || "none"}`
                : "",
            resumePreparation.compactHeadRecovery?.schema
                ? `- compact_head_recovery status=${resumePreparation.compactHeadRecovery.status || "unknown"}; recovered=${resumePreparation.compactHeadRecovery.recovered === true}; prior_generation=${resumePreparation.compactHeadRecovery.priorHeadGeneration || 0}; current_generation=${resumePreparation.compactHeadRecovery.head?.generation || 0}`
                : "",
            resumeBaseline?.schema
                ? `- tokens raw=${resumeBaseline.rawTranscriptTokens || 0}; prefix_omitted=${resumeBaseline.omittedRawTokens || 0}; snip_removed=${resumeBaseline.snipRemovedMessageCount || 0}/${resumeBaseline.snipRemovedTokenEstimate || 0}; summary=${resumeBaseline.summaryTokens || 0}; projected=${resumeBaseline.projectedMessageTokens || 0}; effective=${resumeBaseline.effectiveContextTokens || 0}; stale_usage_excluded=${resumeBaseline.staleProviderUsageTokensExcluded || 0}; baseline=${resumeBaseline.baselineId || "none"}`
                : "",
        ].join("\n"));
    }
    if (digest) {
        sections.push([
            "群聊旧消息压缩摘要（旧消息不直接塞满上下文；需要回溯时按 message id 查原始记录）：",
            digest,
        ].join("\n"));
    }
    if (recentMessages.length) {
        sections.push([
            `群聊近期原文窗口（最近 ${recentMessages.length}/${allMessages.length} 条，最后 ${Math.min(fullCount, recentMessages.length)} 条保留全文）：`,
            (0, group_memory_compaction_1.buildBoundedRecentGroupContext)(recentMessages, fullCount),
        ].join("\n"));
    }
    if (timeBasedToolResultProjection.receipt.enabled) {
        const receipt = timeBasedToolResultProjection.receipt;
        sections.push(`时间触发 microcompact：status=${receipt.status}; gap=${receipt.gap_minutes}/${receipt.gap_threshold_minutes}min; tool_results cleared=${receipt.cleared_tool_result_count}, kept=${receipt.kept_tool_count}; tokens_saved=${receipt.tokens_saved}; raw_transcript_preserved=true。`);
    }
    if (timeBasedThinkingProjection.receipt.enabled) {
        const receipt = timeBasedThinkingProjection.receipt;
        sections.push(`时间触发 thinking clear：status=${receipt.status}; latched=${receipt.latched === true}; compact_epoch=${receipt.compact_epoch}; thinking_turns cleared=${receipt.cleared_thinking_turn_count}, kept=${receipt.kept_thinking_turn_count}; tokens_saved=${receipt.tokens_saved}; raw_transcript_preserved=true。`);
    }
    const rendered = sections.filter(Boolean).join("\n\n");
    const postCompactPayloadGate = memory.compaction?.postCompactPayloadGate
        || memory.messageCompression?.postCompactPayloadGate
        || memory.compactBoundary?.postCompactPayloadGate
        || memory.compactBoundary?.post_compact_restore?.postCompactPayloadGate
        || null;
    if (postCompactPayloadGate?.status !== "recompact_required")
        return rendered;
    return (0, group_memory_shared_1.compactPreserveLines)(rendered, Math.max(4000, Number(postCompactPayloadGate.safe_render_chars || 6000)));
}
//# sourceMappingURL=group-memory-context-part-05.js.map