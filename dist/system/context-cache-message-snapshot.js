"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextCacheMessageChecksum = contextCacheMessageChecksum;
exports.copyContextCacheMessages = copyContextCacheMessages;
const crypto_1 = require("crypto");
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
// This is a local materialization key, not a provider prefix key. All message
// fields matter here: tool_calls, structured content, attachments and future
// provider extensions must not silently reuse an older message snapshot.
function contextCacheMessageChecksum(message) {
    return (0, crypto_1.createHash)("sha256").update((0, workspace_model_result_projection_1.stableModelJson)(message)).digest("hex");
}
function copyContextCacheMessages(messages) {
    return structuredClone(messages);
}
//# sourceMappingURL=context-cache-message-snapshot.js.map