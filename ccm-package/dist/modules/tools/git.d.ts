type FileStats = {
    additions: number;
    deletions: number;
    binary: boolean;
};
export declare function inspectGitRemoteState(workDir: string, changedFiles?: number): {
    remoteUrl: string;
    remoteName: string;
    branch: string;
    detached: boolean;
    upstream: string;
    ahead: number;
    behind: number;
    dirty: boolean;
    changedFiles: number;
    canFetch: boolean;
    canPull: boolean;
    canPush: boolean;
};
export declare function normalizeRepoPath(filePath: any): string;
export declare function resolveSafeProjectFile(workDir: string, filePath: any): {
    normalized: string;
    absolute: string;
};
export declare function parseGitStatus(output: string): {
    statusText: string;
    statusColor: string;
    path: string;
    originalPath: string;
    status: string;
    statusCode: string;
    indexStatus: string;
    worktreeStatus: string;
    staged: boolean;
    unstaged: boolean;
    untracked: boolean;
    conflict: boolean;
}[];
export declare function parseNumstat(output: string): Map<string, FileStats>;
export declare function buildGitStatusSummary(files: any[]): any;
export declare function validatePatchPaths(patchText: string): string[];
export declare function handleGitApi(pathname: string, req: any, res: any, parsed: any): boolean;
export {};
