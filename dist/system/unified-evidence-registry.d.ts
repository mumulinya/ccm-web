/**
 * Shared, content-free evidence registry.
 *
 * The registry deliberately stores facts about an observation rather than the
 * command output or prompt that produced it.  Full output remains in the
 * current execution loop and is projected to this shape before persistence.
 */
export declare const EVIDENCE_SCHEMA: "ccm-evidence-registry-v1";
export declare const EVIDENCE_STORE_FILE: string;
export type EvidenceType = "command" | "diff" | "test" | "review" | "artifact" | "source";
export type EvidenceStatus = "valid" | "stale" | "invalid" | "unknown";
export type RepoStateIdentity = {
    realWorkDir: string;
    worktree: string;
    gitHead: string;
    gitTreeHash: string;
    gitStatusHash: string;
    dirtyPatchHash: string;
    declaredFileHash: string;
};
export type EvidenceRecord = {
    schema: typeof EVIDENCE_SCHEMA;
    evidenceId: string;
    evidenceType: EvidenceType;
    taskId: string;
    workItemId: string;
    scope: string;
    scopeId: string;
    exactSessionId: string;
    generation: number;
    attempt: number;
    leaseId: string;
    repoStateIdentity: RepoStateIdentity | null;
    producerAgentId: string;
    operationFingerprint: string;
    status: EvidenceStatus;
    subject: string;
    references: string[];
    summary: string;
    tokenCount: number;
    createdAt: string;
    expiresAt: string;
    sourceChecksum: string;
    contentStored: false;
};
export declare function captureRepoStateIdentity(workDir: string, declaredFiles?: string[]): RepoStateIdentity;
export declare function repoStateFingerprint(identity: RepoStateIdentity | null | undefined): string;
export declare function compareRepoStateIdentity(expected: RepoStateIdentity | null | undefined, current: RepoStateIdentity | null | undefined): EvidenceStatus;
export declare function normalizeEvidence(input: any): EvidenceRecord;
export declare function recordEvidence(input: any): EvidenceRecord;
export declare function listEvidence(filter?: any): EvidenceRecord[];
export declare function refreshEvidence(record: EvidenceRecord, current: RepoStateIdentity | null): EvidenceRecord;
export declare function refreshEvidenceForTask(task: any, current: RepoStateIdentity | null, options?: {
    strict?: boolean;
}): EvidenceRecord[];
export declare function buildAcceptanceEvaluation(criteria: any[], evidence: EvidenceRecord[]): {
    satisfied: boolean;
    criteria: {
        criterionId: string;
        description: string;
        requiredEvidenceTypes: string[];
        status: string;
        evidenceIds: string[];
    }[];
    evidenceIds: string[];
};
export declare function runUnifiedEvidenceRegistrySelfTest(): {
    pass: boolean;
    record: EvidenceRecord;
    evaluation: {
        satisfied: boolean;
        criteria: {
            criterionId: string;
            description: string;
            requiredEvidenceTypes: string[];
            status: string;
            evidenceIds: string[];
        }[];
        evidenceIds: string[];
    };
};
