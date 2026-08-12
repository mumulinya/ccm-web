export type WorkspaceBoundaryResult = {
    pass: boolean;
    quarantined: Array<{
        executionId: string;
        checkpointId: string;
        paths: string[];
    }>;
    blocked: Array<{
        executionId: string;
        paths: string[];
        reason: string;
    }>;
};
/**
 * Fail-closed boundary for third-party native editors. Violating files are
 * selectively restored only inside isolated worktrees. Shared workspaces are
 * never mutated automatically and remain blocked for explicit user review.
 */
export declare function enforceNativeWorkspaceBoundary(taskId: string, violations?: any[]): WorkspaceBoundaryResult;
