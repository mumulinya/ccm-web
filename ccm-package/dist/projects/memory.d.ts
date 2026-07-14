export declare function scanProjectFileStructure(workDir: string, maxDepth?: number, maxEntries?: number): string;
export declare function loadProjectMemory(project: string, options?: {
    workDir?: string;
    resources?: any;
    refreshStructure?: boolean;
}): any;
export declare function updateProjectMemoryFromReceipt(input: {
    project: string;
    workDir?: string;
    groupId?: string;
    taskId?: string;
    receipt: any;
    actualFiles?: any[];
    resources?: any;
}): any;
export declare function buildProjectMemoryPacket(project: string, options?: {
    workDir?: string;
    resources?: any;
    query?: string;
}): string;
export declare function buildProjectExecutionBrief(project: string, taskText: string, options?: {
    workDir?: string;
    resources?: any;
    query?: string;
    verificationHints?: any;
}): string;
export declare function buildProjectConversationBrief(project: string, message: string, options?: {
    analysis?: boolean;
}): string;
export declare function runProjectMemorySelfTest(): {
    pass: boolean;
    checks: {
        compactsAfterThreshold: boolean;
        retainsOlderDigest: any;
        retainsNewestConclusion: boolean;
        archivesAreLosslessAcrossRollovers: any;
        archivesHaveIntegrityChecksums: any;
        decisionsRollIntoLosslessArchives: any;
        integrityValidationDetectsTampering: boolean;
        retrievesRelevantArchivedEvidence: boolean;
        projectBoundaryTracksTokenPressure: boolean;
        decisionBoundaryTracksTokenPressure: boolean;
        postCompactRestoreAnchorsRecorded: boolean;
        invokedSkillPreservedInMemory: boolean;
        buildsExecutionBriefWithRecallAndRules: boolean;
        atomicBackupRecoveryWorks: boolean;
    };
};
