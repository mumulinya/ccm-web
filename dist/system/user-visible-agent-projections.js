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
exports.publishUserVisibleAssistantText = publishUserVisibleAssistantText;
exports.projectCommittedGroupCompaction = projectCommittedGroupCompaction;
const crypto = __importStar(require("crypto"));
const user_visible_agent_events_1 = require("./user-visible-agent-events");
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function publishUserVisibleAssistantText(input) {
    const text = String(input.text || "");
    if (!text || !input.scopeId || !input.exactSessionId)
        return null;
    try {
        return (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
            eventId: `${input.scope}:assistant-delta:${input.turnId || checksum([input.taskId, text]).slice(0, 20)}`,
            eventType: "assistant_text_delta",
            scope: input.scope,
            scopeId: input.scopeId,
            exactSessionId: input.exactSessionId,
            generation: Math.max(0, Number(input.generation || 0)),
            taskId: input.taskId,
            display: {
                title: input.title || "Agent 回复",
                summary: text,
                status: "running",
            },
            visibility: "default",
        });
    }
    catch {
        return null;
    }
}
function projectCommittedGroupCompaction(input) {
    const result = input.result || {};
    if (result.compacted !== true || !input.groupId || !input.exactSessionId)
        return null;
    const boundary = result.boundary || {};
    const boundaryId = String(boundary.id || checksum([input.groupId, input.exactSessionId, boundary]).slice(0, 24));
    const restoredTokens = Number(boundary?.post_compact_restore?.dynamicContextRestoreReceipt?.restoredTokens
        || boundary?.dynamicContextRestoreReceipt?.restoredTokens
        || result?.memory?.compaction?.dynamicContextRestoreReceipt?.restoredTokens
        || 0);
    try {
        return (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            eventId: `group:${input.groupId}:${input.exactSessionId}:compacted:${boundaryId}`,
            eventType: "context_compacted",
            scope: "group",
            scopeId: input.groupId,
            exactSessionId: input.exactSessionId,
            generation: Math.max(0, Number(boundary.boundaryGeneration || boundary.generation || 0)),
            display: {
                title: "上下文已压缩",
                target: "群聊主 Agent",
                summary: restoredTokens > 0 ? `已从权威来源恢复 ${restoredTokens} tokens` : "已保留摘要并继续当前会话",
                status: "success",
                tokenCount: restoredTokens || undefined,
            },
            result: {
                boundaryId,
                boundaryChecksum: checksum(boundary),
                restoredTokens,
                reason: String(input.reason || "automatic"),
                contentStored: false,
            },
            visibility: "transcript",
        });
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=user-visible-agent-projections.js.map