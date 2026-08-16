export declare function isGlobalAlwaysInlineTool(name: string): boolean;
export declare function isGlobalDeferredTool(name: string, loadedToolNames?: string[]): boolean;
export declare function globalDiscoverableManagementTools(loadedToolNames?: string[]): {
    name: string;
    canonicalName: string;
    server: string;
    description: string;
    inputSchema: {
        type: string;
        additionalProperties: boolean;
        required: string[];
        properties: Record<string, any>;
    };
    loadPolicy: "search";
    authorized: boolean;
    connected: boolean;
    annotations: {
        readOnlyHint: boolean;
    };
}[];
export declare function runGlobalToolLoadPolicySelfTest(): {
    pass: boolean;
    checks: {
        inspectSystemInline: boolean;
        readFileInline: boolean;
        toolSearchInline: boolean;
        manageProjectDeferredUntilLoaded: boolean;
        orchestrateDeferred: boolean;
        gitSearchDeferredUntilLoaded: boolean;
        discoverableOmitsLoadedAndWorkspace: boolean;
    };
};
