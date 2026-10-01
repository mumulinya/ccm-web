"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDeletedSessionContext = clearDeletedSessionContext;
const pre_request_tool_context_1 = require("./pre-request-tool-context");
const post_turn_tool_context_compaction_1 = require("./post-turn-tool-context-compaction");
const provider_neutral_context_cache_1 = require("./provider-neutral-context-cache");
/** Keep audit receipts, but revoke the exact conversation's recoverable model context. */
function clearDeletedSessionContext(scope, scopeId, sessionId) {
    (0, pre_request_tool_context_1.deletePreRequestToolContextState)(scope, scopeId, sessionId);
    (0, post_turn_tool_context_compaction_1.deletePostTurnToolContextState)(scope, scopeId, sessionId);
    const result = (0, provider_neutral_context_cache_1.invalidateProviderNeutralContextCacheState)({ scope, scopeId, sessionId }, 'session_deleted');
    // Older global requests used the session ID as their scope ID.
    if (scope === 'global' && scopeId !== sessionId) {
        (0, pre_request_tool_context_1.deletePreRequestToolContextState)(scope, sessionId, sessionId);
        (0, post_turn_tool_context_compaction_1.deletePostTurnToolContextState)(scope, sessionId, sessionId);
        (0, provider_neutral_context_cache_1.invalidateProviderNeutralContextCacheState)({ scope, scopeId: sessionId, sessionId }, 'session_deleted');
    }
    return result;
}
//# sourceMappingURL=deleted-session-context.js.map