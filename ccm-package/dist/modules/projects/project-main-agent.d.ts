import { type TestAgentAcceptanceEvidence, type TestAgentVerificationProfile } from "../collaboration/test-agent-review-policy";
import type { WorkflowDecision } from "../../agents/workflow-decision";
export type ProjectMainWorkItem = {
    id: string;
    title: string;
    objective: string;
    acceptanceCriteria: string[];
    dependsOn: string[];
    status: "pending" | "running" | "awaiting_review" | "completed" | "failed";
    attempts: number;
    output?: string;
    fileChanges?: any;
};
export type ProjectMainPlan = {
    schema: "ccm-project-main-plan-v1";
    title: string;
    summary: string;
    project: string;
    projectSessionId: string;
    requiresConfirmation: boolean;
    acceptanceCriteria: string[];
    acceptanceEvidencePlan: TestAgentAcceptanceEvidence[];
    verificationProfile: TestAgentVerificationProfile;
    permissionBoundaries: string[];
    sourceEvidence: {
        manifestChecksum: string;
        manifestFiles: number;
        selectedPaths: string[];
        rejectedPaths: Array<{
            path: string;
            reason: string;
        }>;
        totalChars: number;
        truncated: boolean;
    };
    runtimeEvidence: {
        manifestChecksum: string;
        profiles: number;
        toolCalls: Array<{
            name: string;
            profileId: string;
            kind: string;
            checksum: string;
            chars: number;
            truncated: boolean;
            error: string;
        }>;
    };
    workItems: ProjectMainWorkItem[];
    createdAt: string;
};
export type ProjectMainPlanRevisionV1 = {
    schema: "ccm-project-main-plan-revision-v1";
    revision: number;
    feedback: string;
    client_message_id: string;
    previous_plan_checksum: string;
    revised_plan_checksum: string;
    source_snapshot_checksum: string;
    requested_at: string;
    completed_at: string;
};
export type ProjectMainWorkerResult = {
    success: boolean;
    output: string;
    fileChanges: any;
    nativeSessionId?: string;
    sessionId?: string;
    usage?: any;
    error?: string;
};
export type ProjectMainExecutionResult = {
    task: any;
    status: "awaiting_confirmation" | "completed" | "blocked" | "failed";
    summary: string;
    fileChanges: any;
    verification: string[];
    risks: string[];
    testAgent: any;
};
export declare function reconcileInterruptedProjectMainTasks(): {
    checked: number;
    interrupted: number;
    active_elsewhere: number;
    results: any[];
};
export declare function planProjectMainTask(input: {
    project: string;
    projectSessionId: string;
    userMessage: string;
    workflowDecision: WorkflowDecision;
    context?: string;
}): Promise<{
    schema: "ccm-project-main-plan-v1";
    title: string;
    summary: string;
    project: string;
    projectSessionId: string;
    requiresConfirmation: boolean;
    acceptanceCriteria: string[];
    acceptanceEvidencePlan: TestAgentAcceptanceEvidence[];
    verificationProfile: TestAgentVerificationProfile;
    permissionBoundaries: string[];
    sourceEvidence: {
        manifestChecksum: string;
        manifestFiles: number;
        selectedPaths: string[];
        rejectedPaths: Array<{
            path: string;
            reason: string;
        }>;
        totalChars: number;
        truncated: boolean;
    };
    runtimeEvidence: {
        manifestChecksum: string;
        profiles: number;
        toolCalls: Array<{
            name: string;
            profileId: string;
            kind: string;
            checksum: string;
            chars: number;
            truncated: boolean;
            error: string;
        }>;
    };
    workItems: ProjectMainWorkItem[];
    createdAt: string;
}>;
export declare function answerAsProjectMainAgent(input: {
    project: string;
    projectSessionId: string;
    userMessage: string;
    mode: "conversation" | "project_analysis";
    context?: string;
    workflowDecision?: WorkflowDecision;
    onDelta?: (delta: string) => void;
}): Promise<string>;
export declare function createProjectMainTask(input: {
    project: string;
    projectSessionId: string;
    projectMainRunId: string;
    userMessage: string;
    plan: ProjectMainPlan;
    workflowDecision: WorkflowDecision;
    sourceAttachments?: any[];
}): any;
export declare function getProjectMainTask(taskId: string): any;
export declare function confirmProjectMainTask(taskId: string, projectInput: string, projectSessionIdInput: string): any;
export declare function cancelProjectMainTask(taskId: string, projectInput: string, projectSessionIdInput: string, reason?: string): any;
export declare function cancelProjectMainTasksForSession(projectInput: string, projectSessionIdInput: string, reason: string): any[];
export declare function reviseProjectMainTask(input: {
    taskId: string;
    project: string;
    projectSessionId: string;
    feedback: string;
    clientMessageId: string;
    context?: string;
    planBuilder?: typeof planProjectMainTask;
}): Promise<{
    task: any;
    revision: any;
    duplicate: boolean;
}>;
export declare function executeProjectMainTask(input: {
    task: any;
    plan: ProjectMainPlan;
    verificationCommands?: string[];
    confirmed?: boolean;
    executeWorker: (workItem: ProjectMainWorkItem, round: number, reworkProblems: string[]) => Promise<ProjectMainWorkerResult>;
    onEvent?: (event: any) => void;
    onDelta?: (delta: string) => void;
}): Promise<ProjectMainExecutionResult>;
export declare function projectMainTaskPublic(task: any): {
    id: any;
    task_id: any;
    trace_id: any;
    project: any;
    project_session_id: any;
    project_main_run_id: any;
    orchestration_scope: string;
    status: any;
    usage_summary: any;
    phase: string;
    phase_label: string;
    runtime_status: {
        schema: string;
        phase: string;
        phase_label: string;
        terminal: boolean;
        active: boolean;
        waiting: boolean;
        blocker_kind: string;
        status_detail: string;
        next_action: string;
        started_at: string;
        last_activity_at: string;
        completed_at: string;
        queue_position: number;
        review_round: number;
        max_review_rounds: number;
        provider_retry: {
            state: any;
            attempts: number;
            retry_after: any;
        };
        recovery_count: number;
    };
    status_detail: any;
    next_action: any;
    created_at: any;
    started_at: any;
    updated_at: any;
    completed_at: any;
    acceptance_state: any;
    queue_scope: any;
    queue_target_key: any;
    queue_position: number;
    queue_state: any;
    scheduler_state: any;
    workspace_lane: any;
    terminal_decision: any;
    terminal_gate: any;
    acceptance_mode: any;
    test_agent_enabled: boolean;
    message_id: string;
    acceptance_evidence_plan: any;
    test_agent_review_policy: any;
    test_agent_failure_route: any;
    title: any;
    goal: any;
    plan_mode: any;
    source_evidence: any;
    work_items: any;
    verification: any;
    risks: any;
    file_changes: any;
    final_summary: any;
    test_agent: any;
    main_agent_self_verification: any;
    plan_revision_count: any;
    plan_revisions: any;
    plan_revision_pending: any;
    actions: {
        id: string;
        kind: string;
        label: string;
        tone: string;
    }[];
};
export declare function runProjectMainAgentContractSelfTest(): {
    success: boolean;
    checks: {
        serializablePlan: boolean;
        stripsForeignDependency: boolean;
    };
};
