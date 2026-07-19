export declare function buildGroupCollaborationRules(memberList?: string): string;
export declare function buildCoordinatorCollaborationInstructions(memberList?: string): string;
export declare function buildMemberCollaborationInstructions(projectName: string, memberList?: string): string;
export declare function buildCoordinatorPrompt(input: {
    group: any;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    extraInstructions?: string;
    maintenanceAt?: string;
    contextId?: string;
    sessionId?: string;
    groupSessionId?: string;
    group_session_id?: string;
}): string;
export declare function buildCoordinatorMaintenanceNotificationInstructions(groupInput: any, options?: any): {
    text: string;
    context: any;
    health: any;
    cleanup_commit_repair_context?: undefined;
    source_group_id?: undefined;
    group_session_id?: undefined;
    typed_scope_id?: undefined;
} | {
    text: string;
    context: any;
    health: any;
    cleanup_commit_repair_context: any;
    source_group_id: string;
    group_session_id: string;
    typed_scope_id: string;
};
export declare function buildMemberPrompt(input: {
    group: any;
    projectName: string;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
}): string;
export declare function compactText(value: string, maxLength?: number): string;
export declare const COORDINATOR_USER_INTERNAL_TEXT_PATTERN: RegExp;
export declare function sanitizeCoordinatorUserText(value: any, fallback?: any, maxLength?: number): string;
export declare function sanitizeCoordinatorUserList(items: any, fallback?: string, maxLength?: number, limit?: number): string[];
export declare function buildCoordinatorFollowUpSummary(item: any, task: string, reason: string, project: string): string;
export declare function collectCoordinatorFollowUpSpecificHints(value: any): string[];
export declare function buildCoordinatorFollowUpQuality(item: any, task: string, reason: string, project: string, context?: any): {
    schema: string;
    pass: boolean;
    status: string;
    status_label: string;
    reason: string;
    missing: string[];
    hints: string[];
    lazy_delegation: boolean;
    done_criteria_present: boolean;
};
export declare function normalizeCoordinatorFollowUpTask(item: any, task: string, reason: string, project: string, context?: any): {
    message: string;
    quality: {
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    };
} | {
    message: string;
    quality: {
        auto_enriched: boolean;
        enriched_hint_count: number;
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    };
};
export declare function coordinatorNotificationStatusLabel(status: any, receiptStatus?: any): "部分完成" | "执行未通过" | "遇到阻塞" | "结果说明待补" | "已提交结果" | "已停止" | "已返回结果";
export declare function coordinatorNotificationGaps(status: any, receiptStatus?: any): string[];
export declare function buildCodedCoordinatorNotificationRows(outputs: string[]): {
    id: string;
    agent: string;
    status: string;
    receipt_status: string;
    status_label: string;
    summary: string;
    result: string;
    gaps: string[];
}[];
export declare function buildCoordinatorReplayRepairDispatchContext(group: any): string;
