export declare function getGroupToolContinuityDir(groupId: string): string;
export declare function getGroupToolContinuitySnapshotFile(groupId: string): string;
export declare function getGroupToolContinuityMarkdownFile(groupId: string): string;
export declare function normalizeToolContinuitySkill(value: any, source?: string, at?: string): {
    name: string;
    contentHash: string;
    source: string;
    lastSeenAt: string;
    sourcePath?: undefined;
} | {
    name: string;
    contentHash: string;
    sourcePath: string;
    source: string;
    lastSeenAt: string;
};
export declare function compactToolContinuityStatus(row?: any, kind?: string, source?: string): {
    name: string;
    state: string;
    contentHash: string;
    source: string;
    raw?: undefined;
    server?: undefined;
    serverName?: undefined;
    tool?: undefined;
    missingTools?: undefined;
    availableTools?: undefined;
} | {
    raw: string;
    server: string;
    serverName: string;
    tool: string;
    state: string;
    missingTools: any;
    availableTools: any;
    source: string;
    name?: undefined;
    contentHash?: undefined;
};
export declare function compactToolContinuityReadiness(readiness?: any, source?: string): {
    schema: any;
    source: string;
    dispatchReady: boolean;
    status: string;
    requested: any;
    available: any;
    missing: any;
    invalid_mcp_grants: number;
    unavailable: any;
};
export declare function buildGroupToolContinuityConfigSources(groupId: string, memory?: any): {
    groupFound: boolean;
    memberCount: any;
    configuredTools: {
        mcp: string[];
        skill: string[];
    };
    configuredSources: any[];
};
export declare function renderGroupToolContinuityMarkdown(snapshot?: any): string;
export declare function buildGroupToolContinuitySnapshot(groupId: string, memory?: any, options?: any): any;
export declare function summarizeGroupToolContinuitySnapshot(snapshot?: any): any;
export declare function persistGroupToolContinuitySnapshot(groupId: string, memory?: any, options?: any): any;
export declare function readGroupToolContinuitySnapshotSummary(groupId: string): any;
