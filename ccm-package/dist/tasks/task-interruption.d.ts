export type TaskInterruptionReason = "user_interrupt" | "temporary_network" | "provider_overload" | "provider_unavailable" | "model_stream_interrupted" | "agent_runtime_unavailable" | "service_restart" | "lease_lost" | "service_draining" | "unknown";
export type TaskResumeCheckpointV1 = {
    phase: string;
    workItemId?: string;
    reviewRound?: number;
    planChecksum: string;
    workspaceChecksum?: string;
    completedWorkItemIds: string[];
    summaryPending?: boolean;
};
export type TaskRecoveryScheduleV1 = {
    mode: "safe_auto" | "manual";
    state: "waiting_provider" | "waiting_agent" | "validating" | "queued" | "needs_user";
    attempt: number;
    maxAttempts: number;
    nextRetryAt?: string;
};
export declare const TASK_RECOVERY_BACKOFF_MS: readonly [30000, 120000, 300000];
export type TaskInterruptionReceiptV1 = {
    schema: "ccm-task-interruption-receipt-v1";
    version: 1;
    receipt_id: string;
    task_id: string;
    reason_code: TaskInterruptionReason;
    reason: string;
    actor: string;
    checkpoint: string;
    resume_checkpoint?: TaskResumeCheckpointV1;
    recovery?: TaskRecoveryScheduleV1;
    execution_attempt: number;
    workspace_checksum: string;
    task_agent_sessions: Array<{
        task_agent_session_id: string;
        native_session_id: string;
        agent_type: string;
        project: string;
        resume_mode: string;
        turn_count: number;
    }>;
    side_effect_state: "none" | "committed" | "uncertain";
    recoverable: boolean;
    auto_resume_allowed: boolean;
    interrupted_at: string;
    checksum: string;
};
export type TaskRecoveryDecisionV1 = {
    schema: "ccm-task-recovery-decision-v1";
    version: 1;
    task_id: string;
    mode: "auto" | "manual" | "reject";
    reason_code: string;
    reason: string;
    checks: Record<string, boolean>;
    decided_at: string;
    checksum: string;
};
export declare function buildTaskRecoverySchedule(input: {
    reasonCode: TaskInterruptionReason;
    attempt?: number;
    autoResumeAllowed?: boolean;
    now?: number;
}): TaskRecoveryScheduleV1;
export declare function buildTaskInterruptionReceipt(input: {
    task: any;
    reasonCode?: TaskInterruptionReason;
    reason?: string;
    actor?: string;
    checkpoint?: string;
    sideEffectState?: "none" | "committed" | "uncertain";
    workspaceChecksum?: string;
    resumeCheckpoint?: TaskResumeCheckpointV1;
    recovery?: TaskRecoveryScheduleV1;
    processTerminationProven?: boolean;
}): {
    checksum: string;
    version: 1;
    task_id: string;
    reason: string;
    recoverable: boolean;
    recovery?: TaskRecoveryScheduleV1;
    schema: "ccm-task-interruption-receipt-v1";
    actor: string;
    receipt_id: string;
    reason_code: TaskInterruptionReason;
    checkpoint: string;
    resume_checkpoint?: TaskResumeCheckpointV1;
    execution_attempt: number;
    workspace_checksum: string;
    task_agent_sessions: Array<{
        task_agent_session_id: string;
        native_session_id: string;
        agent_type: string;
        project: string;
        resume_mode: string;
        turn_count: number;
    }>;
    side_effect_state: "none" | "committed" | "uncertain";
    auto_resume_allowed: boolean;
    interrupted_at: string;
};
export declare function interruptTaskExecution(input: Parameters<typeof buildTaskInterruptionReceipt>[0]): {
    receipt: {
        checksum: string;
        version: 1;
        task_id: string;
        reason: string;
        recoverable: boolean;
        recovery?: TaskRecoveryScheduleV1;
        schema: "ccm-task-interruption-receipt-v1";
        actor: string;
        receipt_id: string;
        reason_code: TaskInterruptionReason;
        checkpoint: string;
        resume_checkpoint?: TaskResumeCheckpointV1;
        execution_attempt: number;
        workspace_checksum: string;
        task_agent_sessions: Array<{
            task_agent_session_id: string;
            native_session_id: string;
            agent_type: string;
            project: string;
            resume_mode: string;
            turn_count: number;
        }>;
        side_effect_state: "none" | "committed" | "uncertain";
        auto_resume_allowed: boolean;
        interrupted_at: string;
    };
    cancellation: {
        success: boolean;
        taskId: string;
        killedProcesses: number;
        externalRunnerRequests: number;
        executions: string[];
    };
    suspendedSessions: import("./agent-sessions-shared").TaskAgentSession[];
};
export declare function buildTaskRecoveryDecision(task: any, receiptInput?: TaskInterruptionReceiptV1 | null, options?: {
    userRequested?: boolean;
    workspaceChecksum?: string;
    authorizationValid?: boolean;
    runtimeValid?: boolean;
}): TaskRecoveryDecisionV1;
export declare function resumeInterruptedTaskExecution(task: any, options?: Parameters<typeof buildTaskRecoveryDecision>[2]): {
    resumed: boolean;
    decision: TaskRecoveryDecisionV1;
    reopenedSessions: import("./agent-sessions-shared").TaskAgentSession[];
};
