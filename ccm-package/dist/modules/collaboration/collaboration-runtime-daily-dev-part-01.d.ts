import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function getDailyDevCompletionGateSelfTest(): {
    noChildReceiptStatus: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
    noChildReceiptDetail: any;
    withChildReceiptStatus: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
    withChildReceiptDetail: any;
    withFailedChildStatus: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
    withFailedChildDetail: any;
    withActualChangeStatus: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
    withActualChangeNoCoordinationEvidenceStatus: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
    withActualChangeNoCoordinationEvidenceDetail: any;
    waitingEvidencePromotesToDone: any;
    blockedVerificationFailsGate: boolean;
    zeroFailuresCountAsPass: boolean;
    optionalRecommendationDoesNotBlock: boolean;
    coordinatorOwnedReviewFollowUpDoesNotBlock: boolean;
    latestDoneReceiptSupersedesStaleAck: boolean;
    embeddedMarkdownFenceDoesNotTruncateReceipt: boolean;
    doneReceiptWithOpenNeedsStatus: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
    blockedEvidenceDoesNotPromote: boolean;
    withActualChangeNoExecutedVerificationStatus: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
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
        status: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
        detail: any;
    };
    done_result: {
        status: import("./collaboration-runtime-status-helpers-part-01").TaskExecutionStatus;
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
