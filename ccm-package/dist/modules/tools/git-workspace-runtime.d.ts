export interface GitRepositoryIdentityV2 {
    schema: "ccm-git-repository-identity-v2";
    project_id: string;
    work_dir: string;
    repository_root: string;
    git_common_dir: string;
    head: string;
    branch: string;
    remote_fingerprint: string;
    checksum: string;
}
export interface GitWorkspaceSnapshotV2 {
    schema: "ccm-git-workspace-snapshot-v2";
    repository: GitRepositoryIdentityV2;
    status_checksum: string;
    index_checksum: string;
    worktree_content_checksum: string;
    checksum: string;
    captured_at: string;
}
export interface GitMutationLeaseV1 {
    schema: "ccm-git-mutation-lease-v1";
    lease_id: string;
    repository_checksum: string;
    operation: string;
    owner_pid: number;
    acquired_at: string;
    expires_at: string;
    file: string;
}
export interface GitCommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export declare function gitChecksum(value: any): string;
export declare function sanitizeGitDiagnostic(value: any, max?: number): string;
export declare function runGitCommand(workDir: string, args: string[], options?: {
    timeoutMs?: number;
    maxOutputBytes?: number;
    input?: string | Buffer;
    signal?: AbortSignal;
    env?: Record<string, string>;
    remote?: boolean;
}): Promise<GitCommandResult>;
export declare function tryGitCommand(workDir: string, args: string[], options?: any): Promise<{
    ok: boolean;
    output: string;
    error: string;
}>;
export declare function normalizeGitRepoPath(filePath: any): string;
export declare function resolveSafeRepositoryPath(workDir: string, filePath: any, options?: {
    allowLeafSymlink?: boolean;
}): {
    normalized: string;
    absolute: string;
    realRoot: string;
    leafSymlink: boolean;
};
export declare function captureRepositoryIdentity(workDir: string, projectId?: string): Promise<GitRepositoryIdentityV2>;
export declare function captureWorkspaceSnapshot(workDir: string, projectId?: string, statusRaw?: string): Promise<GitWorkspaceSnapshotV2 & {
    status_raw: string;
}>;
export declare function captureFileEvidence(workDir: string, files: any[]): Promise<any[]>;
export declare function acquireGitMutationLease(repository: GitRepositoryIdentityV2, operation: string, leaseMs?: number): Promise<GitMutationLeaseV1>;
export declare function releaseGitMutationLease(lease: GitMutationLeaseV1): Promise<boolean>;
export declare function withGitMutationLease<T>(workDir: string, projectId: string, operation: string, callback: (context: {
    repository: GitRepositoryIdentityV2;
    lease: GitMutationLeaseV1;
    before: GitWorkspaceSnapshotV2 & {
        status_raw: string;
    };
}) => Promise<T>): Promise<T>;
export declare function assertExpectedWorkspaceSnapshot(expected: any, actual: GitWorkspaceSnapshotV2): void;
export declare function buildGitMutationReceipt(input: {
    projectId: string;
    operation: string;
    before: GitWorkspaceSnapshotV2;
    after: GitWorkspaceSnapshotV2;
    files?: string[];
    actor?: string;
    outcome?: string;
}): Promise<{
    checksum: string;
    schema: string;
    project_id: string;
    operation: string;
    actor: string;
    outcome: string;
    before_snapshot_checksum: string;
    after_snapshot_checksum: string;
    base_head: string;
    result_head: string;
    files: any[];
    completed_at: string;
}>;
export declare function cleanupStaleGitMutationLeases(): number;
