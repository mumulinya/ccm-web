export declare const GROUP_MEMORY_COMPACTION_VERSION = 3;
export declare const GROUP_COMPACT_TRIGGER_TOKENS = 137000;
export declare const GROUP_COMPACT_MIN_KEEP_MESSAGES = 5;
export declare const GROUP_COMPACT_MIN_KEEP_TOKENS = 10000;
export declare const GROUP_COMPACT_MAX_KEEP_TOKENS = 40000;
export declare const GROUP_COMPACT_MAX_FAILURES = 3;
export declare const GROUP_COMPACT_MODEL_RETRY_MS: number;
export declare const GROUP_FACT_ANCHOR_LIMIT = 500;
export declare const GROUP_CONTEXT_WINDOW_DEFAULT = 200000;
export declare const GROUP_CONTEXT_RESERVED_TOKENS = 50000;
export declare const GROUP_AUTOCOMPACT_BUFFER_TOKENS = 13000;
export declare const GROUP_COMPACT_MAX_ACTIVE_MESSAGES = 120;
type ConversationSummary = {
    primaryRequest: string;
    userMessages: string[];
    keyConcepts: string[];
    filesAndCode: string[];
    errorsAndFixes: string[];
    decisions: string[];
    completedWork: string[];
    pendingTasks: string[];
    currentWork: string;
    nextStep: string;
    participantState: string[];
    taskStates: string[];
};
export declare function estimateGroupTextTokens(value: any): number;
export declare function estimateGroupMessageTokens(message: any): number;
/** Claude Code session-memory style retained window adapted to group messages:
 * keep 10K/5 text messages, cap near 40K, and preserve task transactions. */
export declare function calculateGroupMessagesToKeepIndex(messages: any[], options?: any): number;
export declare function getGroupAutoCompactThreshold(config?: any): number;
export declare function buildDeterministicConversationSummary(messages: any[], memory: any, previous?: any): ConversationSummary;
export declare function renderConversationSummary(summary: any, maxChars?: number): string;
export declare function buildBoundedRecentGroupContext(messages: any[], fullCount?: number): string;
export declare function buildRelevantHistoricalGroupContext(messages: any[], boundaryIndex: number, query: string, options?: any): string;
export declare function compactGroupConversationMemory(input: {
    groupId: string;
    messages: any[];
    memory: any;
    config?: any;
    transcriptPath: string;
    force?: boolean;
    rebuild?: boolean;
}): Promise<{
    compacted: boolean;
    memory: any;
    keepIndex: number;
    boundary?: undefined;
} | {
    compacted: boolean;
    memory: any;
    boundary: {
        id: string;
        type: string;
        summarizedFromMessageId: string;
        summarizedThroughMessageId: string;
        summarizedMessageCount: number;
        preservedMessageIds: string[];
        preCompactTokenCount: any;
        postCompactTokenCount: any;
        summarySource: string;
        createdAt: string;
    };
    keepIndex: number;
}>;
export declare function runGroupMemoryCompactionSelfTest(): {
    pass: boolean;
    checks: {
        keepsRecentMessages: boolean;
        compactsOlderMessages: boolean;
        preservesUserIntent: boolean;
        preservesErrors: boolean;
        preservesFiles: boolean;
        preservesNextStep: boolean;
        microCompactsLargeOutput: boolean;
        rawTranscriptUntouched: boolean;
        neverCrossesPreviousBoundary: boolean;
        retrievesCompressedOriginalEvidence: boolean;
        rejectsUngroundedModelClaims: boolean;
        preservesDeterministicFacts: boolean;
        storesChecksummedUserAnchors: boolean;
        adaptiveThresholdMatchesDefaultBudget: boolean;
    };
    keepIndex: number;
    keptMessages: number;
    compactedMessages: number;
};
export declare function runGroupMemoryCompactionIntegrationSelfTest(): Promise<{
    pass: boolean;
    checks: {
        actualAsyncCompaction: boolean;
        structuredFallbackWithoutModel: boolean;
        fallbackPreservesUserIntent: boolean;
        rawMessagesRemainImmutable: boolean;
        incrementalSecondCompaction: boolean;
        nextBoundaryStartsAfterPrevious: boolean;
        legacyVersionRebuildsFromRawTranscript: boolean;
    };
}>;
export declare function runGroupMemoryCompactionStressSelfTest(): Promise<{
    pass: boolean;
    checks: {
        handlesTwelveIncrementalCompactions: boolean;
        summaryValidationNeverDrifts: boolean;
        everySummaryHasIntegrityChecksum: boolean;
        compactionActuallyReleasesContext: boolean;
        persistentRequirementSurvives: any;
        oldRawEvidenceIsAutomaticallyRetrievable: boolean;
        rawTranscriptRemainsUntouched: boolean;
        boundaryHistoryIsBounded: boolean;
    };
    finalBoundaryIndex: number;
}>;
export {};
