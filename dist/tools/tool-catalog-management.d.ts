export declare function normalizeToolCatalogName(value: any): string;
export declare function normalizeMcpEnvironment(value: any, options?: {
    strict?: boolean;
}): Record<string, string>;
export declare function redactMcpCommand(value: any): string;
export declare function redactMcpToolForDisplay(tool?: any): {
    name: string;
    description: string;
    command: string;
    args: string[];
    commandRedacted: boolean;
    envConfigured: boolean;
    envKeys: string[];
    enabled: boolean;
    type: string;
    created_at: string;
    source: {
        id: string;
        label: string;
        trust: string;
    };
    version: string;
    author: string;
};
export declare function mergeMcpToolUpdate(existing: any, input?: any, options?: {
    create?: boolean;
}): any;
export declare function mergeSkillUpdate(existing: any, input?: any, options?: {
    create?: boolean;
}): any;
export declare function runToolCatalogManagementSelfTest(): {
    pass: boolean;
    checks: {
        displayHidesEnvironmentValues: boolean;
        displayRedactsCommandAndArgs: boolean;
        patchPreservesCredentialMaterial: any;
        explicitClearRemovesEnvironment: boolean;
        invalidCatalogNameRejected: boolean;
        invalidEnvironmentRejected: boolean;
    };
};
