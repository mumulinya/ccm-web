import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function getDailyDevCompletionGateSelfTest(): {
    noChildReceiptStatus: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
    noChildReceiptDetail: any;
    withChildReceiptStatus: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
    withChildReceiptDetail: any;
    withFailedChildStatus: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
    withFailedChildDetail: any;
    withActualChangeStatus: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
    withActualChangeNoCoordinationEvidenceStatus: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
    withActualChangeNoCoordinationEvidenceDetail: any;
    waitingEvidencePromotesToDone: any;
    blockedVerificationFailsGate: boolean;
    zeroFailuresCountAsPass: boolean;
    optionalRecommendationDoesNotBlock: boolean;
    coordinatorOwnedReviewFollowUpDoesNotBlock: boolean;
    latestDoneReceiptSupersedesStaleAck: boolean;
    embeddedMarkdownFenceDoesNotTruncateReceipt: boolean;
    doneReceiptWithOpenNeedsStatus: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
    blockedEvidenceDoesNotPromote: boolean;
    withActualChangeNoExecutedVerificationStatus: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
    withActualChangeNoExecutedVerificationDetail: any;
    runnerVerificationMerged: any;
    pass: any;
};
export declare function runMemoryDispatchGateReceiptValidationSelfTest(): any;
export declare function runPressureMemoryProvenanceReceiptUsageSelfTest(): any;
export declare function runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest(): any;
export declare function runGlobalMemoryUsageReceiptValidationSelfTest(): any;
export declare function runGlobalMemoryHealthGateReceiptValidationSelfTest(): any;
export declare function runReadPlanRevalidationGateReceiptValidationSelfTest(): any;
export declare function runApiMicrocompactReceiptValidationSelfTest(): any;
export declare function runPostCompactReinjectionGateReceiptValidationSelfTest(): any;
export declare function runPostCompactDispatchMarkerVisibleSelfTest(): any;
export declare function buildDailyDevWorkflowRehearsal(payload?: any): {
    success: boolean;
    pass: any;
    status: string;
    generated_at: string;
    group: {
        id: any;
        name: any;
        coordinator: any;
        readyMemberCount: any;
        selectedMember: any;
    };
    steps: {
        id: string;
        status: string;
        message: string;
    }[];
    task_description: string;
    task_document_context: string;
    no_change_result: {
        status: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
        detail: any;
    };
    done_result: {
        status: import("./collaboration-runtime-status-helpers").TaskExecutionStatus;
        detail: any;
    };
    propagated_assignment_summary: {
        assignment_count: any;
        assignments: any;
    };
    worker_notification: {
        status: string;
        task_id: string;
        receipt_status: string;
    };
    scratchpad_context: string;
    coordinator_protocol: any;
    rework_protocol: any;
    delivery_summary: any;
};
export declare function selectDailyDevSmokeTarget(payload?: any): {
    group: any;
    coordinator: any;
    selectedMember: any;
    readyMembers: any;
};
export declare function createDailyDevSmokeTask(payload: any, ctx: CollabCtx): {
    success: boolean;
    task: any;
    group: {
        id: any;
        name: any;
        coordinator: any;
    };
    target_member: any;
    smoke_file: string;
    queued: boolean;
    queue_result: any;
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
        unified_scheduler: {
            schema: string;
            queued: number;
            running_lanes: string[];
            running_task_ids: string[];
            workspace_lanes: string[];
            queues: {
                queue_key: string;
                task_ids: string[];
            }[];
        };
        unified_queued: number;
        unified_running_lanes: number;
        workspace_mutation_lanes: string[];
    };
};
export declare function getDailyDevSmokeStatus(payload?: any): {
    success: boolean;
    pass: boolean;
    status: string;
    message: string;
    latest_task_id: any;
    execution_readiness: any;
    task?: undefined;
    target?: undefined;
    evidence?: undefined;
} | {
    success: boolean;
    pass: boolean;
    status: string;
    message: any;
    task: {
        id: any;
        title: any;
        status: any;
        status_detail: any;
        created_at: any;
        updated_at: any;
        completed_at: any;
    };
    target: {
        group_id: any;
        group_name: any;
        member: any;
        work_dir: any;
        smoke_file: string;
        smoke_path: string;
        file_exists: boolean;
        file_size: number;
        file_modified_at: string;
    };
    evidence: {
        task_done: boolean;
        file_exists: boolean;
        assignment_count: any;
        has_target_assignment: boolean;
        target_assignment: any;
        worker_notification_count: any;
        has_target_worker_notification: any;
        coordination_plan_count: number;
        actual_file_change_count: number;
        has_done_receipt: any;
        has_final_review: boolean;
        executed_verification_count: number;
        required_verification_passed: boolean;
        missing: string[];
        delivery_summary: any;
    };
    execution_readiness: any;
    latest_task_id?: undefined;
};
export declare function runAgentCliProbe(payload: any, ctx: CollabCtx): Promise<{
    success: boolean;
    blocked: boolean;
    message: any;
    error: any;
    fix_actions: any;
    target: {
        group_id: any;
        group_name: any;
        project: any;
        agent_type: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
        work_dir: any;
    };
    execution_path: any;
    expected_marker: string;
    readiness: any;
}>;
export declare function taskRequiresAgentQa(task: any): boolean;
export declare function getTaskAgentQaGate(task: any): {
    required: boolean;
    pass: boolean;
    total: number;
    accepted: number;
    resumed: number;
    qa_ids: any[];
};
export declare function runRuntimeFallbackProbe(payload: any, ctx: CollabCtx): Promise<{
    success: boolean;
    message: string;
    error: string;
    switched: boolean;
    attempts: any[];
    runtime_tool_dispatch_gate: import("../../tools/runtime-tool-sync").RuntimeToolDispatchGate;
    primary_runtime?: undefined;
    final_runtime?: undefined;
    decision?: undefined;
} | {
    success: boolean;
    message: string;
    switched: boolean;
    primary_runtime: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    final_runtime: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    attempts: any[];
    error?: undefined;
    runtime_tool_dispatch_gate?: undefined;
    decision?: undefined;
} | {
    success: boolean;
    message: string;
    switched: boolean;
    primary_runtime: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    final_runtime: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    attempts: any[];
    decision: {
        permissionDrift: boolean;
        switchRuntime: boolean;
        failureClass: import("../../agents/execution-kernel").FailureClass;
        recoverable: boolean;
        recovery: string[];
        message: string;
    };
    error?: undefined;
    runtime_tool_dispatch_gate?: undefined;
}>;
export declare function normalizeStringArray(value: any): string[];
export declare function buildEvidenceGateFollowUps(group: any, outputs: string[]): any;
export declare function isReviewLikeAgentName(value: any): boolean;
export declare function inferIndependentReviewSubject(input: {
    task?: any;
    actualFileChanges?: any[];
    receipts?: any[];
    assignmentEvidence?: any[];
}): string;
export declare function getReceiptTestAgentHandoff(receipt: any): any;
export declare function getReceiptIndependentReviewSubject(receipt: any, fallback?: string): string;
export declare function findLatestTestAgentReviewReceipt(receipts?: any[], route?: string): any;
export declare function buildTestAgentReviewRecheckFollowUp(input: {
    subject: string;
    reason?: string;
    handoff?: any;
    source?: string;
    report?: any;
    verdict?: any;
}): any;
export declare function buildIndependentReviewGateFollowUps(input: {
    group: any;
    taskId?: string;
    task?: any;
    outputs?: string[];
    existingFollowUps?: any[];
    execution?: any;
}): any[];
export declare function buildFailedIndependentReviewReworkFollowUps(input: {
    group: any;
    taskId?: string;
    task?: any;
    outputs?: string[];
    existingFollowUps?: any[];
    execution?: any;
}): any;
export declare function buildPostReviewSpotCheckFollowUps(input: {
    group: any;
    taskId?: string;
    task?: any;
    outputs?: string[];
    existingFollowUps?: any[];
    execution?: any;
}): {
    mention: string;
    targetName: string;
    project: string;
    summary: string;
    message: string;
    reason: any;
    rework_kind: string;
    postReviewSpotCheckReverify: boolean;
    postReviewSpotCheckGate: {
        schema: string;
        required: boolean;
        pass: boolean;
        status: string;
        reason: any;
        check_count: number;
        latest: any;
        summary: import("../../agents/post-review-spot-check").MainAgentPostReviewSpotCheckSummary;
    };
    reviewSubject: string;
    originalTarget: string;
    testAgentHandoff: any;
    test_agent_handoff: any;
    userTaskPreview: string;
}[] | {
    mention: string;
    targetName: string;
    project: string;
    summary: string;
    message: string;
    reason: any;
    rework_kind: string;
    independentReviewGate: any;
    postReviewSpotCheckGate: {
        schema: string;
        required: boolean;
        pass: boolean;
        status: string;
        reason: any;
        check_count: number;
        latest: any;
        summary: import("../../agents/post-review-spot-check").MainAgentPostReviewSpotCheckSummary;
    };
    reviewSubject: string;
    originalTarget: string;
    userTaskPreview: string;
}[];
export declare function buildCodedCoordinatorReview(group: any, outputs: string[], options?: {
    allowFollowUps?: boolean;
    round?: number;
    maxRounds?: number;
}): {
    agent: any;
    status: string;
    followUps: any;
    structured_review: {
        schema: string;
        status: string;
        follow_ups: any;
        gaps: any;
    };
    gaps: any;
    conflicts: any[];
    content: string;
    confidence: number;
    runtime: string;
};
export declare function writeSse(res: any, data: any): void;
export declare function emitAssignmentStatus(streamRes: any, groupId: string, planMessageId: string, project: string, status: string, statusText?: string): void;
