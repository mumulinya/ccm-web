export type TaskConversationProjectionStatus = "synced" | "unchanged" | "skipped" | "failed";
export type TaskConversationProjectionReceiptV1 = {
    schema: "ccm-task-conversation-projection-receipt-v1";
    taskId: string;
    scope: "project" | "group" | "global" | "feishu";
    sourceSessionId: string;
    activeSessionId: string;
    taskRevision: number;
    status: TaskConversationProjectionStatus;
    updatedSessionIds: string[];
    issues: string[];
    reason: string;
    contentStored: false;
};
export declare function taskConversationProjectionContent(task: any, options?: {
    sourceLink?: boolean;
    activeSessionId?: string;
}): string;
export declare function syncTaskConversationProjection(task: any, reason?: string): TaskConversationProjectionReceiptV1;
export declare function reconcileTaskConversationProjections(): {
    checked: number;
    synced: number;
    unchanged: number;
    skipped: number;
    failed: number;
    receipts: TaskConversationProjectionReceiptV1[];
    contentStored: boolean;
};
export declare function shouldSyncTaskConversationProjection(updates: any): boolean;
