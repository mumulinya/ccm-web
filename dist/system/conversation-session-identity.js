"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversationSessionId = createConversationSessionId;
const crypto_1 = require("crypto");
/** Display titles may repeat; a newly created conversation must never reuse a deleted identity. */
function createConversationSessionId(scope) {
    const prefix = { project: 's_', group: 'gcs_', global: 'session_' }[scope];
    return prefix + (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=conversation-session-identity.js.map