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
exports.readTaskSessionSourceHistory = readTaskSessionSourceHistory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
/** Report missing/raw-source boundaries while keeping the independent task
 * archive authoritative. Never silently substitute another conversation. */
function readTaskSessionSourceHistory(task) {
    const source = task.source_conversation_ref;
    if (!task.task_session_boundary_version || !source?.exactSessionId)
        return null;
    try {
        const file = source.scope === "project"
            ? require("../projects/sessions").getSessionFilePath(source.scopeId, source.exactSessionId)
            : source.scope === "group"
                ? require("./storage").getGroupChatSessionMessagesFile(source.scopeId, source.exactSessionId)
                : source.scope === "global" ? path.join(utils_1.CCM_DIR, "global-agent-history.json") : "";
        if (!file || !fs.existsSync(file))
            return { messages: [], state: { status: "unavailable", reason: "source_history_missing", archive_retained: true } };
        const raw = JSON.parse(fs.readFileSync(file, "utf8"));
        const session = source.scope === "global" ? raw.sessions?.find((row) => row.id === source.exactSessionId) : raw;
        if (!session)
            return { messages: [], state: { status: "unavailable", reason: "source_session_missing", archive_retained: true } };
        const messages = source.scope === "group" ? session : source.scope === "project" ? session.history : session.messages;
        if (!Array.isArray(messages))
            return { messages: [], state: { status: "unavailable", reason: "source_history_invalid", archive_retained: true } };
        const compacted = Number(session.unifiedSessionCompaction?.summarizedMessageCount || session.unifiedSessionBoundary?.summarizedMessageCount || 0);
        return { messages, state: { status: "available", reason: compacted ? "source_summary_present" : "source_history_available",
                summarized_message_count: compacted, archive_retained: true } };
    }
    catch {
        return { messages: [], state: { status: "unavailable", reason: "source_history_read_failed", archive_retained: true } };
    }
}
//# sourceMappingURL=task-session-source-history.js.map