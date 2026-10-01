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
            explicitDeletePersistsTombstone: any;
            explicitDeleteSelectsRemainingSession: boolean;
            staleSyncCannotReviveDeletedSession: boolean;
        };
    };
    mergeGlobalAgentMessages: (existing?: any[], incoming?: any[]) => any[];
    loadGlobalAgentHistoryStore: () => any;
    syncGlobalAgentWebHistory: (payload: any) => any;
    createGlobalAgentConversationSession: (input?: any) => {
        createdAt: string;
        updatedAt: string;
        messages: {
            role: string;
            content: string;
            timestamp: string;
            source: string;
        }[];
        recovery_task_id?: string;
        recovery_attempt?: number;
        id: string;
        name: string;
        titleOrigin: string;
        source: string;
        session_kind: string;
    };
    deleteGlobalAgentConversationSession: (sessionId: string, expectedSource?: string) => {
        deleted: boolean;
        already_deleted: boolean;
        session: any;
        context_cache_invalidated?: undefined;
    } | {
        deleted: boolean;
        session: any;
        context_cache_invalidated: boolean;
        already_deleted?: undefined;
    };
    getGlobalAgentConversationMessages: (sessionId: string) => any[];
    appendGlobalAgentConversationMessage: (sessionId: string, role: "user" | "assistant", content: string, source?: string, options?: {
        extractMemory?: boolean;
        files?: any[];
    }) => {
        appended: boolean;
        reason: string;
    };
    upsertGlobalAgentConversationTaskMessage: (sessionId: string, messageInput: any) => {
        updated: boolean;
        reason: string;
        sessionId?: undefined;
        message?: undefined;
    } | {
        updated: boolean;
        reason: string;
        sessionId: string;
        message: any;
    } | {
        updated: boolean;
        sessionId: string;
        message: any;
        reason?: undefined;
    };
    scheduleGlobalSessionAutoTitle: (sessionId: string) => Promise<any>;
    resolveFeishuGlobalAgentSessionId: (payload: any, store?: any) => string;
    runFeishuGlobalAgentSessionRoutingSelfTest: () => {
        pass: boolean;
        checks: {
            preservesConcurrentWebSession: any;
            removesDeletedWebSession: boolean;
            isolatesAcpSessionFromWebHistory: boolean;
            ignoresRecentWebSessionFallback: boolean;
            onlyUsesAcpSessionWithoutWebHistory: boolean;
        };
    };
};
