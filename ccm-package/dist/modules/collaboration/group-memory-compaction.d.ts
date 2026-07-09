export declare const GROUP_MEMORY_COMPACTION_VERSION = 3;
export declare const GROUP_COMPACT_TRIGGER_TOKENS = 137000;
export declare const GROUP_COMPACT_MIN_KEEP_MESSAGES = 5;
export declare const GROUP_COMPACT_MIN_KEEP_TOKENS = 10000;
export declare const GROUP_COMPACT_MAX_KEEP_TOKENS = 40000;
export declare const GROUP_COMPACT_MAX_FAILURES = 3;
export declare const GROUP_COMPACT_MODEL_RETRY_MS: number;
export declare const GROUP_FACT_ANCHOR_LIMIT = 500;
export declare const GROUP_CONTEXT_WINDOW_DEFAULT = 200000;
export declare const GROUP_CONTEXT_RESERVED_TOKENS = 50000;
export declare const GROUP_AUTOCOMPACT_BUFFER_TOKENS = 13000;
export declare const GROUP_WARNING_BUFFER_TOKENS = 20000;
export declare const GROUP_ERROR_BUFFER_TOKENS = 20000;
export declare const GROUP_MANUAL_COMPACT_BUFFER_TOKENS = 3000;
export declare const GROUP_COMPACT_MAX_ACTIVE_MESSAGES = 120;
export declare const GROUP_MICRO_COMPACT_VERSION = 1;
export declare const GROUP_MICRO_COMPACT_MAX_RECORDS = 80;
export declare const GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION = 1;
export declare const GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION = 1;
export declare const GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS = 180000;
export declare const GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS = 40000;
export declare const GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA = "context-management-2025-06-27";
export declare const GROUP_TIME_BASED_MICRO_COMPACT_VERSION = 1;
export declare const GROUP_TIME_BASED_MC_CLEARED_MESSAGE = "[Old group Agent result content cleared]";
export declare const GROUP_POST_COMPACT_REINJECT_VERSION = 1;
export declare const GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION = 1;
export declare const GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION = 1;
export declare const GROUP_POST_COMPACT_FILE_BUDGET = 5;
export declare const GROUP_POST_COMPACT_SKILL_BUDGET = 5;
export declare const GROUP_POST_COMPACT_VERIFICATION_BUDGET = 8;
export declare const GROUP_PARTIAL_COMPACT_VERSION = 1;
export declare const GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT = 12;
export declare const GROUP_PTL_EMERGENCY_VERSION = 1;
export declare const GROUP_PTL_RECOVERY_VERSION = 1;
export declare const GROUP_PRESERVED_SEGMENT_VERSION = 1;
export declare const GROUP_COMPACT_STRATEGY_DECISION_VERSION = 1;
export declare const GROUP_COMPACTION_HOOK_LEDGER_VERSION = 1;
type ConversationSummary = {
    primaryRequest: string;
    userMessages: string[];
    keyConcepts: string[];
    filesAndCode: string[];
    errorsAndFixes: string[];
    decisions: string[];
    completedWork: string[];
    pendingTasks: string[];
    currentWork: string;
    nextStep: string;
    participantState: string[];
    taskStates: string[];
};
type FactAnchor = {
    id: string;
    type: "user_requirement" | "dispatch_decision";
    messageId: string;
    text: string;
    timestamp: string;
    checksum: string;
};
type GroupMemoryQualitySeverity = "fatal" | "high" | "medium" | "low";
type GroupMemoryQualityCheck = {
    id: string;
    label: string;
    pass: boolean;
    severity: GroupMemoryQualitySeverity;
    score: number;
    detail: string;
    evidence?: string[];
    gaps?: string[];
};
type GroupMemoryQualityReport = {
    schema: "ccm-group-memory-quality-v1";
    score: number;
    pass: boolean;
    status: "pass" | "degraded" | "failed";
    checks: GroupMemoryQualityCheck[];
    drift: {
        detected: boolean;
        reasons: string[];
    };
    downgrade_required: boolean;
    downgrade_reason: string;
    evaluated_at: string;
};
type GroupMemoryCompactionHookPhase = "pre" | "post";
type GroupMemoryCompactionHook = (input: any) => any | Promise<any>;
export declare function getGroupMemoryCompactionHookLedgerFile(groupId: string): string;
export declare function readGroupMemoryCompactionHookLedger(groupId: string): {
    file: string;
    stats: any;
    schema: string;
    version: number;
    groupId: string;
    entries: any;
    updatedAt: string;
};
export declare function registerGroupMemoryCompactionHook(phase: GroupMemoryCompactionHookPhase, hook: GroupMemoryCompactionHook): () => boolean;
export declare function evaluateGroupMemorySummaryQuality(summary: ConversationSummary, fallback: ConversationSummary, messages: any[], memory?: any, options?: any): GroupMemoryQualityReport;
export declare function estimateGroupTextTokens(value: any): number;
export declare function estimateGroupMessageTokens(message: any): number;
/** Claude Code session-memory style retained window adapted to group messages:
 * keep 10K/5 text messages, cap near 40K, and preserve task transactions. */
