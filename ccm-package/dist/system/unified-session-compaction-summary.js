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
exports.UNIFIED_COMPACTION_SYSTEM_PROMPT = void 0;
exports.unifiedSummaryChecksum = unifiedSummaryChecksum;
exports.normalizeCcmUnifiedSummary = normalizeCcmUnifiedSummary;
exports.buildUnifiedSummaryReference = buildUnifiedSummaryReference;
exports.buildUnifiedSummaryPrompt = buildUnifiedSummaryPrompt;
exports.runUnifiedSummaryShapeCheck = runUnifiedSummaryShapeCheck;
const crypto = __importStar(require("crypto"));
const SUMMARY_KEYS = [
    "userGoals", "corrections", "decisions", "authorizationBoundaries",
    "completedWork", "pendingWork", "risksAndBlockers", "fileReferences",
    "verificationEvidence", "attachmentReferences", "nextActions", "sourceMessageIds",
];
function clean(value, max = 1000) {
    return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}
function list(value, max = 48) {
    const values = Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
    return [...new Set(values.map(item => clean(typeof item === "string" ? item : item?.path || item?.file || item?.summary || item?.title || item?.id || item, 1000)).filter(Boolean))].slice(-max);
}
function unifiedSummaryChecksum(summary) {
    return crypto.createHash("sha256").update(JSON.stringify(summary ?? null)).digest("hex");
}
function normalizeCcmUnifiedSummary(value, sourceMessageIds = []) {
    const candidate = value?.summary && typeof value.summary === "object" ? value.summary : value || {};
    const aliases = {
        userGoals: "userGoals", user_goals: "userGoals", primaryRequest: "userGoals", userRequests: "userGoals",
        corrections: "corrections", feedback: "corrections",
        decisions: "decisions",
        authorizationBoundaries: "authorizationBoundaries", authorization: "authorizationBoundaries", permissions: "authorizationBoundaries",
        completedWork: "completedWork", keyOutcomes: "completedWork", completed: "completedWork",
        pendingWork: "pendingWork", unresolved: "pendingWork", currentWork: "pendingWork",
        risksAndBlockers: "risksAndBlockers", risks: "risksAndBlockers", errors: "risksAndBlockers", blockers: "risksAndBlockers",
        fileReferences: "fileReferences", filesAndResources: "fileReferences", files: "fileReferences",
        verificationEvidence: "verificationEvidence", verification: "verificationEvidence", tests: "verificationEvidence",
        attachmentReferences: "attachmentReferences", attachments: "attachmentReferences",
        nextActions: "nextActions", nextSteps: "nextActions", next_actions: "nextActions",
        sourceMessageIds: "sourceMessageIds", source_message_ids: "sourceMessageIds",
    };
    const output = {
        schema: "ccm-unified-session-summary-v1",
        userGoals: [], corrections: [], decisions: [], authorizationBoundaries: [], completedWork: [],
        pendingWork: [], risksAndBlockers: [], fileReferences: [], verificationEvidence: [],
        attachmentReferences: [], nextActions: [], sourceMessageIds: [...new Set(sourceMessageIds.map(String).filter(Boolean))],
        contentStored: false,
    };
    for (const [key, target] of Object.entries(aliases)) {
        if (candidate[key] !== undefined)
            output[target] = [...output[target], ...list(candidate[key])];
    }
    for (const key of SUMMARY_KEYS)
        output[key] = [...new Set((output[key] || []).map(String).filter(Boolean))].slice(-64);
    if (sourceMessageIds.length)
        output.sourceMessageIds = [...new Set(sourceMessageIds.map(String).filter(Boolean))];
    return output;
}
function buildUnifiedSummaryReference(snapshot) {
    const messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
    const events = Array.isArray(snapshot.executionEvents) ? snapshot.executionEvents : [];
    const sourceMessageIds = messages.map((message, index) => String(message?.id || message?.uuid || message?.messageId || `message-${index}`));
    const text = messages.map(message => typeof message?.content === "string" ? message.content : JSON.stringify(message?.content ?? "")).join("\n");
    const files = [...text.matchAll(/(?:[A-Za-z]:[\\/]|\.\.?[\\/]|src[\\/]|backend[\\/]|frontend[\\/])[A-Za-z0-9_./\\-]+/g)].map(match => match[0]);
    const toolFiles = events.flatMap(event => {
        const payload = event?.payload || event?.result || {};
        return list(payload?.path || payload?.file || payload?.files || [], 20);
    });
    return normalizeCcmUnifiedSummary({
        ...(snapshot.activeSummary || {}),
        userGoals: messages.filter(message => message?.role === "user").slice(-8).map(message => message.content),
        fileReferences: [...files, ...toolFiles],
        sourceMessageIds,
    }, sourceMessageIds);
}
exports.UNIFIED_COMPACTION_SYSTEM_PROMPT = [
    "You are the CCM unified session compactor.",
    "Summarize only observed session facts for safe continuation.",
    "Preserve user goals, corrections, decisions, authorization boundaries, completed and pending work, risks, file references, verification evidence, attachments, and next actions.",
    "Do not expose hidden reasoning. Do not invent files, commands, results, permissions, or task state.",
    "Return one JSON object with the exact ccm-unified-session-summary-v1 fields.",
    "The source message boundary is authoritative and must be copied exactly.",
].join("\n");
function buildUnifiedSummaryPrompt(input) {
    const messages = (Array.isArray(input.snapshot?.messages) ? input.snapshot.messages : []).map((message) => ({
        id: message?.id || message?.uuid || message?.messageId,
        role: message?.role,
        content: typeof message?.content === "string" ? message.content : message?.content ?? null,
    }));
    return JSON.stringify({
        reason: input.reason || "automatic",
        customInstructions: clean(input.customInstructions, 2000),
        previousSummary: input.previousSummary || null,
        sourceMessageIds: messages.map((message) => String(message.id || "")),
        messages,
        executionEventCount: Array.isArray(input.snapshot?.executionEvents) ? input.snapshot.executionEvents.length : 0,
        recoveryContextPresent: Boolean(input.snapshot?.recoveryContext),
        PRESERVATION_REFERENCE: buildUnifiedSummaryReference(input.snapshot),
    });
}
function runUnifiedSummaryShapeCheck(summary) {
    const required = SUMMARY_KEYS.every(key => Array.isArray(summary?.[key]));
    return {
        valid: summary?.schema === "ccm-unified-session-summary-v1" && required && summary?.contentStored === false,
        missing: SUMMARY_KEYS.filter(key => !Array.isArray(summary?.[key])).map(String),
    };
}
//# sourceMappingURL=unified-session-compaction-summary.js.map