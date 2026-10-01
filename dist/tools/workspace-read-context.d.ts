/** Fingerprint the complete selected text, not a checksum-only reference. */
export declare function workspaceTextEvidenceKey(value: any, project?: string): string;
export type WorkspaceReadContextIdentity = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    generation: number;
};
export type WorkspaceReadRange = {
    jsonPointers?: string[];
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
    private jsonEvidence;
    private textEvidence;
    hasJsonEvidence(id: string): boolean;
    retainJsonEvidence(ids: Set<string>): void;
    hasTextEvidence(id: string): boolean;
    retainTextEvidence(ids: Set<string>): void;
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
/** Only complete selections in the effective messages authorize unchanged replies.
 * Keep the existing export for checkpoint callers and older integrations. */
export declare function reconcileJsonReadEvidence(identity: Partial<WorkspaceReadContextIdentity>, messages: any[]): void;
export declare function createWorkspaceReadContextLedger(identity: WorkspaceReadContextIdentity): WorkspaceReadContextLedger;
export declare function clearWorkspaceReadContextLedger(identity?: Partial<WorkspaceReadContextIdentity>): number;
