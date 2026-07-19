import { CollabCtx } from "./collaboration-runtime-plan-tools";
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
        agent_type: import("../../agents/runtime").AgentRuntimeId;
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
    runtime_tool_dispatch_gate: import("../../tools/runtime-tool-sync-part-01").RuntimeToolDispatchGate;
    primary_runtime?: undefined;
    final_runtime?: undefined;
    decision?: undefined;
} | {
    success: boolean;
    message: string;
    switched: boolean;
    primary_runtime: import("../../agents/runtime").AgentRuntimeId;
    final_runtime: import("../../agents/runtime").AgentRuntimeId;
    attempts: any[];
    error?: undefined;
    runtime_tool_dispatch_gate?: undefined;
    decision?: undefined;
} | {
    success: boolean;
    message: string;
    switched: boolean;
    primary_runtime: import("../../agents/runtime").AgentRuntimeId;
    final_runtime: import("../../agents/runtime").AgentRuntimeId;
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
