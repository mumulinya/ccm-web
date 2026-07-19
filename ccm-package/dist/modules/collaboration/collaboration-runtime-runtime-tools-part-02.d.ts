import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function hasDailyDevContinuationGaps(task: any): any;
export declare function taskNeedsUserIntervention(task: any): any;
export declare function getTaskExecutionPhase(task: any): any;
export declare function buildExecutionDashboard(limit?: number): {
    success: boolean;
    generated_at: string;
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
    };
    summary: {
        total: number;
        active: number;
        queued: number;
        running: number;
        blocked: number;
        pending: number;
        done: number;
    };
    phase_counts: any;
    items: {
        id: any;
        title: any;
        status: any;
        phase: any;
        priority: any;
        workflow_type: any;
        assign_type: any;
        target_project: any;
        group_id: any;
        created_at: any;
        updated_at: any;
        status_detail: any;
        headline: any;
        execution_readiness: any;
        main_plan: {
            count: number;
            strategy: any;
            phases: any;
        };
        assignments: any;
        workers: any;
        evidence: {
            actual_file_change_count: number;
            actual_file_changes: any;
            verification_executed: any;
            verification_failed: any;
            verification_required_missing: any;
            has_final_review: boolean;
            receipt_count: number;
        };
        rework_records: any[];
        blockers: any[];
        recent_logs: any[];
        actions: any[];
        raw_task: any;
    }[];
};
export declare function continueDailyDevTasksFromGaps(ctx: CollabCtx, options?: any): any;
export declare function continueTaskWithMessage(taskId: string, message: string, ctx: CollabCtx, options?: any): any;
export declare function retryTask(id: string, ctx: CollabCtx, reason?: string, autoExecute?: boolean): any;
