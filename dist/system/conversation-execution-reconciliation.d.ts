export type ConversationExecutionIdentity = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
};
export type CcmConversationExecutionReconciliationV1 = {
    schema: "ccm-conversation-execution-reconciliation-v1";
    scope: ConversationExecutionIdentity["scope"];
    scopeId: string;
    exactSessionId: string;
    taskId: string;
    generation: number;
    attempts: number[];
    sourceChecksum: string;
    projectedEventCount: number;
    projectedToolEventCount: number;
    agentToolCoverage: Array<{
        agentRunId: string;
        role: "main_agent" | "project_agent" | "test_agent";
        projectId?: string;
        expectedToolCount?: number;
        persistedToolCount: number;
        status: "complete" | "partial" | "not_applicable";
    }>;
    missingSourceKinds: string[];
    status: "current" | "repaired" | "partial";
    contentStored: false;
};
type ReconcileOptions = {
    identity?: ConversationExecutionIdentity;
    reason?: string;
};
export declare function reconcileConversationExecutionForTask(taskOrId: any, options?: ReconcileOptions): CcmConversationExecutionReconciliationV1 | null;
export declare function reconcileConversationExecutionsForIdentity(identity: ConversationExecutionIdentity): {
    schema: string;
    receipts: CcmConversationExecutionReconciliationV1[];
    repaired: number;
    partial: number;
    contentStored: boolean;
};
export {};
