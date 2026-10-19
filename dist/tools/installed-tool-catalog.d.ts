export declare function installedRecordAllowed(kind: "mcp" | "skill", item: any, ignoreConnection?: boolean): boolean;
export declare function resolveInstalledToolCatalog(input?: {
    mcpTools?: any[];
    skills?: any[];
    runtime?: any;
}): {
    availabilityMode: "installed";
    tools: {
        mcp: any[];
        skill: any[];
    };
    entries: {
        kind: string;
        name: any;
        description: string;
        installed: boolean;
        enabled: boolean;
        ready: boolean;
        integrity: boolean;
        state: any;
        reason: string;
        version: string;
        source: any;
        materialHash: any;
    }[];
    revision: string;
};
export declare function installedToolGrants(): {
    mcp: any[];
    skill: any[];
};
export declare function currentInstalledToolGrants(): {
    mcp: any[];
    skill: any[];
};
export declare function buildInstalledToolAvailabilityPayload(_legacy?: any): any;
export declare function currentInstalledRecordAllowed(kind: "mcp" | "skill", name: string): boolean;
export declare function isToolSelectionSubset(requested: any, current: any): boolean;
export declare function rejectLegacyToolSelection(payload: any): void;
export declare function migrateInstalledToolAvailability(): void;
