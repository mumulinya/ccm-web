export declare function buildMemoryCenterOverview(): {
    generatedAt: string;
    groups: any[];
    projects: any[];
    globals: any[];
    tasks: any;
    alerts: any[];
    totals: {
        scopes: number;
        groupSessions: number;
        projects: number;
        taskAgents: any;
        alerts: number;
        beforeTokens: any;
        afterTokens: any;
    };
};
export declare function handleMemoryCenterApi(pathname: string, req: any, res: any, parsed: any): boolean;
