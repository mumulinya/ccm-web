"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONVERSATION_SEARCH_DIRTY_META_KEY = void 0;
exports.markConversationSearchIndexDirty = markConversationSearchIndexDirty;
exports.conversationSearchDirtyState = conversationSearchDirtyState;
exports.clearConversationSearchIndexDirty = clearConversationSearchIndexDirty;
const observability_database_1 = require("./observability-database");
exports.CONVERSATION_SEARCH_DIRTY_META_KEY = "conversation_search_dirty_v3";
function markConversationSearchIndexDirty(reason = "conversation_changed") {
    (0, observability_database_1.setObservabilityMeta)(exports.CONVERSATION_SEARCH_DIRTY_META_KEY, {
        dirty: true,
        reason: String(reason || "conversation_changed").slice(0, 160),
        at: new Date().toISOString(),
    });
}
function conversationSearchDirtyState(fallback = null) {
    return (0, observability_database_1.observabilityMeta)(exports.CONVERSATION_SEARCH_DIRTY_META_KEY, fallback);
}
function clearConversationSearchIndexDirty(value) {
    (0, observability_database_1.setObservabilityMeta)(exports.CONVERSATION_SEARCH_DIRTY_META_KEY, { dirty: false, ...value });
}
//# sourceMappingURL=conversation-search-dirty.js.map