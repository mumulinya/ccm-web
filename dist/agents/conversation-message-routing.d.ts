export declare const CONVERSATION_CANDIDATE_CONFIDENCE = 0.72;
export declare const CONVERSATION_AUTO_RESUME_CONFIDENCE = 0.85;
export type ConversationRouteScope = "global" | "project" | "group" | "feishu";
export type ConversationRouteKind = "answer_only" | "continue_current_session" | "resume_existing_task" | "revise_existing_task" | "start_new_task" | "needs_user";
export declare function findConversationTaskCandidates(input: {
    scope: ConversationRouteScope;
    scopeId: string;
    exactSessionId: string;
    includeCompleted?: boolean;
}): any[];
export declare function findRecoverableConversationTasks(input: {
    scope: ConversationRouteScope;
    scopeId: string;
    exactSessionId: string;
}): any[];
export declare function buildRecoverableTaskSummary(task: any): {
    taskId: string;
    title: string;
    status: string;
    generation: number;
    candidateKind: "completed" | "active" | "recoverable";
    phase: string;
    attempt: number;
    hasIncompleteWorkItems: any;
    targetProjects: any[];
    recoverable: boolean;
    contentStored: boolean;
};
export declare function bindConversationRouteToWorkflowDecision(workflowDecision: any, route: any, candidate: any, source?: "model" | "session_anchor" | "explicit_user_choice" | "recovery_preflight"): any;
export declare function decideConversationMessageRoute(input: {
    workflowDecision: any;
    candidates: any[];
    exactSessionId?: string;
    scope?: ConversationRouteScope;
    scopeId?: string;
    messageId?: string;
    message?: string;
}): any;
export declare function conversationRouteAuditChecksum(value: any): string;
export declare function runConversationMessageRoutingSelfTest(): {
    pass: boolean;
    checks: {
        belowThresholdNeedsUser: boolean;
        mediumConfidenceNeedsUser: boolean;
        highConfidenceResumes: boolean;
        multipleCandidatesNeedUser: boolean;
        expandedTargetNeedsUser: boolean;
        explicitNewTaskStaysNew: boolean;
        answerDoesNotCreateTask: boolean;
        noCandidateContinuationNeedsUser: boolean;
        explicitNewTaskStartsNewTask: boolean;
        noCandidateReadOnlyAnswers: boolean;
    };
};
