export type ScopeExpansionRequest = {
    id: string;
    path: string;
    reason: string;
    allowedChanges: string[];
    requestedBy: string;
    status: "pending" | "approved" | "rejected";
    requestedAt: string;
    approvedAt?: string;
    approvedBy?: string;
};
export declare function createScopeExpansionRequest(input: any): ScopeExpansionRequest;
export declare function approvedScopePaths(task: any): string[];
export declare function scopeExpansionPolicy(task: any): any;
