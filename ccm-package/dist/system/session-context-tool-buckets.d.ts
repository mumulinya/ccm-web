export declare function isInternalContextToolServer(server: string): boolean;
export declare function isBuiltinOrWorkspaceToolDefinition(tool: any): boolean;
export declare function isUserMcpToolDefinition(tool: any): boolean;
export declare function selectUserMcpToolDefinitions(value: any): any[];
export declare function runSessionContextToolBucketSelfTest(): {
    pass: boolean;
    checks: {
        workspaceIsBuiltin: boolean;
        workspaceIsNotUserMcp: boolean;
        inspectStaysInToolDefinitions: boolean;
        userMcpDetected: boolean;
        selectFiltersWorkspace: boolean;
    };
};
