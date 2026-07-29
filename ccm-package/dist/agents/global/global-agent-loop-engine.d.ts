import { type WorkflowDecision } from "../workflow-decision";
import type { GlobalAgentDecisionState, GlobalAgentLoopRuntime, GlobalAgentRun, GlobalAgentRunStatus, GlobalAgentRunStep, GlobalAgentUserSteer, GlobalAgentUserSteerKind, GlobalAgentUserSteerStatus } from "./loop";
export declare const attachGlobalAgentRunSupervision: (run: GlobalAgentRun, link: {
    mission_id: string;
    supervisor_id: string;
    state?: string;
}) => GlobalAgentRun, completeGlobalAgentSupervision: (id: string, report: any, outcome?: "completed" | "failed" | "cancelled") => any, globalSupervisionStateVisibleSummary: (state: any) => {
    status: GlobalAgentRunStatus;
    phase: GlobalAgentDecisionState;
    reply: string;
    summary: string;
    next_action: string;
    timelineType: string;
    timelineStatus: string;
}, updateGlobalAgentSupervisionState: (id: string, state: string) => any;
export declare function emitGlobalDispatchLaunchProgress(runtime: GlobalAgentLoopRuntime, run: GlobalAgentRun, step: GlobalAgentRunStep): void;
export declare function emit(runtime: GlobalAgentLoopRuntime, event: any, run: GlobalAgentRun): void;
export declare function classifyGlobalAgentUserSteer(message: string, requestedKind?: string): GlobalAgentUserSteerKind;
export declare function buildGlobalAgentEffectiveGoal(run: GlobalAgentRun): string;
export declare function steerGlobalAgentRun(id: string, message: string, options?: {
    kind?: GlobalAgentUserSteerKind | "auto";
    source?: string;
    requestId?: string;
}): {
    run: GlobalAgentRun;
    steering: GlobalAgentUserSteer;
    duplicate: boolean;
};
export declare function applyGlobalAgentSupervisionSteer(id: string, message: string, options?: {
    kind?: GlobalAgentUserSteerKind | "auto";
    source?: string;
    requestId?: string;
    supervisorState?: string;
    continuationSummary?: any;
}): {
    run: GlobalAgentRun;
    steering: GlobalAgentUserSteer;
    duplicate: boolean;
    applied: boolean;
    continuation?: undefined;
} | {
    run: GlobalAgentRun;
    steering: GlobalAgentUserSteer;
    duplicate: boolean;
    applied: boolean;
    continuation: {
        schema: string;
        kind: GlobalAgentUserSteerKind;
        source: string;
        affected_task_count: number;
        queued_task_count: number;
        deferred_task_count: number;
        interrupted_task_count: number;
        failed_task_count: number;
        replan_required: boolean;
        authorization_preserved: boolean;
        at: string;
    };
};
export declare function applyPendingGlobalAgentUserSteers(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime): {
    status: GlobalAgentUserSteerStatus;
    applied_at: string;
    authorization_preserved: boolean;
    id: string;
    message: string;
    kind: GlobalAgentUserSteerKind;
    source: string;
    request_id?: string;
    at: string;
}[];
export declare function applyGlobalResumeFeedback(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime, value: any, options?: {
    source?: string;
}): string;
export declare function buildGlobalRunWorkchain(run: GlobalAgentRun, status: GlobalAgentRunStatus, reply?: string, report?: any, options?: {
    mode?: string;
}): {
    schema: string;
    surface: import("../workchain").MainAgentWorkchainSurface;
    mode: string;
    status: string;
    phase: string;
    user_visible_text: string;
    stages: {
        id: string;
        label: string;
        status: string;
        summary: string;
    }[];
    todo_plan: {
        schema: string;
        source: string;
        title: string;
        surface: import("../workchain").MainAgentWorkchainSurface;
        mode: string;
        task_id: string;
        run_id: string;
        mission_id: string;
        steps: any[];
        current_step: any;
        currentStep: any;
        completed_count: number;
        total_count: number;
        progress_label: string;
        visible_steps: any[];
        visibleSteps: any[];
        archived_steps_count: number;
        archivedStepsCount: number;
        archive_summary: string;
        archiveSummary: string;
        quality_followup_required: boolean;
        qualityFollowupRequired: boolean;
        quality_followup: any;
        qualityFollowup: any;
        verification_nudge: boolean;
        verification_reminder: {
            schema: string;
            status: string;
            title: string;
            headline: string;
            reason: string;
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        verificationReminder: {
            schema: string;
            status: string;
            title: string;
            headline: string;
            reason: string;
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        display_policy: {
            user_visible: boolean;
            hide_for_ordinary_conversation: boolean;
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            quiet_completed: boolean;
            archive_completed_todo: boolean;
            archiveCompletedTodo: boolean;
            archived_when_complete: boolean;
            archivedWhenComplete: boolean;
            visible_when_completed: boolean;
            visibleWhenCompleted: boolean;
            max_visible_steps: number;
        };
    };
    todoPlan: {
        schema: string;
        source: string;
        title: string;
        surface: import("../workchain").MainAgentWorkchainSurface;
        mode: string;
        task_id: string;
        run_id: string;
        mission_id: string;
        steps: any[];
        current_step: any;
        currentStep: any;
        completed_count: number;
        total_count: number;
        progress_label: string;
        visible_steps: any[];
        visibleSteps: any[];
        archived_steps_count: number;
        archivedStepsCount: number;
        archive_summary: string;
        archiveSummary: string;
        quality_followup_required: boolean;
        qualityFollowupRequired: boolean;
        quality_followup: any;
        qualityFollowup: any;
        verification_nudge: boolean;
        verification_reminder: {
            schema: string;
            status: string;
            title: string;
            headline: string;
            reason: string;
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        verificationReminder: {
            schema: string;
            status: string;
            title: string;
            headline: string;
            reason: string;
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        display_policy: {
            user_visible: boolean;
            hide_for_ordinary_conversation: boolean;
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            quiet_completed: boolean;
            archive_completed_todo: boolean;
            archiveCompletedTodo: boolean;
            archived_when_complete: boolean;
            archivedWhenComplete: boolean;
            visible_when_completed: boolean;
            visibleWhenCompleted: boolean;
            max_visible_steps: number;
        };
    };
    progress_checkpoints: {
        schema: string;
        title: string;
        display_policy: {
            user_visible: boolean;
            hide_for_ordinary_conversation: boolean;
            raw_events_default_collapsed: boolean;
        };
        items: any[];
    };
    completion_summary: {
        headline: string;
        evidence: string[];
        files: any[];
        verification: string[];
        acceptance: string[];
        independent_review: string[];
        independentReview: string[];
        post_review_spot_check: any;
        postReviewSpotCheck: any;
        post_review_spot_check_summary: any;
        postReviewSpotCheckSummary: any;
        post_review_spot_check_gate: any;
        postReviewSpotCheckGate: any;
        post_review_spot_check_required: boolean;
        post_review_spot_check_gate_passed: boolean;
        risks: string[];
        next_action: string;
        verification_status: string;
        risk_status: string;
        final_summary_quality: {
            schema: string;
            required: boolean;
            passed: boolean;
            checks: {
                id: string;
                label: string;
                passed: boolean;
                detail: string;
            }[];
            missing: string[];
            verification_status: string;
            risk_status: string;
            source: string;
        };
        quality_followup: {
            schema: string;
            title: string;
            headline: string;
            missing: string[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        qualityFollowup: {
            schema: string;
            title: string;
            headline: string;
            missing: string[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        todo_plan: {
            schema: string;
            source: string;
            title: string;
            surface: import("../workchain").MainAgentWorkchainSurface;
            mode: string;
            task_id: string;
            run_id: string;
            mission_id: string;
            steps: any[];
            current_step: any;
            currentStep: any;
            completed_count: number;
            total_count: number;
            progress_label: string;
            visible_steps: any[];
            visibleSteps: any[];
            archived_steps_count: number;
            archivedStepsCount: number;
            archive_summary: string;
            archiveSummary: string;
            quality_followup_required: boolean;
            qualityFollowupRequired: boolean;
            quality_followup: any;
            qualityFollowup: any;
            verification_nudge: boolean;
            verification_reminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            verificationReminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            display_policy: {
                user_visible: boolean;
                hide_for_ordinary_conversation: boolean;
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                quiet_completed: boolean;
                archive_completed_todo: boolean;
                archiveCompletedTodo: boolean;
                archived_when_complete: boolean;
                archivedWhenComplete: boolean;
                visible_when_completed: boolean;
                visibleWhenCompleted: boolean;
                max_visible_steps: number;
            };
        };
        todoPlan: {
            schema: string;
            source: string;
            title: string;
            surface: import("../workchain").MainAgentWorkchainSurface;
            mode: string;
            task_id: string;
            run_id: string;
            mission_id: string;
            steps: any[];
            current_step: any;
            currentStep: any;
            completed_count: number;
            total_count: number;
            progress_label: string;
            visible_steps: any[];
            visibleSteps: any[];
            archived_steps_count: number;
            archivedStepsCount: number;
            archive_summary: string;
            archiveSummary: string;
            quality_followup_required: boolean;
            qualityFollowupRequired: boolean;
            quality_followup: any;
            qualityFollowup: any;
            verification_nudge: boolean;
            verification_reminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            verificationReminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            display_policy: {
                user_visible: boolean;
                hide_for_ordinary_conversation: boolean;
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                quiet_completed: boolean;
                archive_completed_todo: boolean;
                archiveCompletedTodo: boolean;
                archived_when_complete: boolean;
                archivedWhenComplete: boolean;
                visible_when_completed: boolean;
                visibleWhenCompleted: boolean;
                max_visible_steps: number;
            };
        };
        terminal: boolean;
    };
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        final_summary_required: boolean;
    };
    technical_details: {
        id: string;
        title: string;
        items: any[];
    }[];
};
export declare function buildGlobalDisplayStreamFromWorkchain(workchain: any): {
    schema: string;
    type: string;
    user_visible: boolean;
    user_visible_text: any;
    text_message: {
        type: string;
        text: any;
    };
    tool_use_summary: {
        type: string;
        tool_summary: any;
        counts: {};
        hidden_tool_uses: number;
    };
    workchain: any;
    completion_summary: any;
    dispatch_launch_summary: any;
    dispatchLaunchSummary: any;
    main_agent_decision: any;
    mainAgentDecision: any;
    progress_checkpoints: any;
    delivery_report: any;
    workchain_stages: any;
    technical_details: any;
    todo: {
        visible: boolean;
        surface: string;
        tool_message_visible: boolean;
        quiet_completed: boolean;
    };
    terminology: {
        sanitized: boolean;
        blocked_terms: string[];
    };
};
export declare function completeRun(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime, status: GlobalAgentRunStatus, reply: string, error?: string): GlobalAgentRun;
export declare function startGlobalAgentRun(input: {
    message: string;
    originalMessage?: string;
    history?: any[];
    sessionId?: string;
    source?: string;
    explicitWriteAuthorization?: boolean;
    workflowDecision?: WorkflowDecision | null;
    traceId?: string;
    maxSteps?: number;
    timeoutMs?: number;
}, runtime: GlobalAgentLoopRuntime): Promise<GlobalAgentRun>;
export declare function resumeGlobalAgentRun(id: string, runtime: GlobalAgentLoopRuntime, options?: {
    approved?: boolean;
    cancelled?: boolean;
    feedback?: string;
    acceptFeedback?: string;
    source?: string;
    resumeSource?: string;
}): Promise<GlobalAgentRun>;
export declare function continueGlobalAgentRunWithClarification(id: string, answer: string, runtime: GlobalAgentLoopRuntime, options?: {
    explicitWriteAuthorization?: boolean;
}): Promise<GlobalAgentRun>;
export declare function pauseGlobalAgentRun(id: string): GlobalAgentRun;
export declare function cancelGlobalAgentRun(id: string): GlobalAgentRun;
export declare function recoverInterruptedGlobalAgentRuns(runtime: GlobalAgentLoopRuntime): Promise<{
    total: number;
    resumed: number;
    results: any[];
}>;
export declare const runGlobalAgentLoopSelfTest: () => Promise<{
    workchain: any;
    deliveryReport: any;
    multiStepCompletes: boolean;
    dispatchIsNotDeliveryCompletion: any;
    acceptedDispatchStopsSynchronousPolling: boolean;
    supervisingVisibleReplyHidesTechnicalIds: boolean;
    finalGateCompletesOriginalRun: boolean;
    globalSupervisionWaitingRefreshesVisibleWorkchain: boolean;
    globalSupervisionReworkRefreshesVisibleWorkchain: any;
    globalSupervisionGoalRevisionStopsOldRunAndReplans: boolean;
    modelObservesAndContinues: boolean;
    consultationDoesNotDispatch: boolean;
    ordinaryConversationUsesQuietWorkchain: boolean;
    readOnlySystemStatusUsesQuietWorkchain: boolean;
    globalVisibleReplySanitizesProtocol: boolean;
    globalVisibleReplyStoresRawTechnicalContent: boolean;
    globalProtocolLeakAnswerHasNoPlanMode: boolean;
    globalVisibleReplyHidesArtifactPaths: boolean;
    globalArtifactLeakAnswerHasNoPlanMode: boolean;
    ambiguousConsultationNeedsClarification: boolean;
    clarificationContinuesSameRun: boolean;
    clarificationPreservesOriginalGoal: any;
    reasoningPlanAndFactsAreAudited: any;
    clarificationCanRevokeAuthorization: boolean;
    toolFailureTriggersAuditedReplan: any;
    destructiveAlwaysNeedsConfirmation: boolean;
    globalPlanModeVisible: any;
    globalPlanModeCompletesAfterConfirmation: any;
    globalConfirmedPlanHasExecutionFollowup: any;
    globalConfirmedPlanCarriesAcceptFeedback: any;
    globalOrdinaryAnswerHasNoPlanMode: boolean;
    confirmationExecutesExactPendingToolOnce: boolean;
    invalidToolsConvergeToFailure: any;
    duplicateLoopIsStopped: boolean;
    pauseAndResumeWorks: boolean;
    globalResumeCarriesFeedback: boolean;
    globalMidTurnSteerUsesSameRun: boolean;
    globalMidTurnSteerConsumesOnce: boolean;
    globalMidTurnSteerStreamsFriendlyAppliedEvent: boolean;
    globalMidTurnGoalRevisionForcesReplanAndRevokesAuthorization: boolean;
    fencedJsonParses: boolean;
    shadowModeHasNoSideEffect: boolean;
    completedRunsHaveWorkchain: boolean;
    completedRunsHaveProgressCheckpoints: boolean;
    workchainSelfTestPasses: boolean;
    deliveryReportSelfTestPasses: boolean;
    executionRunsHaveUnifiedDeliveryReport: boolean;
    executionRunsHaveCompletionCard: boolean;
    ordinaryAnswerDoesNotShowDeliveryReport: boolean;
    globalDispatchLaunchSummaryVisible: boolean;
    globalDispatchLaunchSummaryStreamsLive: boolean;
    globalDispatchLaunchSummaryDoesNotCallDoneTargetCompleted: boolean;
    globalAutoPlanModeStreamsLive: boolean;
    globalAutoPlanModeHasExecutionFollowup: boolean;
    globalOrdinaryAnswerHasNoPlanModeEvent: boolean;
    globalProjectDispatchLaunchSummaryVisible: any;
    globalProjectDispatchLaunchSummaryStreamsLive: any;
    globalOrdinaryAnswerHasNoDispatchLaunchSummary: boolean;
    globalOrdinaryAnswerHasNoDispatchLaunchEvent: boolean;
    globalDispatchLaunchSummaryHidesProtocol: boolean;
    globalClarificationSummaryVisible: boolean;
    globalQualityClarificationSummaryStreamsLive: boolean;
    globalConfirmationSummaryVisible: boolean;
    globalPlanModeStreamsLive: boolean;
    globalWaitingSummariesHideProtocol: boolean;
    pass: boolean;
}>;
