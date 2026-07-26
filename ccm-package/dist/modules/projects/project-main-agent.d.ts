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
    phase: string;
    acceptance_state: any;
    title: any;
    goal: any;
    plan_mode: any;
    work_items: any;
    verification: any;
    risks: any;
    file_changes: any;
    final_summary: any;
    test_agent: any;
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
