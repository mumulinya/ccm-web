import { ChildProcess } from "child_process";
export type ExecutionState = "queued" | "spawning" | "ready" | "prompt_accepted" | "running" | "waiting_input" | "reviewing" | "succeeded" | "failed" | "cancel_requested" | "cancelled";
export type FailureClass = "prompt_delivery" | "trust_gate" | "workspace" | "permission" | "branch_divergence" | "compile" | "test" | "test_timeout" | "plugin_startup" | "mcp_startup" | "mcp_handshake" | "gateway_routing" | "tool_runtime" | "provider" | "cancelled" | "timeout" | "infra" | "unknown";
export type GreenLevel = "none" | "targeted" | "project" | "workspace" | "merge_ready";
export interface DevelopmentTaskPacket {
    version: 1;
    taskId: string;
    objective: string;
    project: string;
    workDir: string;
    scope: {
        allowedPaths: string[];
        deniedPaths: string[];
        requiresChanges: boolean;
    };
    isolation: {
        mode: "shared" | "worktree";
        failClosed: boolean;
    };
    branchPolicy: "current" | "require_fresh" | "worktree";
    verification: {
        required: boolean;
        commands: string[];
        requiredGreenLevel: GreenLevel;
    };
    commitPolicy: "none" | "manual" | "verified_commit";
    permissions: {
        filesystem: "read_only" | "workspace_write";
        network: "deny" | "allow";
        envAllowlist: string[];
    };
    budget: {
        timeoutMs: number;
        maxOutputBytes: number;
        maxRecoveryAttempts: number;
    };
    escalationPolicy: "stop" | "ask_user" | "retry_once";
    acceptanceCriteria: string;
    createdAt: string;
}
export interface ExecutionEvent {
    id: string;
    at: string;
    taskId: string;
    executionId: string;
    name: string;
    state?: ExecutionState;
    status: "info" | "ok" | "warning" | "error";
    failureClass?: FailureClass;
    message: string;
    data?: any;
}
export interface ExecutionRecord {
    version: 1;
    id: string;
    taskId: string;
    project: string;
    agent: string;
    state: ExecutionState;
    packet: DevelopmentTaskPacket;
    processIds: number[];
    externalRunnerRequestIds: string[];
    workspace: any;
    checkpointIds: string[];
    green: any;
    receipt?: any;
    fileChanges?: any;
    runnerVerification?: any;
    outputPreview?: string;
    failure: any;
    cancellation: any;
    createdAt: string;
    updatedAt: string;
    startedAt: string;
    finishedAt: string;
    events: ExecutionEvent[];
}
export declare function sanitizeExecutionEnv(extra?: Record<string, any>, allowlist?: string[]): Record<string, string>;
export declare function isSafeVerificationCommand(command: string): boolean;
export declare function buildDevelopmentTaskPacket(task: any, options?: any): DevelopmentTaskPacket;
export declare function validateDevelopmentTaskPacket(packet: DevelopmentTaskPacket): {
    pass: boolean;
    errors: string[];
};
export declare function ensureExecution(input: {
    task: any;
    project: string;
    agent?: string;
    workDir: string;
    executionId?: string;
    packet?: DevelopmentTaskPacket;
}): ExecutionRecord;
export declare function loadExecution(executionId: string): ExecutionRecord | null;
export declare function listExecutions(filters?: any): ExecutionRecord[];
export declare function purgeTaskExecutionArtifacts(taskId: string): {
    executions: number;
    checkpoints: number;
    outputs: number;
};
export declare function transitionExecution(executionId: string, state: ExecutionState, message?: string, extra?: any): ExecutionRecord;
export declare function attachExecutionWorkspace(executionId: string, workspace: any): ExecutionRecord;
export declare function registerExternalRunnerRequest(executionId: string, requestId: string): void;
export declare function listActiveAgentRuns(filters?: any): {
    id: any;
    taskId: any;
    executionId: any;
    project: any;
    agentType: any;
    source: any;
    pid: any;
    cwd: any;
    status: any;
    startedAt: any;
    updatedAt: any;
    timeoutMs: any;
    ageMs: number;
    commandLabel: any;
    title: any;
    cancellable: boolean;
}[];
export declare function cancelActiveAgentRun(input?: any): {
    success: boolean;
    matched: number;
    killed: number;
    cancellation: {
        success: boolean;
        taskId: string;
        killedProcesses: number;
        externalRunnerRequests: number;
        executions: string[];
    };
    targeted: boolean;
    runs: {
        id: any;
        taskId: any;
        executionId: any;
        project: any;
        agentType: any;
        source: any;
        pid: any;
        cwd: any;
        status: any;
        startedAt: any;
        updatedAt: any;
        timeoutMs: any;
        ageMs: number;
        commandLabel: any;
        title: any;
        cancellable: boolean;
    }[];
};
export declare function trackManagedChildProcess(taskId: string, executionId: string, child: ChildProcess, meta?: any): () => void;
export declare function terminateManagedChildProcess(child: ChildProcess): boolean;
export declare function clearTaskCancellation(taskId: string): void;
export declare function isTaskCancellationRequested(taskId: string): boolean;
export declare function requestTaskCancellation(taskId: string, reason?: string, actor?: string): {
    success: boolean;
    taskId: string;
    killedProcesses: number;
    externalRunnerRequests: number;
    executions: string[];
};
export declare function requestGroupSessionAgentCancellation(input?: any): {
    schema: string;
    groupId: string;
    groupSessionId: string;
    reason: string;
    actor: string;
    taskIds: string[];
    matchedRunnerRequests: number;
    cancellations: ({
        success: boolean;
        taskId: string;
        killedProcesses: number;
        externalRunnerRequests: number;
        executions: string[];
    } | {
        success: boolean;
        taskId: string;
        error: any;
    })[];
    requestedAt: string;
};
export declare function runManagedCommand(input: {
    taskId?: string;
    executionId?: string;
    command: string;
    cwd: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    maxOutputBytes?: number;
    onStdout?: (text: string) => void;
    onStderr?: (text: string) => void;
    onStarted?: (input: {
        pid: number;
        startedAt: string;
        runId: string;
    }) => void;
    project?: string;
    agentType?: string;
    source?: string;
    commandLabel?: string;
    title?: string;
}): Promise<any>;
export declare function persistBoundedOutput(taskId: string, content: string, maxBytes?: number): {
    content: string;
    persisted: boolean;
    path: string;
    bytes: number;
};
export declare function classifyExecutionFailure(value: any): {
    failureClass: FailureClass;
    recoverable: boolean;
    recovery: string[];
    message: string;
};
export declare function evaluateGreenContract(input: any): {
    level: GreenLevel;
    requiredLevel: GreenLevel;
    pass: boolean;
    checks: any[];
    evaluatedAt: string;
};
export declare function createExecutionCheckpoint(input: {
    executionId: string;
    taskId: string;
    workDir: string;
    mode?: string;
    label?: string;
}): {
    version: number;
    id: string;
    executionId: string;
    taskId: string;
    label: string;
    workDir: string;
    repoRoot: string;
    mode: string;
    originalHead: string;
    originalBranch: string;
    indexTree: string;
    checkpointCommit: string;
    createdAt: string;
    rolledBackAt: string;
    rollbackReason: string;
};
export declare function rollbackExecutionCheckpoint(checkpointId: string, reason: string, options?: any): {
    success: boolean;
    checkpointId: string;
    executionId: any;
    restoredHead: any;
    rolledBackAt: any;
};
export declare function inspectBranchFreshness(workDir: string, baseRef?: string): {
    repoRoot: string;
    branch: string;
    baseRef: string;
    behind: number;
    ahead: number;
    fresh: boolean;
    diverged: boolean;
    checkedAt: string;
};
export declare function mergeExecutionWorktree(executionId: string, options?: any): {
    success: boolean;
    duplicate: boolean;
    executionId: string;
    branch: any;
    mergeCommit: any;
    mergedAt: any;
} | {
    success: boolean;
    executionId: string;
    branch: any;
    mergeCommit: any;
    duplicate?: undefined;
    mergedAt?: undefined;
};
export declare function cleanupExecutionWorktree(executionId: string, force?: boolean): {
    success: boolean;
    executionId: string;
    cleanedAt: any;
};
export declare function runExecutionKernelSelfTest(): {
    pass: boolean;
    checks: {
        validatesTypedPacket: boolean;
        rejectsDangerousVerificationCommand: boolean;
        createsPersistentExecution: boolean;
        checkpointRollbackRestoresFiles: boolean;
        classifiesTypedFailure: boolean;
        evaluatesMergeReadyGreenContract: boolean;
        persistsDeliveryEvidence: boolean;
        sanitizesEnvironment: boolean;
        supportsTargetedAgentRunCancel: boolean;
    };
};
export declare function runExecutionKernelCancellationSelfTest(): Promise<{
    pass: boolean;
    checks: {
        returnsTypedCancellation: boolean;
        terminatesPromptly: boolean;
    };
    elapsedMs: number;
}>;
