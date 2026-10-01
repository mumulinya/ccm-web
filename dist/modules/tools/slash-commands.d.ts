export type SlashCommandScope = "global" | "project" | "group";
type SlashRisk = "safe" | "guarded" | "high";
type SlashImplementation = "local-query" | "local-mutation" | "client" | "navigation" | "agent-workflow";
type SlashExecutionType = "local-jsx" | "local" | "prompt";
type SlashDisplayMode = "overlay" | "transcript" | "conversation" | "skip";
type SlashCompatibility = "cc_exact" | "cc_equivalent" | "ccm_extension";
export declare function getSlashCommandSummary(): {
    total: number;
    builtin: number;
    custom: number;
    skills: string;
};
export declare function getSlashCommandContractSnapshot(): {
    commands: {
        compatibility: SlashCompatibility;
        action: {
            type: "prompt" | "navigate" | "query" | "mutation" | "client";
            prompt?: string;
            tab?: string;
            endpoint?: string;
            endpointByScope?: Partial<Record<SlashCommandScope, string>>;
            method?: "GET" | "POST";
            body?: Record<string, any>;
            clientAction?: string;
        };
        executionType: SlashExecutionType;
        displayMode: SlashDisplayMode;
        historyPolicy: "transient" | "persisted";
        modelVisibility: "hidden" | "visible";
        name: string;
        aliases: string[];
        scopes: SlashCommandScope[];
        risk: SlashRisk;
        requiresArgs: boolean;
        requiresContext: boolean;
        implementation: SlashImplementation;
    }[];
    counts: {
        global: number;
        project: number;
        group: number;
    };
};
export declare function runSlashCommandSelfTest(): {
    pass: boolean;
    checks: {
        parsesNameAndArguments: boolean;
        hasAllCoreScopes: boolean;
        scopeIsolation: boolean;
        scopePolicyEnforced: boolean;
        highRiskIsNotDirectAction: boolean;
        memoryUsesScopedManager: boolean;
        argumentsAndContextExpand: boolean;
        aliasesAvailable: boolean;
        parameterSchemaPublished: boolean;
        permissionDerivedFromRisk: boolean;
        skillsRequireScopeAuthorization: boolean;
        localQueriesDoNotInvokeModel: boolean;
        clientSessionCommandsAreExplicit: boolean;
        groupCompactIsDirectAndExactSession: boolean;
        checkpointAndRollbackAreControlled: boolean;
        localMutationNeedsManagePermission: boolean;
        endpointArgumentsAreEncoded: any;
        longestContextPlaceholderWins: boolean;
        allCommandsDeclareExecutableActions: boolean;
        implementationMetadataPublished: boolean;
        ccParityCommandsPresent: boolean;
        scopedToolCatalogCommands: boolean;
    };
    endpointPreview: any;
    counts: {
        global: number;
        project: number;
        group: number;
    };
};
export declare function handleSlashCommandsApi(pathname: string, req: any, res: any, parsed: any): boolean;
export {};
