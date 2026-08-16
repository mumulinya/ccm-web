export type ConversationPlanScope = "global" | "project" | "group";
export declare function isConversationPlanModeEnabled(scope: ConversationPlanScope, scopeId: string, exactSessionId: string): boolean;
export declare function conversationPlanModeWouldCauseSideEffect(input: {
    toolName?: string;
    isReadOnly?: boolean;
    knownTool?: boolean;
    workflowActionRequired?: boolean;
}): boolean;
export declare function conversationPlanModeHoldsParsed(parsed: any): boolean;
export declare function holdConversationPlanModeParsed(parsed: any): any;
export declare function applyConversationPlanModeHold(scope: ConversationPlanScope, scopeId: string, exactSessionId: string, parsed: any): any;
export declare function applyConversationPlanModeToRound(input: {
    enabled: boolean;
    parsed: any;
    requests: any[];
    isReadOnly: (request: any) => boolean;
}): {
    parsed: any;
    requests: any[];
    blockedRequests: any[];
    blockedResults: any[];
    held: boolean;
    stopLoop: boolean;
};
export declare function conversationPlanModeIdentityFromTask(task: any): {
    scope: ConversationPlanScope;
    scopeId: string;
    exactSessionId: string;
} | null;
export declare function exitConversationPlanModeForTask(task: any): {
    exited: boolean;
} | {
    scope: ConversationPlanScope;
    scopeId: string;
    exactSessionId: string;
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
    scope: ConversationPlanScope;
    scopeId: string;
    exactSessionId: string;
    exited: boolean;
    alreadyAgent?: undefined;
    revision?: undefined;
    generation?: undefined;
} | {
    scope: ConversationPlanScope;
    scopeId: string;
    exactSessionId: string;
    exited: boolean;
    alreadyAgent: boolean;
    revision: number;
    generation: number;
};
export declare function runConversationPlanModeGateSelfTest(): {
    pass: boolean;
    checks: {
        holdClearsDispatch: boolean;
        holdClearsProjectDelegate: boolean;
        readToolsPass: boolean;
        writeToolsHeld: boolean;
        unknownToolsHeld: boolean;
        disabledDoesNotHold: boolean;
        unknownToolClosed: boolean;
        readToolOpen: boolean;
        groupSessionWins: boolean;
        projectIdentityResolved: boolean;
    };
};
