export declare function buildUserWorkOrderPreview(task: any, summary?: any, planMode?: any): {
    title: string;
    source: string;
    ready: boolean;
    requires_confirmation: boolean;
    summary: string;
    orders: any;
};
export declare function executionStoryStatus(conditionDone: boolean, conditionActive: boolean, phase: string): "failed" | "pending" | "done" | "active" | "warning";
export declare function buildUserExecutionStory(task: any, summary?: any, executions?: any[], phase?: string, workOrderPreview?: any): {
    title: string;
    style: string;
    current_step: string;
    steps: {
        id: string;
        label: string;
        detail: string;
        status: string;
        evidence: any;
    }[];
};
export declare function buildUserCompletionReadinessSummary(task: any, summary?: any, workItems?: any[], phase?: string): {
    schema: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    rows: {
        target: string;
        subject: string;
        status: string;
        status_label: string;
    }[];
    open_session_count: number;
    unresolved_work_item_count: number;
    next_action: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
    technical: {
        unresolved_work_item_ids: any[];
        open_session_ids: any;
    };
};
export declare function sanitizeAcceptanceVisibleText(value: any, fallback?: string, max?: number): string;
export declare function normalizeUserAcceptanceCheck(item: any, context?: any): any;
