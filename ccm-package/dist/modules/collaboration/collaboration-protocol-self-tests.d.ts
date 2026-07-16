export declare function runCollaborationProtocolSelfTest(): {
    pass: boolean;
    reworkProtocol: any;
    agentCollaborationProtocol: {
        pass: boolean;
        checks: {
            capabilityRouting: boolean;
            taskAndExecutionBound: boolean;
            permissionDoesNotExpand: boolean;
            admissionPasses: boolean;
            duplicateStops: boolean;
            evidenceAccepted: boolean;
            conflictingAnswerStops: boolean;
            timeoutReturnsToCoordinator: boolean;
            sideEffectDetected: boolean;
        };
        route: {
            targetName: any;
            strategy: string;
            candidates: any;
        };
        contract: any;
        admission: {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id?: undefined;
        } | {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id: any;
        };
        duplicate: {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id?: undefined;
        } | {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id: any;
        };
        answer: {
            status: string;
            accepted: boolean;
            score: number;
            evidence: string[];
            polarity: string;
            conflicts_with: any[];
            reason: string;
            arbitrated_by: string;
            arbitrated_at: string;
        };
        opposing: {
            status: string;
            accepted: boolean;
            score: number;
            evidence: string[];
            polarity: string;
            conflicts_with: any[];
            reason: string;
            arbitrated_by: string;
            arbitrated_at: string;
        };
        timeout: {
            timed_out: boolean;
            status: string;
            deadline_at: string;
            checked_at: string;
            recovery: string;
            reason: string;
        };
        permissionOk: {
            pass: boolean;
            mode: string;
            violations: ({
                type: string;
                path: string;
            } | {
                type: string;
                detail: string;
            })[];
            reason: string;
        };
        permissionDenied: {
            pass: boolean;
            mode: string;
            violations: ({
                type: string;
                path: string;
            } | {
                type: string;
                detail: string;
            })[];
            reason: string;
        };
    };
    startupTaskRecovery: {
        pass: boolean;
        checks: {
            startedAuthorizedTaskAutoResumes: boolean;
            confirmedQueuedTaskAutoResumes: boolean;
            awaitingConfirmationStaysManual: boolean;
            userPauseStaysManual: boolean;
            runtimeDebtStaysManual: boolean;
            missingAuthorizationStaysManual: boolean;
            startupManualHoldNeedsExplicitResume: boolean;
            explicitResumeCanReleaseStartupHold: boolean;
            mixedBatchIsPartitioned: boolean;
            userCopyHidesTechnicalEvidence: boolean;
        };
        samples: {
            started: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            queuedConfirmed: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            awaitingConfirmation: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            userPaused: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            runtimeDebt: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            missingAuthorization: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            heldWithoutOverride: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            heldWithOverride: import("./startup-task-recovery").StartupTaskRecoveryDecision;
        };
    };
    testAgentRunner: {
        pass: boolean;
        stableSourceFingerprint: boolean;
        recordsReconcile: boolean;
    };
    taskDocumentContextPreview: string;
    taskDocumentChecks: {
        hasBusinessGoal: boolean;
        hasAcceptance: boolean;
        hasSourceDocument: boolean;
        mergeKeepsTaskDocument: boolean;
    };
    structuredAssignmentChecks: {
        hasTwoMentions: boolean;
        preservesTarget: boolean;
        preservesTask: boolean;
        preservesDependency: boolean;
        preservesContinuation: boolean;
    };
    executionFixChecks: {
        hasCliCheck: boolean;
        hasApiNetworkHint: boolean;
        hasRetryAction: boolean;
    };
    executionFixActions: string[];
    probeHealthChecks: {
        recentFailureBlocks: boolean;
        freshSuccessPasses: boolean;
        probeCanRetryAfterRecentFailure: boolean;
        probeFailureKeepsRunnerError: boolean;
        freshProbeEnablesImmediateRecovery: boolean;
        staleProbeDoesNotEnableImmediateRecovery: boolean;
        dailyDevRequiresFreshProbe: boolean;
        dailyDevWatchdogGapsRequireFreshProbe: boolean;
        dailyDevFreshProbePasses: boolean;
        dailyDevFreshProbeMustMatchTarget: boolean;
        groupProbeRequiresAllMembers: boolean;
        groupProbeAllMembersPass: boolean;
        explicitProjectBypassesGroupWideProbe: boolean;
        targetProbeKeysAreIsolated: boolean;
        targetProbePartialMatchWorks: boolean;
        recoveryProbeGroupsAreTargeted: boolean;
        recoveryProbePayloadKeepsTarget: boolean;
        recoveryTargetMatchWorks: boolean;
        generalTaskDoesNotRequireProbe: boolean;
    };
    taskNotificationChecks: {
        hasXmlEnvelope: boolean;
        hasTaskId: boolean;
        hasCompletedStatus: boolean;
        detectsMissingReceipt: any;
        missingReceiptFollowUpHasUserPreview: any;
        missingReceiptSummaryFriendly: boolean;
        missingReceiptSummaryHidesProtocol: boolean;
        displaySelfTestPasses: boolean;
    };
    taskNotificationDisplay: {
        pass: boolean;
        checks: {
            keepsInternalEnvelopeForCoordinator: boolean;
            missingReceiptSummaryFriendly: boolean;
            missingReceiptResultKeepsUsefulText: boolean;
            completedSummaryPreserved: boolean;
            visibleNotificationTextHidesProtocol: boolean;
        };
        samples: {
            missing: any;
            completed: any;
        };
    };
    dependencyGateChecks: {
        doneDependencyPasses: boolean;
        blockedDependencyStopsDownstream: boolean;
        blockedDependencyExplainsReason: boolean;
        latestRecoveredReceiptUnblocksDownstream: boolean;
    };
    notificationDeliveryChecks: {
        summaryHasWorkerNotification: boolean;
        summaryKeepsNotificationTaskId: boolean;
        summaryUsesNotificationAgent: any;
        userReportHidesNotificationProtocol: boolean;
    };
    continuationGapChecks: {
        workerNotificationTriggersGap: any;
        draftIncludesWorkerNotification: any;
        draftIncludesSameWorkerStrategy: any;
        missingCoordinationTriggersGap: any;
        draftIncludesCoordinationEvidenceGap: any;
        firstGapCanAutoContinue: boolean;
        unchangedGapDoesNotLoop: boolean;
        changedGapAllowsNewTargetedAttempt: boolean;
        exhaustedGapNeedsUserDecision: boolean;
        automaticContinuationIsInternal: boolean;
        userTaskCardExplainsNextAction: boolean;
        userTaskCardHidesProtocolTerms: boolean;
    };
    scratchpadChecks: {
        storesWorkerLedger: boolean;
        contextIncludesScratchpad: boolean;
        contextIncludesWorkerSummary: boolean;
    };
    coordinatorVisibleMessageSelfTest: {
        pass: boolean;
        visible: string;
        friendly: string;
    };
    agentQaRequirementChecks: {
        infersExplicitAskAgentRequirement: boolean;
        explicitFalseDisablesRequirement: boolean;
        missingQaBlocksAcceptance: boolean;
    };
    globalMissionRequirementChecks: {
        codeTaskDefaultsToIndependentReview: boolean;
        explicitNonCodeTaskCanDisableReview: boolean;
        targetRequirementOverridesMissionDefault: boolean;
    };
};
