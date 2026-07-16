export declare function runGlobalMemoryControlSelfTest(): {
    pass: boolean;
    checks: {
        globalScopePins: boolean;
        globalScopeEdits: boolean;
        globalScopeDeletes: boolean;
        globalScopeRestores: boolean;
        operationsAreAudited: boolean;
    };
};
export declare function runMemoryCenterPostCompactUsageDiagnosticsSelfTest(): {
    pass: boolean;
    checks: {
        scopeExposesDiagnostics: boolean;
        ledgerTotalsVisible: boolean;
        summaryBucketsVisible: boolean;
        archiveRowsVisible: boolean;
        recallScoringVisible: boolean;
        boostAndDeprioritizeVisible: boolean;
        disciplineTrendVisible: boolean;
        boundaryTimelineVisible: boolean;
        overviewCarriesLightStats: boolean;
    };
    diagnostics: any;
};
export declare function runMemoryCenterPostCompactCandidateDisciplineSelfTest(): {
    pass: boolean;
    checks: {
        qualityCheckHasSchema: boolean;
        strictClassificationCountsRows: boolean;
        staleUsedIsGap: boolean;
        mentionedCandidateIsGap: boolean;
        ledgerMentionedIsGap: boolean;
        verifiedStaleCanPass: boolean;
    };
    quality: any;
};
export declare function runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest(): {
    pass: boolean;
    checks: {
        trendHasSchema: boolean;
        groupTrendHasSchema: boolean;
        countsStrictRows: boolean;
        stalePromotionCounted: boolean;
        missingRowsCounted: boolean;
        noRowsCandidateCounted: boolean;
        bucketTrendBuilt: any;
        lowRateRaisesAlert: boolean;
        ledgerRateVisible: boolean;
        overallAggregatesGroup: boolean;
    };
    trend: {
        schema: string;
        generatedAt: string;
        threshold: number;
        minSample: number;
        taskLimit: number;
        overall: any;
        groups: {
            schema: string;
            groupId: any;
            taskCount: number;
            checked: number;
            strictClassified: number;
            missing: number;
            unclassified: number;
            stalePromoted: number;
            stateCounts: any;
            strictClassificationRate: number;
            effectiveStrictClassificationRate: any;
            status: string;
            alert: boolean;
            threshold: number;
            minSample: number;
            buckets: {
                key: any;
                checked: number;
                strictClassified: number;
                missing: number;
                unclassified: number;
                stalePromoted: number;
                taskCount: number;
                strictClassificationRate: number;
            }[];
            ledger: any;
            recentRows: any;
            stalePromotions: any;
        }[];
        alertGroups: {
            schema: string;
            groupId: any;
            taskCount: number;
            checked: number;
            strictClassified: number;
            missing: number;
            unclassified: number;
            stalePromoted: number;
            stateCounts: any;
            strictClassificationRate: number;
            effectiveStrictClassificationRate: any;
            status: string;
            alert: boolean;
            threshold: number;
            minSample: number;
            buckets: {
                key: any;
                checked: number;
                strictClassified: number;
                missing: number;
                unclassified: number;
                stalePromoted: number;
                taskCount: number;
                strictClassificationRate: number;
            }[];
            ledger: any;
            recentRows: any;
            stalePromotions: any;
        }[];
    };
};
export declare function runMemoryCenterPostCompactDispatchMarkerTrendSelfTest(): {
    pass: boolean;
    checks: {
        firstMarkerIsFirst: boolean;
        secondMarkerIsFollowup: boolean;
        otherTargetGetsOwnFirst: boolean;
        trendAggregatesMarkers: boolean;
        latestBoundaryCoverageVisible: boolean;
        detailExposesDispatchTrend: boolean;
        overviewTrendAggregates: boolean;
    };
    trend: any;
};
export declare function runMemoryCenterChildAgentMemoryReliabilitySelfTest(): {
    pass: boolean;
    checks: {
        reportHasSchema: boolean;
        groupHasTwoAgents: boolean;
        apiScoresOk: boolean;
        webScoresFail: boolean;
        webGapsIncludeCandidateAndDispatch: boolean;
        qualityCheckFlagsWeakAgent: any;
        detailExposesReliability: boolean;
    };
    report: any;
};
export declare function runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest(): {
    pass: boolean;
    checks: {
        reportCoversBridge: boolean;
        rowHasRenderedBridge: boolean;
        rowHasSourceManifest: boolean;
        rowHasCompactReference: boolean;
        qualityCheckCoversBridge: boolean;
    };
    row: any;
};
export declare function runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest(): {
    pass: boolean;
    checks: {
        reportStillPassesWithArbitration: boolean;
        reportCountsDemotion: boolean;
        renderedArbitrationVerified: boolean;
        bridgeStillHasSources: boolean;
        arbitrationLedgerRecorded: boolean;
        arbitrationLedgerQualityCheckPasses: boolean;
        arbitrationDistillationQualityCheckPasses: boolean;
    };
    row: any;
    arbitrationLedgerQuality: any;
    arbitrationDistillationQuality: any;
};
export declare function runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest(): {
    pass: boolean;
    checks: {
        reportCoversCrossGroupSuppression: boolean;
        rowHasRenderedCrossGroupSuppression: boolean;
        rowHasCrossGroupSources: boolean;
        qualityCheckPasses: boolean;
        reportOverallCountsSuppression: boolean;
    };
    row: any;
    quality: any;
};
export declare function runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest(): {
    pass: boolean;
    checks: {
        reportCoversFreshness: boolean;
        rowHasRenderedFreshness: boolean;
        rowHasCrossGroupSources: boolean;
        qualityCheckPasses: boolean;
        reportOverallCountsFreshness: boolean;
    };
    row: any;
    quality: any;
};
export declare function runMemoryCenterQualityTargetedRefreshSelfTest(): {
    pass: boolean;
    checks: {
        targetedReportOnlyRunsRequestedCheck: boolean;
        targetedReportDoesNotOverwriteMainCache: boolean;
        targetedReportCarriesAvailableIds: any;
        unknownIdsAreReported: any;
        targetedDurationRecorded: boolean;
    };
    targeted: {
        id: any;
        status: any;
        checkIds: any;
        unknownCheckIds: any;
    };
};
export declare function runMemoryCenterCompactBoundaryTimelineSelfTest(): {
    pass: boolean;
    checks: {
        timelineHasSchema: boolean;
        boundaryCapturesTokens: boolean;
        componentsCoverCompactLifecycle: boolean;
        eventsCoverCompactLifecycle: boolean;
        timelineScoresHealthy: boolean;
        reportAggregatesTimeline: boolean;
        qualityCheckPassesTimeline: boolean;
    };
    timeline: any;
};
export declare function runMemoryCenterCompactStrategyDecisionSelfTest(): {
    pass: boolean;
    checks: {
        overviewPassesDecision: boolean;
        reportAggregatesDecision: boolean;
        qualityCheckCoversDecision: boolean;
        detailExposesDecision: boolean;
        childAgentRendererMentionsDecision: any;
    };
    decision: any;
};
export declare function runMemoryCenterPostCompactCleanupAuditSelfTest(): {
    pass: boolean;
    checks: {
        overviewPassesCleanupAudit: boolean;
        reportAggregatesCleanupAudit: boolean;
        qualityCheckCoversCleanupAudit: boolean;
        detailExposesCleanupAudit: boolean;
        childAgentRendererMentionsCleanup: any;
    };
    cleanup: any;
};
export declare function runMemoryCenterApiMicroCompactEditPlanSelfTest(): {
    pass: boolean;
    checks: {
        overviewPassesApiMicrocompactPlan: boolean;
        reportAggregatesApiMicrocompactPlan: boolean;
        qualityCheckCoversApiMicrocompactPlan: boolean;
        detailExposesApiMicrocompactPlan: boolean;
        childAgentRendererMentionsApiMicrocompactPlan: any;
        planKeepsThirdPartyCliAdvisoryBoundary: boolean;
    };
    plan: any;
};
export declare function runMemoryCenterApiMicrocompactReceiptDisciplineSelfTest(): {
    pass: boolean;
    checks: {
        reportAggregatesReceiptDiscipline: boolean;
        qualityCheckCoversReceiptDiscipline: boolean;
        detailExposesReceiptDiscipline: boolean;
    };
    discipline: any;
};
export declare function runMemoryCenterApiMicrocompactNativeApplyReadinessSelfTest(): {
    pass: boolean;
    checks: {
        reportAggregatesNativeReadiness: boolean;
        qualityCheckCoversNativeReadiness: boolean;
        detailExposesNativeReadiness: boolean;
        readinessTracksSessionBinding: boolean;
    };
    readiness: any;
};
export declare function runMemoryCenterApiMicrocompactNativeApplyProofSelfTest(): {
    pass: boolean;
    checks: {
        reportAggregatesNativeProof: boolean;
        qualityCheckCoversNativeProof: boolean;
        detailExposesNativeProof: boolean;
        detailExposesAdapterTelemetrySource: boolean;
        childAgentRendererMentionsNativeProof: any;
    };
    proof: any;
};
export declare function runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest(): {
    pass: boolean;
    checks: {
        receiptOnlyDoesNotPass: boolean;
        staleAdapterDoesNotPass: boolean;
        overallCountsWeakProofs: boolean;
        gapsExplainDowngrade: boolean;
    };
    report: {
        overall: {
            status: string;
            score: number;
            checked: any;
            passed: any;
            missing: number;
            groupCount: any;
            checkedGroupCount: any;
            nativeClaimCount: any;
            verifiedProofCount: any;
            failedProofCount: any;
            missingProofCount: any;
            requestTelemetryMatchedCount: any;
            requestTelemetryStrongCount: any;
            requestTelemetryReceiptOnlyCount: any;
            requestTelemetryStaleCount: any;
            requestTelemetryMaxAgeMs: number;
            requestTelemetryAdapterMatchedCount: any;
            requestTelemetryReceiptMatchedCount: any;
            requestTelemetryMissingCount: any;
            requestTelemetryInvalidCount: any;
            requestTelemetrySessionBoundCount: any;
            requestTelemetrySessionMismatchCount: any;
            requestTelemetryDispatchBoundCount: any;
            requestTelemetryDispatchUnboundCount: any;
            requestTelemetryRunnerBoundCount: any;
            requestTelemetryRunnerMissingCount: any;
            requestTelemetryRunnerMismatchCount: any;
            requestTelemetryEntryCount: any;
            requestTelemetryNativeAdapterEntryCount: any;
            requestTelemetryAgentReceiptEntryCount: any;
            platformExecutionReceiptCount: any;
            platformExecutionNativeAppliedCount: any;
            platformExecutionRequestAcceptedCount: any;
            platformExecutionNoEditsCount: any;
            platformExecutionFailedCount: any;
            advisoryProofCount: any;
        };
        receiptOnly: any;
        stale: any;
    };
};
export declare function runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest(): {
    pass: boolean;
    checks: {
        boundDispatchPasses: boolean;
        missingSessionDowngrades: boolean;
        runnerMismatchDowngrades: boolean;
        gapsNameBindingFailures: boolean;
        overallCountsBinding: boolean;
    };
    report: {
        overall: {
            status: string;
            score: number;
            checked: any;
            passed: any;
            missing: number;
            groupCount: any;
            checkedGroupCount: any;
            nativeClaimCount: any;
            verifiedProofCount: any;
            failedProofCount: any;
            missingProofCount: any;
            requestTelemetryMatchedCount: any;
            requestTelemetryStrongCount: any;
            requestTelemetryReceiptOnlyCount: any;
            requestTelemetryStaleCount: any;
            requestTelemetryMaxAgeMs: number;
            requestTelemetryAdapterMatchedCount: any;
            requestTelemetryReceiptMatchedCount: any;
            requestTelemetryMissingCount: any;
            requestTelemetryInvalidCount: any;
            requestTelemetrySessionBoundCount: any;
            requestTelemetrySessionMismatchCount: any;
            requestTelemetryDispatchBoundCount: any;
            requestTelemetryDispatchUnboundCount: any;
            requestTelemetryRunnerBoundCount: any;
            requestTelemetryRunnerMissingCount: any;
            requestTelemetryRunnerMismatchCount: any;
            requestTelemetryEntryCount: any;
            requestTelemetryNativeAdapterEntryCount: any;
            requestTelemetryAgentReceiptEntryCount: any;
            platformExecutionReceiptCount: any;
            platformExecutionNativeAppliedCount: any;
            platformExecutionRequestAcceptedCount: any;
            platformExecutionNoEditsCount: any;
            platformExecutionFailedCount: any;
            advisoryProofCount: any;
        };
        good: any;
        missingSession: any;
        runnerMismatch: any;
    };
};
export declare function runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest(): {
    pass: boolean;
    checks: {
        proofProducesBindingGaps: boolean;
        firstMaterializesNativeProofRepairItems: boolean;
        duplicateDoesNotAppend: boolean;
        qualityCoversRepairItems: boolean;
        childAgentRendererMentionsRepairItems: any;
        resolvedProofClosesOpenNativeItems: any;
    };
    first: {
        schema: string;
        groupId: string;
        groupSessionId: string;
        file: any;
        updatedAt: any;
        latestReplay: any;
        total: number;
        openItemCount: number;
        pendingCount: number;
        inProgressCount: number;
        blockedCount: number;
        completedCount: number;
        cancelledCount: number;
        items: {
            id: any;
            work_item_id: any;
            status: string;
            owner: any;
            priority: any;
            component: any;
            source: any;
            subject: any;
            activeForm: any;
            target: any;
            repair_target: any;
            target_project: any;
            revalidation_gate_id: any;
            read_plan_id: any;
            reinjection_gate_id: any;
            post_compact_candidate_id: any;
            post_compact_candidate_kind: any;
            post_compact_candidate_value: any;
            post_compact_candidate_source_message_id: any;
            proof_entry_id: any;
            plan_checksum: any;
            request_patch_checksum: any;
            request_telemetry_status: any;
            request_telemetry_session_status: any;
            request_telemetry_dispatch_status: any;
            runner_request_id: any;
            expected_task_agent_session_id: any;
            receipt_task_agent_session_id: any;
            session_mismatch: boolean;
            instruction: string;
            expected: string;
            dispatch_target: any;
            replay_attempt_id: any;
            replay_rendered_hash: any;
            boundary_checksum: any;
            createdAt: any;
            updatedAt: any;
            startedAt: any;
            completedAt: any;
            blockedReason: any;
            resolutionReason: any;
            seenCount: number;
        }[];
        openItems: any;
    };
    resolved: {
        schema: string;
        groupId: string;
        groupSessionId: string;
        file: any;
        updatedAt: any;
        latestReplay: any;
        total: number;
        openItemCount: number;
        pendingCount: number;
        inProgressCount: number;
        blockedCount: number;
        completedCount: number;
        cancelledCount: number;
        items: {
            id: any;
            work_item_id: any;
            status: string;
            owner: any;
            priority: any;
            component: any;
            source: any;
            subject: any;
            activeForm: any;
            target: any;
            repair_target: any;
            target_project: any;
            revalidation_gate_id: any;
            read_plan_id: any;
            reinjection_gate_id: any;
            post_compact_candidate_id: any;
            post_compact_candidate_kind: any;
            post_compact_candidate_value: any;
            post_compact_candidate_source_message_id: any;
            proof_entry_id: any;
            plan_checksum: any;
            request_patch_checksum: any;
            request_telemetry_status: any;
            request_telemetry_session_status: any;
            request_telemetry_dispatch_status: any;
            runner_request_id: any;
            expected_task_agent_session_id: any;
            receipt_task_agent_session_id: any;
            session_mismatch: boolean;
            instruction: string;
            expected: string;
            dispatch_target: any;
            replay_attempt_id: any;
            replay_rendered_hash: any;
            boundary_checksum: any;
            createdAt: any;
            updatedAt: any;
            startedAt: any;
            completedAt: any;
            blockedReason: any;
            resolutionReason: any;
            seenCount: number;
        }[];
        openItems: any;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingWork: any;
        groupsCovered: any;
        requiredActionCount: any;
        openItemCount: any;
        coveredItemCount: any;
        sessionBindingRepairCount: any;
        dispatchBindingRepairCount: any;
        runnerMismatchRepairCount: any;
    };
};
export declare function runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest(): {
    pass: boolean;
    checks: {
        proofProducesNativeRepairItems: boolean;
        nativeRepairItemsBecomeDispatchCandidates: any;
        nativeCandidateCarriesProofTelemetry: boolean;
        nativeDispatchCandidateQualityPasses: boolean;
        childAgentRendererMentionsNativeCandidateTelemetry: any;
        resolvedProofRemovesNativeCandidates: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingCandidates: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedCandidateCount: any;
        coveredCandidateCount: any;
        candidateCount: any;
        nativeOpenItemCount: any;
        readyCount: any;
        dispatchMarkedCount: any;
        metadataGapCount: any;
        proofEntryCandidateCount: any;
        runnerBoundCandidateCount: any;
    };
    candidate: {
        work_item_id: any;
        proof_entry_id: any;
        request_patch_checksum: any;
        request_telemetry_session_status: any;
        request_telemetry_dispatch_status: any;
        runner_request_id: any;
    };
};
export declare function runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchBriefSelfTest(): {
    pass: boolean;
    checks: {
        nativeCandidatesCoveredBeforeBriefs: boolean;
        dispatchBriefReportPasses: boolean;
        dispatchBriefLedgerPersistsNativeProof: boolean;
        dispatchBriefWorkerTaskIsSelfContained: boolean;
        coordinatorPromptReceivesDispatchBrief: any;
        resolvedProofSupersedesReadyBriefs: any;
    };
    report: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingBriefs: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedBriefCount: any;
        coveredBriefCount: any;
        readyBriefCount: any;
        metadataGapCount: any;
        proofEntryBriefCount: any;
        runnerBoundBriefCount: any;
    };
    brief: {
        brief_id: any;
        work_item_id: any;
        proof_entry_id: any;
        request_patch_checksum: any;
        runner_request_id: any;
    };
};
export declare function runMemoryCenterApiMicrocompactNativeApplyProofRepairAssignmentBindingSelfTest(): {
    pass: boolean;
    checks: {
        dispatchBriefReady: boolean;
        assignmentCarriesBriefBinding: boolean;
        workerContextPacketCarriesBrief: boolean;
        bindingLedgerPersistsAssignmentProof: boolean;
        qualityCoversAssignmentBinding: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        bindingCount: any;
        validBindingCount: any;
        metadataGapCount: any;
        proofEntryBindingCount: any;
        runnerBoundBindingCount: any;
        workerContextPacketBindingCount: any;
    };
    binding: {
        binding_id: any;
        brief_id: any;
        assignment_id: any;
        dispatch_key: any;
        worker_context_packet_id: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketContextUsageSelfTest(): {
    pass: boolean;
    checks: {
        assignmentPacketCarriesUsage: boolean;
        renderedWorkerTaskShowsBudget: boolean;
        bindingPersistsUsageBudget: boolean;
        reportCoversUsageBudget: boolean;
        qualityCheckExposesUsageBudget: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        packetBindingCount: any;
        validUsageCount: any;
        metadataGapCount: any;
        overBudgetCount: any;
        compactRecommendedCount: any;
        renderedBudgetCount: any;
        totalTokens: any;
        maxPressure: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    usage: {
        status: any;
        total_tokens: any;
        free_tokens: any;
        top_categories: any;
    };
    binding: {
        binding_id: any;
        packet_id: any;
        rendered_context_usage_budget: boolean;
    };
};
