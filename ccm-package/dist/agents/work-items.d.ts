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
    busy?: MainAgentWorkItem;
    items: MainAgentWorkItem[];
    blocking?: string[];
};
export type MainAgentWorkItemUnlockSummary = {
    schema: "ccm-main-agent-work-item-unlock-summary-v1";
    title: string;
    status: "ready_to_dispatch" | "auto_dispatch_deferred" | "auto_dispatch_queued" | "auto_dispatch_blocked";
    status_label: string;
    headline: string;
    rows: Array<{
        id: string;
        target: string;
        owner: string;
        subject: string;
        label: string;
    }>;
    next_claimable: Array<{
        id: string;
        target: string;
        owner: string;
        subject: string;
    }>;
    next_action: string;
    display_policy: any;
    technical: any;
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
export declare function buildMainAgentWorkItemUnlockSummary(previousItems: MainAgentWorkItem[], nextItems: MainAgentWorkItem[], options?: any): MainAgentWorkItemUnlockSummary | null;
export declare function buildMainAgentWorkItemClaimSummary(result: MainAgentWorkItemClaimResult, owner?: string, itemRef?: string): {
    schema: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    next_action: string;
    work_item: {
        id: string;
        target: string;
        owner: string;
        subject: string;
    };
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
    technical: {
        reason_code: string;
        work_item_id: string;
        blocking_refs: string[];
        busy_work_item_id: string;
    };
};
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
    dependency_summary: {
        schema: string;
        title: string;
        status: string;
        status_label: string;
        headline: string;
        rows: {
            id: string;
            target: string;
            subject: string;
            status: MainAgentWorkItemStatus;
            dependency_count: number;
            open_dependency_count: number;
            dependencies: {
                id: string;
                label: string;
                status: MainAgentWorkItemStatus;
                completed: boolean;
            }[];
            label: string;
            next_action: string;
        }[];
        ready: {
            id: string;
            target: string;
            subject: string;
            label: string;
        }[];
        next_claimable: {
            id: string;
            target: string;
            subject: string;
        }[];
        next_action: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
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
        unlockSummaryFriendly: boolean;
        ownerBusyGuard: boolean;
        claimSummaryFriendlySuccess: boolean;
        claimSummaryFriendlyBlocked: boolean;
        claimSummaryFriendlyBusy: boolean;
        claimSummaryFriendlyAlreadyClaimed: boolean;
        claimSummaryFriendlyAlreadyResolved: boolean;
        claimSummaryFriendlyNotFound: boolean;
        claimSummaryKeepsRawReasonTechnical: boolean;
        staleRequeues: boolean;
        summaryCounts: boolean;
        dependencySummaryExplainsUnlockedWork: boolean;
        workItemVerificationReminderWhenAllDoneWithoutVerification: boolean;
        workItemVerificationReminderSkippedWhenVerificationExists: boolean;
        workItemVisibleTextUsesFriendlyRoles: boolean;
    };
    items: MainAgentWorkItem[];
    blockedBefore: MainAgentWorkItem[];
    claimWeb: {
        ok: boolean;
        reason: "blocked" | "task_not_found" | "already_claimed" | "already_resolved" | "agent_busy";
    };
    stale: MainAgentWorkItem[];
};
