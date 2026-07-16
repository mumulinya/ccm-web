/** 确认 → 派发就绪 → 依赖解锁 → 批准 / 返工 编排自测（不启真实 Agent）。 */
export declare function runRequirementEpicOrchestrationSelfTest(): {
    success: boolean;
    channel_intent: boolean;
    confirm_dispatch_ready: any[];
    dependency_unlocked: any[];
    awaiting_change_review: boolean;
    approve_completes: boolean;
    rework_reopens: boolean;
};
export declare function runRequirementEpicSelfTest(): {
    success: boolean;
    schema: "ccm-requirement-decomposition-v1";
    item_count: number;
    integration_acceptance_added: boolean;
    cycle_rejected: boolean;
    duplicate_key_rejected: boolean;
    unknown_dependency_rejected: boolean;
    diff: {
        schema: string;
        from_version: number;
        to_version: number;
        from_content_hash: string;
        to_content_hash: string;
        added: string[];
        removed: string[];
        changed: string[];
        unchanged: string[];
        has_changes: boolean;
    };
    sqlite_atomic_batch: {
        success: boolean;
        rollback_observed: boolean;
        committed_count: number;
        idempotent_replay: boolean;
        parent_round_trip: boolean;
        restart_recovered: boolean;
        restart_count: number;
    };
    sqlite_row_apis: {
        success: boolean;
        row_get: boolean;
        row_update: boolean;
        parent_list: number;
        group_logs_cleared: number;
    };
    epic_acceptance_gate: {
        globalMissionWeakAcceptanceGateRejected: boolean;
        globalMissionWeakAcceptanceMarkedWeak: boolean;
        globalMissionWeakAcceptanceParentStaysInProgress: boolean;
        globalMissionWeakAcceptanceDoesNotCountCompleted: boolean;
        globalMissionStrongAcceptanceGatePasses: boolean;
        globalMissionStrongAcceptanceParentCompletes: boolean;
        globalMissionStrongAcceptanceEvidenceVisible: boolean;
        requirementEpicWaitsForBatchReview: boolean;
        requirementEpicCompletesOnlyAfterApproval: boolean;
    };
    epic_orchestration: {
        success: boolean;
        channel_intent: boolean;
        confirm_dispatch_ready: any[];
        dependency_unlocked: any[];
        awaiting_change_review: boolean;
        approve_completes: boolean;
        rework_reopens: boolean;
    };
};
