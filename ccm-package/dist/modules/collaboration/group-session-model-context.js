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
exports.buildChildParentSessionContextPacket = exports.buildChildParentSessionContextProjection = void 0;
exports.buildExactGroupSessionModelContextProjection = buildExactGroupSessionModelContextProjection;
exports.buildExactGroupSessionModelContextPacket = buildExactGroupSessionModelContextPacket;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const session_memory_window_1 = require("../../system/session-memory-window");
const group_compaction_projections_1 = require("./group-compaction-projections");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
const storage_1 = require("./storage");
function modelContextMessageContent(message) {
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
function renderModelContextMessages(messages) {
    return (messages || []).map((message, index) => {
        const id = String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
        const role = String(message?.role || message?.type || "message");
        const actor = role === "user" ? "用户" : String(message?.agent || message?.target || role || "Agent");
        const timestamp = String(message?.timestamp || message?.created_at || message?.createdAt || "");
        return `[#${id}${timestamp ? ` ${timestamp}` : ""}] [${role}:${actor}]\n${modelContextMessageContent(message)}`;
    }).join("\n\n");
}
function buildExactGroupSessionModelContextProjection(messagesInput, memory, options = {}) {
    const groupId = String(options.groupId || options.group_id || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "");
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_model_context");
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
        preservedTokenCount: messages.reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0),
        preservedMessageCount: messages.length,
        preservedTextMessageCount: messages.filter((message) => modelContextMessageContent(message).trim()).length,
    };
    const visibleMessages = canonicalSummary ? messages.slice(recentWindow.startIndex) : messages;
    const summaryText = canonicalSummary ? JSON.stringify(memory.conversationSummary, null, 2) : "";
    const renderedMessages = renderModelContextMessages(visibleMessages);
    const mode = canonicalSummary ? "canonical_summary_recent_raw" : "precompact_full_raw";
    const rendered = [
        "【当前精确群聊会话连续性】",
        `- scope=${groupId}::${groupSessionId}`,
        `- mode=${mode}`,
        "- raw_transcript_preserved=true；本段不使用本地摘要、固定消息条数或字符截断。",
        canonicalSummary ? `- 正式摘要来源=${summarySource}；boundary_index=${boundaryIndex}` : "- 尚未发生正式模型压缩，以下为当前会话全部模型可见原文。",
        summaryText ? `\n【正式模型摘要】\n${summaryText}` : "",
        `\n【${canonicalSummary ? "压缩后近期完整原文" : "压缩前完整会话原文"} · ${visibleMessages.length}/${messages.length} 条】\n${renderedMessages || "（当前会话暂无文本消息）"}`,
    ].filter(Boolean).join("\n");
    return {
        schema: "ccm-exact-group-session-model-context-v1",
        version: 1,
        groupId,
        groupSessionId,
        mode,
        canonicalSummary,
        summarySource: canonicalSummary ? summarySource : "",
        summaryChecksum: String(memory?.compaction?.summaryChecksum || memory?.compactBoundary?.summaryChecksum || ""),
        boundaryGeneration: Number(memory?.compaction?.boundaryGeneration || memory?.compactBoundary?.generation || 0),
        totalMessageCount: messages.length,
        visibleMessageCount: visibleMessages.length,
        visibleMessageIds: visibleMessages.map((message, index) => String(message?.id || message?.uuid || message?.messageId || `message-${index}`)),
        visibleMessageTokens: visibleMessages.reduce((sum, message) => sum + (0, group_compaction_projections_1.estimateGroupMessageTokens)(message), 0),
        renderedTokens: (0, context_budget_1.estimateTextTokens)(rendered),
        transcriptChecksum: crypto.createHash("sha256").update(JSON.stringify(messages.map((message) => ({ id: message?.id || message?.uuid || "", role: message?.role || "", content: modelContextMessageContent(message) })))).digest("hex"),
        recentWindow,
        rendered,
    };
}
function buildExactGroupSessionModelContextPacket(groupId, options = {}) {
    const id = String(groupId || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(id));
    if (!id || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_model_context");
    return buildExactGroupSessionModelContextProjection((0, storage_1.getGroupMessages)(id, groupSessionId), (0, group_memory_storage_1.loadGroupMemory)(id, groupSessionId), { groupId: id, groupSessionId });
}
exports.buildChildParentSessionContextProjection = buildExactGroupSessionModelContextProjection;
exports.buildChildParentSessionContextPacket = buildExactGroupSessionModelContextPacket;
//# sourceMappingURL=group-session-model-context.js.map