export type SlashCommandScope = "global" | "project" | "group";
export declare function getSlashCommandSummary(): {
    total: number;
    builtin: number;
    custom: number;
    skills: number;
    customFile: string;
    auditFile: string;
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
        checkpointAndRollbackAreControlled: boolean;
        localMutationNeedsManagePermission: boolean;
        endpointArgumentsAreEncoded: any;
        longestContextPlaceholderWins: boolean;
    };
    endpointPreview: any;
    counts: {
        global: number;
        project: number;
        group: number;
    };
};
export declare function handleSlashCommandsApi(pathname: string, req: any, res: any, parsed: any): boolean;
