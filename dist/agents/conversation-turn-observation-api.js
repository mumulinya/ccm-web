"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConversationTurnObservationApi = handleConversationTurnObservationApi;
const utils_1 = require("../core/utils");
const conversation_attempt_1 = require("./conversation-attempt");
/** Read execution state without claiming, editing, retrying or settling a turn. */
function handleConversationTurnObservationApi(pathname, req, res, parsed, deps) {
    if (pathname !== '/api/conversation-turns/observation' || req.method !== 'GET')
        return false;
    try {
        const query = parsed?.query || {};
        const id = String(query.id || '').trim();
        if (!id || !query.scope || !query.conversation_id || !query.attempt_id) {
            return (0, utils_1.sendJson)(res, { success: false, error: '缺少会话执行标识', code: 'CONVERSATION_OBSERVATION_ID_REQUIRED' }, 400);
        }
        // Reuse resource and owner checks; knowledge of a turn ID grants no access.
        if (!deps.authorize(req, res, { id, operation: 'observe' }))
            return true;
        const turn = deps.get(id);
        if (!turn || turn.scope !== query.scope || turn.conversation_id !== query.conversation_id) {
            return (0, utils_1.sendJson)(res, { success: false, error: '当前会话中不存在这条消息', code: 'CONVERSATION_OBSERVATION_NOT_FOUND' }, 404);
        }
        (0, conversation_attempt_1.requireConversationAttempt)(turn, query, true);
        if (turn.kind !== 'user_message') {
            return (0, utils_1.sendJson)(res, { success: false, error: '请通过任务状态查看这项派发', code: 'CONVERSATION_OBSERVATION_KIND_UNSUPPORTED' }, 409);
        }
        const principal = req.ccmAuth;
        res.setHeader('Cache-Control', 'private, no-store');
        return (0, utils_1.sendJson)(res, { success: true, turn: deps.project(turn, principal?.kind === 'browser' ? String(principal.userId || '') : '', principal?.kind === 'browser' ? String(principal.role || '') : '') });
    }
    catch (error) {
        return (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error), code: error?.code || 'CONVERSATION_OBSERVATION_FAILED' }, Number(error?.statusCode || 400));
    }
}
//# sourceMappingURL=conversation-turn-observation-api.js.map