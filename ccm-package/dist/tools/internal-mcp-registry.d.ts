export declare const GROUP_COORDINATOR_INTERNAL_MCP = "ccm__group_coordinator";
export declare const FEISHU_INTERNAL_MCP = "mcp-feishu";
export declare function findCcmPackageRoot(): string;
export declare function discoverBundledInternalMcpManifests(packageRoot?: string): any[];
export declare function isInternalMcpName(value: any): boolean;
export declare function buildBundledFeishuMcpTool(config?: any, fallback?: any): any;
export declare function buildInternalMcpCatalog(options?: {
    feishuConfig?: any;
    runtimeServers?: any[];
    packageRoot?: string;
}): {
    schema: string;
    success: boolean;
    source: string;
    read_only: boolean;
    items: ({
        name: string;
        display_name: string;
        description: string;
        version: string;
        origin: string;
        protected: boolean;
        immutable: boolean;
        bundled: boolean;
        lifecycle: string;
        lifecycle_label: string;
        scopes: string[];
        tools: {
            name: string;
            label: string;
            description: string;
        }[];
        state: string;
        state_label: string;
        state_detail: string;
        configuration_route: string;
        technical: {
            entry_path: string;
            discovery: string;
            server_name: string;
        };
    } | {
        name: any;
        display_name: any;
        description: any;
        version: any;
        origin: string;
        protected: boolean;
        immutable: boolean;
        bundled: boolean;
        lifecycle: any;
        lifecycle_label: any;
        scopes: any;
        tools: any;
        state: string;
        state_label: string;
        state_detail: string;
        configuration_route: string;
        runtime: {
            state: string;
            connected: boolean;
            tools_count: number;
            error: string;
        };
        technical: {
            entry_path: string;
            manifest_path: any;
            discovery: string;
            server_name: any;
        };
    })[];
    summary: {
        total: number;
        ready: number;
        needs_configuration: number;
        unavailable: number;
        tools: any;
    };
};
export declare function runInternalMcpRegistrySelfTest(packageRoot?: string): {
    pass: boolean;
    checks: {
        bundledCatalogDiscovered: boolean;
        coordinatorProtectedAndReady: boolean;
        feishuBundledAndReady: boolean;
        workflowMcpsProtectedAndReady: boolean;
        feishuNeedsSettingsWithoutCredentials: boolean;
        internalNamesReserved: boolean;
        secretsNeverExposed: boolean;
    };
    catalog: {
        schema: string;
        success: boolean;
        source: string;
        read_only: boolean;
        items: ({
            name: string;
            display_name: string;
            description: string;
            version: string;
            origin: string;
            protected: boolean;
            immutable: boolean;
            bundled: boolean;
            lifecycle: string;
            lifecycle_label: string;
            scopes: string[];
            tools: {
                name: string;
                label: string;
                description: string;
            }[];
            state: string;
            state_label: string;
            state_detail: string;
            configuration_route: string;
            technical: {
                entry_path: string;
                discovery: string;
                server_name: string;
            };
        } | {
            name: any;
            display_name: any;
            description: any;
            version: any;
            origin: string;
            protected: boolean;
            immutable: boolean;
            bundled: boolean;
            lifecycle: any;
            lifecycle_label: any;
            scopes: any;
            tools: any;
            state: string;
            state_label: string;
            state_detail: string;
            configuration_route: string;
            runtime: {
                state: string;
                connected: boolean;
                tools_count: number;
                error: string;
            };
            technical: {
                entry_path: string;
                manifest_path: any;
                discovery: string;
                server_name: any;
            };
        })[];
        summary: {
            total: number;
            ready: number;
            needs_configuration: number;
            unavailable: number;
            tools: any;
        };
    };
};
