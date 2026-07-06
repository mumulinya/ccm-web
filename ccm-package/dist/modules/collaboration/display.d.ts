export declare function sanitizeMainAgentUserText(value: any, fallback?: string, max?: number): string;
export declare function buildStreamlinedToolUseSummary(input: {
    actionIds?: string[];
    steps?: any[];
    workers?: any[];
    executions?: any[];
    summary?: any;
}): {
    type: string;
    tool_summary: string;
    counts: {
        reads: number;
        writes: number;
        dispatches: number;
        receipts: number;
        verifications: number;
        executions: number;
    };
    hidden_tool_uses: number;
};
export declare function buildTechnicalDetailSections(input: {
    traceId?: string;
    actionIds?: string[];
    permissions?: any[];
    observations?: any;
    technical?: any;
    rawEvents?: any[];
}): {
    id: string;
    title: string;
    items: any[];
}[];
export declare function buildMainAgentDisplayStream(input: {
    mode: string;
    userText?: string;
    actionIds?: string[];
    steps?: any[];
    permissions?: any[];
    observations?: any;
    traceId?: string;
    technical?: any;
    workers?: any[];
    executions?: any[];
    summary?: any;
    rawEvents?: any[];
}): {
    schema: string;
    type: string;
    user_visible: boolean;
    user_visible_text: string;
    text_message: {
        type: string;
        text: string;
    };
    tool_use_summary: {
        type: string;
        tool_summary: string;
        counts: {
            reads: number;
            writes: number;
            dispatches: number;
            receipts: number;
            verifications: number;
            executions: number;
        };
        hidden_tool_uses: number;
    };
    technical_details: {
        id: string;
        title: string;
        items: any[];
    }[];
    raw_events: any[];
    todo: {
        visible: boolean;
        surface: string;
        tool_message_visible: boolean;
        quiet_completed: boolean;
    };
    terminology: {
        sanitized: boolean;
        blocked_terms: string[];
    };
};
