export declare const CONVERSATION_AUTO_RESUME_CONFIDENCE = 0.72;
export type ConversationRouteScope = "global" | "project" | "group";
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
    targetProjects: any[];
    recoverable: boolean;
    contentStored: boolean;
};
export declare function decideConversationMessageRoute(input: {
    workflowDecision: any;
    candidates: any[];
}): {
    decision: "answer";
    confidence: number;
    candidate: any;
    reason: string;
} | {
    decision: "new_task";
    confidence: number;
    candidate: any;
    reason: string;
} | {
    decision: "resume_task" | "revise_task";
    confidence: number;
    candidate: any;
    reason: string;
} | {
    decision: "needs_user";
    confidence: number;
    candidate: any;
    reason: string;
};
export declare function conversationRouteAuditChecksum(value: any): string;
export declare function runConversationMessageRoutingSelfTest(): {
    pass: boolean;
    checks: {
        belowThresholdNeedsUser: boolean;
        thresholdResumes: boolean;
        multipleCandidatesNeedUser: boolean;
        expandedTargetNeedsUser: boolean;
        explicitNewTaskStaysNew: boolean;
        answerDoesNotCreateTask: boolean;
        noCandidateActionStartsNewTask: boolean;
        noCandidateReadOnlyAnswers: boolean;
    };
};
