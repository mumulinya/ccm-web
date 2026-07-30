import { type ConversationSearchRecordV3 } from "./conversation-search-index";
export { collapseGeneratedGlobalWelcomeSessions } from "./conversation-search-index";
export type ConversationSearchRecord = Omit<ConversationSearchRecordV3, "rowId" | "sourceIdentity" | "sourceChecksum"> & {
    context: {
        before: any[];
        after: any[];
    };
};
export declare function parseConversationSearchQuery(value: any, match?: string): {
    query: string;
    terms: string[];
    match: string;
};
export declare function searchConversationIndex(options?: any): {
    schema: string;
    success: boolean;
    code: string;
    error: string;
    retryable: boolean;
    index: {
        schema: string;
        ready: boolean;
        active_generation: any;
        message_count: number;
        source_count: number;
        degraded_source_count: number;
        completed_at: any;
        stale: boolean;
        building: boolean;
        latest_status: any;
        error: any;
    };
    query?: undefined;
    page?: undefined;
    page_size?: undefined;
    total?: undefined;
    page_count?: undefined;
    has_more?: undefined;
    results?: undefined;
    facets?: undefined;
    audit?: undefined;
} | {
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
    results: any[];
    facets: {
        sources: Record<string, number>;
        conversation_types: Record<string, number>;
        roles: Record<string, number>;
        agents: Record<string, number>;
        projects: Record<string, number>;
        groups: Record<string, number>;
    };
    index: {
        active_generation: string;
        stale_served: boolean;
        schema: string;
        ready: boolean;
        message_count: number;
        source_count: number;
        degraded_source_count: number;
        completed_at: any;
        stale: boolean;
        building: boolean;
        latest_status: any;
        error: any;
    };
    audit: {
        candidate_messages: number;
        elapsed_ms: number;
        sources: string[];
    };
    code?: undefined;
    error?: undefined;
    retryable?: undefined;
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
        matchTerms: string[];
        agent: string;
        project: string;
        taskId: string;
        groupId: string;
        sessionId: string;
        source: string;
        messageId: string;
        role: string;
        content: string;
        attachments: any[];
        messageIndex: number;
        timestamp: string;
        sessionName: string;
        conversationType: import("./conversation-search-index").ConversationTypeV3;
        sourceLabel: string;
        groupName: string;
        taskTitle: string;
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
export declare function collectConversationSearchRecords(): {
    context: {
        before: any[];
        after: any[];
    };
    rowId: string;
    conversationType: import("./conversation-search-index").ConversationTypeV3;
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
    sourceIdentity: string;
    sourceChecksum: string;
}[];
export declare function runConversationSearchSelfTest(): {
    pass: boolean;
    checks: {
        multiWordSearch: boolean;
        pagination: boolean;
        musicCovered: boolean;
        generatedWelcomeCollapsed: boolean;
        fullTextNotTruncated: boolean;
    };
};
export declare function handleConversationSearchApi(pathname: string, req: any, res: any, parsed: any): boolean;
