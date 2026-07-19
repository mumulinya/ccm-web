export type SlashCommandScope = "global" | "project" | "group";
type SlashRisk = "safe" | "guarded" | "high";
type SlashImplementation = "local-query" | "local-mutation" | "client" | "navigation" | "agent-workflow";
export declare function getSlashCommandSummary(): {
    total: number;
    builtin: number;
    custom: number;
    skills: number;
    customFile: string;
    auditFile: string;
};
export declare function getSlashCommandContractSnapshot(): {
    commands: {
        name: string;
        aliases: string[];
        scopes: SlashCommandScope[];
        risk: SlashRisk;
        requiresArgs: boolean;
        requiresContext: boolean;
        implementation: SlashImplementation;
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
        highRiskIsNotDirectAction: boolean;
        navigationIsExplicit: boolean;
        argumentsAndContextExpand: boolean;
        aliasesAvailable: boolean;
        parameterSchemaPublished: boolean;
        permissionDerivedFromRisk: boolean;
        skillsBecomeCommands: boolean;
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
