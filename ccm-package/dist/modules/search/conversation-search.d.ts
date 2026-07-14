type ConversationType = "project" | "group" | "global";
export type ConversationSearchRecord = {
    conversationType: ConversationType;
    source: string;
    sourceLabel: string;
    project: string;
    groupId: string;
    groupName: string;
    sessionId: string;
    sessionName: string;
    messageId: string;
    messageIndex: number;
    role: string;
    agent: string;
    content: string;
    timestamp: string;
    taskId: string;
    taskTitle: string;
    attachments: any[];
    context: {
        before: any[];
        after: any[];
    };
};
export declare function collapseGeneratedGlobalWelcomeSessions(sessions: any[]): any[];
export declare function collectConversationSearchRecords(): ConversationSearchRecord[];
export declare function parseConversationSearchQuery(value: any, match?: string): {
    query: string;
    terms: string[];
    match: string;
};
export declare function searchConversationRecords(records: ConversationSearchRecord[], options?: any): {
    schema: string;
    success: boolean;
    query: {
        query: string;
        terms: string[];
        match: string;
    };
    page: number;
    page_size: number;
    total: number;
    page_count: number;
    has_more: boolean;
    results: {
        id: string;
        stableMessageId: boolean;
        matchTerms: string[];
        conversationType: ConversationType;
        source: string;
        sourceLabel: string;
        project: string;
        groupId: string;
        groupName: string;
        sessionId: string;
        sessionName: string;
        messageId: string;
        messageIndex: number;
        role: string;
        agent: string;
        content: string;
        timestamp: string;
        taskId: string;
        taskTitle: string;
        attachments: any[];
        context: {
            before: any[];
            after: any[];
        };
    }[];
    facets: {
        sources: Record<string, number>;
        conversation_types: Record<string, number>;
        roles: Record<string, number>;
        agents: Record<string, number>;
        projects: Record<string, number>;
        groups: Record<string, number>;
    };
};
export declare function runConversationSearchSelfTest(): {
    pass: boolean;
    checks: {
        multiWordAndSearch: boolean;
        accuratePagination: boolean;
        phraseSearch: boolean;
        sourceAndRoleFilters: boolean;
        exactNavigationIdentity: boolean;
        taskAndAttachmentRelation: boolean;
        completeFacets: boolean;
        generatedWelcomeNoiseCollapsed: boolean;
    };
};
export declare function handleConversationSearchApi(pathname: string, req: any, res: any, parsed: any): boolean;
export {};
