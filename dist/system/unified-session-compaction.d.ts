export type UnifiedCompactionScope = "global" | "group" | "project";
export type UnifiedCompactionStage = "idle" | "microcompact" | "request_preflight" | "full_compaction" | "post_gate" | "recovery";
export type UnifiedCompactionPolicy = {
    strategy: "cc_two_stage";
    microCompactEnabled: boolean;
    pressureFirst: boolean;
    idleAssistEnabled: boolean;
    idleGapMinutes: number;
    keepRecentToolResults: number;
    minKeepTokens: number;
    minKeepTextMessages: number;
    maxKeepTokens: number;
    autoCompactThreshold: number;
};
export type UnifiedRecoveryContext = {
    schema: "ccm-unified-recovery-context-v1";
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    taskBindings: Array<{
        taskId: string;
        generation?: number;
        attempt?: number;
        leaseId?: string;
    }>;
    planBindings: Array<{
        planId: string;
        revision?: number;
        checksum?: string;
    }>;
    fileReferences: string[];
    verificationEvidence: string[];
    pendingActions: string[];
    permissionBoundary: string;
    contentStored: false;
    checksum: string;
};
export type UnifiedCompactionReceipt = {
    schema: "ccm-unified-session-compaction-v1";
    strategy: "cc_two_stage";
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    stage: UnifiedCompactionStage;
    beforeTokens: number;
    afterTokens: number;
    microCompactApplied: boolean;
    microCompactTrigger: "pressure" | "idle" | "none";
    summarySource: "model" | "session_memory" | "reused" | "none";
    gateStatus: "ready" | "recompact_required" | "degraded";
    boundaryGeneration: number;
    summaryChecksum: string;
    recoveryContextChecksum: string;
    strategyApplied?: "none" | "microcompact" | "session_memory" | "model_summary" | "reactive_recovery";
    sessionMemoryChecksum?: string;
    sessionMemoryCursor?: string;
    ptlRecoveryAttempts?: number;
    ptlDroppedRoundCount?: number;
    ptlDroppedMessageIds?: string[];
    ptlDroppedMessagesChecksum?: string;
    executionPath?: "session_memory_direct" | "request_preflight_summary" | "microcompact_then_model" | "partial_model" | "cancelled_before_commit" | "committed_recovery_warning" | "none";
    compactionRunId?: string;
    contentStored: false;
    createdAt: string;
    checksum: string;
};
export type UnifiedCompactionProjection = {
    schema: "ccm-unified-session-compaction-projection-v1";
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    strategy: "cc_two_stage";
    stage: UnifiedCompactionStage;
    beforeTokens: number;
    afterTokens: number;
    microCompactApplied: boolean;
    summarySource: UnifiedCompactionReceipt["summarySource"];
    gateStatus: UnifiedCompactionReceipt["gateStatus"];
    boundaryGeneration: number;
    summaryQuality: unknown;
    receiptChecksum: string;
    strategyApplied: string;
    ptlRecoveryAttempts: number;
    ptlDroppedRoundCount: number;
    executionPath: NonNullable<UnifiedCompactionReceipt["executionPath"]>;
    compactionRunId: string;
    contentStored: false;
};
export type UnifiedCompactionOrchestrationInput = {
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    activeTokens: number;
    threshold: number;
    microCompactApplied?: boolean;
    microCompactTrigger?: UnifiedCompactionReceipt["microCompactTrigger"];
    force?: boolean;
    promptTooLong?: boolean;
    summarySource?: UnifiedCompactionReceipt["summarySource"];
    summaryQuality?: unknown;
    afterTokens?: number;
    boundaryGeneration?: number;
    recoveryContextChecksum?: string;
};
export declare function resolveUnifiedCompactionPolicy(config?: any, overrides?: Partial<UnifiedCompactionPolicy>): UnifiedCompactionPolicy;
export declare function shouldRunUnifiedFullCompaction(input: {
    activeTokens: number;
    threshold: number;
    force?: boolean;
    promptTooLong?: boolean;
}): {
    required: boolean;
    activeTokens: number;
    threshold: number;
    pressure: number;
};
export declare function buildUnifiedRecoveryContext(input: {
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    taskBindings?: any[];
    planBindings?: any[];
    fileReferences?: any[];
    verificationEvidence?: any[];
    pendingActions?: any[];
    permissionBoundary?: string;
}): UnifiedRecoveryContext;
export declare function buildUnifiedCompactionReceipt(input: Partial<UnifiedCompactionReceipt> & {
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    beforeTokens?: number;
    afterTokens?: number;
    boundaryGeneration?: number;
    summaryChecksum?: string;
    recoveryContextChecksum?: string;
}): {
    checksum: string;
    schema: "ccm-unified-session-compaction-v1";
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    contentStored: false;
    createdAt: string;
    boundaryGeneration: number;
    summaryChecksum: string;
    strategy: "cc_two_stage";
    microCompactTrigger: "pressure" | "idle" | "none";
    stage: UnifiedCompactionStage;
    beforeTokens: number;
    afterTokens: number;
    microCompactApplied: boolean;
    summarySource: "model" | "session_memory" | "reused" | "none";
    gateStatus: "ready" | "recompact_required" | "degraded";
    recoveryContextChecksum: string;
    strategyApplied?: "none" | "microcompact" | "session_memory" | "model_summary" | "reactive_recovery";
    sessionMemoryChecksum?: string;
    sessionMemoryCursor?: string;
    ptlRecoveryAttempts?: number;
    ptlDroppedRoundCount?: number;
    ptlDroppedMessageIds?: string[];
    ptlDroppedMessagesChecksum?: string;
    executionPath?: "session_memory_direct" | "request_preflight_summary" | "microcompact_then_model" | "partial_model" | "cancelled_before_commit" | "committed_recovery_warning" | "none";
    compactionRunId?: string;
};
export declare function estimateRecoveryContextTokens(context: UnifiedRecoveryContext | null | undefined): number;
/**
 * Shared decision/receipt boundary used by all three session adapters. The
 * adapter owns model summarisation and transactional persistence; this layer
 * owns only the invariant two-stage policy and safe receipt shape.
 */