export declare function calculateGroupMessagesToKeepIndex(messages: any[], options?: any): number;
export declare function buildGroupPreservedSegment(messages: any[], keepIndex: number, options?: any): {
    schema: string;
    version: number;
    keepIndex: number;
    floorIndex: number;
    preservedMessageCount: number;
    preservedTextBlockMessageCount: number;
    preservedTokenEstimate: any;
    preservedMessageIds: string[];
    omittedPreservedMessageIds: number;
    firstPreservedMessageId: string;
    lastPreservedMessageId: string;
    summarizedThroughMessageId: string;
    summaryMessageId: any;
    summaryChecksum: any;
    minTokens: number;
    minTextBlockMessages: number;
    maxTokens: number;
    protectedTaskTransaction: boolean;
    firstPreservedTaskId: string;
    transcriptPath: any;
    createdAt: any;
};
export declare function buildGroupApiMicroCompactEditPlan(messages?: any[], options?: any): any;
export declare function buildGroupApiMicrocompactNativeApplyPlan(apiEditPlan?: any, options?: any): any;
export declare function buildGroupCompactStrategyDecision(input?: any): any;
export declare function buildGroupPtlRecoveryPlan(input?: any): {
    schema: string;
    version: number;
    recovered: boolean;
    reason: string;
    previousEmergencyLevel: any;
    previousEmergencyReason: any;
    previousMessageDigestMaxChars: number;
    restoredMessageDigestMaxChars: number;
    triggerTokens: number;
    postCompactTokenCount: number;
    postCompactRatio: number;
    contextBudgetPressure: number;
    pressureThreshold: number;
    ratioThreshold: number;
    summaryChecksum: any;
    rawTranscriptPath: any;
    rawTranscriptUnmodified: boolean;
    recoveredAt: any;
};
export declare function getGroupAutoCompactThreshold(config?: any): number;
export declare function getGroupEffectiveContextWindow(config?: any): number;
export declare function calculateGroupCompactWarningState(input?: any): {
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
export declare function buildGroupMicroCompactPlan(messages: any[], options?: any): {
    schema: string;
    version: number;
    sourceMessageCount: number;
    recordCount: number;
    compactedMessageCount: number;
    tokensBefore: number;
    tokensAfter: number;
    tokensFreed: number;
    maxChars: number;
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
    records: any[];
};
export declare function buildPostCompactReinjectionPlan(messages: any[], microCompact?: any, options?: any): {
    schema: string;
    version: number;
    strategy: string;
    budgets: {
        files: number;
        skills: number;
        verification: number;
    };
    files: any[];
    skills: any[];
    verification: any[];
    blockers: any[];
    hasCandidates: boolean;
};
export declare function buildGroupPostCompactRecoveryAudit(input?: any): {
    schema: string;
    version: number;
    status: string;
    pass: boolean;
    action: string;
    createdAt: any;
    groupId: string;
    boundaryId: string;
    summarizedFromMessageId: string;
    summarizedThroughMessageId: string;
    compactedMessageCount: number;
    keepIndex: number;
    messageCount: any;
    keptRecentMessageCount: number;
    summaryChecksum: string;
    transcriptPath: string;
    candidateCounts: {
        files: any;
        skills: any;
        verification: any;
        blockers: any;
    };
    cleanupPolicy: {
        resetDerivedCompactState: boolean;
        childAgentIsolation: string;
        nextDispatchContext: string;
    };
    checks: any[];
    failedChecks: any[];
    passedChecks: number;
    checkCount: number;
};
export declare function buildGroupPostCompactCleanupAudit(input?: any): {
    schema: string;
    version: number;
    status: string;
    pass: boolean;
    action: string;
    createdAt: any;
    groupId: string;
    boundaryId: string;
    compactStrategyDecisionId: string;
    apiMicroCompactEditPlanId: string;
    mode: string;
    transcriptPath: string;
    summaryChecksum: string;
    partialSidecarOnly: boolean;
    preserveInvokedSkills: boolean;
    preserveToolContinuity: boolean;
    resetDerivedCompactState: boolean;
    childAgentIsolation: string;
    sourceOfTruth: string;
    skillHints: string[];
    apiMicroCompactEditPlan: any;
    cleanupActions: {
        id: string;
        action: string;
        status: string;
        evidence: any;
    }[];
    checks: any[];
    failedChecks: any[];
    passedChecks: number;
    checkCount: number;
};
export declare function buildDeterministicConversationSummary(messages: any[], memory: any, previous?: any): ConversationSummary;
export declare function renderConversationSummary(summary: any, maxChars?: number): string;
export declare function buildBoundedRecentGroupContext(messages: any[], fullCount?: number): string;
export declare function buildRelevantHistoricalGroupContext(messages: any[], boundaryIndex: number, query: string, options?: any): string;
export declare function compactGroupConversationMemory(input: {
    groupId: string;
    messages: any[];
    memory: any;
    config?: any;
    transcriptPath: string;
    force?: boolean;
    rebuild?: boolean;
    partialCompact?: any;
}): Promise<{
    compacted: boolean;
    partialCompacted: boolean;
    memory: any;
    keepIndex: any;
    partialCompact: any;
    partialSegment: {
        schema: string;
        version: number;
        id: string;
        direction: any;
        sidecar: boolean;
        range: {
            startIndex: number;
            endIndex: number;
            fromMessageId: string;
            throughMessageId: string;
            messageCount: any;
        };
        sourceTokens: any;
        summary: ConversationSummary;
        messageDigest: string;
        summaryChecksum: string;
        validation: {
            pass: boolean;
            missing: string[];
        };
        quality: {
            score: number;
            status: "failed" | "pass" | "degraded";
            pass: boolean;
            driftDetected: boolean;
        };
        microCompact: {
            schema: string;
            version: number;
            sourceMessageCount: number;
            recordCount: number;
            compactedMessageCount: number;
            tokensBefore: number;
            tokensAfter: number;
            tokensFreed: number;
            maxChars: number;
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
            records: any[];
        };
        reinjectionPlan: {
            schema: string;
            version: number;
            strategy: string;
            budgets: {
                files: number;
                skills: number;
                verification: number;
            };
            files: any[];
            skills: any[];
            verification: any[];
            blockers: any[];
            hasCandidates: boolean;
        };
        factAnchors: FactAnchor[];
        persistentRequirements: FactAnchor[];
        rawTranscriptPath: any;
        rawTranscriptUnmodified: boolean;
        reason: string;
        createdAt: any;
    };
    compactStrategyDecision: any;
    postCompactCleanupAudit: {
        schema: string;
        version: number;
        status: string;
        pass: boolean;
        action: string;
        createdAt: any;
        groupId: string;
        boundaryId: string;
        compactStrategyDecisionId: string;
        apiMicroCompactEditPlanId: string;
        mode: string;
        transcriptPath: string;
        summaryChecksum: string;
        partialSidecarOnly: boolean;
        preserveInvokedSkills: boolean;
        preserveToolContinuity: boolean;
        resetDerivedCompactState: boolean;
        childAgentIsolation: string;
        sourceOfTruth: string;
        skillHints: string[];
        apiMicroCompactEditPlan: any;
        cleanupActions: {
            id: string;
            action: string;
            status: string;
            evidence: any;
        }[];
        checks: any[];
        failedChecks: any[];
        passedChecks: number;
        checkCount: number;
    };
    apiMicroCompactEditPlan: any;
    contextPressureWarning?: undefined;
    boundary?: undefined;
    preCompactWarning?: undefined;
    postCompactRecoveryAudit?: undefined;
} | {
    compacted: boolean;
    memory: any;
    keepIndex: any;
    partialCompact: any;
    contextPressureWarning: {
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
    compactStrategyDecision: any;
    apiMicroCompactEditPlan: any;
    partialCompacted?: undefined;
    partialSegment?: undefined;
    postCompactCleanupAudit?: undefined;
    boundary?: undefined;
    preCompactWarning?: undefined;
    postCompactRecoveryAudit?: undefined;
} | {
    compacted: boolean;
    memory: any;
    boundary: {
        id: string;
        type: string;
        summarizedFromMessageId: string;
        summarizedThroughMessageId: string;
        summarizedMessageCount: number;
        preservedMessageIds: string[];
        preservedSegment: {
            schema: string;
            version: number;
            keepIndex: number;
            floorIndex: number;
            preservedMessageCount: number;
            preservedTextBlockMessageCount: number;
            preservedTokenEstimate: any;
            preservedMessageIds: string[];
            omittedPreservedMessageIds: number;
            firstPreservedMessageId: string;
            lastPreservedMessageId: string;
            summarizedThroughMessageId: string;
            summaryMessageId: any;
            summaryChecksum: any;
            minTokens: number;
            minTextBlockMessages: number;
            maxTokens: number;
            protectedTaskTransaction: boolean;
            firstPreservedTaskId: string;
            transcriptPath: any;
            createdAt: any;
        };
        preCompactTokenCount: any;
        postCompactTokenCount: any;
        compactStrategyDecision: any;
        apiMicroCompactEditPlan: any;
        post_compact_restore: {
            strategy: string;
            preservedMessageIds: string[];
            preservedSegment: {
                schema: string;
                version: number;
                keepIndex: number;
                floorIndex: number;
                preservedMessageCount: number;
                preservedTextBlockMessageCount: number;
                preservedTokenEstimate: any;
                preservedMessageIds: string[];
                omittedPreservedMessageIds: number;
                firstPreservedMessageId: string;
                lastPreservedMessageId: string;
                summarizedThroughMessageId: string;
                summaryMessageId: any;
                summaryChecksum: any;
                minTokens: number;
                minTextBlockMessages: number;
                maxTokens: number;
                protectedTaskTransaction: boolean;
                firstPreservedTaskId: string;
                transcriptPath: any;
                createdAt: any;
            };
            strategyDecision: any;
            apiMicroCompactEditPlan: any;
            summaryChecksum: string;
            transcriptPath: string;
            microCompact: {
                schema: string;
                version: number;
                sourceMessageCount: number;
                recordCount: number;
                compactedMessageCount: number;
                tokensBefore: number;
                tokensAfter: number;
                tokensFreed: number;
                maxChars: number;
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
                records: any[];
            };
            reinjectionPlan: {
                schema: string;
                version: number;
                strategy: string;
                budgets: {
                    files: number;
                    skills: number;
                    verification: number;
                };
                files: any[];
                skills: any[];
                verification: any[];
                blockers: any[];
                hasCandidates: boolean;
            };
            partialSidecarSegment: {
                schema: string;
                version: number;
                id: string;
                direction: any;
                sidecar: boolean;
                range: {
                    startIndex: number;
                    endIndex: number;
                    fromMessageId: string;
                    throughMessageId: string;
                    messageCount: any;
                };
                sourceTokens: any;
                summary: ConversationSummary;
                messageDigest: string;
                summaryChecksum: string;
                validation: {
                    pass: boolean;
                    missing: string[];
                };
                quality: {
                    score: number;
                    status: "failed" | "pass" | "degraded";
                    pass: boolean;
                    driftDetected: boolean;
                };
                microCompact: {
                    schema: string;
                    version: number;
                    sourceMessageCount: number;
                    recordCount: number;
                    compactedMessageCount: number;
                    tokensBefore: number;
                    tokensAfter: number;
                    tokensFreed: number;
                    maxChars: number;
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
                    records: any[];
                };
                reinjectionPlan: {
                    schema: string;
                    version: number;
                    strategy: string;
                    budgets: {
                        files: number;
                        skills: number;
                        verification: number;
                    };
                    files: any[];
                    skills: any[];
                    verification: any[];
                    blockers: any[];
                    hasCandidates: boolean;
                };
                factAnchors: FactAnchor[];
                persistentRequirements: FactAnchor[];
                rawTranscriptPath: any;
                rawTranscriptUnmodified: boolean;
                reason: string;
                createdAt: any;
            };
            ptlEmergency: {
                schema: string;
                version: number;
                engaged: boolean;
                emergencyLevel: string;
                reason: string;
                activeTokensBeforeCompact: number;
                triggerTokens: number;
                preCompactTokenCount: number;
                postCompactTokenCount: number;
                postCompactRatio: number;
                contextBudgetPressure: number;
                summaryRenderMaxChars: number;
                messageDigestMaxChars: number;
                rawTranscriptPath: any;
                rawTranscriptUnmodified: boolean;
                compactedRange: {
                    fromMessageId: string;
                    throughMessageId: string;
                    messageCount: any;
                };
                condensedMessageIds: any;
                omittedCondensedMessageIds: number;
                preservedRecentMessageIds: any;
                safeguards: string[];
                createdAt: any;
            };
            ptlRecovery: {
                schema: string;
                version: number;
                recovered: boolean;
                reason: string;
                previousEmergencyLevel: any;
                previousEmergencyReason: any;
                previousMessageDigestMaxChars: number;
                restoredMessageDigestMaxChars: number;
                triggerTokens: number;
                postCompactTokenCount: number;
                postCompactRatio: number;
                contextBudgetPressure: number;
                pressureThreshold: number;
                ratioThreshold: number;
                summaryChecksum: any;
                rawTranscriptPath: any;
                rawTranscriptUnmodified: boolean;
                recoveredAt: any;
            };
            recoveryAudit: any;
            cleanupAudit: any;
        };
        context_budget: {
            chars: number;
            estimated_tokens: number;
            max_chars: number;
            max_tokens: number;
            reserved_output_tokens: number;
            auto_compact_threshold: number;
            warning_threshold: number;
            blocking_threshold: number;
            pressure: number;
            compact_recommended: boolean;
            boundary: {
                type: string;
                preserved_head_chars: number;
                preserved_tail_chars: number;
            };
        } | {
            ptl_emergency: {
                schema: string;
                emergencyLevel: string;
                reason: string;
                messageDigestMaxChars: number;
            };
            chars: number;
            estimated_tokens: number;
            max_chars: number;
            max_tokens: number;
            reserved_output_tokens: number;
            auto_compact_threshold: number;
            warning_threshold: number;
            blocking_threshold: number;
            pressure: number;
            compact_recommended: boolean;
            boundary: {
                type: string;
                preserved_head_chars: number;
                preserved_tail_chars: number;
            };
        } | {
            ptl_recovery: {
                schema: string;
                reason: string;
                restoredMessageDigestMaxChars: number;
                contextBudgetPressure: number;
            };
            chars: number;
            estimated_tokens: number;
            max_chars: number;
            max_tokens: number;
            reserved_output_tokens: number;
            auto_compact_threshold: number;
            warning_threshold: number;
            blocking_threshold: number;
            pressure: number;
            compact_recommended: boolean;
            boundary: {
                type: string;
                preserved_head_chars: number;
                preserved_tail_chars: number;
            };
        };
        partialCompact: any;
        partialSidecarSegment: {
            schema: string;
            version: number;
            id: string;
            direction: any;
            sidecar: boolean;
            range: {
                startIndex: number;
                endIndex: number;
                fromMessageId: string;
                throughMessageId: string;
                messageCount: any;
            };
            sourceTokens: any;
            summary: ConversationSummary;
            messageDigest: string;
            summaryChecksum: string;
            validation: {
                pass: boolean;
                missing: string[];
            };
            quality: {
                score: number;
                status: "failed" | "pass" | "degraded";
                pass: boolean;
                driftDetected: boolean;
            };
            microCompact: {
                schema: string;
                version: number;
                sourceMessageCount: number;
                recordCount: number;
                compactedMessageCount: number;
                tokensBefore: number;
                tokensAfter: number;
                tokensFreed: number;
                maxChars: number;
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
                records: any[];
            };
            reinjectionPlan: {
                schema: string;
                version: number;
                strategy: string;
                budgets: {
                    files: number;
                    skills: number;
                    verification: number;
                };
                files: any[];
                skills: any[];
                verification: any[];
                blockers: any[];
                hasCandidates: boolean;
            };
            factAnchors: FactAnchor[];
            persistentRequirements: FactAnchor[];
            rawTranscriptPath: any;
            rawTranscriptUnmodified: boolean;
            reason: string;
            createdAt: any;
        };
        ptlEmergency: {
            schema: string;
            version: number;
            engaged: boolean;
            emergencyLevel: string;
            reason: string;
            activeTokensBeforeCompact: number;
            triggerTokens: number;
            preCompactTokenCount: number;
            postCompactTokenCount: number;
            postCompactRatio: number;
            contextBudgetPressure: number;
            summaryRenderMaxChars: number;
            messageDigestMaxChars: number;
            rawTranscriptPath: any;
            rawTranscriptUnmodified: boolean;
            compactedRange: {
                fromMessageId: string;
                throughMessageId: string;
                messageCount: any;
            };
            condensedMessageIds: any;
            omittedCondensedMessageIds: number;
            preservedRecentMessageIds: any;
            safeguards: string[];
            createdAt: any;
        };
        ptlRecovery: {
            schema: string;
            version: number;
            recovered: boolean;
            reason: string;
            previousEmergencyLevel: any;
            previousEmergencyReason: any;
            previousMessageDigestMaxChars: number;
            restoredMessageDigestMaxChars: number;
            triggerTokens: number;
            postCompactTokenCount: number;
            postCompactRatio: number;
            contextBudgetPressure: number;
            pressureThreshold: number;
            ratioThreshold: number;
            summaryChecksum: any;
            rawTranscriptPath: any;
            rawTranscriptUnmodified: boolean;
            recoveredAt: any;
        };
        summarySource: string;
        quality: {
            score: number;
            status: "failed" | "pass" | "degraded";
            driftDetected: boolean;
            downgradedByQualityGate: boolean;
        };
        createdAt: string;
    };
    keepIndex: any;
    contextPressureWarning: {
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
    preCompactWarning: {
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
    postCompactRecoveryAudit: {
        schema: string;
        version: number;
        status: string;
        pass: boolean;
        action: string;
        createdAt: any;
        groupId: string;
        boundaryId: string;
        summarizedFromMessageId: string;
        summarizedThroughMessageId: string;
        compactedMessageCount: number;
        keepIndex: number;
        messageCount: any;
        keptRecentMessageCount: number;
        summaryChecksum: string;
        transcriptPath: string;
        candidateCounts: {
            files: any;
            skills: any;
            verification: any;
            blockers: any;
        };
        cleanupPolicy: {
            resetDerivedCompactState: boolean;
            childAgentIsolation: string;
            nextDispatchContext: string;
        };
        checks: any[];
        failedChecks: any[];
        passedChecks: number;
        checkCount: number;
    };
    postCompactCleanupAudit: {
        schema: string;
        version: number;
        status: string;
        pass: boolean;
        action: string;
        createdAt: any;
        groupId: string;
        boundaryId: string;
        compactStrategyDecisionId: string;
        apiMicroCompactEditPlanId: string;
        mode: string;
        transcriptPath: string;
        summaryChecksum: string;
        partialSidecarOnly: boolean;
        preserveInvokedSkills: boolean;
        preserveToolContinuity: boolean;
        resetDerivedCompactState: boolean;
        childAgentIsolation: string;
        sourceOfTruth: string;
        skillHints: string[];
        apiMicroCompactEditPlan: any;
        cleanupActions: {
            id: string;
            action: string;
            status: string;
            evidence: any;
        }[];
        checks: any[];
        failedChecks: any[];
        passedChecks: number;
        checkCount: number;
    };
    compactStrategyDecision: any;
    apiMicroCompactEditPlan: any;
    partialCompacted?: undefined;
    partialCompact?: undefined;
    partialSegment?: undefined;
}>;
export declare function runGroupMemoryPreservedSegmentSelfTest(): Promise<{
    pass: boolean;
    checks: {
        keepIndexExpandedToTaskStart: boolean;
        taskTransactionProtected: boolean;
        segmentRecordsBudget: boolean;
        compactBoundaryCarriesSegment: boolean;
        postCompactRestoreCarriesSegment: boolean;
        memoryCarriesSegment: boolean;
        rawTranscriptUntouched: boolean;
    };
    keepIndex: number;
    segment: {
        schema: string;
        version: number;
        keepIndex: number;
        floorIndex: number;
        preservedMessageCount: number;
        preservedTextBlockMessageCount: number;
        preservedTokenEstimate: any;
        preservedMessageIds: string[];
        omittedPreservedMessageIds: number;
        firstPreservedMessageId: string;
        lastPreservedMessageId: string;
        summarizedThroughMessageId: string;
        summaryMessageId: any;
        summaryChecksum: any;
        minTokens: number;
        minTextBlockMessages: number;
        maxTokens: number;
        protectedTaskTransaction: boolean;
        firstPreservedTaskId: string;
        transcriptPath: any;
        createdAt: any;
    };
    boundarySegment: any;
}>;
export declare function runGroupMemoryPostCompactRecoveryAuditSelfTest(): Promise<{
    pass: boolean;
    checks: {
        compacted: boolean;
        auditRecordedInCompaction: boolean;
        auditRecordedInBoundary: boolean;
        auditRecordedInMessageCompression: boolean;
        boundaryRangeResolvable: boolean;
        rawTranscriptRecoverable: boolean;
        preservedAndReinjectReady: boolean;
        warningSuppressedAfterCompact: boolean;
        childAgentActionSafe: boolean;
        rawTranscriptUntouched: boolean;
    };
    audit: any;
}>;
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
        cleanupAuditRecordedEverywhere: boolean;
        cleanupLinksStrategyAndRecovery: boolean;
        cleanupPreservesRawTranscript: boolean;
        cleanupPreservesSkillAndToolContinuity: boolean;
        cleanupActionsCoverCcStyleState: boolean;
        cleanupDoesNotMutateRawMessages: boolean;
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
        status: "failed" | "pass" | "degraded";
    };
    bad: {
        score: number;
        status: "failed" | "pass" | "degraded";
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
        };
        files: any[];
        skills: any[];
        verification: any[];
        blockers: any[];
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
export {};
