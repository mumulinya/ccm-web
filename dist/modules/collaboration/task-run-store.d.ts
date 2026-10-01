import { type TaskRunStatus, type TaskRunTrigger } from "./task-workflow-model";
export interface TaskRunRecord {
    schema: "ccm-task-run-record-v1";
    run_id: string;
    task_id: string;
    trace_id: string;
    spec_revision: number;
    trigger: TaskRunTrigger;
    status: TaskRunStatus;
    attempt: number;
    parent_run_id: string;
    created_at: string;
    updated_at: string;
    queue_lane: string;
    lease: any | null;
    execution_evidence: any[];
    verification_result: any;
    delivery_result: any;
    task_spec_checksum: string;
    automation_definition_id?: string;
    automation_definition_revision?: number;
    history: any[];
}
export declare function taskRunStorePath(): string;
export declare function loadTaskRuns(): TaskRunRecord[];
export declare function getTaskRun(runId: string): TaskRunRecord;
export declare function activeTaskRunId(task: any): string;
export declare function validateActiveTaskRun(task: any, runId: string): {
    ok: boolean;
    runId: string;
    code?: undefined;
    error?: undefined;
} | {
    ok: boolean;
    code: string;
    error: string;
    runId?: undefined;
};
export declare function listTaskRuns(taskId?: string): TaskRunRecord[];
export declare function createTaskRunRecord(input: any, taskSpec: any, trigger?: TaskRunTrigger, options?: any): TaskRunRecord;
export declare function patchTaskRun(runId: string, updates: any, options?: any): TaskRunRecord;
export declare function claimTaskRunLease(runId: string, owner: string, ttlMs?: number): {
    claimed: boolean;
    run: TaskRunRecord;
    reason: string;
};
export declare function releaseTaskRunLease(runId: string, owner: string, status?: TaskRunStatus): TaskRunRecord;
export declare function recordTaskRunFromTask(task: any): TaskRunRecord;
/**
 * Keep the independent TaskRun record aligned with the task projection at
 * execution boundaries. The task record remains the legacy/UI projection;
 * run identity and evidence stay in task-runs.json.
 */
export declare function syncTaskRunFromTask(task: any, updates?: any): TaskRunRecord;
export declare function taskRunStoreChecksum(): string;
