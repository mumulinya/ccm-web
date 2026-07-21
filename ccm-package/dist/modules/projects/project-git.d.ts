export declare function normalizeGitHubRepositoryUrl(value: unknown): string;
export declare function githubWebUrl(value: unknown): string;
export declare function sanitizeGitRemoteUrl(value: unknown): string;
export declare function normalizeGitBranch(value: unknown): string;
export declare function inspectProjectGit(workDir: string): any;
export declare function cloneGitHubRepository(input: {
    repositoryUrl: unknown;
    destination: unknown;
    branch?: unknown;
}): Promise<any>;
export declare function configureProjectRepository(input: {
    workDir: string;
    repositoryUrl?: unknown;
    initialize?: boolean;
}): any;
