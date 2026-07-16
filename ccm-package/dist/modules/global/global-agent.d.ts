import { type CollabCtx } from "../collaboration/collaboration";
export declare function runGlobalAgentHistorySyncSelfTest(): {
    pass: boolean;
    checks: {
        preservesType: boolean;
        preservesRun: boolean;
        preservesDeliveryReport: boolean;
        mergesRicherMetadata: any;
        preservesProgressCheckpoints: boolean;
        sanitizesProtocolContent: boolean;
        sanitizesArtifactPathContent: boolean;
    };
};
export declare function runFeishuGlobalAgentSessionRoutingSelfTest(): {
    pass: boolean;
    checks: {
        removesDeletedWebSession: boolean;
        usesValidCurrentSession: boolean;
        fallsBackToMostRecentWebSession: boolean;
        onlyUsesAcpSessionWithoutWebHistory: boolean;
    };
};
export declare function runGlobalAgentIntentSelfTest(): {
    passed: boolean;
    results: ({
        actual: any;
        targetCount: any;
        actualAuthorized: boolean;
        passed: boolean;
        message: string;
        expected: string;
        expectedTargetCount: number;
        authorized: boolean;
    } | {
        actual: any;
        targetCount: any;
        actualAuthorized: boolean;
        passed: boolean;
        message: string;
        expected: string;
        authorized: boolean;
        expectedTargetCount?: undefined;
    } | {
        actual: any;
        targetCount: any;
        actualAuthorized: boolean;
        passed: boolean;
        message: string;
        expected: string;
        expectedTargetCount?: undefined;
        authorized?: undefined;
    })[];
    actionBlockHidden: boolean;
    fallbackDelegationCannotWrite: boolean;
    localGroupDispatchUsesSchema: boolean;
    localDispatchRepliesFriendly: boolean;
    fallbackCronCannotWrite: boolean;
    ambiguousFallbackCannotWrite: boolean;
    fallbackObservationFriendly: boolean;
    fallbackGreetingStaysConversation: boolean;
    groupMemoryModelContextBounded: boolean;
    globalHistoryMergePreservesBackendCompletion: boolean;
    statusChecks: {
        globalStatusFollowupRecognized: boolean;
        globalStatusFollowupAvoidsManagementMutation: boolean;
        globalStatusShortcutDoesNotCaptureExplicitDevelopment: boolean;
        globalStatusSummaryFriendly: boolean;
        globalStatusShowsChildAgentWaitingState: boolean;
        globalStatusWeakMissionStaysReviewing: boolean;
        globalStatusShowsSupervisionWaitingState: boolean;
        globalStatusShowsSupervisionReworkState: boolean;
        globalStatusShowsStandaloneRunState: boolean;
        globalStatusShowsIndependentReviewRework: boolean;
        globalStatusShowsTestAgentPlanOnly: boolean;
        globalStatusSynthesizesTestAgentFailureSummary: boolean;
        globalStatusIncludesDirectDispatch: boolean;
        globalStatusShowsDirectDispatchContinuation: boolean;
        globalStatusShowsPickupSummary: boolean;
        globalStatusWeakDirectDispatchStaysReviewing: boolean;
        globalStatusShowsProgressRefreshSummary: boolean;
        globalStatusHidesProtocol: boolean;
    };
    directDispatchChecks: {
        groupVisibleWorkOrderFriendly: boolean;
        groupVisibleWorkOrderNoProtocolLeak: boolean;
        groupDirectDispatchSaysAcceptedNotDone: boolean;
        groupDirectDispatchHidesTaskId: boolean;
        groupDirectDispatchUsesFriendlyReplyLabel: boolean;
        globalFeishuDevelopmentDispatchHidesIds: boolean;
        globalFeishuTaskDispatchHidesIds: boolean;
        projectInternalWorkOrderSelfContained: boolean;
        directDispatchHandoffSummary: boolean;
        verificationOnlyCanAvoidCodeChanges: any;
        singleProjectDispatchUsesPersistentMission: boolean;
        singleProjectDispatchCarriesReviewAcceptance: boolean;
        dispatchLaunchUiFriendly: boolean;
        dispatchLaunchUiHidesProtocol: boolean;
    };
    testAgentRelayChecks: {
        globalTestAgentPassedSpotCheckAllowsAcceptance: boolean;
        globalTestAgentSpotCheckMismatchOverridesLegacyPass: boolean;
        globalTestAgentUnknownCoverageRelayNeedsUser: boolean;
        globalTestAgentUnknownCoverageUiWaits: boolean;
        globalTestAgentNotVerifiedCoverageRelayNeedsRework: boolean;
        globalTestAgentNotVerifiedCoverageUiWaits: boolean;
        globalTestAgentSummaryOnlyGapRelayNeedsRework: boolean;
        globalTestAgentWeakSummaryRelayNeedsUser: boolean;
        globalTestAgentWeakSummaryUiWaits: boolean;
        globalTestAgentFailedBrowserFlowRelayNeedsRework: boolean;
        globalTestAgentFailedMultiSessionRelayNeedsRework: boolean;
        globalTestAgentIncompleteLatestEvidenceNeedsRecheck: boolean;
        globalTestAgentFailedAuthenticationOverridesLegacyPass: boolean;
        globalTestAgentBlockedAuthenticationNeedsUser: boolean;
        globalTestAgentFailureSummaryRelayNeedsRework: boolean;
        globalTestAgentFailureSummaryUiWaits: boolean;
    };
    visibleReply: string;
};
export declare function verifyGlobalAgentContextBoundary(context?: any): {
    schema: string;
    valid: boolean;
    issues: string[];
    expectedChecksum: string;
};
export declare function buildGlobalAgentGroupMemoryModelContext(bundle: any, options?: any): {
    schema: string;
    source_schema: string;
    generated_at: string;
    query: string;
    total_group_count: number;
    selected_group_count: number;
    selected_groups: any;
    memory_policy: any;
    rendered_text: string;
    context_budget: {
        max_chars: number;
        used_chars: number;
        approximate_tokens: number;
        source_bytes: number;
        truncated: boolean;
        full_context_available_via: string;
    };
};
export declare function buildAgenticContext(query?: string, sessionId?: string, options?: any): any;
export declare function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number): Promise<any>;
export declare function startGlobalMissionSupervisionForServer(ctx: CollabCtx): any;
export declare function bootstrapGlobalAgentMemoryForServer(): {
    total: any;
    migrated: number;
    results: any[];
};
export declare function stopGlobalMissionSupervisionForServer(): void;
type FeishuTurnCommand = {
    kind: "normal" | "steer" | "queue" | "stop";
    message: string;
};
export declare function parseFeishuConversationTurnCommand(value: any): FeishuTurnCommand;
export declare function startFeishuConversationTurnRecoveryForServer(baseUrl: string, ctx: CollabCtx): {
    started: boolean;
};
export declare function stopFeishuConversationTurnRecoveryForServer(): void;
export declare function runFeishuConversationTurnCommandSelfTest(): {
    pass: boolean;
    checks: {
        stop: boolean;
        steer: boolean;
        queue: boolean;
        ordinaryDefaultsToNormal: boolean;
    };
};
export declare function handleGlobalAgentApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
export declare function runGlobalModelRetrySelfTest(): Promise<{
    pass: boolean;
    checks: {
        transientFailureRetriesOnce: boolean;
        permanentClientErrorDoesNotRetry: boolean;
        openAiBaseUrlUsesV1Endpoint: boolean;
        anthropicBaseUrlUsesV1Endpoint: boolean;
    };
}>;
export {};
