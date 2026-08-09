export declare function readSlashCommandSessionState(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string): {
    revision: number;
    generation: number;
    preferences: any;
    planMode: any;
};
export declare function renderSlashCommandSessionDirective(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string): string;
