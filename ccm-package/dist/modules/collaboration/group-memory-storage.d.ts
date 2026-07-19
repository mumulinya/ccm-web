import * as fs from "fs";
export declare function getGroupSessionSidecarFile(root: string, groupId: string, sessionId?: string): string;
export declare function getGroupMemoryFile(groupId: string, sessionId?: string): string;
export declare function getGroupMemoryReloadLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupPostCompactDispatchLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupReplayRepairLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupReplayRepairWorkItemsFile(groupId: string, sessionId?: string): string;
export declare function getGroupSessionMemoryDir(groupId: string): string;
export declare function getGroupSessionMemoryMarkdownFile(groupId: string): string;
export declare function readGroupReplayRepairLedgerSummary(groupId: string, sessionId?: string): {
    schema: string;
    file: string;
    updatedAt: any;
    attemptCount: any;
    openActionCount: number;
    reworkRequiredCount: number;
    historicalReworkRequiredCount: any;
    latestStatus: any;
    latestScore: any;
    latestRenderedHash: any;
    latestAttemptId: any;
    recentAttempts: any;
};
export declare function readGroupReplayRepairWorkItemsSummary(groupId: string, sessionId?: string): {
    schema: string;
    file: string;
    updatedAt: any;
    latestReplay: any;
    total: any;
    openItemCount: any;
    pendingCount: any;
    inProgressCount: any;
    blockedCount: any;
    completedCount: any;
    cancelledCount: any;
    openItems: {
        id: any;
        status: string;
        owner: any;
        priority: any;
        component: any;
        subject: any;
        target: any;
        repair_target: any;
        target_project: any;
        source: any;
        proof_entry_id: any;
        plan_checksum: any;
        request_patch_checksum: any;
        request_telemetry_status: any;
        request_telemetry_session_status: any;
        request_telemetry_dispatch_status: any;
        runner_request_id: any;
        instruction: string;
        expected: string;
        dispatch_target: any;
        replay_attempt_id: any;
        replay_rendered_hash: any;
    }[];
    items: {
        id: any;
        status: string;
        owner: any;
        priority: any;
        component: any;
        subject: any;
        target: any;
        repair_target: any;
        target_project: any;
        source: any;
        proof_entry_id: any;
        plan_checksum: any;
        request_patch_checksum: any;
        request_telemetry_status: any;
        request_telemetry_session_status: any;
        request_telemetry_dispatch_status: any;
        runner_request_id: any;
        instruction: string;
        expected: string;
        dispatch_target: any;
        replay_attempt_id: any;
        replay_rendered_hash: any;
    }[];
};
export declare function replayRepairWorkItemStatusForMemory(item: any): "pending" | "blocked" | "in_progress" | "completed" | "cancelled";
export declare function replayRepairCandidatePriorityRank(item: any): 0 | 1 | 2 | 9;
export declare function readGroupReplayRepairDispatchCandidatesSummary(groupId: string, limit?: number, sessionId?: string): {
    schema: string;
    groupId: string;
    file: string;
    updatedAt: any;
    candidateCount: any;
    openItemCount: any;
    claimedCount: any;
    dispatchMarkedCount: any;
    criticalCount: any;
    readyCount: any;
    shouldCreateRealTask: boolean;
    candidates: any;
};
export declare function getGroupMemoryBackupFile(groupId: string, sessionId?: string): string;
export declare function createEmptyGroupMemory(groupId: string, sessionId?: string): {
    groupId: string;
    groupSessionId: string;
    goal: string;
    summary: string;
    currentPhase: string;
    decisions: any[];
    completed: any[];
    blocked: any[];
    workerLedger: any[];
    agentMemories: {};
    conversationSummary: any;
    factAnchors: any[];
    persistentRequirements: any[];
    messageDigest: string;
    sessionMemory: any;
    toolContinuity: any;
    compactBoundary: any;
    compaction: {
        version: number;
        enabled: boolean;
        health: string;
        compactedMessageCount: number;
    };
    messageCompression: {
        enabled: boolean;
        recentLimit: number;
        olderLimit: number;
        totalMessages: number;
        compressedMessages: number;
        lastCompressedAt: string;
    };
    longTermLogDistillation: any;
    openQuestions: any[];
    nextActions: any[];
    updated_at: string;
};
export declare function loadGroupMemory(groupId: string, sessionId?: string): any;
export declare function saveGroupMemory(groupId: string, memory: any, sessionId?: string, options?: any): any;
export declare function deleteGroupSessionMemoryArtifacts(groupId: string, sessionId: string): {
    schema: string;
    groupId: string;
    sessionId: string;
    scopeId: string;
    deletedFiles: number;
    boundaryArtifacts: {
        schema: string;
        groupId: string;
        sessionId: string;
        deletedFiles: number;
        files: string[];
        deletedAt: string;
    };
    typedMemoryDispatchWalArtifacts: {
        deletedFiles: number;
    };
    invocationLineageArtifacts: {
        deleted: number;
        recoveryDeleted: number;
        recoveryLeaseDeleted: number;
    } | {
        deleted: number;
        recoveryDeleted: number;
    };
    continuationSoakArtifacts: {
        deleted: number;
        groupId: string;
        groupSessionId: string;
        taskAgentSessionId: string;
    } | {
        deleted: number;
    };
    compactHeadArtifacts: {
        deleted: number;
        groupId: string;
        groupSessionId: string;
        file: string;
    } | {
        deleted: number;
    };
    providerNativeCompactSessionCapacityArtifacts: {
        deleted: number;
        file: string;
        groupId: string;
        groupSessionId: string;
    };
    autoCompactCircuitBreakerArtifacts: {
        deleted: number;
        groupId: string;
        groupSessionId: string;
        file: string;
    } | {
        deleted: number;
    };
    compactionActivityArtifacts: {
        deleted: number;
        file: string;
        groupId: string;
        groupSessionId: string;
    } | {
        deleted: number;
    };
    reactiveCompactRetryOwnershipArtifacts: {
        deleted: number;
        groupId: string;
        groupSessionId: string;
        file: string;
    } | {
        deleted: number;
    };
    promptCacheBreakDetectionArtifacts: {
        file: string;
        deleted: number;
    } | {
        deleted: number;
    };
    workerContextCompactSessionArtifacts: any;
    conflictResolutionMaintenanceSchedulerArtifacts: any;
    deletedAt: string;
};
export declare function persistGroupMemoryResumeEffectiveTokenBaseline(groupId: string, groupSessionId: string, allMessages: any[], memory: any, projection: any, options?: any): {
    memory: any;
    baseline: any;
    cadenceDecision: {
        tokenBasis: string;
        resumeBaselineId: any;
        resumeBaselineChecksum: any;
        rawTranscriptTokens: any;
        effectiveContextTokens: any;
        cadenceRebased: boolean;
        previousTokensAtLastExtraction: number;
        schema: string;
        version: number;
        ccParitySource: string;
        minimumMessageTokensToInit: number;
        minimumTokensBetweenUpdate: number;
        toolCallsBetweenUpdates: number;
        initialized: boolean;
        status: string;
        shouldExtract: boolean;
        currentContextTokens: number;
        tokensAtLastExtraction: number;
        tokensSinceLastExtraction: number;
        toolCallsSinceLastExtraction: any;
        lastAssistantTurnHasToolCalls: boolean;
        tokenThresholdMet: boolean;
        toolCallThresholdMet: boolean;
        naturalBreak: boolean;
        lastObservedMessageId: string;
        lastExtractionMessageId: string;
        lastExtractionCursorStatus: string;
        lastExtractionCursorIndex: number;
        toolCallScanMessageCount: number;
        extractionCount: number;
        lastExtractedAt: string;
        observedAt: string;
    };
};
export declare function hashGroupMemoryFileWindow(file: string, stat: fs.Stats, maxBytes?: number): {
    checksum: string;
    checksumMode: string;
    lineCount: number;
};
