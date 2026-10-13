export declare function captureDispatchReworkEvidenceSync(task: any, workspacePath?: string): {
    available: boolean;
    reason: string;
} | {
    declaredFileHash: string;
    contentChecksum: string;
    artifacts: {
        kind: "receipt" | "file" | "external" | "diff" | "report" | "test_evidence";
        path: string;
        checksum: string;
    }[];
    realWorkDir: string;
    worktree: string;
    gitHead: string;
    gitTreeHash: string;
    gitStatusHash: string;
    dirtyPatchHash: string;
    available: boolean;
    reason?: undefined;
};
/** Recompute content, including untracked files. Timestamps and model reports
 * are deliberately excluded from the no-progress identity. */
export declare function captureDispatchReworkEvidence(task: any, workspacePath?: string): Promise<{
    available: boolean;
    reason: string;
} | {
    declaredFileHash: string;
    contentChecksum: string;
    artifacts: {
        kind: "receipt" | "file" | "external" | "diff" | "report" | "test_evidence";
        path: string;
        checksum: string;
    }[];
    realWorkDir: string;
    worktree: string;
    gitHead: string;
    gitTreeHash: string;
    gitStatusHash: string;
    dirtyPatchHash: string;
    available: boolean;
    reason?: undefined;
}>;
