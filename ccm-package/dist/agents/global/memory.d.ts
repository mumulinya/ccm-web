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
export declare function setGlobalAgentMemoryPolicy(input: any): any;
export declare function extractGlobalMemoryCandidates(messages: any[], sessionId: string): {
    candidates: GlobalMemoryItem[];
    rejected: number;
};
export declare function compactGlobalAgentSession(sessionId: string, options?: {
    force?: boolean;
    reason?: string;
}): {
    compacted: boolean;
    reason: string;
    tokenCount: any;
    messageCount: any;
    memory: any;
    archive?: undefined;
    session?: undefined;
} | {
    compacted: boolean;
    archive: any;
    session: any;
    memory: any;
    reason?: undefined;
    tokenCount?: undefined;
    messageCount?: undefined;
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
        compacted: boolean;
        reason: string;
        tokenCount: any;
        messageCount: any;
        memory: any;
        archive?: undefined;
        session?: undefined;
    } | {
        compacted: boolean;
        archive: any;
        session: any;
        memory: any;
        reason?: undefined;
        tokenCount?: undefined;
        messageCount?: undefined;
    };
};
export declare function recallGlobalAgentMemory(query: string, options?: {
    sessionId?: string;
    limit?: number;
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
export declare function buildGlobalAgentMemoryPacket(query: string, options?: {
    sessionId?: string;
    limit?: number;
    maxChars?: number;
}): string;
export declare function recordGlobalMissionMemory(input: any): GlobalMemoryItem;
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
