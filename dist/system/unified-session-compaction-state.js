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
exports.CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA = void 0;
exports.buildUnifiedSessionCompactionStateV1 = buildUnifiedSessionCompactionStateV1;
exports.projectUnifiedSessionCompactionState = projectUnifiedSessionCompactionState;
const crypto = __importStar(require("crypto"));
exports.CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA = "ccm-unified-session-compaction-state-v1";
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function buildUnifiedSessionCompactionStateV1(input) {
    const core = {
        schema: exports.CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA,
        scope: input.receipt.scope,
        exactSessionId: input.receipt.exactSessionId,
        strategy: "cc_two_stage",
        stage: input.receipt.stage,
        triggerReason: String(input.triggerReason || "automatic"),
        beforeTokens: Math.max(0, Number(input.receipt.beforeTokens || 0)),
        afterTokens: Math.max(0, Number(input.receipt.afterTokens || 0)),
        summarySource: String(input.receipt.summarySource || "none"),
        gateStatus: String(input.receipt.gateStatus || "ready"),
        qualityStatus: input.summaryQuality == null ? "not_run" : input.summaryQuality?.valid === true || input.summaryQuality?.pass === true ? "passed" : "failed",
        boundaryGeneration: input.receipt.boundaryGeneration,
        summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
        summarizedMessageCount: Math.max(0, Number(input.summarizedMessageCount || 0)),
        preservedRecentMessageIds: (Array.isArray(input.preservedRecentMessageIds) ? input.preservedRecentMessageIds : []).map(String).filter(Boolean).slice(-256),
        receiptChecksum: input.receipt.checksum,
        summaryChecksum: input.receipt.summaryChecksum,
        microCompactReceiptChecksum: String(input.microCompact?.receiptChecksum || input.microCompact?.checksum || ""),
        recoveryContextChecksum: input.receipt.recoveryContextChecksum || String(input.recoveryContext?.checksum || ""),
        strategyApplied: String(input.receipt.strategyApplied || "none"),
        sessionMemoryChecksum: String(input.receipt.sessionMemoryChecksum || ""),
        sessionMemoryCursor: String(input.receipt.sessionMemoryCursor || ""),
        ptlRecoveryAttempts: Math.max(0, Number(input.receipt.ptlRecoveryAttempts || 0)),
        ptlDroppedRoundCount: Math.max(0, Number(input.receipt.ptlDroppedRoundCount || 0)),
        ptlDroppedMessagesChecksum: String(input.receipt.ptlDroppedMessagesChecksum || ""),
        summaryQualityChecksum: checksum(input.summaryQuality || null),
        compactionMode: input.compactionMode === "partial" ? "partial" : "full",
        executionPath: input.receipt.executionPath || "none",
        compactionRunId: String(input.receipt.compactionRunId || ""),
        partialCompaction: input.compactionMode === "partial" ? input.partialCompaction || null : null,
        contentStored: false,
        updatedAt: new Date().toISOString(),
    };
    return { ...core, checksum: checksum(core) };
}
function projectUnifiedSessionCompactionState(value) {
    if (!value || value.schema !== exports.CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA)
        return null;
    return {
        schema: value.schema,
        scope: String(value.scope || ""),
        exactSessionId: String(value.exactSessionId || ""),
        strategy: "cc_two_stage",
        stage: String(value.stage || "idle"),
        triggerReason: String(value.triggerReason || "automatic"),
        beforeTokens: Math.max(0, Number(value.beforeTokens || 0)),
        afterTokens: Math.max(0, Number(value.afterTokens || 0)),
        summarySource: String(value.summarySource || "none"),
        gateStatus: String(value.gateStatus || "ready"),
        qualityStatus: String(value.qualityStatus || "not_run"),
        boundaryGeneration: Math.max(0, Number(value.boundaryGeneration || 0)),
        summarizedThroughMessageId: String(value.summarizedThroughMessageId || ""),
        summarizedMessageCount: Math.max(0, Number(value.summarizedMessageCount || 0)),
        preservedRecentMessageIds: (Array.isArray(value.preservedRecentMessageIds) ? value.preservedRecentMessageIds : []).map(String).filter(Boolean).slice(-256),
        receiptChecksum: String(value.receiptChecksum || ""),
        summaryChecksum: String(value.summaryChecksum || ""),
        microCompactReceiptChecksum: String(value.microCompactReceiptChecksum || ""),
        recoveryContextChecksum: String(value.recoveryContextChecksum || ""),
        strategyApplied: String(value.strategyApplied || "none"),
        sessionMemoryChecksum: String(value.sessionMemoryChecksum || ""),
        sessionMemoryCursor: String(value.sessionMemoryCursor || ""),
        ptlRecoveryAttempts: Math.max(0, Number(value.ptlRecoveryAttempts || 0)),
        ptlDroppedRoundCount: Math.max(0, Number(value.ptlDroppedRoundCount || 0)),
        ptlDroppedMessagesChecksum: String(value.ptlDroppedMessagesChecksum || ""),
        summaryQualityChecksum: String(value.summaryQualityChecksum || ""),
        compactionMode: value.compactionMode === "partial" ? "partial" : "full",
        executionPath: ["session_memory_direct", "request_preflight_summary", "microcompact_then_model", "partial_model", "cancelled_before_commit", "committed_recovery_warning"].includes(String(value.executionPath || "")) ? value.executionPath : "none",
        compactionRunId: String(value.compactionRunId || ""),
        partialCompaction: value.compactionMode === "partial" && value.partialCompaction?.schema === "ccm-partial-compaction-projection-v2" ? value.partialCompaction : null,
        contentStored: false,
    };
}
//# sourceMappingURL=unified-session-compaction-state.js.map