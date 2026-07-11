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
    globalHistoryMergePreservesBackendCompletion: boolean;
    statusChecks: {
        globalStatusFollowupRecognized: boolean;
        globalStatusFollowupAvoidsManagementMutation: boolean;
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
        verificationOnlyCanAvoidCodeChanges: boolean;
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
export declare function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number): Promise<{
    total: number;
    resumed: number;
    results: any[];
}>;
export declare function startGlobalMissionSupervisionForServer(ctx: CollabCtx): {
    started: boolean;
    active: boolean;
    resumed?: undefined;
} | {
    started: boolean;
    active: boolean;
    resumed: number;
};
export declare function bootstrapGlobalAgentMemoryForServer(): {
    total: any;
    migrated: number;
    results: any[];
};
export declare function stopGlobalMissionSupervisionForServer(): void;
export declare function handleGlobalAgentApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
