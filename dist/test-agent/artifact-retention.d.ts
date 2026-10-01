export interface TestAgentArtifactRetentionOptions {
    rootDir?: string;
    retentionDays?: number;
    maxRuns?: number;
    maxTotalBytes?: number;
    excludeDirs?: string[];
    force?: boolean;
}
export interface TestAgentArtifactRetentionResult {
    schema: "ccm-test-agent-artifact-retention-v1";
    rootDir: string;
    scannedRuns: number;
    retainedRuns: number;
    removedRuns: number;
    removedBytes: number;
    retainedBytes: number;
    skipped: boolean;
    errors: string[];
}
export interface TestAgentArtifactCatalogItem {
    id: string;
    type: string;
    title: string;
    project: string;
    status: string;
    available: boolean;
    size_bytes: number;
    sha256: string;
    mime_type: string;
    preview_kind: "image" | "text" | "download";
}
export interface TestAgentArtifactCatalogRun {
    run_id: string;
    task_id: string;
    group_id: string;
    status: string;
    recommendation: string;
    summary: string;
    started_at: string;
    finished_at: string;
    retained_until: string;
    retention_status: "available" | "expired";
    artifacts: TestAgentArtifactCatalogItem[];
}
export interface ResolvedTestAgentArtifact {
    file_path: string;
    file_name: string;
    mime_type: string;
    preview_kind: TestAgentArtifactCatalogItem["preview_kind"];
}
export declare function listTestAgentArtifactCatalogForTasks(taskIds: string[], options?: {
    rootDir?: string;
    retentionDays?: number;
}): TestAgentArtifactCatalogRun[];
export declare function resolveTestAgentArtifactForTask(input: {
    taskId: string;
    runId: string;
    artifactId: string;
    rootDir?: string;
}): ResolvedTestAgentArtifact | null;
export declare function pruneTestAgentArtifacts(options?: TestAgentArtifactRetentionOptions): TestAgentArtifactRetentionResult;
export declare function purgeTestAgentArtifactsForTask(taskId: string, options?: {
    rootDir?: string;
}): {
    schema: string;
    taskId: string;
    removed: string[];
    errors: string[];
};
