export type WorkspaceReadContextIdentity = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    generation: number;
};
export type WorkspaceReadRange = {
    offset?: number;
    limit?: number;
    pages?: string;
    cellOffset?: number;
    cellLimit?: number;
    tokenBudget?: number;
};
export type WorkspaceReadEntry = {
    project: string;
    path: string;
    range: WorkspaceReadRange;
    checksum: string;
    mtimeMs: number;
    size: number;
    totalLines?: number;
    from?: number;
    to?: number;
    nextOffset?: number;
};
export declare class WorkspaceReadContextLedger {
    readonly epoch: string;
    readonly identity: WorkspaceReadContextIdentity;
    private entries;
    private signatures;
    private inFlight;
    constructor(identity: WorkspaceReadContextIdentity);
    lookup(project: string, filePath: string, range: WorkspaceReadRange, stat: {
        mtimeMs: number;
        size: number;
    }): WorkspaceReadEntry;
    record(entry: WorkspaceReadEntry): void;
    invalidate(project: string, filePath: string): void;
    inFlightFor(project: string, filePath: string, range: WorkspaceReadRange): Promise<any>;
    setInFlight(project: string, filePath: string, range: WorkspaceReadRange, promise: Promise<any>): void;
}
export declare function createWorkspaceReadContextLedger(identity: WorkspaceReadContextIdentity): WorkspaceReadContextLedger;
