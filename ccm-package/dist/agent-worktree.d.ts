export type ChildAgentIsolationMode = "shared" | "worktree";
export interface PreparedAgentWorkDir {
    mode: ChildAgentIsolationMode;
    requestedMode: ChildAgentIsolationMode;
    workDir: string;
    originalWorkDir: string;
    worktreePath?: string;
    worktreeBranch?: string;
    reused?: boolean;
    warning?: string;
}
export declare function normalizeChildAgentIsolationMode(value: any): ChildAgentIsolationMode;
export declare function createChildAgentWorktree(baseWorkDir: string, options?: any): {
    worktreePath: string;
    worktreeBranch: string;
    reused: boolean;
};
export declare function prepareChildAgentWorkDir(baseWorkDir: string, options?: any): PreparedAgentWorkDir;
export declare function buildChildAgentWorktreeNotice(prepared: PreparedAgentWorkDir): string;
