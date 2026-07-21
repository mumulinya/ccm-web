export declare function runGroupMemoryCompactWarningSelfTest(): {
    pass: boolean;
    checks: {
        effectiveWindowMatchesCcStyleBudget: boolean;
        autoThresholdMatchesBuffer: boolean;
        okLevel: boolean;
        warningLevel: boolean;
        errorLevel: boolean;
        autoCompactLevel: boolean;
        blockingLevel: boolean;
        suppressedLevel: boolean;
        thresholdsRecorded: boolean;
    };
    states: {
        ok: {
            schema: string;
            version: number;
            tokenUsage: number;
            activeMessageCount: number;
            percentLeft: number;
            level: string;
            recommendation: string;
            suppressed: boolean;
            suppressReason: string;
            thresholds: {
                effectiveContextWindow: number;
                autoCompactThreshold: number;
                warningThreshold: number;
                errorThreshold: number;
                blockingThreshold: number;
                autoCompactBufferTokens: number;
                warningBufferTokens: number;
                errorBufferTokens: number;
                manualCompactBufferTokens: number;
            };
            flags: {
                isAboveWarningThreshold: boolean;
                isAboveErrorThreshold: boolean;
                isAboveAutoCompactThreshold: boolean;
                isAtBlockingLimit: boolean;
            };
            createdAt: any;
        };
        warning: {
            schema: string;
            version: number;
            tokenUsage: number;
            activeMessageCount: number;
            percentLeft: number;
            level: string;
            recommendation: string;
            suppressed: boolean;
            suppressReason: string;
            thresholds: {
                effectiveContextWindow: number;
                autoCompactThreshold: number;
                warningThreshold: number;
                errorThreshold: number;
                blockingThreshold: number;
                autoCompactBufferTokens: number;
                warningBufferTokens: number;
                errorBufferTokens: number;
                manualCompactBufferTokens: number;
            };
            flags: {
                isAboveWarningThreshold: boolean;
                isAboveErrorThreshold: boolean;
                isAboveAutoCompactThreshold: boolean;
                isAtBlockingLimit: boolean;
            };
            createdAt: any;
        };
        error: {
            schema: string;
            version: number;
            tokenUsage: number;
            activeMessageCount: number;
            percentLeft: number;
            level: string;
            recommendation: string;
            suppressed: boolean;
            suppressReason: string;
            thresholds: {
                effectiveContextWindow: number;
                autoCompactThreshold: number;
                warningThreshold: number;
                errorThreshold: number;
                blockingThreshold: number;
                autoCompactBufferTokens: number;
                warningBufferTokens: number;
                errorBufferTokens: number;
                manualCompactBufferTokens: number;
            };
            flags: {
                isAboveWarningThreshold: boolean;
                isAboveErrorThreshold: boolean;
                isAboveAutoCompactThreshold: boolean;
                isAtBlockingLimit: boolean;
            };
            createdAt: any;
        };
        autoCompact: {
            schema: string;
            version: number;
            tokenUsage: number;
            activeMessageCount: number;
            percentLeft: number;
            level: string;
            recommendation: string;
            suppressed: boolean;
            suppressReason: string;
            thresholds: {
                effectiveContextWindow: number;
                autoCompactThreshold: number;
                warningThreshold: number;
                errorThreshold: number;
                blockingThreshold: number;
                autoCompactBufferTokens: number;
                warningBufferTokens: number;
                errorBufferTokens: number;
                manualCompactBufferTokens: number;
            };
            flags: {
                isAboveWarningThreshold: boolean;
                isAboveErrorThreshold: boolean;
                isAboveAutoCompactThreshold: boolean;
                isAtBlockingLimit: boolean;
            };
            createdAt: any;
        };
        blocking: {
            schema: string;
            version: number;
            tokenUsage: number;
            activeMessageCount: number;
            percentLeft: number;
            level: string;
            recommendation: string;
            suppressed: boolean;
            suppressReason: string;
            thresholds: {
                effectiveContextWindow: number;
                autoCompactThreshold: number;
                warningThreshold: number;
                errorThreshold: number;
                blockingThreshold: number;
                autoCompactBufferTokens: number;
                warningBufferTokens: number;
                errorBufferTokens: number;
                manualCompactBufferTokens: number;
            };
            flags: {
                isAboveWarningThreshold: boolean;
                isAboveErrorThreshold: boolean;
                isAboveAutoCompactThreshold: boolean;
                isAtBlockingLimit: boolean;
            };
            createdAt: any;
        };
        suppressed: {
            schema: string;
            version: number;
            tokenUsage: number;
            activeMessageCount: number;
            percentLeft: number;
            level: string;
            recommendation: string;
            suppressed: boolean;
            suppressReason: string;
            thresholds: {
                effectiveContextWindow: number;
                autoCompactThreshold: number;
                warningThreshold: number;
                errorThreshold: number;
                blockingThreshold: number;
                autoCompactBufferTokens: number;
                warningBufferTokens: number;
                errorBufferTokens: number;
                manualCompactBufferTokens: number;
            };
            flags: {
                isAboveWarningThreshold: boolean;
                isAboveErrorThreshold: boolean;
                isAboveAutoCompactThreshold: boolean;
                isAtBlockingLimit: boolean;
            };
            createdAt: any;
        };
    };
};
export declare function runGroupMemoryCompactionSelfTest(): {
    pass: boolean;
    checks: {
        keepsRecentMessages: boolean;
        compactsOlderMessages: boolean;
        preservesUserIntent: boolean;
        preservesErrors: boolean;
        preservesFiles: boolean;
        preservesNextStep: boolean;
        microCompactsLargeOutput: boolean;
        rawTranscriptUntouched: boolean;
        neverCrossesPreviousBoundary: boolean;
        retrievesCompressedOriginalEvidence: boolean;
        rejectsUngroundedModelClaims: boolean;
        preservesDeterministicFacts: boolean;
        storesChecksummedUserAnchors: boolean;
        adaptiveThresholdMatchesDefaultBudget: boolean;
    };
    keepIndex: number;
    keptMessages: number;
    compactedMessages: number;
};
export declare function runGroupMemoryModelCapacitySelfTest(): {
    pass: boolean;
    checks: {
        ccDefaultUsesTwentyKSummaryReserve: boolean;
        ccDefaultAutoCompactThresholdIs167k: boolean;
        preset516IsApplied: boolean;
        preset1mIsApplied: boolean;
        threeMbSourceIsNeverSentWhole: boolean;
        requestCarriesCapacityProof: boolean;
        originalMemoryRemainsUntouched: any;
    };
    defaultCapacity: {
        schema: string;
        provider: any;
        model: any;
        contextWindow: number;
        maxOutputTokens: number;
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        source: any;
        confidence: number;
        checkedAt: any;
        expiresAt: any;
        evidenceId: any;
        evidenceChecksum: any;
        cacheStatus: string;
        conservativeFallback: boolean;
    } | {
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        reserveSource: string;
        schema: string;
        provider: any;
        model: any;
        contextWindow: number;
        maxOutputTokens: number;
        source: any;
        confidence: number;
        checkedAt: any;
        expiresAt: any;
        evidenceId: any;
        evidenceChecksum: any;
        cacheStatus: string;
        conservativeFallback: boolean;
    } | {
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        reserveSource: string;
        conservativeFallback: boolean;
        fallbackReason: string;
        staleEvidenceId: any;
        staleEvidenceSource: any;
        schema: string;
        provider: any;
        model: any;
        contextWindow: number;
        maxOutputTokens: number;
        source: any;
        confidence: number;
        checkedAt: any;
        expiresAt: any;
        evidenceId: any;
        evidenceChecksum: any;
        cacheStatus: string;
    } | {
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        reserveSource: string;
        schema: string;
        provider: string;
        model: string;
        contextWindow: number;
        maxOutputTokens: number;
        source: string;
        confidence: number;
        checkedAt: string;
        expiresAt: string;
        evidenceId: string;
        evidenceChecksum: string;
        cacheStatus: string;
        conservativeFallback: boolean;
        fallbackReason: string;
    };
    preset516Threshold: number;
    preset1mThreshold: number;
    requestAudit: {
        schema: string;
        modelCapacity: {
            schema: string;
            provider: any;
            model: any;
            contextWindow: number;
            maxOutputTokens: number;
            reservedOutputTokens: number;
            effectiveContextWindow: number;
            autoCompactBufferTokens: number;
            autoCompactThreshold: number;
            source: any;
            confidence: number;
            checkedAt: any;
            expiresAt: any;
            evidenceId: any;
            evidenceChecksum: any;
            cacheStatus: string;
            conservativeFallback: boolean;
        } | {
            reservedOutputTokens: number;
            effectiveContextWindow: number;
            autoCompactBufferTokens: number;
            autoCompactThreshold: number;
            reserveSource: string;
            schema: string;
            provider: any;
            model: any;
            contextWindow: number;
            maxOutputTokens: number;
            source: any;
            confidence: number;
            checkedAt: any;
            expiresAt: any;
            evidenceId: any;
            evidenceChecksum: any;
            cacheStatus: string;
            conservativeFallback: boolean;
        } | {
            reservedOutputTokens: number;
            effectiveContextWindow: number;
            autoCompactBufferTokens: number;
            autoCompactThreshold: number;
            reserveSource: string;
            conservativeFallback: boolean;
            fallbackReason: string;
            staleEvidenceId: any;
            staleEvidenceSource: any;
            schema: string;
            provider: any;
            model: any;
            contextWindow: number;
            maxOutputTokens: number;
            source: any;
            confidence: number;
            checkedAt: any;
            expiresAt: any;
            evidenceId: any;
            evidenceChecksum: any;
            cacheStatus: string;
        } | {
            reservedOutputTokens: number;
            effectiveContextWindow: number;
            autoCompactBufferTokens: number;
            autoCompactThreshold: number;
            reserveSource: string;
            schema: string;
            provider: string;
            model: string;
            contextWindow: number;
            maxOutputTokens: number;
            source: string;
            confidence: number;
            checkedAt: string;
            expiresAt: string;
            evidenceId: string;
            evidenceChecksum: string;
            cacheStatus: string;
            conservativeFallback: boolean;
            fallbackReason: string;
        };
        maxInputTokens: number;
        maxOutputTokens: number;
        estimatedInputTokensBefore: number;
        estimatedInputTokensAfterRoundDrops: number;
        estimatedInputTokens: number;
        withinBudget: boolean;
        clipped: boolean;
        sourceMessageCount: number;
        effectiveSourceMessageCount: number;
        droppedApiRoundCount: number;
        recentTimelineMessageLimit: number;
        userMessageLimit: number;
        sourceStrategy: string;
        rawTranscriptPreserved: boolean;
        customInstructionsApplied: boolean;
        summaryInputProjection: any;
    };
    sourceChars: number;
};
export declare function runGroupCompactStrategyDecisionSelfTest(): Promise<{
    pass: boolean;
    checks: {
        directDecisionHasSchema: boolean;
        directDecisionRecordsWindow: boolean;
        directDecisionPassesInvariants: boolean;
        compactResultCarriesDecision: boolean;
        boundaryCarriesDecision: boolean;
        decisionMentionsCcStyleMode: boolean;
    };
    decision: {
        mode: any;
        invariantPass: any;
        decisionChecksum: any;
    };
}>;
export declare function runGroupPostCompactCleanupAuditSelfTest(): Promise<{
    pass: boolean;
    checks: {
        cleanupAuditHasSchema: boolean;
        cleanupAuditBindsExactMainAgentSession: boolean;
        cleanupAuditRecordedEverywhere: boolean;
        cleanupLinksStrategyAndRecovery: boolean;
        cleanupPreservesRawTranscript: boolean;
        cleanupPreservesSkillAndToolContinuity: boolean;
        cleanupActionsCoverCcStyleState: boolean;
        cleanupDoesNotMutateRawMessages: boolean;
        compactReceiptBindsCleanupAuditChecksum: boolean;
        crossSessionAuditCopyFailsClosed: boolean;
        recomputedTamperedAuditCannotRebindReceipt: boolean;
    };
    audit: {
        status: any;
        actionIds: any;
        failedChecks: any;
    };
}>;
export declare function runGroupApiMicroCompactEditPlanSelfTest(): Promise<{
    pass: boolean;
    checks: {
        directPlanHasSchema: any;
        directPlanIncludesThinkingEdit: boolean;
        directPlanIncludesToolEdit: boolean;
        compactResultCarriesPlan: boolean;
        boundaryAndCleanupCarryPlan: boolean;
        planIsAdvisoryForThirdPartyCli: boolean;
    };
    plan: {
        editCount: any;
        checksum: any;
        signalCounts: any;
    };
}>;
export declare function runGroupApiMicrocompactNativeApplyPlanSelfTest(): {
    pass: boolean;
    checks: {
        cliStaysAdvisory: boolean;
        nativeApiBuildsRealRequestPatch: any;
        nativePatchLinksEditPlan: any;
        nativePatchBindsChildAgentSession: boolean;
        missingBetaFailsClosed: boolean;
    };
    cli: {
        mode: any;
        reason: any;
        failedChecks: any;
    };
    native: {
        mode: any;
        requestPatch: any;
        checksum: any;
    };
    missingBeta: {
        mode: any;
        failedChecks: any;
    };
};
export declare function runGroupMemoryQualityGateSelfTest(): {
    pass: boolean;
    checks: {
        goodSummaryPasses: boolean;
        goodSummaryPreservesSentinel: boolean;
        badSummaryFails: boolean;
        driftDetected: boolean;
        missingFallbackDetected: boolean;
        ungroundedCompletionDetected: boolean;
    };
    good: {
        score: number;
        status: "failed" | "degraded" | "pass";
    };
    bad: {
        score: number;
        status: "failed" | "degraded" | "pass";
        downgrade_reason: string;
    };
};
export declare function runGroupMemoryMicroCompactSelfTest(): {
    pass: boolean;
    checks: {
        compactedLongAgentOutput: boolean;
        preservesTailSentinel: boolean;
        recordsChecksum: boolean;
        reinjectsFile: boolean;
        reinjectsSkill: boolean;
        reinjectsVerification: boolean;
    };
    micro: {
        recordCount: number;
        compactedMessageCount: number;
        tokensFreed: number;
    };
    reinject: {
        schema: string;
        version: number;
        strategy: string;
        budgets: {
            files: number;
            skills: number;
            verification: number;
            taskStatuses: number;
            invokedSkillSingleTokens: number;
            invokedSkillsTotalTokens: number;
            currentPlanTokens: number;
            dynamicContextTokens: number;
        };
        files: any[];
        skills: any[];
        verification: any[];
        blockers: any[];
        taskStatuses: any[];
        preservedFileDedup: any;
        invokedSkillAttachments: any[];
        invokedSkillAttachmentReceipt: any;
        planAttachment: any;
        planAttachmentReceipt: any;
        dynamicContextDeltaAttachment: any;
        dynamicContextDeltaReceipt: any;
        hasCandidates: boolean;
    };
};
export declare function runGroupMemoryTimeBasedMicroCompactSelfTest(): {
    pass: boolean;
    checks: {
        timeBasedTriggered: boolean;
        clearsOldButKeepsRecent: boolean;
        preservesArtifactHints: boolean;
        recordsClearedPlaceholder: boolean;
        freesTokens: boolean;
        notTriggeredWhenGapBelowThreshold: boolean;
        rawTranscriptUntouched: boolean;
    };
    timeBased: {
        clearSet: any;
        keepSet: any;
        schema: string;
        version: number;
        enabled: boolean;
        triggered: boolean;
        force: boolean;
        gapMinutes: number;
        gapThresholdMinutes: number;
        keepRecent: number;
        compactableCount: number;
        clearedCount: number;
        keptCount: number;
        lastAssistantAt: string;
        now: string;
        reason: string;
    };
    cleared: any[];
};
export declare function runGroupMemoryCompactionHookSelfTest(): Promise<{
    pass: boolean;
    checks: {
        compacted: boolean;
        preHookRecorded: boolean;
        postHookRecorded: boolean;
        hookRequirementPersisted: any;
        hookFactAnchorPersisted: any;
        microCompactStored: boolean;
        reinjectionStored: boolean;
        hookLedgerStored: any;
        hookLedgerReadable: boolean;
    };
}>;
export declare function runGroupMemoryPartialCompactSelfTest(): Promise<{
    pass: boolean;
    checks: {
        compacted: boolean;
        boundaryIsPartial: boolean;
        compactedThroughSelected: boolean;
        laterMessagesRemainRaw: any;
        partialMetadataRecorded: boolean;
        summaryPreservesSentinel: boolean;
        rawTranscriptUntouched: boolean;
    };
    keepIndex: any;
    boundary: any;
}>;
export declare function runGroupMemoryPartialCompactSidecarSelfTest(): Promise<{
    pass: boolean;
    checks: {
        sidecarCompacted: boolean;
        primaryBoundaryUnchanged: boolean;
        sidecarMetadataRecorded: boolean;
        sidecarSummaryPreservesSentinel: boolean;
        sidecarQualityPasses: boolean;
        sidecarReinjectsFile: boolean;
        sidecarFactMerged: boolean;
        sidecarCleanupDoesNotResetPrimaryDerivedState: boolean;
        rawTranscriptUntouched: boolean;
    };
    partialSegment: any;
}>;
export declare function runGroupMemoryPtlEmergencySelfTest(): Promise<{
    pass: boolean;
    checks: {
        compacted: boolean;
        ptlRecordedInCompaction: boolean;
        ptlRecordedInBoundary: boolean;
        ptlRecordedInMessageCompression: boolean;
        healthDowngraded: boolean;
        digestIsBounded: boolean;
        qualityStillPasses: boolean;
        summaryPreservesSentinel: boolean;
        rawTranscriptUntouched: boolean;
    };
    ptlEmergency: any;
}>;
export declare function runGroupMemoryPtlRecoverySelfTest(): Promise<{
    pass: boolean;
    checks: {
        compacted: boolean;
        recoveryRecorded: boolean;
        emergencyCleared: boolean;
        healthHealthy: boolean;
        digestRestoredAboveEmergencyBudget: boolean;
        recoveryStoredInBoundaryBudget: boolean;
        summaryPreservesSentinel: boolean;
    };
    recovery: any;
}>;
export declare function runGroupMemoryCompactionIntegrationSelfTest(): Promise<{
    pass: boolean;
    checks: {
        actualAsyncCompaction: boolean;
        structuredFallbackWithoutModel: boolean;
        qualityGatePassed: boolean;
        microCompactRecorded: boolean;
        postCompactReinjectRecorded: boolean;
        fallbackPreservesUserIntent: boolean;
        rawMessagesRemainImmutable: boolean;
        incrementalSecondCompaction: boolean;
        nextBoundaryStartsAfterPrevious: boolean;
        postCompactRestoreAnchorsRecorded: boolean;
        legacyVersionRebuildsFromRawTranscript: boolean;
    };
}>;
export declare function runGroupMemoryCompactionStressSelfTest(): Promise<{
    pass: boolean;
    checks: {
        handlesTwelveIncrementalCompactions: boolean;
        summaryValidationNeverDrifts: boolean;
        everySummaryHasIntegrityChecksum: boolean;
        compactionActuallyReleasesContext: boolean;
        persistentRequirementSurvives: any;
        oldRawEvidenceIsAutomaticallyRetrievable: boolean;
        rawTranscriptRemainsUntouched: boolean;
        boundaryHistoryIsBounded: boolean;
    };
    finalBoundaryIndex: number;
}>;
