export type BasicGroupRouteDeps = {
    getGroupMemoryFile: (groupId: string, sessionId?: string) => string;
    loadGroupMemory: (groupId: string, sessionId?: string) => any;
    saveGroupMemory: (groupId: string, memory: any, sessionId?: string) => any;
    buildGroupMemoryContext: (memory: any) => string;
    buildAgentMemoryPacket: (groupId: string, project: string, task?: string, options?: any) => string;
    buildInlineTaskRuntime: (task: any) => any;
    getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
    deleteGroupSessionMemoryArtifacts?: (groupId: string, sessionId: string) => any;
};
export declare function compactGroupMessageTaskRuntime(runtime: any): any;
export declare function compactGroupStatusText(value: any, max?: number): string;
export declare function taskUpdatedMs(task: any): number;
export declare function checkpointStatus(status: any): "failed" | "pending" | "done" | "active" | "warning";
export declare function groupTaskStatusMeta(status: any): {
    phase: string;
    label: string;
    terminal: boolean;
    deliveryStatus: string;
    checkpointStatus: string;
};
export declare function groupDeliveryCheckpointLabel(status: any): "任务交付完成" | "任务未完成，已整理原因" | "任务已取消，已整理状态" | "已整理阶段总结";
export declare function groupTaskDisplayStatus(task: any, summary?: any, latestCard?: any, rawStatus?: any): any;
export declare function buildGroupCompletionSummary(task: any, summary: any, latestCard?: any): {
    schema: string;
    title: string;
    status: string;
    status_label: any;
    headline: string;
    file_change_count: number;
    verification_count: number;
    risk_count: number;
    next_action: string;
    display_policy: {
        user_visible: boolean;
        technical_details_default_collapsed: boolean;
    };
};
export declare function buildGroupPickupSummary(task: any, summary: any, completionSummary: any, latestCard?: any): {
    schema: string;
    source_schema: any;
    title: string;
    status: any;
    status_label: any;
    headline: string;
    current_state: string;
    review_items: any;
    resume_action: string;
    technical_hint: string;
    display_policy: {
        user_visible: boolean;
        technical_details_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
};
export declare function groupTodoTextNeedsUserAction(value: any, phase?: any): boolean;
export declare function groupStatusPhaseNeedsUserAction(status: any): boolean;
export declare function buildGroupCurrentTodoSummary(latestCard: any, latestTask: any, latestStatusMeta: any): {
    schema: string;
    title: any;
    task_id: any;
    task_title: any;
    step_id: any;
    label: string;
    active_form: string;
    detail: string;
    recent_action: string;
    recentAction: string;
    needs_action: string;
    needsAction: string;
    status: string;
    status_label: string;
    progress_label: string;
    completed_count: any;
    total_count: any;
    next_action: string;
    display_policy: {
        user_visible: boolean;
        technical_details_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        archive_completed_todo: boolean;
        visible_when_completed: boolean;
    };
};
export declare function buildGroupProgressRefreshSummary(latestTask: any, latestCard: any, latestStatusMeta: any, childAgentStatusSummary: any, latestCheckpoint: any, nowMs?: number): {
    schema: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    current_state: string;
    review_items: string[];
    next_action: string;
    last_progress_age_label: string;
    stalled_work_item_count: number;
    display_policy: {
        user_visible: boolean;
        show_for_ordinary_conversation: boolean;
        technical_details_default_collapsed: boolean;
        hide_internal_protocols: boolean;
    };
};
export declare function getGroupStatusIndependentReviewSummary(source?: any): any;
export declare function summarizeGroupStatusIndependentReview(source?: any): {
    status: string;
    statusLabel: string;
    blocking: boolean;
    headline: string;
    rows: any;
    nextAction: string;
};
export declare function getGroupStatusTestAgentExecutionPlanSummary(source?: any): {
    summary: any;
    plan: any;
};
export declare function summarizeGroupStatusTestAgentExecutionPlan(source?: any): {
    status: string;
    statusLabel: string;
    headline: string;
    rows: string[];
    nextAction: string;
};
