export type WorkspaceSearchEngine = "bundled_rg" | "system_rg" | "node_fallback";
export type WorkspaceSearchExecution = {
    engine: WorkspaceSearchEngine;
    timedOut: boolean;
    cancelled: boolean;
    partial: boolean;
};
export type WorkspaceSearchRunResult = WorkspaceSearchExecution & {
    stdout: string;
    stderr?: string;
};
export type WorkspaceSearchRunOptions = {
    signal?: AbortSignal;
    timeoutMs?: number;
    maxOutputBytes?: number;
    nodeFallback: () => Promise<WorkspaceSearchRunResult>;
};
export declare function runWorkspaceRipgrep(args: string[], cwd: string, options: WorkspaceSearchRunOptions): Promise<WorkspaceSearchRunResult>;
