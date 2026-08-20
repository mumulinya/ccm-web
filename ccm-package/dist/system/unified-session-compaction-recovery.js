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
exports.buildUnifiedRecoveryAttachment = buildUnifiedRecoveryAttachment;
exports.verifyUnifiedRecoveryAttachment = verifyUnifiedRecoveryAttachment;
const crypto = __importStar(require("crypto"));
const unified_session_compaction_1 = require("./unified-session-compaction");
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function buildUnifiedRecoveryAttachment(input) {
    const snapshot = input.snapshot;
    const taskBindings = [
        ...(Array.isArray(snapshot.recoveryContext?.taskBindings) ? snapshot.recoveryContext.taskBindings : []),
        ...(Array.isArray(snapshot.recoveryContext?.tasks) ? snapshot.recoveryContext.tasks : []),
    ];
    const planBindings = Array.isArray(snapshot.recoveryContext?.planBindings) ? snapshot.recoveryContext.planBindings : [];
    const base = (0, unified_session_compaction_1.buildUnifiedRecoveryContext)({
        scope: snapshot.scope,
        exactSessionId: snapshot.exactSessionId,
        taskBindings,
        planBindings,
        fileReferences: input.summary.fileReferences,
        verificationEvidence: input.summary.verificationEvidence,
        pendingActions: [...input.summary.pendingWork, ...input.summary.nextActions],
        permissionBoundary: String(snapshot.recoveryContext?.permissionBoundary || `${snapshot.scope}:${snapshot.exactSessionId}`),
    });
    return {
        schema: "ccm-unified-recovery-attachment-v1",
        scope: snapshot.scope,
        exactSessionId: snapshot.exactSessionId,
        unifiedRecoveryContext: base,
        provider: snapshot.providerUsage ? {
            provider: String(snapshot.providerUsage?.provider || ""),
            model: String(snapshot.providerUsage?.model || ""),
            checksum: checksum({ provider: snapshot.providerUsage?.provider, model: snapshot.providerUsage?.model }),
        } : null,
        skills: Array.isArray(snapshot.contextComponents?.skills) ? snapshot.contextComponents.skills.map((item) => ({ name: String(item?.name || item), checksum: String(item?.checksum || "") })).slice(-64) : [],
        mcp: Array.isArray(snapshot.contextComponents?.mcp) ? snapshot.contextComponents.mcp.map((item) => ({ name: String(item?.name || item), checksum: String(item?.checksum || "") })).slice(-64) : [],
        attachmentReferences: input.summary.attachmentReferences.slice(-64),
        contentStored: false,
        checksum: checksum({ base, provider: snapshot.providerUsage, skills: snapshot.contextComponents?.skills, mcp: snapshot.contextComponents?.mcp, attachments: input.summary.attachmentReferences }),
    };
}
function verifyUnifiedRecoveryAttachment(value, expected = {}) {
    const issues = [
        value?.schema !== "ccm-unified-recovery-attachment-v1" ? "schema_invalid" : "",
        expected.scope && value?.scope !== expected.scope ? "scope_mismatch" : "",
        expected.exactSessionId && value?.exactSessionId !== expected.exactSessionId ? "session_mismatch" : "",
        value?.contentStored !== false ? "content_storage_forbidden" : "",
        value?.unifiedRecoveryContext?.contentStored !== false ? "nested_content_storage_forbidden" : "",
    ].filter(Boolean);
    return { valid: issues.length === 0, issues };
}
//# sourceMappingURL=unified-session-compaction-recovery.js.map