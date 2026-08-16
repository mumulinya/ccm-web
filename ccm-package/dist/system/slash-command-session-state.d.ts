export declare function readSlashCommandSessionState(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string): {
    revision: number;
    generation: number;
    preferences: any;
    planMode: any;
};
export declare function exitSlashCommandSessionPlanMode(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string): {
    exited: boolean;
    revision: any;
    generation: number;
    planMode: {
        enabled: boolean;
        planId: string;
        description: string;
        exitedAt: string;
        updatedAt: string;
    };
} | {
    exited: boolean;
    alreadyAgent?: undefined;
    revision?: undefined;
    generation?: undefined;
} | {
    exited: boolean;
    alreadyAgent: boolean;
    revision: number;
    generation: number;
};
export declare function renderSlashCommandSessionDirective(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string): string;
