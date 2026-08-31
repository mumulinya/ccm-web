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
exports.normalizeConversationIdentity = normalizeConversationIdentity;
exports.conversationIdentityKey = conversationIdentityKey;
exports.conversationIdentityDigest = conversationIdentityDigest;
exports.identityMatches = identityMatches;
const crypto = __importStar(require("crypto"));
function normalizeConversationIdentity(input) {
    const scope = input.scope === "group" || input.scope === "project" ? input.scope : "global";
    const exactSessionId = String(input.exactSessionId ?? input.sessionId ?? "").trim();
    let scopeId = String(input.scopeId ?? "").trim();
    if (scope === "global")
        scopeId = "global";
    if (!scopeId || !exactSessionId)
        return null;
    return { scope, scopeId, exactSessionId };
}
function conversationIdentityKey(input) {
    const identity = normalizeConversationIdentity(input);
    return identity ? `${identity.scope}\0${identity.scopeId}\0${identity.exactSessionId}` : "";
}
function conversationIdentityDigest(input) {
    return crypto.createHash("sha256").update(conversationIdentityKey(input)).digest("hex");
}
function identityMatches(left, right) {
    const a = normalizeConversationIdentity(left || {});
    const b = normalizeConversationIdentity(right || {});
    return !!a && !!b && a.scope === b.scope && a.scopeId === b.scopeId && a.exactSessionId === b.exactSessionId;
}
//# sourceMappingURL=conversation-identity.js.map