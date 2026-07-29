type ProjectFeishuTurnInput = {
    project: string;
    projectSessionId: string;
    message: string;
    files?: any[];
    platformContext: Record<string, any>;
    requestId: string;
};
export declare function projectFeishuTurnConversationId(project: string, projectSessionId: string): string;
export declare function enqueueProjectFeishuTurn(input: ProjectFeishuTurnInput): {
    conversationId: string;
    position: number;
    turn: import("../../agents/conversation-turn-control").ConversationTurnRecord;
    duplicate: boolean;
};
export declare function drainProjectFeishuTurns(baseUrl: string, project: string, projectSessionId: string): Promise<void>;
export declare function startProjectFeishuTurnRecoveryForServer(baseUrl: string): {
    started: boolean;
};
export declare function stopProjectFeishuTurnRecoveryForServer(): void;
export {};
