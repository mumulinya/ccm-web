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
    createGlobalAgentConversationSession: (input?: any) => {
        id: string;
        name: string;
        titleOrigin: string;
        source: string;
        createdAt: string;
        updatedAt: string;
        messages: {
            role: string;
            content: string;
            timestamp: string;
            source: string;
        }[];
    };
    deleteGlobalAgentConversationSession: (sessionId: string, expectedSource?: string) => {
        deleted: boolean;
        session: any;
        context_cache_invalidated?: undefined;
    } | {
        deleted: boolean;
        session: any;
        context_cache_invalidated: boolean;
    };
    getGlobalAgentConversationMessages: (sessionId: string) => any[];
    appendGlobalAgentConversationMessage: (sessionId: string, role: "user" | "assistant", content: string, source?: string, options?: {
        extractMemory?: boolean;
        files?: any[];
    }) => void;
    scheduleGlobalSessionAutoTitle: (sessionId: string) => Promise<any>;
    resolveFeishuGlobalAgentSessionId: (payload: any, store?: any) => string;
    runFeishuGlobalAgentSessionRoutingSelfTest: () => {
        pass: boolean;
        checks: {
            removesDeletedWebSession: boolean;
            isolatesAcpSessionFromWebHistory: boolean;
            ignoresRecentWebSessionFallback: boolean;
            onlyUsesAcpSessionWithoutWebHistory: boolean;
        };
    };
};
