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
exports.loadPostTurnToolContextState = loadPostTurnToolContextState;
exports.deletePostTurnToolContextState = deletePostTurnToolContextState;
exports.compactConsumedToolResultsAfterTurn = compactConsumedToolResultsAfterTurn;
exports.verifyPostTurnToolContextCompactionReceipt = verifyPostTurnToolContextCompactionReceipt;
exports.runPostTurnToolContextCompactionSelfTest = runPostTurnToolContextCompactionSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
function digest(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function safePart(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100) || "unknown";
}
function stateFile(scope, scopeId, exactSessionId) {
    return path.join(utils_1.CCM_DIR, "context-projections", "tool-evidence", safePart(scope), `${safePart(scopeId)}-${digest(scopeId).slice(0, 12)}`, `${safePart(exactSessionId)}-${digest(exactSessionId).slice(0, 12)}.json`);
}
function loadPostTurnToolContextState(scope, scopeId, exactSessionId) {
    try {
        const parsed = JSON.parse(fs.readFileSync(stateFile(scope, scopeId, exactSessionId), "utf8"));
        if (parsed?.schema !== "ccm-post-turn-tool-context-state-v1")
            return null;
        if (parsed.scope !== scope || parsed.scopeId !== scopeId || parsed.exactSessionId !== exactSessionId)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
function deletePostTurnToolContextState(scope, scopeId, exactSessionId) {
    const file = stateFile(scope, scopeId, exactSessionId);
    try {
        fs.rmSync(file, { force: true });
    }
    catch { }
    return { deleted: !fs.existsSync(file), contentStored: false };
}
/** @deprecated Read-only compatibility stub. It intentionally never writes or replaces model content. */
function compactConsumedToolResultsAfterTurn(input) {
    const results = (Array.isArray(input.executionEvents) ? input.executionEvents : [])
        .filter(event => event.type === "tool_result" && event.toolCallId);
    const lastProviderRequestTokens = Math.max(0, Number(input.lastProviderRequestTokens || 0));
    const retentionMetrics = {
        schema: "ccm-context-retention-metrics-v1",
        retentionStrategy: "dynamic_scope_pressure",
        contextPressure: false,
        recentCompletedTurnLimit: 0,
        recentToolResultBudgetTokens: 0,
        retainedRecentToolResultTokens: 0,
        lastProviderRequestTokens,
        nextTurnRetainedTokens: lastProviderRequestTokens,
        activeToolResultTokens: 0,
        compressedEvidenceTokens: 0,
        reclaimedToolResultTokens: 0,
        contentStored: false,
    };
    return {
        evidence: [],
        receipts: [],
        replacements: new Map(),
        compactedToolCallIds: [],
        preservedToolCallIds: results.map(event => event.toolCallId),
        retentionMetrics,
        persistedState: null,
        compatibilityOnly: true,
    };
}
function receiptChecksum(receipt) {
    const core = { ...(receipt || {}) };
    delete core.receiptChecksum;
    return digest(core);
}
function verifyPostTurnToolContextCompactionReceipt(receipt, expected = {}) {
    const issues = [
        receipt?.schema !== "ccm-post-turn-tool-context-compaction-receipt-v1" ? "schema_invalid" : "",
        expected.scope && receipt?.scope !== expected.scope ? "scope_mismatch" : "",
        expected.scopeId && receipt?.scopeId !== expected.scopeId ? "scope_id_mismatch" : "",
        expected.exactSessionId && receipt?.exactSessionId !== expected.exactSessionId ? "session_mismatch" : "",
        receipt?.rawExecutionLedgerPreserved !== true ? "raw_ledger_preservation_missing" : "",
        receiptChecksum(receipt) !== String(receipt?.receiptChecksum || "") ? "checksum_invalid" : "",
    ].filter(Boolean);
    return { valid: issues.length === 0, issues };
}
function runPostTurnToolContextCompactionSelfTest() {
    const result = compactConsumedToolResultsAfterTurn({
        scope: "project",
        scopeId: "demo",
        exactSessionId: `retired-selftest-${process.pid}-${Date.now()}`,
        executionEvents: [{ id: "r1", type: "tool_result", toolCallId: "call1", toolName: "read_file", timestamp: "2026-01-01T00:00:00Z", runId: "run", traceId: "trace", anchorMessageId: "u1", status: "ok", hidden: true, payload: { originalTokens: 25_000 } }],
        persist: true,
    });
    const checks = {
        compatibilityOnly: result.compatibilityOnly === true,
        noCompaction: result.compactedToolCallIds.length === 0,
        noReceiptWrite: result.receipts.length === 0 && result.persistedState === null,
        toolResultPreserved: result.preservedToolCallIds.includes("call1"),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=post-turn-tool-context-compaction.js.map