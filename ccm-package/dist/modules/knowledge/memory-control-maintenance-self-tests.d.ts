export declare function runMemoryCenterPostCompactCompletionMemoryPreservationRepairClosureTypedMemoryWorkerContextSelfTest(): {
    pass: boolean;
    checks: {
        indexLayerSelfTestPasses: boolean;
        distillationIsIdempotent: boolean;
        typedMemoryQualityCoversBothGroups: boolean;
        legacyMemoryIsNotInjectedIntoUnscopedSessions: boolean;
        groupRecallIdentityIsIsolated: boolean;
        legacyClosureRemainsReadableForMigration: boolean;
    };
    typedMemory: {
        status: string;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        expectedClosureCount: any;
        coveredClosureCount: any;
        archivedClosureCount: any;
    };
    workerContext: {
        status: string;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        expectedClosureCount: any;
        firstSessionRecallCount: any;
        secondSessionRecallCount: any;
    };
    legacyAutoInjectionBlocked: boolean;
};
export declare function runMemoryCenterPostCompactCompletionMemoryPreservationClosureUsageFeedbackSelfTest(): {
    pass: boolean;
    checks: {
        validUsedFeedbackPromotesRecall: boolean;
        repeatedIgnoredFeedbackDeprioritizesGenericRecall: boolean;
        exactCorrectedOutcomeStillRecalls: boolean;
        invalidReceiptRequiresRepair: boolean;
        duplicateScanIsIdempotent: boolean;
        correctedReceiptClosesRepairAndRecovers: boolean;
        feedbackSessionsStayGroupIsolated: boolean;
        immutableClosureArchivesRemainUnchanged: boolean;
        qualityChecksRegisteredAndPass: boolean;
        memoryCenterCreatedNoRealTask: boolean;
    };
    receiptBefore: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        receiptContractCount: any;
        coveredReceiptCount: any;
        missingReceiptCoverageCount: number;
        missingReceiptCount: any;
        missingDocCoverageCount: any;
        missingUsageOrReverifyCount: any;
        missingBoundaryCount: any;
        sessionMismatchCount: any;
        repairedReceiptCount: any;
        repairItemCount: any;
        openRepairItemCount: any;
        metadataGapCount: any;
    };
    usageFeedback: {
        status: string;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        feedbackCount: any;
        validFeedbackCount: any;
        distinctTaskSessionCount: any;
        distinctNativeSessionCount: any;
    };
    receiptRepair: {
        status: string;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        noncompliantFeedbackCount: any;
        repairCoveredCount: any;
    };
    recallPriority: {
        status: string;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        suppressedGroupCount: number;
        immutableArchivePreservedCount: number;
    };
    correctedReceipt: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        receiptContractCount: any;
        coveredReceiptCount: any;
        missingReceiptCoverageCount: number;
        missingReceiptCount: any;
        missingDocCoverageCount: any;
        missingUsageOrReverifyCount: any;
        missingBoundaryCount: any;
        sessionMismatchCount: any;
        repairedReceiptCount: any;
        repairItemCount: any;
        openRepairItemCount: any;
        metadataGapCount: any;
    };
    recommendations: {
        used: any;
        ignored: any;
        invalid: any;
        corrected: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    }[];
};
export declare function runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackAgingTaskFamilySelfTest(): {
    pass: boolean;
    checks: {
        oldIgnoredFeedbackDecaysOutOfSuppression: boolean;
        recentSameFamilyIgnoredStillSuppresses: boolean;
        unrelatedTaskFamilyDoesNotInheritFeedback: boolean;
        exactIdentityOverridesFamilySuppression: boolean;
        groupsRemainIsolated: boolean;
        agingMetadataIsExplicit: any;
        qualityCheckPasses: boolean;
        immutableClosureArchivesRemainUnchanged: boolean;
        memoryCenterCreatedNoRealTask: boolean;
    };
    summaries: {
        paymentA: {
            recommendation: any;
            weightedIgnoredCount: any;
            matchedEntryCount: any;
        };
        searchA: {
            recommendation: any;
            weightedIgnoredCount: any;
            matchedEntryCount: any;
        };
        unrelatedA: {
            recommendation: any;
            matchedEntryCount: any;
        };
        paymentB: {
            recommendation: any;
            weightedIgnoredCount: any;
            matchedEntryCount: any;
        };
    };
    aging: {
        status: string;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        taskFamilyCount: any;
        staleFeedbackCount: any;
        staleDecayedFamilyCount: any;
        unrelatedMatchedEntryCount: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackEvidenceConfidenceSelfTest(): {
    pass: boolean;
    checks: {
        reusedSessionDuplicatesCollapseToOneEvidence: boolean;
        duplicateBurstCannotSuppressRecall: boolean;
        twoIndependentReliableSessionsCanSuppress: boolean;
        providerAndSourceDiversityRaiseConfidence: boolean;
        lowReliabilityStatusOnlyEvidenceCannotSuppress: boolean;
        exactIdentityStillOverridesConfidentSuppression: boolean;
        evidenceStaysGroupIsolated: boolean;
        qualityCheckPassesWithoutAuthorization: boolean;
        immutableClosureArchivesRemainUnchanged: boolean;
        memoryCenterCreatedNoRealTask: boolean;
    };
    summaries: {
        duplicateA: {
            recommendation: any;
            raw: any;
            independent: any;
            duplicates: any;
            confidence: any;
        };
        sameSourceB: {
            recommendation: any;
            sessions: any;
            confidence: any;
        };
        diverseB: {
            recommendation: any;
            providers: any;
            sources: any;
            confidence: any;
        };
        lowSourceC: {
            recommendation: any;
            sourceReliability: any;
            confidence: any;
        };
    };
    confidence: {
        status: string;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        taskFamilyCount: any;
        rawMatchedEntryCount: any;
        independentEvidenceCount: any;
        correlatedDuplicateCount: any;
        confidentSuppressionCount: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackConflictArbitrationSelfTest(): {
    pass: boolean;
    checks: {
        reliableOpposingBranchesTriggerConflict: boolean;
        historicalMajorityCannotAutoSuppress: boolean;
        bothEvidenceBranchesRemainAuditable: boolean;
        workerContextRequiresCurrentSessionArbitration: boolean;
        consistentIgnoredStillUsesConfidenceGate: boolean;
        staleOppositionDoesNotCreateFalseConflict: boolean;
        exactIdentityRemainsAvailable: boolean;
        groupsRemainIsolated: boolean;
        qualityCheckAndImmutableArchivePass: boolean;
        memoryCenterCreatedNoRealTask: boolean;
    };
    summaries: {
        conflictA: {
            recommendation: any;
            arbitrationState: any;
            ratio: any;
            positiveWeight: any;
            ignoredWeight: any;
        };
        consistentB: {
            recommendation: any;
            conflictActive: any;
        };
        staleOppositionC: {
            recommendation: any;
            conflictActive: any;
        };
    };
    conflict: {
        status: string;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        conflictFamilyCount: any;
        coveredConflictFamilyCount: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionSelfTest(): {
    pass: boolean;
    checks: {
        wrongSessionCannotCreateResolution: boolean;
        validUsedResolutionIsSessionBound: boolean;
        validIgnoredResolutionStaysNeutral: boolean;
        resolutionAutomaticallyDistillsTypedMemory: any;
        duplicateReceiptScanIsIdempotent: boolean;
        futureWorkerContextRecallsResolution: boolean;
        historicalBranchesRemainPreserved: boolean;
        laterReliableOppositionReopensConflict: boolean;
        qualityAndGroupIsolationPass: boolean;
        memoryCenterCreatedNoRealTask: boolean;
    };
    summaries: {
        used: {
            recommendation: any;
            resolution: any;
        };
        ignored: {
            recommendation: any;
            resolution: any;
        };
        reopened: {
            recommendation: any;
            resolution: any;
        };
    };
    resolution: {
        status: string;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        resolutionEntryCount: any;
        archivedResolutionCount: any;
        coveredResolutionCount: any;
        activeResolutionCount: any;
        reopenedResolutionCount: any;
    };
    resolutionGroups: {
        schema: string;
        groupId: string;
        groupSessionId: string;
        scopeId: string;
        typedScopeId: string;
        exactSession: boolean;
        status: string;
        resolutionEntryCount: any;
        archivedResolutionCount: number;
        hotResolutionCount: any;
        coldArchiveValid: boolean;
        coveredResolutionCount: number;
        activeResolutionCount: number;
        reopenedResolutionCount: number;
        typedMemoryDocFile: any;
        historicalBranchesPreserved: any;
        reversible: any;
        probes: {
            taskFamilyKey: string;
            resolutionEntryId: any;
            resolutionUsageState: any;
            active: boolean;
            reopened: boolean;
            state: any;
            archiveCovered: boolean;
            archiveSource: string;
            coldShardsRead: number;
            covered: boolean;
            gaps: any[];
        }[];
        gaps: any[];
    }[];
    future: {
        docRelPaths: any;
        contract: any;
        acceptance: any;
        renderedHasResolution: boolean;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionSelfTest(): {
    pass: boolean;
    checks: {
        realFourStrategyIntegrationPasses: boolean;
        exactResolutionIdentitySurvivesEveryStrategy: any;
        reversibleBranchBoundarySurvives: any;
        activeResolutionAcceptanceSurvivesMemoryAndReplay: boolean;
        reopenedConflictAcceptanceSurvivesMetadataAndPtl: boolean;
        recoveryBehaviorMatchesCompactStrategy: boolean;
        tamperedResolutionIsRejected: any;
        reportAndQualityPass: boolean;
        memoryCenterCreatedNoRealTask: boolean;
    };
    report: {
        status: string;
        checkedGroupCount: any;
        groupsCovered: any;
        requiredOutcomeCount: any;
        preservedOutcomeCount: any;
        activeResolutionCount: any;
        reopenedResolutionCount: any;
        memoryFirstCount: any;
        replayPartialCount: any;
        metadataPartialCount: any;
        ptlEmergencyCount: any;
    };
    scenarios: any;
    tampered: any;
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest(): {
    pass: boolean;
    checks: {
        childBundleSurfacesCompactReferences: boolean;
        surfacingLedgerExists: boolean;
        accessSummaryFindsUsedReference: any;
        disciplineReportChecksSurfacedRefs: boolean;
        unmentionedRefsBecomeGaps: boolean;
        qualityCheckCoversDiscipline: boolean;
        memoryCenterDetailExposesDiscipline: any;
    };
    discipline: {
        checked: any;
        passed: any;
        missing: any;
        status: any;
        usedReference: any;
        unmentionedReference: any;
    };
};
export declare function runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionRepairSelfTest(): {
    pass: boolean;
    checks: {
        idempotentWorkItemsPerGroup: boolean;
        candidatesCarryExactResolutionIdentity: any;
        briefsAreSelfContainedAndNoRealTask: any;
        staleSameAndCrossGroupOutcomesCannotClose: boolean;
        oneGroupClosureCannotCloseAnother: boolean;
        activeResolutionStrictlyCloses: boolean;
        reopenedResolutionStrictlyCloses: boolean;
        closureReportRequiresStrictResolutionProof: boolean;
        immutableResolutionArchivePreserved: any;
        memoryCenterCreatedNoRealTask: boolean;
    };
    workItems: {
        status: string;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        requiredActionCount: any;
        coveredItemCount: any;
        openItemCount: any;
        correctedRetryCompletedCount: any;
    };
    candidates: {
        status: string;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        expectedCandidateCount: any;
        coveredCandidateCount: any;
        metadataGapCount: any;
    };
    briefs: {
        status: string;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        expectedBriefCount: any;
        coveredBriefCount: any;
        metadataGapCount: any;
    };
    closure: {
        status: string;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        correctedRetryCompletedCount: any;
        verifiedClosureCount: any;
    };
};
export declare function runMemoryCenterReplayRepairLedgerRetentionSafetySelfTest(): {
    pass: boolean;
    checks: {
        oldOpenRepairSurvivesTerminalPressure: boolean;
        latestStrictProofSurvives: boolean;
        immutableConflictBranchIdentitySurvives: boolean;
        supersededTerminalNoiseIsCompacted: boolean;
        crossGroupRowsAreRejectedAndAudited: boolean;
        compactingOneGroupDoesNotTouchAnother: boolean;
        allResolutionBranchesRemainArchived: boolean;
        secondGroupArchiveIsIndependent: boolean;
        unresolvedOutcomeSurvivesPressure: boolean;
        resolvedFailureCanBeCompactedAfterStrictCorrection: boolean;
        outcomeCrossGroupRowsAreRejected: boolean;
        retentionQualityChecksPass: boolean;
        retentionNeverCreatesRealTask: boolean;
    };
    retentionA: {
        schema: string;
        policy: string;
        group_id: string;
        input_count: number;
        accepted_count: number;
        deduplicated_count: number;
        retained_count: number;
        dropped_count: number;
        cross_group_rejected_count: number;
        protected_open_count: number;
        protected_latest_verified_proof_count: number;
        protected_conflict_resolution_count: number;
        recent_terminal_limit: number;
        dropped_open_count: number;
        dropped_verified_proof_count: number;
        dropped_conflict_resolution_count: number;
        dropped_by_status: Record<string, number>;
        dropped_digest: string;
        cross_group_rejected_digest: string;
        compacted_at: string;
    };
    retentionB: {
        schema: string;
        policy: string;
        group_id: string;
        input_count: number;
        accepted_count: number;
        deduplicated_count: number;
        retained_count: number;
        dropped_count: number;
        cross_group_rejected_count: number;
        protected_open_count: number;
        protected_latest_verified_proof_count: number;
        protected_conflict_resolution_count: number;
        recent_terminal_limit: number;
        dropped_open_count: number;
        dropped_verified_proof_count: number;
        dropped_conflict_resolution_count: number;
        dropped_by_status: Record<string, number>;
        dropped_digest: string;
        cross_group_rejected_digest: string;
        compacted_at: string;
    };
    archiveA: {
        archivedCount: any;
        immutableBranchCount: any;
        retentionPolicy: any;
    };
    outcomeRetention: any;
    quality: any;
};
export declare function runMemoryCenterConflictResolutionColdArchiveSelfTest(): {
    pass: boolean;
    checks: {
        hotIndexIsBounded: boolean;
        manifestCoversEveryImmutableBranch: boolean;
        lazyLookupReadsOnlyMatchingShard: boolean;
        onDemandRestoreIsAuditOnlyAndBounded: boolean;
        appendPreservesColdHistory: boolean;
        shardsAreContentAddressed: boolean;
        shardTamperIsDetectedAndBlocksRestore: boolean;
        tamperedArchiveCannotBeRedistilled: boolean;
        restoredShardPassesFullVerification: boolean;
        manifestTamperIsDetected: any;
        groupsRemainIsolated: boolean;
        integrityQualityGatePasses: boolean;
        coldArchiveCreatesNoRealTask: boolean;
    };
    archive: {
        hotRowCount: any;
        archivedCount: any;
        shardCount: any;
        manifestChecksum: any;
    };
    lookup: {
        status: any;
        shardsRead: any;
        matchedRowCount: any;
    };
    tamper: {
        shardStatus: any;
        manifestStatus: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionManifestGenerationGcSelfTest(): {
    pass: boolean;
    checks: {
        currentAndPreviousGenerationsVerify: boolean;
        generationChainLinksExactChecksums: boolean;
        openRepairProtectsOrphanShard: any;
        secondPassDeletesOnlyAfterRepairClosure: any;
        deletionPreservesEveryCurrentRow: boolean;
        firstDiscoveryNeverDeletesSameRun: any;
        currentManifestCrashBlocksGc: boolean;
        latestValidGenerationRecoversCurrentPointer: boolean;
        previousGenerationTamperBlocksGc: boolean;
        restoringPreviousGenerationRestoresChain: boolean;
        quarantineTamperCannotBypassGrace: any;
        quarantineAndGcRemainGroupIsolated: boolean;
        generationGcQualityGatePasses: boolean;
        manifestGcCreatesNoRealTask: boolean;
    };
    generation: {
        current: any;
        previous: any;
        generationNumber: any;
        recoverySimulationPassed: any;
    };
    quarantine: {
        protected: any;
        deleted: any;
        firstDiscoveryDeleted: any;
    };
    recovery: any;
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceControllerSelfTest(): {
    pass: boolean;
    checks: {
        backgroundDueRunIsReadOnly: any;
        directTimerRunCannotAuthorizeDeletion: boolean;
        recommendationsReachBothAgentsWithoutTasks: boolean;
        approvalRequiresExplicitTrustedActor: boolean;
        approvalBindsExactCurrentState: boolean;
        backgroundExecutionIsBlocked: boolean;
        crossGroupReceiptCannotExecute: boolean;
        expiredReceiptCannotExecute: boolean;
        generationChangeInvalidatesReceipt: boolean;
        tamperedReceiptCannotExecute: boolean;
        validReceiptDeletesOnlyApprovedShard: boolean;
        consumedReceiptCannotReplay: boolean;
        maintenanceStatusAuditsReceiptLifecycle: boolean;
        maintenanceControllerQualityGatePasses: boolean;
        controllerMaintainsGroupIsolation: boolean;
        maintenanceCreatesNoRealTask: boolean;
    };
    dueRun: {
        dueCount: any;
        deletedCount: any;
    };
    receipt: {
        receiptId: any;
        candidateCount: any;
        deletedCount: any;
        replayReason: any;
    };
    recommendations: {
        groupMainAgent: any;
        globalAgent: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceSchedulerSelfTest(): {
    pass: boolean;
    checks: {
        schedulerFirstTickRunsBothGroupsReadOnly: boolean;
        sameWindowTickIsIdempotentlySuppressed: boolean;
        nextWindowRunsWithoutDuplicateNotifications: any;
        notificationsAreAdvisoryAndDeduplicated: boolean;
        failureEntersPersistentBackoff: boolean;
        retryAfterBackoffRecovers: boolean;
        schedulerNeverCreatesApprovalReceipts: boolean;
        schedulerNeverDeletesShards: boolean;
        schedulerNeverCreatesTasks: boolean;
        schedulerStatusPreservesSafetyBoundary: boolean;
        schedulerQualityGatePasses: boolean;
        schedulerMaintainsGroupIsolation: any;
    };
    ticks: {
        firstCompleted: any;
        duplicateSuppressed: any;
        restartSuppressed: any;
        failed: any;
        backoff: any;
        recovered: any;
    };
    notifications: {
        groupA: any;
        groupB: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationContextSelfTest(): {
    pass: boolean;
    checks: {
        coordinatorPromptReceivesOnlyCurrentGroupNotification: boolean;
        globalAgentExcludesGroupMaintenanceAdvisories: boolean;
        acknowledgementHidesExactAudienceState: boolean;
        suppressionRequiresReasonAndHidesExactAudienceState: boolean;
        wrongAudienceCrossGroupAndStaleUseRejected: boolean;
        changedStateReappearsForBothAudiences: boolean;
        notificationConsumptionIsNonDestructive: boolean;
        notificationSafetyFlagsRemainHardFalse: boolean;
        notificationContextQualityGatePasses: boolean;
    };
    pending: {
        groupBefore: any;
        groupAfterAck: any;
        globalAfterSuppression: any;
        groupAfterStateChange: any;
        globalAfterStateChange: any;
    };
    receipts: {
        acknowledgement: any;
        suppression: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryHealthSelfTest(): {
    pass: boolean;
    checks: {
        unhealthyManifestCriticalNotificationRemainsVisible: any;
        repeatedUnseenCriticalIsDiagnosedReadOnly: boolean;
        realCoordinatorContextHelperRecordsDelivery: boolean;
        repeatedContextBuildIsIdempotentlyBounded: boolean;
        globalAgentDoesNotConsumeGroupDeliveryContext: boolean;
        crossGroupDeliveryCannotBeRecorded: boolean;
        deliveryObservationIsNonDestructive: boolean;
        deliveryHealthQualityGatePasses: boolean;
    };
    health: {
        before: {
            pending: any;
            repeatedUnseen: any;
        };
        afterMain: {
            delivered: any;
            repeatedUnseen: any;
        };
        afterGlobal: {
            delivered: any;
            repeatedUnseen: any;
        };
    };
    deliveryLedger: {
        entries: any;
        mainDeliveryCount: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRetentionSelfTest(): {
    pass: boolean;
    checks: {
        currentOldFingerprintIsPinnedUnderNotificationPressure: boolean;
        oldDeliveryCannotAuthorizeCurrentRecurrence: boolean;
        terminalDetailsCompactButCurrentCriticalRemainsProtected: boolean;
        restartRetentionPreservesChecksumChainWithoutDoubleCounting: boolean;
        schedulerRunsRetentionReadOnlyForBothGroups: boolean;
        currentFreshDeliveryIsPinnedAfterScheduler: boolean;
        tamperedLedgerBlocksRetentionWithoutCrossGroupFallback: boolean;
        retentionNeverMutatesTasksApprovalsOrShards: boolean;
        retentionQualityGatePassesForBothGroups: boolean;
    };
    notificationRetention: {
        count: any;
        pinned: any;
    };
    deliveryRetention: {
        firstGeneration: any;
        restartGeneration: any;
        compacted: any;
        finalHot: any;
    };
    scheduler: {
        retentionCount: any;
        blocked: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRecoverySelfTest(): {
    pass: boolean;
    checks: {
        invalidCurrentWithValidSameGroupPreviousIsRecoverable: boolean;
        dryRunDoesNotOverwriteCurrent: boolean;
        schedulerAutomaticallyRecoversWithoutAuthority: boolean;
        recoveryCreatesNewValidGenerationAndPreservesFreshness: boolean;
        corruptCurrentAndInterruptedTempsAreQuarantinedAsEvidence: boolean;
        crossGroupPreviousCannotRecover: boolean;
        tamperedPreviousCannotRecover: boolean;
        orphanPreviousIsDiagnosedWithoutDeletion: boolean;
        recoveryNeverMutatesTasksApprovalsOrShards: boolean;
        recoveryQualityGatePassesForBothGroups: boolean;
    };
    recovery: {
        selectedPrevious: any;
        recoveredGeneration: any;
        quarantineCount: any;
        tempCandidates: any;
    };
    blocked: {
        crossGroup: any;
        tamperedPrevious: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupSelfTest(): {
    pass: boolean;
    checks: {
        unresolvedAndLatestRecoveryProofAreProtectedBeforeCleanup: boolean;
        cleanupReceiptRequiresExplicitApproval: boolean;
        expiredTamperedBackgroundAndCrossGroupExecutionBlocked: boolean;
        validReceiptDeletesOnlyExactEligibleEvidence: boolean;
        consumedReceiptCannotReplay: boolean;
        cleanedDiagnosticsCompactWhileLatestProofRemainsHot: boolean;
        schedulerNeverCreatesOrExecutesCleanupReceipt: boolean;
        cleanupDoesNotChangeTasksGcApprovalsOrColdShards: boolean;
        cleanupQualityGatePassesForBothGroups: boolean;
    };
    receipt: {
        candidateCount: any;
        deletedCount: any;
        replayReason: any;
    };
    quarantine: {
        before: any;
        after: any;
        compacted: any;
    };
    scheduler: {
        retentionCount: any;
        deletedCount: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalSelfTest(): {
    pass: boolean;
    checks: {
        receiptCanBeRevokedOnlyBeforeExecution: boolean;
        partialExecutionPersistsResumableExactJournal: boolean;
        tamperedAndCrossGroupJournalResumeBlocked: boolean;
        schedulerDetectsButDoesNotResumePartialDeletion: any;
        expiredReceiptCanResumeAlreadyStartedJournalAfterGenerationAdvance: any;
        consumedPartialReceiptCannotReplay: boolean;
        schedulerFinalizesMetadataAfterAllDeletesWithoutDeleting: boolean;
        latestRecoveryProofAndGroupBUnresolvedEvidenceRemain: boolean;
        journalRecoveryDoesNotChangeTasksGcApprovalsOrColdShards: boolean;
        cleanupJournalQualityGatePassesForBothGroups: boolean;
    };
    partial: {
        deleted: any;
        resumed: any;
        total: any;
    };
    diagnostics: {
        resumedExecution: any;
        replayExecution: any;
        schedulerDuringPartial: {
            open: any;
            reconciled: any;
            deleted: any;
            rows: any;
        };
        qualityWeak: any;
    };
    finalization: {
        interrupted: any;
        reconciled: any;
    };
    journals: {
        open: any;
        invalid: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLeaseSelfTest(): {
    pass: boolean;
    checks: {
        simultaneousExplicitExecutorsAreExclusive: boolean;
        schedulerObservesActiveLeaseWithoutMutationOrDeletion: boolean;
        crossGroupExecutorCannotUseReceipt: boolean;
        interruptedExecutorKeepsExclusiveLeaseUntilExpiry: boolean;
        abandonedExecutorIsRecoveredWithHigherFence: boolean;
        deadProcessOwnerIsRecoveredBeforeLeaseExpiry: boolean;
        terminalAbandonedLeaseIsReconciledWithoutReplay: boolean;
        takeoverDeletesOnlyRemainingCandidates: any;
        receiptConsumedOnceAndJournalNotOverwritten: boolean;
        finalLeaseStateAndQualityGateAreHealthy: boolean;
        leaseRecoveryDoesNotChangeTasksGcApprovalsOrColdShards: boolean;
    };
    concurrent: {
        winner: any;
        competitor: any;
        scheduler: any;
    };
    recovery: {
        interrupted: any;
        immediate: any;
        recovered: any;
        replay: any;
        deadProcessInterrupted: any;
        deadProcessRecovered: any;
        terminalInterrupted: any;
        terminalReconciliation: any;
        terminalReplay: any;
    };
    final: {
        open: any;
        invalid: any;
        abandoned: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
        weak: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupLedgerCasSelfTest(): {
    pass: boolean;
    checks: {
        differentReceiptsInterleaveAndBothExecute: boolean;
        receiptLedgerMergesBothConcurrentConsumptions: boolean;
        journalLedgerMergesBothConcurrentExecutions: boolean;
        quarantineCommitsPreserveBothCandidateCleanups: boolean;
        overlappingCandidateHasSingleJournalClaim: boolean;
        losingOverlappingReceiptRemainsRevocable: boolean;
        ledgerChecksumTamperingBlocksFurtherCommit: boolean;
        revisionsChecksumsClaimsAndLockAreHealthy: boolean;
        crossGroupEvidenceRemainsIsolated: boolean;
        ledgerCasDoesNotChangeTasksGcApprovalsOrColdShards: boolean;
        ledgerCasQualityGatePasses: boolean;
    };
    interleaved: {
        executionA: any;
        executionB: any;
        receiptRevisionBefore: number;
        receiptRevisionAfterB: any;
        receiptRevisionFinal: any;
        journalRevisionBefore: number;
        journalRevisionAfterB: any;
        journalRevisionFinal: any;
    };
    overlap: {
        winner: any;
        loser: any;
        revoked: any;
    };
    ledgers: {
        receiptRevision: any;
        journalRevision: any;
        quarantineRevision: any;
        claimConflicts: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
        weak: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitWalSelfTest(): {
    pass: boolean;
    checks: {
        preparedCrashRecoversFromWal: boolean;
        quarantineCommitCrashRecoversFromWal: boolean;
        receiptCommitCrashRecoversFromWal: boolean;
        journalCommitCrashRecoversTerminalWal: boolean;
        recoveryNeverRepeatsEvidenceDeletion: boolean;
        allTransactionsCloseWithRevisionBindings: any;
        commitTamperingIsDetected: boolean;
        groupLockContentionUsesBoundedBackoff: boolean;
        abandonedGroupLockHistoryIsBounded: boolean;
        abandonedReceiptLeaseHistoryIsBounded: boolean;
        schedulerReportsWalHealthWithoutDeletion: boolean;
        latestWalQualityGatePasses: boolean;
        walRecoveryPreservesOtherGroupTasksApprovalsAndShards: boolean;
    };
    phases: {
        phase: any;
        interrupted: any;
        transaction: any;
        reconciled: any;
        deleted: any;
    }[];
    contention: {
        error: string;
        elapsedMs: number;
        groupLockArchiveCount: number;
        leaseArchiveCount: number;
    };
    wal: {
        revision: any;
        transactions: any;
        open: any;
        invalid: any;
        recovered: any;
    };
    scheduler: {
        open: any;
        invalid: any;
        recovered: any;
        deleted: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
        weak: any;
    };
};
export declare function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscoverySelfTest(): {
    pass: boolean;
    checks: {
        terminalWalHistoryCompactsWithAuditRoot: boolean;
        schedulerRunsIndependentDiscoveryForHealthyGroup: boolean;
        startupDiscoveryAutomaticallyRecoversExactOpenWal: boolean;
        missingJournalRowIsFoundFromWalNotJournalTraversal: any;
        unprovenWalIsQuarantinedWithoutDeletion: any;
        repairWorkItemAndDispatchBriefAreMaterialized: any;
        discoveryArtifactsAreIdempotent: boolean;
        startupWideDiscoveryCoversMultipleGroups: boolean;
        startupDiscoveryQualityAcceptsHealthyOrContainedState: boolean;
        discoveryCreatesNoRealTasksOrApprovals: boolean;
        discoveryPreservesColdShardsAndEvidence: boolean;
    };
    compact: {
        retained: any;
        compacted: any;
        history: any;
    };
    automatic: {
        crash: any;
        discovery: any;
        openAfter: any;
    };
    orphan: {
        crash: any;
        discovery: any;
        quarantineCount: any;
        workItemCount: any;
        briefCount: any;
    };
    startupWide: {
        groups: any;
        invalid: any;
        repairs: any;
        briefs: any;
    };
    quality: {
        id: any;
        status: any;
        checked: any;
        passed: any;
        weak: any;
    };
};
export declare function runMemoryCenterHistoricalCompactBoundaryReplaySelfTest(): {
    pass: boolean;
    checks: {
        directReplaysMultipleBoundaries: boolean;
        detailExposesHistoricalReplay: any;
        reportAggregatesHistoricalReplay: boolean;
        qualityCheckPassesHistoricalReplay: boolean;
        childAgentRendererMentionsBoundaryHistory: any;
    };
    historical: any;
};
export declare function runMemoryCenterChildAgentTypeReplayMatrixSelfTest(): {
    pass: boolean;
    checks: {
        directScoresThreeAgentTypes: boolean;
        detailExposesTypeMatrix: any;
        reportAggregatesTypeMatrix: boolean;
        qualityCheckPassesTypeMatrix: boolean;
        childAgentRendererMentionsTypeMatrix: any;
    };
    matrix: any;
};
