import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
type GroupLiveRoutesDeps = {
    writeSse: (res: ServerResponse, data: any) => void;
    ensureTraceId: (value: any, prefix: string) => string;
    classifyGroupProjectTaskIntentWithAgent: (input: any) => Promise<any>;
    shouldCreatePersistentGroupTask: (input: any) => boolean;
    shouldUseProjectAnalysisMode: (input: any) => boolean;
    classifyTaskContinuation: (message: string) => string;
    looksLikeTaskContinuation: (message: string) => boolean;
    continueTaskWithMessage: (taskId: string, message: string, ctx: any, options?: any) => any;
    appendMainAgentDecisionTrace: (input: any) => any;
    applyMainAgentDecisionPetState: (ctx: any, decision: any) => void;
    validateDailyDevGroupReady: (group: any) => any;
    compactMemoryText: (text: any, maxLength?: number) => string;
    buildGroupPlanModePreflight: (input: any) => any;
    createTask: (task: any) => any;
    updateTask: (taskId: string, updates: any) => any;
    appendTaskTimelineEvent: (taskId: string, event: any) => void;
    buildWorkflowMeta: (phase: string, label?: string) => any;
    buildInlineTaskRuntime: (task: any) => any;
    updateGroupMemory: (groupId: string, patch: any) => any;
    enqueueTask: (taskId: string, ctx: any) => any;
    buildCoordinatorSharedFilesContext: (ctx: any, group: any) => string;
    buildGroupProjectAnalysisContext: (group: any, message: string, ctx: any, configs?: any[]) => string;
    normalizePlanAssignments: (items: any[]) => any[];
    getInitialWorkflowMeta: (assignments: any[], dispatchPolicy: any, label?: string) => any;
    getCoordinatorActionMentions: (coordinatorResult: any, group: any, coordinatorProject: string) => any[];
    processCrossAgents: (...args: any[]) => Promise<any>;
    runCoordinatorReviewLoop: (input: any) => Promise<any>;
    buildGroupContextPacket: (groupId: string, options?: any) => string;
    buildAgentToolContext: (ctx: any, group: any, project: string) => any;
    prepareAgentRuntimeTools: (groupId: string, project: string, workDir: string, agentType: string, allowedTools: any, streamRes?: ServerResponse | null, options?: any) => any;
    getProjectExtraConfig: (project: string) => any;
    buildAgentMemoryContextBundle: (groupId: string, project: string, message: string, options?: any) => any;
    buildAgentMemoryPacket: (groupId: string, project: string, message: string) => string;
    buildChildAgentDevelopmentContract: (project: string, message: string, options?: any) => string;
    buildProjectVerificationHints: (project: string, workDir: string) => any;
    buildAgentQaProtocolInstructions: (project: string, memberList: string) => string;
    getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
    handleAgentQaRequests: (input: any) => Promise<any>;
    runtimeToolSnapshotFromAudit: (audit: any, allowedTools: any) => any;
    extractActionableMentions: (text: string, group: any, sourceProject: string) => any[];
    extractAgentReceipt: (text: string, project: string) => any;
};
export declare function resolveExplicitGroupContinuationTask(tasks: any[], groupId: string, taskId: string): {
    task: any;
    status: number;
    error: string;
};
export declare function runGroupExplicitContinuationRoutingSelfTest(): {
    pass: boolean;
    checks: {
        selectsRequestedTaskInsteadOfMostRecent: boolean;
        rejectsCrossGroupTask: boolean;
        rejectsCancelledTask: boolean;
        acceptsMultipartBoolean: boolean;
    };
};
export declare function buildGroupClarificationSummary(input: {
    group: any;
    userMessage?: string;
    responseText?: string;
    dispatchPolicy?: any;
    analysis?: any;
    coordinator?: string;
}): {
    schema: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    question: string;
    reason: string;
    answer_suggestions: string[];
    next_action: string;
    coordinator: string;
    display_policy: {
        user_visible: boolean;
        show_todo: boolean;
        technical_details_default_collapsed: boolean;
        hide_internal_protocols: boolean;
    };
};
export declare function runGroupClarificationSummarySelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        waitsForUser: boolean;
        questionVisible: boolean;
        suggestionsVisible: boolean;
        todoHidden: boolean;
        hidesProtocol: boolean;
    };
    summary: {
        schema: string;
        title: string;
        status: string;
        status_label: string;
        headline: string;
        question: string;
        reason: string;
        answer_suggestions: string[];
        next_action: string;
        coordinator: string;
        display_policy: {
            user_visible: boolean;
            show_todo: boolean;
            technical_details_default_collapsed: boolean;
            hide_internal_protocols: boolean;
        };
    };
};
export declare function resolvePendingGroupClarification(messages: any[], requestId: string, messageId?: string): {
    message: any;
    context: any;
    status: number;
    error: string;
};
export declare function buildGroupClarificationContinuationMessage(context: any, answerForAgent: string): string;
export declare function runGroupClarificationContinuationSelfTest(): {
    pass: boolean;
    checks: {
        selectsExactPendingQuestion: boolean;
        ignoresResolvedQuestion: boolean;
        preservesOriginalRequest: boolean;
        carriesQuestionAndAnswer: boolean;
        preventsStandaloneAnswerRouting: boolean;
    };
};
export declare function handleGroupLiveRoutes(req: IncomingMessage, res: ServerResponse, parsed: UrlWithParsedQuery, ctx: any, deps: GroupLiveRoutesDeps): boolean;
export {};