export declare function orchestrateUnifiedCompaction(input: UnifiedCompactionOrchestrationInput): {
    decision: {
        required: boolean;
        activeTokens: number;
        threshold: number;
        pressure: number;
    };
    receipt: {
        checksum: string;
        schema: "ccm-unified-session-compaction-v1";
        scope: UnifiedCompactionScope;
        exactSessionId: string;
        contentStored: false;
        createdAt: string;
        boundaryGeneration: number;
        summaryChecksum: string;
        strategy: "cc_two_stage";
        microCompactTrigger: "pressure" | "idle" | "none";
        stage: UnifiedCompactionStage;
        beforeTokens: number;
        afterTokens: number;
        microCompactApplied: boolean;
        summarySource: "model" | "session_memory" | "reused" | "none";
        gateStatus: "ready" | "recompact_required" | "degraded";
        recoveryContextChecksum: string;
        strategyApplied?: "none" | "microcompact" | "session_memory" | "model_summary" | "reactive_recovery";
        sessionMemoryChecksum?: string;
        sessionMemoryCursor?: string;
        ptlRecoveryAttempts?: number;
        ptlDroppedRoundCount?: number;
        ptlDroppedMessageIds?: string[];
        ptlDroppedMessagesChecksum?: string;
        executionPath?: "session_memory_direct" | "request_preflight_summary" | "microcompact_then_model" | "partial_model" | "cancelled_before_commit" | "committed_recovery_warning" | "none";
        compactionRunId?: string;
    };
    projection: UnifiedCompactionProjection;
};
export declare function projectUnifiedCompactionReceipt(receipt: UnifiedCompactionReceipt | null | undefined, summaryQuality?: unknown): UnifiedCompactionProjection | null;
export type { CcmUnifiedSessionSummaryV1, UnifiedCompactionSnapshot, UnifiedCompactionFence, UnifiedRecoveryInput, UnifiedSessionCompactionAdapter, UnifiedCompactionResult, UnifiedCompactionEngineInput, } from "./unified-session-compaction-types";
export { UnifiedSessionCompactionEngine, createUnifiedSessionCompactionEngine } from "./unified-session-compaction-engine";
export { buildUnifiedRecoveryAttachment, verifyUnifiedRecoveryAttachment } from "./unified-session-compaction-recovery";
export { buildUnifiedSessionCompactionStateV1, projectUnifiedSessionCompactionState, CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA } from "./unified-session-compaction-state";
export { createUnifiedScopeAdapter, runUnifiedScopeCompaction } from "./unified-session-compaction-adapters";
export { normalizeCcmUnifiedSummary, unifiedSummaryChecksum, buildUnifiedSummaryReference, buildUnifiedSummaryPrompt, runUnifiedSummaryShapeCheck, UNIFIED_COMPACTION_SYSTEM_PROMPT, } from "./unified-session-compaction-summary";
