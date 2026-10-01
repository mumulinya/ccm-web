export declare const GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED = "\u5168\u5C40\u4F1A\u8BDD\u4E0D\u652F\u6301 Plan \u6A21\u5F0F\u3002\u5168\u5C40 Agent \u4E0D\u8BFB\u53D6\u9879\u76EE\u4EE3\u7801\uFF1B\u5B9E\u73B0\u8BA1\u5212\u8BF7\u5230\u7FA4\u804A\u6216\u9879\u76EE\u4E3B Agent \u4F1A\u8BDD\u3002";
export declare function conversationPlanModeSupported(scope: "global" | "project" | "group"): scope is "group" | "project";
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
