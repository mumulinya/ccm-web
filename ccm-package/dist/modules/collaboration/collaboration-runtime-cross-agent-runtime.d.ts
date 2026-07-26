import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function processCrossAgents(groupId: string, group: any, sourceProject: string, output: string, atMentions: any[], configs: any[], ctx: CollabCtx, streamRes?: any, depth?: number, seenMentions?: Set<string>, executionOrder?: string, planMessageId?: string, taskId?: string): Promise<string[]>;
export declare function resumeAgentQaFromStoredContinuation(qa: any, group: any, ctx: CollabCtx, streamRes?: any): Promise<{
    resumed: boolean;
    reason: string;
    runtimeToolDispatchGate?: undefined;
    item?: undefined;
    output?: undefined;
    session?: undefined;
} | {
    resumed: boolean;
    reason: string;
    runtimeToolDispatchGate: import("../../tools/runtime-tool-sync").RuntimeToolDispatchGate;
    item?: undefined;
    output?: undefined;
    session?: undefined;
} | {
    resumed: boolean;
    item: any;
    output: string;
    session: any;
    reason?: undefined;
    runtimeToolDispatchGate?: undefined;
}>;
export declare function retryAgentQaItem(id: string, ctx: CollabCtx, streamRes?: any): Promise<{
    success: boolean;
    error: string;
    item?: undefined;
    wakeup?: undefined;
} | {
    success: boolean;
    item: any;
    wakeup: {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate?: undefined;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate: import("../../tools/runtime-tool-sync").RuntimeToolDispatchGate;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        item: any;
        output: string;
        session: any;
        reason?: undefined;
        runtimeToolDispatchGate?: undefined;
    };
    error?: undefined;
}>;
export declare function handleAgentQaRequests(input: {
    groupId: string;
    group: any;
    sourceProject: string;
    sourceOutput: string;
    originalPrompt: string;
    sourceWorkDir: string;
    sourceAgentType: string;
    allowedTools: any;
    mcpConfigPath?: string;
    runtimeToolSnapshot?: any;
    configs: any[];
    ctx: CollabCtx;
    streamRes?: any;
    taskId?: string;
    sourceTaskAgentSessionId?: string;
    sourceNativeSessionId?: string;
    qaDepth?: number;
}): Promise<{
    outputs: string[];
    resumedOutput: string;
}>;
export declare function evaluateCoordinationImplementationReceipt(receipt: any, request: any): {
    status: string;
    accepted: boolean;
    score: number;
    evidence: string[];
    files_changed: string[];
    verification: string[];
    gaps: string[];
    reason: string;
    arbitrated_by: string;
    arbitrated_at: string;
};
export declare function evaluateCoordinationTaskEvidence(task: any, request: any, receipt: any, execution: any): {
    status: string;
    accepted: boolean;
    score: number;
    gaps: string[];
    workspace_files: any;
    evidence: string[];
    reason: string;
    files_changed: string[];
    verification: string[];
    arbitrated_by: string;
    arbitrated_at: string;
};
export declare function getCoordinationRequestForTask(task: any): import("./group-coordination-store").GroupCoordinationRequestRecord;
export declare function getCoordinationQaForRequest(requestId: string): any;
export declare function coordinationAuditHas(request: any, type: string): any;
export declare function markGroupCoordinationDependencyStarted(task: any, workspace: any, session: any): import("./group-coordination-store").GroupCoordinationRequestRecord | {
    mode: string;
    target_project: any;
    work_item_task_id: any;
    task_agent_session_id: any;
    native_session_id: any;
    agent_type: any;
    workspace_mode: any;
    worktree_path: any;
    worktree_branch: any;
    original_work_dir: any;
    started_at: string;
};
export declare function buildRejectedCoordinationAcceptance(task: any, request: any, receipt: any, reason: string): {
    status: string;
    accepted: boolean;
    score: number;
    gaps: string[];
    reason: string;
    evidence: string[];
    files_changed: string[];
    verification: string[];
    arbitrated_by: string;
    arbitrated_at: string;
};
export declare function settleGroupCoordinationDependency(task: any, ctx: CollabCtx, streamRes?: any): Promise<{
    handled: boolean;
    reason: string;
    duplicate?: undefined;
    status?: undefined;
    pending?: undefined;
    accepted?: undefined;
    resumed?: undefined;
    wakeup?: undefined;
    acceptance?: undefined;
    merge?: undefined;
} | {
    handled: boolean;
    duplicate: boolean;
    status: string;
    reason?: undefined;
    pending?: undefined;
    accepted?: undefined;
    resumed?: undefined;
    wakeup?: undefined;
    acceptance?: undefined;
    merge?: undefined;
} | {
    handled: boolean;
    pending: boolean;
    status: string;
    reason: any;
    duplicate?: undefined;
    accepted?: undefined;
    resumed?: undefined;
    wakeup?: undefined;
    acceptance?: undefined;
    merge?: undefined;
} | {
    handled: boolean;
    duplicate: boolean;
    accepted: boolean;
    resumed: boolean;
    status: string;
    reason?: undefined;
    pending?: undefined;
    wakeup?: undefined;
    acceptance?: undefined;
    merge?: undefined;
} | {
    handled: boolean;
    accepted: boolean;
    resumed: boolean;
    reason: string;
    duplicate?: undefined;
    status?: undefined;
    pending?: undefined;
    wakeup?: undefined;
    acceptance?: undefined;
    merge?: undefined;
} | {
    handled: boolean;
    accepted: boolean;
    resumed: boolean;
    wakeup: {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate?: undefined;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate: import("../../tools/runtime-tool-sync").RuntimeToolDispatchGate;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        item: any;
        output: string;
        session: any;
        reason?: undefined;
        runtimeToolDispatchGate?: undefined;
    };
    reason: string;
    duplicate?: undefined;
    status?: undefined;
    pending?: undefined;
    acceptance?: undefined;
    merge?: undefined;
} | {
    handled: boolean;
    pending: boolean;
    status: any;
    reason?: undefined;
    duplicate?: undefined;
    accepted?: undefined;
    resumed?: undefined;
    wakeup?: undefined;
    acceptance?: undefined;
    merge?: undefined;
} | {
    handled: boolean;
    accepted: boolean;
    acceptance: any;
    merge: any;
    reason?: undefined;
    duplicate?: undefined;
    status?: undefined;
    pending?: undefined;
    resumed?: undefined;
    wakeup?: undefined;
} | {
    handled: boolean;
    accepted: boolean;
    resumed: boolean;
    wakeup: {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate?: undefined;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        reason: string;
        runtimeToolDispatchGate: import("../../tools/runtime-tool-sync").RuntimeToolDispatchGate;
        item?: undefined;
        output?: undefined;
        session?: undefined;
    } | {
        resumed: boolean;
        item: any;
        output: string;
        session: any;
        reason?: undefined;
        runtimeToolDispatchGate?: undefined;
    };
    merge: any;
    reason?: undefined;
    duplicate?: undefined;
    status?: undefined;
    pending?: undefined;
    acceptance?: undefined;
} | {
    handled: boolean;
    accepted: boolean;
    resumed: boolean;
    reason: string;
    merge: any;
    duplicate?: undefined;
    status?: undefined;
    pending?: undefined;
    wakeup?: undefined;
    acceptance?: undefined;
}>;
export declare function recoverGroupCoordinationDependencies(ctx: CollabCtx): Promise<{
    total: number;
    results: any[];
}>;
export declare function runGroupCoordinationBusinessChainTestTurn(input: any): Promise<{
    outputs: string[];
    resumedOutput: string;
}>;
export declare function getCoordinatorVisibleMessageSelfTest(): {
    pass: boolean;
    visible: string;
    friendly: string;
};
export declare function appendCoordinatorMessage(groupId: string, agent: string, content: string, streamRes?: any, suffix?: string, metadata?: any): Promise<string>;
export declare function buildCoordinatorReworkRoutingDecision(item: any, input?: {
    previousLedger?: any;
    userMessage?: string;
    coordinatorOutput?: string;
}): any;
export declare function getMentionReworkRoute(mention: any): any;
export declare function coordinatorReworkRouteRequiresStop(route: any): boolean;
export declare function coordinatorReworkRouteNeedsFreshVerifier(route: any): boolean;
export declare function coordinatorReworkRouteUsesVerifier(route: any): boolean;
export declare function selectCoordinatorIndependentVerifier(group: any, originalTarget?: string): any;
export declare function isCoordinatorTestAgentName(value: any): boolean;
export declare function resolveProjectRuntimeForTestAgentHandoff(group: any, project: string): {
    workDir: string;
    agentType: string;
    source: string;
};
export declare function collectCoordinatorChangedFiles(value: any, project?: string): string[];
export declare function collectCoordinatorVerificationCommands(project: string, workDir?: string, previousLedger?: any): string[];
export declare function isCoordinatorReviewInstruction(value: any): boolean;
export declare function buildCoordinatorTestAgentAcceptanceCriteria(task: any, verificationCommands: string[]): string[];
export declare function buildTestAgentHandoffId(taskId?: string, originalTarget?: string): string;
export declare function getTestAgentHandoffReviewSubject(handoff?: any): string;
