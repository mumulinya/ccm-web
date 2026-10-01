export declare const CCM_PROJECT_ANALYSIS_INDEX_SCHEMA: "ccm-project-analysis-index-v1";
export type CcmProjectAnalysisIndexV1 = {
    schema: typeof CCM_PROJECT_ANALYSIS_INDEX_SCHEMA;
    projectId: string;
    generation: number;
    repoStateChecksum: string;
    status: "queued" | "building" | "ready" | "stale" | "failed";
    symbolChecksum: string;
    dependencyChecksum: string;
    contractChecksum: string;
    testMappingChecksum: string;
    indexedFileCount: number;
    unresolvedCount: number;
    contentStored: false;
};
export declare function getProjectAnalysisIndex(projectId: string): CcmProjectAnalysisIndexV1;
export declare function ensureProjectAnalysisIndex(input: {
    projectId: string;
    root: string;
    force?: boolean;
}): CcmProjectAnalysisIndexV1;
export declare function queryProjectAnalysisIndex(projectId: string, kind: "dependencies" | "contracts" | "tests", limit?: number): unknown[];
export declare function markProjectAnalysisIndexStale(projectId: string): void;
export declare function scheduleProjectAnalysisIndexRefresh(input: {
    projectId: string;
    root: string;
    delayMs?: number;
}): void;
export declare function closeProjectAnalysisIndexes(): void;
