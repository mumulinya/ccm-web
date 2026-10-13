"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPreStartupConversationTurn = isPreStartupConversationTurn;
/** Startup may expose HTTP before recovery. New requests belong to this process. */
function isPreStartupConversationTurn(turn, createdBefore) {
    const createdAt = Date.parse(String(turn?.created_at || ''));
    return !Number.isFinite(createdBefore) || !Number.isFinite(createdAt) || createdAt <= createdBefore;
}
//# sourceMappingURL=conversation-startup-recovery.js.map