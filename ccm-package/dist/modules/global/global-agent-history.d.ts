export declare function createGlobalAgentHistoryRuntime(deps: any): {
    runGlobalAgentHistorySyncSelfTest: () => {
        pass: boolean;
        checks: {
            preservesType: boolean;
            preservesRun: boolean;
            preservesDeliveryReport: boolean;
            mergesRicherMetadata: any;
            preservesProgressCheckpoints: boolean;
            sanitizesProtocolContent: boolean;
            sanitizesArtifactPathContent: boolean;
        };
    };
    mergeGlobalAgentMessages: (existing?: any[], incoming?: any[]) => any[];
    loadGlobalAgentHistoryStore: () => any;
    syncGlobalAgentWebHistory: (payload: any) => any;
    getGlobalAgentConversationMessages: (sessionId: string) => any[];
    appendGlobalAgentConversationMessage: (sessionId: string, role: "user" | "assistant", content: string, source?: string) => void;
    resolveFeishuGlobalAgentSessionId: (payload: any, store?: any) => string;
    runFeishuGlobalAgentSessionRoutingSelfTest: () => {
        pass: boolean;
        checks: {
            removesDeletedWebSession: boolean;
            usesValidCurrentSession: boolean;
            fallsBackToMostRecentWebSession: boolean;
            onlyUsesAcpSessionWithoutWebHistory: boolean;
        };
    };
};
