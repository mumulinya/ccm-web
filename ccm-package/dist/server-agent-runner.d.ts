export declare function createAgentRunnerRuntime(deps: any): {
    buildProjectToolContext: (projectName: string, workDir?: string, agentType?: string, options?: any) => {
        prompt: any;
        allowedTools: any;
        audit: any;
        workEvent: {
            id: string;
            time: string;
            agent: string;
            kind: string;
            text: string;
            runtimeToolSync: any;
        };
        dispatchGate: any;
        runtimeToolSnapshot: {
            snapshotId: string;
            snapshotPath: string;
            mcpConfigPath: string;
            runtime: any;
            allowedTools: any;
            requested: any;
            permissionRules: any;
            permission_rules: any;
            authorizationReadiness: any;
            authorization_readiness: any;
            dispatchGate: any;
            dispatch_gate: any;
            catalogRevision: string;
        };
    };
    callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => Promise<any>;
    callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
    callAgentStream: (projectName: string, message: string, workDir: string, agentType: string, res: any, options?: any) => void;
    sendRuntimeToolDispatchBlocked: (res: any, toolContext: any) => any;
};
