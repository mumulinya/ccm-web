import { GroupTypedMemoryType } from "./typed-memory-shared";
export declare function postCompactCompletionMemoryPreservationClosureReceiptSourceReliability(entry?: any, options?: any): {
    source: string;
    status: string;
    reliability: number;
};
export declare function getGroupTypedMemoryDistillationLedgerFile(groupId: string): any;
export declare function getGroupTypedMemoryDistillationLockFile(groupId: string): any;
export declare function getGroupTypedMemoryDistillationTransactionStateFile(groupId: string): any;
export declare function groupTypedMemoryDistillationLockChecksum(lock?: any): string;
export declare function groupTypedMemoryDistillationStateChecksum(state?: any): string;
export declare function typedMemoryDistillationProcessAlive(pid: number): boolean;
export declare function typedMemoryDistillationWait(ms: number): void;
export declare function inspectGroupTypedMemoryDistillationLock(groupId: string, options?: any): any;
export declare function readGroupTypedMemoryDistillationTransactionState(groupId: string): any;
export declare function writeGroupTypedMemoryDistillationTransactionState(groupId: string, value: any): any;
export declare function nextGroupTypedMemoryDistillationFencingToken(groupId: string, abandonedLock?: any): number;
export declare function writeGroupTypedMemoryDistillationLockHandle(handle: any, patch?: any): any;
export declare function acquireGroupTypedMemoryDistillationLock(groupId: string, options?: any): {
    acquired: boolean;
    reason: string;
    waitedMs: number;
    status: any;
    handle?: undefined;
    lock?: undefined;
    recoveredLeaseCount?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    handle: any;
    lock: any;
    waitedMs: number;
    recoveredLeaseCount: number;
    reason?: undefined;
    status?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    reason: string;
    waitedMs: number;
    error: string;
    status?: undefined;
    handle?: undefined;
    lock?: undefined;
    recoveredLeaseCount?: undefined;
} | {
    acquired: boolean;
    reason: string;
    waitedMs: number;
    status?: undefined;
    handle?: undefined;
    lock?: undefined;
    recoveredLeaseCount?: undefined;
    error?: undefined;
};
export declare function verifyGroupTypedMemoryDistillationLock(handle: any): {
    owned: boolean;
    reason: string;
    status?: undefined;
} | {
    owned: boolean;
    reason: string;
    status: any;
};
export declare function renewGroupTypedMemoryDistillationLock(handle: any): {
    renewed: boolean;
    reason: string;
    verification: {
        owned: boolean;
        reason: string;
        status?: undefined;
    } | {
        owned: boolean;
        reason: string;
        status: any;
    };
    lock?: undefined;
} | {
    renewed: boolean;
    reason: string;
    verification: {
        owned: boolean;
        reason: string;
        status?: undefined;
    } | {
        owned: boolean;
        reason: string;
        status: any;
    };
    lock: any;
};
export declare function releaseGroupTypedMemoryDistillationLock(handle: any, finalStatus?: string): boolean;
export declare function runGroupTypedMemoryDistillationMutation(groupId: string, mutationKind: string, options: any, operation: (context: any) => any): any;
export declare function extractGroupLogPositiveFeedbackLifecycleRequests(groupId: string, messages?: any[]): any[];
export declare function positiveFeedbackLifecycleEventChecksum(event: any): string;
export declare function applyGroupPositiveFeedbackLifecycle(groupId: string, facts: any, requests?: any[], previous?: any, options?: any): {
    facts: any;
    lifecycle: {
        schema: string;
        version: number;
        groupId: string;
        activeValidatedCount: number;
        revokedCount: number;
        supersededCount: number;
        currentSourceProofCount: number;
        eventCount: number;
        observationCount: number;
        appliedThisRun: number;
        rejectedThisRun: number;
        invalidBindingThisRun: number;
        events: any[];
        observations: any[];
        updatedAt: any;
    };
};
export declare function groupLogDistillationAdmission(candidate: any): {
    admitted: boolean;
    reason: string;
    hardExclusion: boolean;
    durable: boolean;
    nonObvious: boolean;
    hasRationale: boolean;
    confidence: number;
    why: string;
    howToApply: string;
};
export declare function addDistilledCandidate(candidates: any[], category: GroupTypedMemoryType, type: string, message: any, index: number, text: any, overrides?: any): void;
export declare function extractGroupLogDistillationCandidates(groupId: string, messages?: any[]): any[];
export declare function applyGroupLogDistillationAdmission(candidates?: any[]): {
    admitted: any[];
    rejected: any[];
};
export declare function filterExistingDistilledFactsByAdmission(facts?: any): {
    admittedFacts: any;
    rejected: any[];
};
export declare function buildGroupLogDistillationAdmissionLedger(previous?: any, admitted?: any[], rejected?: any[], evicted?: any[], updatedAt?: string): {
    schema: string;
    version: number;
    evaluatedThisRun: number;
    admittedThisRun: number;
    rejectedThisRun: number;
    evictedExistingFactCount: number;
    hardExclusionThisRun: number;
    positiveConfirmationCandidateCount: number;
    positiveConfirmationAdmittedCount: number;
    positiveConfirmationRejectedCount: number;
    positiveConfirmationInvalidBindingCount: number;
    admittedByCategory: any;
    reasonCounts: Record<string, number>;
    observationCount: number;
    observations: any[];
    updatedAt: string;
};
export declare function readGroupTypedMemoryDistillationLedger(groupId: string): any;
export declare function pruneDistilledFacts(facts?: any, perTypeLimit?: number): any;
export declare function renderDistilledMemoryBody(title: string, facts: any[], options?: any): string;
export declare function preservedGroupTypedMemoryDistillationArchives(...ledgers: any[]): any;
export declare function modelExtractionTypedArchiveChecksum(archive: any): string;
export declare function modelExtractionReceiptChecksum(receipt: any): string;
export declare function modelExtractionArtifactChecksum(artifact: any): string;
export declare function modelExtractionGraphChecksum(graph: any): string;
export declare function modelExtractionEvidenceComparable(value: any): string;
export declare function verifyModelExtractionGraphForTypedMemory(graph: any): any;
export declare function validateModelExtractionTypedMemoryInput(scopeId: string, input: any): {
    groupId: string;
    groupSessionId: string;
    receipt: any;
    graph: any;
    transcript: string;
    sourceRows: any[];
    markdown: string;
    requestArtifact: any;
    resultArtifact: any;
    currentReceiptValid: boolean;
    resultArtifactValid: boolean;
};
export declare function modelExtractionTopicConceptProfile(value: any): {
    concepts: string[];
    canonicalConcepts: string[];
    lexicalConcepts: string[];
    confidence: number;
    lowConfidence: boolean;
    language: string;
};
export declare function modelExtractionTopicConcepts(value: any): string[];
export declare function modelExtractionTopicSimilarity(left?: string[], right?: string[]): number;
export declare function modelExtractionTopicDisplayConcept(concepts: string[], category: string, topicId: string): string;
export declare function modelExtractionTopicSlug(category: string, concepts: string[], topicId: string): string;
export declare function buildGroupSessionModelExtractionTypedMemoryTopics(factsInput?: any, previousTopicsInput?: any, options?: any): {
    schema: string;
    version: number;
    facts: any;
    topics: {
        [k: string]: any;
    };
    activeTopicCount: number;
    retiredTopicCount: number;
    mergedTopicCount: number;
    createdTopicCount: number;
    reusedTopicCount: number;
    consolidatedFactCount: any;
    unclassifiedFactCount: any;
    lowConfidenceFactCount: number;
    rebalancedFactCount: number;
    crossLanguageReuseCount: number;
    maxTopicsPerCategory: number;
    updatedAt: string;
};
export declare function renderModelExtractionTypedMemoryBody(title: string, facts: any[], updatedAt: string): string;
export declare function distillGroupSessionModelExtractionToTypedMemory(scopeId: string, input: any, options?: any): any;
export declare function normalizeProviderReproofReceiptConsumptionStatus(value: any): "missing" | "blocked" | "invalid" | "verified" | "used" | "ignored" | "strong";
export declare function providerReproofReceiptConsumptionCategory(status: string): "caution" | "promoted";
export declare function providerReproofReceiptConsumptionRecommendation(row?: any): "requires_followup_before_reuse" | "do_not_promote_unless_current_task_explicitly_matches" | "recall_but_verify_native_provider_proof_ledger" | "promote_recall_with_current_source_verification" | "promote_recall_with_current_repo_verification";
