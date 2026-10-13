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
exports.readConversationMessageRoute = readConversationMessageRoute;
exports.persistConversationMessageRoute = persistConversationMessageRoute;
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const directory = path.join(utils_1.CCM_DIR, "conversation-message-routes");
const hash = (value) => (0, crypto_1.createHash)("sha256").update(JSON.stringify(value)).digest("hex");
function readConversationMessageRoute(input) {
    if (!input.messageId)
        return null;
    const key = hash({ scope: input.scope, scopeId: input.scopeId || "", sessionId: input.exactSessionId, messageId: input.messageId });
    const record = (0, atomic_json_file_1.readJsonWithBackup)(path.join(directory, key.slice(0, 2), `${key}.json`), null);
    if (record && record.fingerprint !== hash(String(input.message || ""))) {
        throw Object.assign(new Error("同一消息身份不能提交不同内容"), { code: "CONVERSATION_MESSAGE_ID_CONFLICT", status: 409 });
    }
    return record;
}
/** Persist the association decision, never the user's message or model prompt. */
function persistConversationMessageRoute(input, route) {
    if (!input.messageId)
        return route;
    const identity = { scope: input.scope, scopeId: input.scopeId || "", sessionId: input.exactSessionId, messageId: input.messageId };
    const key = hash(identity);
    const file = path.join(directory, key.slice(0, 2), `${key}.json`);
    return (0, atomic_json_file_1.withFileLock)(`${file}.lock`, () => {
        const existing = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
        const fingerprint = hash(String(input.message || ""));
        if (existing) {
            if (existing.fingerprint !== fingerprint)
                throw Object.assign(new Error("同一消息身份不能提交不同内容"), { code: "CONVERSATION_MESSAGE_ID_CONFLICT" });
            const candidate = input.candidates.find((row) => row.id === existing.taskId) || null;
            if (existing.taskId && !candidate)
                return { ...route, decision: "needs_user", candidate: null, reason: "原消息绑定的任务已不可续接，请重新确认" };
            if (existing.taskId && ["done", "completed", "success"].includes(String(candidate?.status || ""))) {
                return { ...existing.route, decision: "needs_user", candidate, reason: "原任务已结束，请明确确认新的开发周期" };
            }
            return { ...existing.route, candidate };
        }
        const { candidate, ...projection } = route;
        const taskId = ["resume_task", "revise_task"].includes(route.decision) ? String(candidate?.id || "") : "";
        const record = { schema: "ccm-conversation-message-route-v1", key, ...identity, fingerprint, taskId, revision: 1, route: projection, createdAt: new Date().toISOString(), contentStored: false };
        (0, atomic_json_file_1.writeJsonAtomic)(file, record);
        return route;
    }, { timeoutMs: 10000, staleMs: 60000 });
}
//# sourceMappingURL=conversation-message-route-store.js.map