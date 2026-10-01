export interface ProjectCloneReceiptV2 {
    schema: "ccm-project-clone-receipt-v2";
    id: string;
    destination: string;
    temporary_directory: string;
    repository_fingerprint: string;
    branch: string;
    status: "cloning" | "validated" | "completed" | "failed" | "cancelled" | "rolled_back" | "recovery_required";
    created_at: string;
    updated_at: string;
    error: string;
    destination_created_by_ccm: boolean;
    result_head: string;
    checksum: string;
}
export declare function getProjectCloneReceipt(id: string): ProjectCloneReceiptV2;
export declare function cancelProjectClone(id: string): ProjectCloneReceiptV2;
export declare function finalizeProjectCloneReceipt(id: string, status?: "completed" | "recovery_required", error?: string): ProjectCloneReceiptV2;
export declare function rollbackProjectClone(id: string, reason: string): Promise<ProjectCloneReceiptV2>;
export declare function cleanupStaleProjectCloneArtifacts(maxAgeMs?: number): number;
export declare function normalizeGitHubRepositoryUrl(value: unknown): string;
export declare function githubWebUrl(value: unknown): string;
export declare function sanitizeGitRemoteUrl(value: unknown): string;
export declare function normalizeGitBranch(value: unknown): string;
export declare function inspectProjectGit(workDir: string): any;
/**
 * Lightweight status projection for request-path diagnostics.
 *
 * The full inspector intentionally gathers GitHub authentication, remotes,
 * upstream divergence and the latest commit. Running that synchronous probe
 * from a latency-sensitive HTTP route can block the Node event loop for tens
 * of seconds when a repository or credential helper is slow. This projection
 * only reads the fields used by Session Status and applies a small, bounded
 * timeout to every Git command.
 */
export declare function inspectProjectGitQuick(workDir: string, timeoutMs?: number): any;
export declare function inspectProjectGitAsync(workDir: string): Promise<any>;
export declare function cloneGitHubRepository(input: {
    repositoryUrl: unknown;
    destination: unknown;
    branch?: unknown;
    receiptId?: unknown;
}): Promise<any>;
export declare function configureProjectRepository(input: {
    workDir: string;
    repositoryUrl?: unknown;
    initialize?: boolean;
}): any;
export declare function configureProjectRepositoryAsync(input: {
    workDir: string;
    repositoryUrl?: unknown;
    initialize?: boolean;
}): Promise<any>;
