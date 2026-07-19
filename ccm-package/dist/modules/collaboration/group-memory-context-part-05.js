"use strict";
// Behavior-freeze split from group-memory-context.ts (part 5/5).
// Behavior-freeze module extracted mechanically from the former facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExactGroupSessionModelContextProjection = exports.buildExactGroupSessionModelContextPacket = exports.buildChildParentSessionContextProjection = exports.buildChildParentSessionContextPacket = void 0;
exports.buildGroupContextPacket = buildGroupContextPacket;
const group_memory_compaction_1 = require("./group-memory-compaction");
const storage_1 = require("./storage");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
const group_memory_context_part_01_1 = require("./group-memory-context-part-01");
var group_session_model_context_1 = require("./group-session-model-context");
Object.defineProperty(exports, "buildChildParentSessionContextPacket", { enumerable: true, get: function () { return group_session_model_context_1.buildChildParentSessionContextPacket; } });
Object.defineProperty(exports, "buildChildParentSessionContextProjection", { enumerable: true, get: function () { return group_session_model_context_1.buildChildParentSessionContextProjection; } });
Object.defineProperty(exports, "buildExactGroupSessionModelContextPacket", { enumerable: true, get: function () { return group_session_model_context_1.buildExactGroupSessionModelContextPacket; } });
Object.defineProperty(exports, "buildExactGroupSessionModelContextProjection", { enumerable: true, get: function () { return group_session_model_context_1.buildExactGroupSessionModelContextProjection; } });
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