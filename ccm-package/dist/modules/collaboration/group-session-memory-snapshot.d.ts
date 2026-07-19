export declare function getGroupSessionMemorySnapshotFile(groupId: string): string;
export declare function groupSessionMemorySectionTokenLimit(header: string): number;
export declare function splitGroupSessionMemorySections(markdown: string): {
    header: string;
    lines: string[];
}[];
export declare function truncateGroupSessionMemorySection(section: {
    header: string;
    lines: string[];
}, maxTokens: number): {
    text: string;
    truncated: boolean;
    tokensBefore: number;
    tokensAfter: number;
};
export declare function analyzeGroupSessionMemoryBudget(markdown: string): {
    schema: string;
    version: number;
    status: string;
    estimator: string;
    ccParitySource: string;
    totalTokens: number;
    maxTotalTokens: number;
    totalUtilizationPercent: number;
    maxSectionTokens: number;
    maxSectionUtilizationPercent: number;
    sectionCount: number;
    oversizedSectionCount: number;
    oversizedSections: {
        header: string;
        tokens: number;
        maxTokens: number;
        overBudget: boolean;
    }[];
    sections: {
        header: string;
        tokens: number;
        maxTokens: number;
        overBudget: boolean;
    }[];
};
export declare function evaluateGroupSessionMemoryUpdateCadence(messages: any[], previousSnapshot?: any, options?: any): {
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
export declare function enforceGroupSessionMemoryBudget(markdown: string): {
    markdown: string;
    wasTruncated: boolean;
    truncatedSections: string[];
    before: {
        schema: string;
        version: number;
        status: string;
        estimator: string;
        ccParitySource: string;
        totalTokens: number;
        maxTotalTokens: number;
        totalUtilizationPercent: number;
        maxSectionTokens: number;
        maxSectionUtilizationPercent: number;
        sectionCount: number;
        oversizedSectionCount: number;
        oversizedSections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
        sections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
    };
    after: {
        schema: string;
        version: number;
        status: string;
        estimator: string;
        ccParitySource: string;
        totalTokens: number;
        maxTotalTokens: number;
        totalUtilizationPercent: number;
        maxSectionTokens: number;
        maxSectionUtilizationPercent: number;
        sectionCount: number;
        oversizedSectionCount: number;
        oversizedSections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
        sections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
    };
};
export declare function buildGroupSessionMemorySectionEvidence(markdown: string, source?: any): {
    checksum: string;
    schema: string;
    version: number;
    sourceType: string;
    markdownChecksum: string;
    sourceTranscriptChecksum: string;
    sourceFirstMessageId: string;
    sourceLastMessageId: string;
    sourceMessageCount: number;
    sourceMessageIds: unknown[];
    sections: {
        evidenceId: string;
        section: string;
        sectionIndex: number;
        sectionChecksum: string;
        sourceTranscriptChecksum: string;
        sourceFirstMessageId: string;
        sourceLastMessageId: string;
        sourceMessageCount: number;
        sourceMessageIds: unknown[];
    }[];
};
export declare function buildGroupSessionMemorySnapshot(groupId: string, memory?: any, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    generatedAt: string;
    reason: string;
    strategy: string;
    extractionMethod: string;
    modelExtracted: boolean;
    deterministicFallback: boolean;
    modelExtractionReceipt: any;
    modelMergeQuality: any;
    factSupersessionGraph: any;
    sectionEvidence: any;
    budgetEnforcement: {
        wasTruncated: boolean;
        truncatedSections: string[];
        before: {
            schema: string;
            version: number;
            status: string;
            estimator: string;
            ccParitySource: string;
            totalTokens: number;
            maxTotalTokens: number;
            totalUtilizationPercent: number;
            maxSectionTokens: number;
            maxSectionUtilizationPercent: number;
            sectionCount: number;
            oversizedSectionCount: number;
            oversizedSections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
            sections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
        };
        after: {
            schema: string;
            version: number;
            status: string;
            estimator: string;
            ccParitySource: string;
            totalTokens: number;
            maxTotalTokens: number;
            totalUtilizationPercent: number;
            maxSectionTokens: number;
            maxSectionUtilizationPercent: number;
            sectionCount: number;
            oversizedSectionCount: number;
            oversizedSections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
            sections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
        };
    };
    summaryFile: string;
    snapshotFile: string;
    lastSummarizedMessageId: string;
    durableBoundaryMessageId: string;
    providerActiveLastSummarizedMessageId: string;
    providerActiveCursorStatus: string;
    extractionCursorGeneration: number;
    postCompactSessionStateReset: any;
    postCompactSessionStateResetValid: boolean;
    postCompactSessionStateResetIssues: string[];
    summaryChecksum: string;
    markdownChecksum: string;
    markdownChars: number;
    markdownTokens: number;
    memoryBudget: {
        schema: string;
        version: number;
        status: string;
        estimator: string;
        ccParitySource: string;
        totalTokens: number;
        maxTotalTokens: number;
        totalUtilizationPercent: number;
        maxSectionTokens: number;
        maxSectionUtilizationPercent: number;
        sectionCount: number;
        oversizedSectionCount: number;
        oversizedSections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
        sections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
    };
    updateCadence: any;
    extractionTransaction: any;
    hasSummary: boolean;
    compactedMessageCount: number;
    preservedRecentMessages: number;
    preCompactTokenCount: number;
    postCompactTokenCount: number;
    health: string;
    contextPressureWarning: any;
    markdownExcerpt: string;
    markdown: string;
};
export declare function summarizeGroupSessionMemorySnapshot(snapshot?: any): any;
export declare function persistGroupSessionMemorySnapshot(groupId: string, memory?: any, options?: any): any;
export declare function commitGroupSessionMemorySnapshot(snapshot?: any): any;
export declare function persistGroupSessionMemoryCadenceObservation(groupId: string, cadenceDecision?: any): any;
export declare function readGroupSessionMemorySnapshotSummary(groupId: string): any;
export declare function refreshGroupConversationMemorySnapshot(groupId: string, allMessages: any[], memory: any, options?: any): any;
