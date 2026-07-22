export type GlobalMemoryItemType = "user" | "feedback" | "authorization" | "decisions" | "missions" | "unresolved" | "references";
export interface GlobalMemoryItem {
    id: string;
    type: GlobalMemoryItemType;
    text: string;
    why?: string;
    howToApply?: string;
    importance: number;
    confidence: number;
    createdAt: string;
    updatedAt: string;
    source: {
        sessionId?: string;
        messageIds?: string[];
        missionId?: string;
        traceId?: string;
        source?: string;
        timestamp?: string;
    };
    expiresAt?: string;
}
export declare const GLOBAL_AGENT_MEMORY_FILE: string;
export declare function getGlobalAgentSessionCompactionActivity(sessionId: string): {
    active: boolean;
    status: string;
    stage: string;
    reason: string;
    startedAt: string;
    updatedAt: string;
};
export declare function acquireGlobalAgentMemorySelfTestLock(label?: string, options?: any): () => void;
export declare function scanGlobalAgentMemorySelfTestContamination(options?: any): {
    schema: string;
    generatedAt: string;
    file: string;
    status: string;
    pass: boolean;
    active_contamination_count: number;
    residue_contamination_count: number;
    contamination_count: number;
    contaminated_file_count: number;
    files: {
        exists: boolean;
        contaminated: boolean;
        sentinelCount: number;
        hasSelftestSource: boolean;
        bytes: number;
        file: string;
        role: string;
        active: boolean;
    }[];
    rows: any[];
};
export declare function archiveGlobalAgentMemorySelfTestResidues(options?: any): {
    schema: string;
    dryRun: boolean;
    reason: string;
    actor: string;
    archiveDir: string;
    selectedCount: number;
    archivedCount: number;
    skippedCount: number;
    archived: any[];
    skipped: any[];
    before: {
        active_contamination_count: number;
        residue_contamination_count: number;
    };
    after: {
        active_contamination_count: number;
        residue_contamination_count: number;
    };
};
export declare function runGlobalAgentMemorySelfTestResidueArchiveSelfTest(): {
    pass: boolean;
    checks: {
        beforeDetectsResidue: boolean;
        dryRunDoesNotMoveFile: boolean;
        archiveMovesOnlyResidue: boolean;
        activeMemoryStillClean: boolean;
        residueNoLongerIncludesTestFile: boolean;
    };
    archived: {
        archiveFile: string;
        archivedCount: number;
        skippedCount: number;
    };
};
export declare function runGlobalAgentMemorySelfTestIsolationSelfTest(): {
    pass: boolean;
    checks: {
        detectsActivePollution: boolean;
        lockFileExists: boolean;
        startedCleanOrWarnOnly: boolean;
    };
    polluted: {
        status: string;
        active: number;
    };
};
export declare function loadGlobalAgentTranscript(sessionId: string): {
    version: number;
    sessionId: string;
    source: any;
    messages: any;
    updatedAt: any;
    storageRecovery: {
        recoveredFromBackup: boolean;
        recoveredAt: string;
    };
};
export declare function loadGlobalAgentMemory(options?: {
    recover?: boolean;
}): any;
export declare function pruneDeletedGlobalWebSessionMemory(activeSessionIds: string[]): {
    removed: any;
    transcriptFilesRemoved: number;
};
export declare function recordGlobalAgentSessionProviderUsage(sessionId: string, input?: any): import("../../system/session-compaction-core").SessionProviderUsageBaseline;
export declare function setGlobalAgentMemoryPolicy(input: any): any;
export declare function extractGlobalMemoryCandidates(messages: any[], sessionId: string): {
    candidates: GlobalMemoryItem[];
    rejected: number;
};
export declare function compactGlobalAgentSessionWithModel(sessionId: string, options?: {
    force?: boolean;
    promptTooLong?: boolean;
    reason?: string;
    customInstructions?: string;
    modelCall?: (request: any) => Promise<any>;
    currentRequest?: any;
    fixedContext?: any;
    tools?: any;
    recoveryContext?: any;
    modelVisiblePayload?: any;
    contextComponents?: any;
    postCompactPayloadBuilder?: (input: any) => Promise<any> | any;
}): any;
export declare function scheduleGlobalAgentSessionMemoryExtraction(sessionId: string, options?: {
    modelCall?: (request: any) => Promise<any>;
}): {
    scheduled: boolean;
    reason: string;
    cadence?: undefined;
} | {
    scheduled: boolean;
    reason: string;
    cadence: {
        schema: string;
        shouldExtract: boolean;
        reason: string;
        totalTokens: any;
        priorTokens: number;
        growthTokens: number;
        toolCallsSinceLastExtraction: any;
        cursorIndex: number;
        cursorValid: boolean;
        sourceLastMessageId: string;
        sourceMessageIds: string[];
    };
} | {
    cadence: {
        schema: string;
        shouldExtract: boolean;
        reason: string;
        totalTokens: any;
        priorTokens: number;
        growthTokens: number;
        toolCallsSinceLastExtraction: any;
        cursorIndex: number;
        cursorValid: boolean;
        sourceLastMessageId: string;
        sourceMessageIds: string[];
    };
    scheduled: boolean;
    reason: string;
    startedAt: string;
    identity: any;
};
export declare function ingestGlobalAgentConversation(input: {
    sessionId: string;
    source?: string;
    messages: any[];
    compact?: boolean;
}): {
    transcript: {
        sessionId: string;
        messageCount: any;
        updatedAt: any;
    };
    extracted: number;
    rejected: number;
    compaction: {
        scheduled: boolean;
        mode: string;
        sessionId: string;
    };
};
export declare function recallGlobalAgentMemory(query: string, options?: {
    sessionId?: string;
    limit?: number;
    recordMetric?: boolean;
}): {
    ignored: boolean;
    items: any[];
    sessionSummary: any;
    citations: any[];
    boundary?: undefined;
} | {
    ignored: boolean;
    items: any[];
    sessionSummary: any;
    boundary: any;
    citations: any[];
};
export declare function buildGlobalAgentSessionContinuation(sessionId: string): {
    schema: string;
    sessionId: string;
    summary: any;
    messages: any[];
    boundary: any;
    summaryChecksum?: undefined;
    recentWindow?: undefined;
    tokenMeasurement?: undefined;
    postCompactGate?: undefined;
    consecutiveFailures?: undefined;
} | {
    schema: string;
    sessionId: string;
    summary: any;
    summaryChecksum: string;
    messages: any;
    boundary: any;
    recentWindow: {
        schema: string;
        strategy: string;
        startIndex: number;
        floorIndex: number;
        preservedMessageCount: number;
        preservedTextMessageCount: number;
        preservedTokenCount: number;
        minTokens: number;
        minTextMessages: number;
        maxTokens: number;
        lastSummarizedMessageId: string;
        lastSummarizedMessageIndex: number;
        cursorValid: boolean;
        tokenSelectedStartIndex: number;
        expandedForConversationTurn: boolean;
        maxExceededForAtomicBoundary: boolean;
        minimumSatisfied: boolean;
    } | {
        startIndex: number;
        preservedTokenCount: any;
        preservedTextMessageCount: number;
    };
    tokenMeasurement: any;
    postCompactGate: any;
    consecutiveFailures: number;
};
export declare function buildGlobalAgentMemoryPacket(query: string, options?: {
    sessionId?: string;
    limit?: number;
    maxChars?: number;
    recordMetric?: boolean;
}): string;
export declare function recordGlobalMissionMemory(input: any): GlobalMemoryItem;
export declare function recordGlobalDirectDispatchMemory(input: any): GlobalMemoryItem;
export declare function recordGlobalDirectDispatchRollbackMemory(input: any): GlobalMemoryItem;
export declare function getGlobalMemoryEvidence(input: {
    sessionId?: string;
    messageId?: string;
    missionId?: string;
}): any[];
export declare function rebuildGlobalAgentMemory(reason?: string, actor?: string): any;
export declare function getGlobalAgentMemoryPolicy(): any;
export declare function runGlobalAgentMemorySelfTest(): {
    pass: boolean;
    checks: {
        encryptedTranscriptHidesPlaintext: boolean;
        losslessTranscriptRecoverable: boolean;
        compactBoundaryCreated: boolean;
        archiveIntegrityPasses: boolean;
        privacyRejectsSecret: boolean;
        oneShotInstructionDoesNotPolluteLongTerm: boolean;
        missionWritebackTracksAndClearsUnresolved: any;
        globalDirectDispatchCompletionIsRemembered: boolean;
        globalDirectDispatchRollbackOverridesCompletion: boolean;
        durableAuthorizationRemembered: boolean;
        crossSessionRecallWorks: boolean;
        explicitIgnoreMemoryWorks: boolean;
        evidenceTraceable: boolean;
        recentWindowPreserved: boolean;
        tokenAwareBoundaryRecorded: boolean;
        microCompactRecordsLargeOutput: boolean;
        postCompactRestoreAnchorsRecorded: boolean;
        corruptedTranscriptRecoversFromBackup: boolean;
    };
    packetPreview: string;
    ingest: {
        extracted: number;
        rejected: number;
    };
};
export declare function runGlobalAgentMemoryStressSelfTest(): {
    pass: boolean;
    checks: {
        repeatedCompactionCreatesBoundedArchives: boolean;
        boundariesMonotonicallyAdvance: any;
        rawTranscriptNeverLosesMessages: boolean;
        archiveChecksumsRemainValid: any;
        persistentRequirementSurvivesDrift: boolean;
        recentWindowRemainsBounded: boolean;
        circuitBreakerHealthy: boolean;
    };
    archives: any;
    transcriptMessages: any;
};
