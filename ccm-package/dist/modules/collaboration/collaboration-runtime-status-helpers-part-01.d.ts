export declare function extractAgentQaRequests(text: string, group: any, sourceProject?: string): any[];
export declare function extractAgentQaReplies(text: string, qaId?: string): any[];
export declare function stripAgentQaProtocolBlocks(text: string): string;
export declare function getCoordinatorActionMentions(result: any, group: any, sourceProject?: string): any[];
export declare function summarizeReplayRepairTimelineBindingsForEvent(mention: any, context?: any): any;
export declare function recordReplayRepairTimelineBindingsForMention(groupId: string, mention: any, context?: any): any;
export declare function getAgentDependencyStateFromOutputs(agent: string, outputs?: string[]): {
    ok: boolean;
    status: any;
    reason: string;
};
export type TaskExecutionStatus = "done" | "waiting" | "failed";
export declare function buildTaskExecutionResult(status: TaskExecutionStatus, result: string, details?: any): {
    status: TaskExecutionStatus;
    result: string;
    report: string;
    detail: any;
    receipt: any;
    review: any;
    fileChanges: any;
    deliverySummary: any;
    assignments: any;
    coordinationPlan: any;
    dispatchPolicy: any;
    executionOrder: any;
    coordinatorRuntime: any;
    coordinatorAgent: any;
    runtimeToolSync: any;
    runtimeTooling: any;
    invokedSkills: any;
};
export declare function getReadyDailyDevMembers(group: any, configs?: any[]): {
    normalizedGroup: any;
    coordinator: any;
    routableMembers: any;
    readyMembers: any;
};
export declare function validateDailyDevGroupReady(group: any): {
    normalizedGroup: any;
    coordinator: any;
    routableMembers: any;
    readyMembers: any;
};
export declare function splitEvidenceList(value: any): any;
export declare function uniqueStrings(...lists: any[]): string[];
export declare function taskRequiresVerification(task: any): boolean;
export declare function isAdvisoryNeed(value: any, task?: any): boolean;
export declare function receiptHasOpenNeeds(receipt: any, task?: any): boolean;
export declare function getVerificationEvidenceGate(receipts?: any[]): {
    pass: boolean;
    executed: string[];
    suggested: string[];
    failed: string[];
};
export declare function getRequiredVerificationCoverage(receipts?: any[]): {
    pass: boolean;
    required: any[];
    covered: any[];
    missing: any[];
};
export declare function parseFormattedReceiptsFromText(text: string): any[];
export declare function extractActualFileChanges(fileChanges: any, agent?: string): any;
export declare function collectTaskActualFileChanges(task: any, execution: any): any[];
export declare function collectTaskCoordinationPlans(task: any, execution: any): any[];
export declare function collectTaskAssignmentEvidence(task: any, execution: any): any[];
export declare function collectTaskReworkEvidence(task: any, execution: any): any[];
export declare function buildTaskSandboxRehearsal(task: any, group: any, coordinatorResult?: any, assignments?: any[], mentions?: any[], dispatchPolicy?: any): {
    id: string;
    generated_at: string;
    status: string;
    title: any;
    business_goal: any;
    dispatch_action: any;
    dispatch_reason: any;
    impact_scope: {
        projects: string[];
        areas: string[];
        file_hints: string[];
        requires_code_changes: boolean;
        requires_verification: boolean;
    };
    agent_plan: {
        order: number;
        project: any;
        task: any;
        reason: any;
        depends_on: any;
    }[];
    verification_plan: any;
    risks: string[];
    gate_requirements: string[];
};
export declare function buildTeamShutdownGate(finalStatus: string, sessionContinuity?: any[], workItems?: any[], workItemSummary?: any): {
    required: boolean;
    pass: boolean;
    status: string;
    open_session_count: number;
    open_sessions: {
        id: any;
        project: any;
        executor: any;
        resume_mode: any;
        turn_count: any;
    }[];
    closed_session_count: number;
    work_item_total: number;
    unresolved_work_item_count: number;
    unresolved_work_items: {
        id: any;
        target: any;
        status: any;
        subject: any;
    }[];
    checked_at: string;
};
export declare function changeLooksHighRiskForIndependentReview(change: any): boolean;
export declare function explainIndependentReviewTriggerDecision(task: any, actualFileChanges?: any[]): {
    required: boolean;
    triggerReasons: string[];
    skipReasons: string[];
    highRiskFiles: any[];
    fileChangeCount: number;
    decisionDetail: string;
};
export declare function taskChangeNeedsIndependentReview(task: any, actualFileChanges?: any[]): boolean;
export declare function formatIndependentReviewGateUserDetail(gate?: any): string;
