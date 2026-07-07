export type MainAgentWorkItemStatus = "pending" | "in_progress" | "completed" | "blocked" | "failed" | "cancelled";
export type MainAgentWorkItem = {
    id: string;
    taskId: string;
    scopeId: string;
    subject: string;
    description: string;
    activeForm: string;
    owner: string;
    target: string;
    agentType: string;
    status: MainAgentWorkItemStatus;
    blocks: string[];
    blockedBy: string[];
    attempt: number;
    source: string;
    createdAt: string;
    updatedAt: string;
    startedAt: string;
    completedAt: string;
    lastReceipt: any | null;
    evidence: string[];
    filesChanged: string[];
    verification: string[];
    blockers: string[];
    needs: string[];
    requeueReason: string;
};
export type MainAgentWorkItemClaimResult = {
    ok: boolean;
    reason?: "task_not_found" | "already_claimed" | "already_resolved" | "blocked" | "agent_busy";
    item?: MainAgentWorkItem;
    items: MainAgentWorkItem[];
    blocking?: string[];
};
export declare function normalizeMainAgentWorkItemStatus(status: any): MainAgentWorkItemStatus;
export declare function buildMainAgentWorkItems(task?: any, options?: {
    executions?: any[];
    now?: string;
}): MainAgentWorkItem[];
export declare function updateMainAgentWorkItem(items: MainAgentWorkItem[], itemRef: string, patch?: Partial<MainAgentWorkItem>, now?: string): MainAgentWorkItem[];
export declare function claimMainAgentWorkItem(items: MainAgentWorkItem[], itemRef: string, owner: string, options?: {
    checkOwnerBusy?: boolean;
    now?: string;
}): MainAgentWorkItemClaimResult;
export declare function requeueStaleMainAgentWorkItems(items: MainAgentWorkItem[], options?: {
    staleMs?: number;
    nowMs?: number;
    reason?: string;
}): {
    items: MainAgentWorkItem[];
    requeued: MainAgentWorkItem[];
};
export declare function buildMainAgentWorkItemSummary(items: MainAgentWorkItem[]): {
    total: number;
    counts: any;
    active: string[];
    blocked: {
        id: string;
        target: string;
        blockers: string[];
    }[];
    next_claimable: {
        id: string;
        target: string;
        subject: string;
    }[];
    verification_nudge: boolean;
    verification_reminder: {
        schema: string;
        status: string;
        title: string;
        headline: string;
        reason: string;
        next_action: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    all_completed: boolean;
};
export declare function runMainAgentWorkItemSelfTest(): {
    pass: boolean;
    checks: {
        derivesAssignments: boolean;
        receiptCompletesDependency: boolean;
        blocksBeforeDependencyDone: boolean;
        claimAfterDependencyDone: boolean;
        ownerBusyGuard: boolean;
        staleRequeues: boolean;
        summaryCounts: boolean;
        workItemVerificationReminderWhenAllDoneWithoutVerification: boolean;
        workItemVerificationReminderSkippedWhenVerificationExists: boolean;
    };
    items: MainAgentWorkItem[];
    blockedBefore: MainAgentWorkItem[];
    claimWeb: {
        ok: boolean;
        reason: "blocked" | "task_not_found" | "already_claimed" | "already_resolved" | "agent_busy";
    };
    stale: MainAgentWorkItem[];
};
