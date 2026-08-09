import { ConversationSummary, FactAnchor, GroupMemoryQualityCheck, GroupMemoryQualityReport, GroupMemoryQualitySeverity } from "./group-compaction-receipts";
export declare function compactText(value: any, max?: number): string;
export declare function renderMessageContentValue(value: any): string;
export declare function messageContent(message: any): string;
export declare function compactionSummaryInputProjectionChecksum(receipt: any): string;
export declare function verifyGroupCompactionSummaryInputProjectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export type CompactionSummaryInputProjectionState = {
    imageBlocksStripped: number;
    documentBlocksStripped: number;
    binarySegmentsStripped: number;
};
export declare const GROUP_COMPACTION_IMAGE_BLOCK_TYPES: Set<string>;
export declare const GROUP_COMPACTION_DOCUMENT_BLOCK_TYPES: Set<string>;
export declare const GROUP_COMPACTION_REINJECTED_ATTACHMENT_TYPES: Set<string>;
export declare const GROUP_COMPACTION_BINARY_VALUE_KEYS: Set<string>;
export declare function sanitizeCompactionSummaryString(value: string, state: CompactionSummaryInputProjectionState, key?: string): string;
export declare function sanitizeCompactionSummaryValue(value: any, state: CompactionSummaryInputProjectionState, key?: string): any;
export declare function isReinjectedCompactionAttachment(message: any): boolean;
export declare function buildGroupCompactionSummaryInputProjection(messages?: any[], options?: any): {
    messages: any[];
    previousSummary: any;
    fallbackSummary: any;
    receipt: any;
};
export declare function messageIdentity(message: any, index?: number): string;
export declare function messageActor(message: any): any;
export declare function mergeUnique(existing?: any[], incoming?: any[], limit?: number, max?: number): string[];
export declare function mergeTaskStates(existing?: any[], incoming?: any[], limit?: number): string[];
export declare function stringArray(value: any, limit?: number): string[];
export declare function uniqueStrings(values?: any[], limit?: number): string[];
export declare function normalizedSearchTokens(value: any): Set<string>;
export declare function isGroundedInSource(value: any, source: string): boolean;
export declare function mergeSafeConversationSummary(previous: ConversationSummary, fallback: ConversationSummary, model: ConversationSummary | null, messages: any[]): ConversationSummary;
export declare function validateSummaryPreservesFallback(summary: ConversationSummary, fallback: ConversationSummary): {
    pass: boolean;
    missing: string[];
};
export declare function buildGroupMemoryQualitySource(messages: any[], memory?: any): string;
export declare function extractRequirementNeedles(text: any): string[];
export declare function isRequirementRepresented(requirement: any, artifactText: string): boolean;
export declare function extractBlockedTaskSignals(messages: any[]): {
    taskId: string;
    text: string;
}[];
export declare function addQualityCheck(checks: GroupMemoryQualityCheck[], check: Omit<GroupMemoryQualityCheck, "score">): void;
export declare function qualityPenalty(severity: GroupMemoryQualitySeverity): 8 | 16 | 30 | 45;
export declare function evaluateGroupMemorySummaryQuality(summary: ConversationSummary, fallback: ConversationSummary, messages: any[], memory?: any, options?: any): GroupMemoryQualityReport;
export declare function extractFactAnchors(messages: any[]): FactAnchor[];
export declare function mergeFactAnchors(existing?: any[], incoming?: FactAnchor[]): FactAnchor[];
export declare function extractPersistentRequirements(messages: any[]): FactAnchor[];
export declare function mergePersistentRequirements(existing?: any[], incoming?: FactAnchor[]): FactAnchor[];
export declare function estimateGroupTextTokens(value: any): number;
export declare function estimateGroupMessageTokens(message: any): number;
export declare function messageHasText(message: any): boolean;
export declare function groupMessageTaskId(message: any): string;
export declare function groupProviderMessageId(message: any): string;
export declare function groupMessageToolUseIds(message: any): Set<string>;
export declare function groupMessageToolResultIds(message: any): Set<string>;
export declare function groupSessionMemoryApiInvariantClosureChecksum(receipt: any): string;
export declare function verifyGroupSessionMemoryApiInvariantClosure(receipt: any): {
    valid: boolean;
    issues: string[];
};
export declare function adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants(messages: any[], startIndex: number, options?: any): {
    keepIndex: number;
    receipt: any;
};
/** Claude Code session-memory style retained window adapted to group messages:
 * keep 10K/5 text messages, cap near 40K, and preserve task transactions. */
export declare function calculateGroupMessagesToKeepIndex(messages: any[], options?: any): number;
/** Calculate the CC session-memory retained window from an extraction cursor. */
export declare function calculateGroupSessionMemoryMessagesToKeepIndex(messages: any[], lastSummarizedMessageId: string, options?: any): number;
export declare function groupSessionMemoryCompactSelectionChecksum(receipt: any): string;
export declare function groupSessionMemoryCompactProjectionChecksum(receipt: any): string;
export declare function splitGroupSessionMemoryMarkdownSections(markdown: string): string[];
export declare function truncateGroupSessionMemorySectionAtLineBoundary(section: string, maxTokens: number): {
    text: string;
    originalTokens: number;
    projectedTokens: number;
    truncated: boolean;
};
export declare function buildGroupSessionMemoryCompactProjection(input?: any): {
    markdown: string;
    receipt: any;
};
export declare function verifyGroupSessionMemoryCompactProjection(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildGroupSessionMemoryCompactSelectionReceipt(input?: any): any;
export declare function verifyGroupSessionMemoryCompactSelectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function selectGroupSessionMemoryForCompact(input?: any): Promise<{
    selected: boolean;
    markdown: string;
    keepIndex: number;
    receipt: any;
} | {
    selected: boolean;
    markdown: string;
    keepIndex: number;
    snapshot: any;
    receipt: any;
}>;
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
    summaryMessageId: string;
    summaryChecksum: string;
    headMessageId: string;
    anchorMessageId: string;
    tailMessageId: string;
    anchorKind: string;
    anchorMode: string;
    minTokens: number;
    minTextBlockMessages: number;
    maxTokens: number;
    protectedTaskTransaction: boolean;
    firstPreservedTaskId: string;
    transcriptPath: any;
    createdAt: any;
};
export declare function messageContentBlocks(message: any): any[];
export declare function collectWindowBlockRefs(messages: any[], offset?: number): {
    toolUseIds: Set<string>;
    toolResultIds: Set<string>;
    thinkingMessageIds: Set<string>;
    rows: any[];
};
export declare function collectApiMicroCompactSignals(messages?: any[]): {
    toolUseIds: string[];
    toolResultIds: string[];
    toolNames: string[];
    resultToolNames: string[];
    toolUseBlockCount: number;
    toolResultBlockCount: number;
    thinkingBlockCount: number;
    redactedThinkingBlockCount: number;
    hasThinking: boolean;
    hasToolUses: boolean;
    hasToolResults: boolean;
};
export declare const GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES: Set<string>;
export declare function normalizedToolName(value: any): string;
export declare function timeBasedToolResultReceiptChecksum(receipt: any): string;
export declare function verifyGroupTimeBasedToolResultProjectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function clearProjectedToolResultValue(value: any, clearIds: Set<string>, state: {
    tokensSaved: number;
    cleared: number;
}): any;
export declare function buildGroupTimeBasedToolResultProjection(messages?: any[], options?: any): {
    messages: any[];
    receipt: any;
    applied: boolean;
};
export declare function timeBasedThinkingReceiptChecksum(receipt: any): string;
export declare function verifyGroupTimeBasedThinkingProjectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function hasModelVisibleThinking(message: any): boolean;
export declare function clearProjectedThinkingValue(value: any, state: {
    tokensSaved: number;
    clearedBlocks: number;
}): any;
export declare function buildGroupTimeBasedThinkingProjection(messages?: any[], options?: any): {
    messages: any[];
    receipt: any;
    applied: boolean;
    shouldPersist: boolean;
};
export declare function buildGroupApiMicroCompactEditPlan(messages?: any[], options?: any): any;
export declare function buildGroupApiMicrocompactNativeApplyPlan(apiEditPlan?: any, options?: any): any;
export declare function verifyGroupApiMicrocompactNativeApplyPlan(plan?: any, expected?: any): {
    valid: boolean;
    issues: string[];
    computedApplyPlanChecksum: string;
    computedRequestPatchChecksum: string;
};
export declare function createEmptyConversationSummary(): ConversationSummary;
export declare function extractFiles(message: any): string[];
export declare function extractRuntimeSkillFacts(message: any): string[];
export declare function extractVerificationFacts(message: any): string[];
export declare function extractMessageStatus(message: any): string;
export declare function messageTimestampMs(message: any): number;
export declare function isGroupMicroCompactableMessage(message: any, includeUser?: boolean): boolean;
export declare function resolveGroupTimeBasedMicroCompact(messages: any[], options?: any, includeUser?: boolean): {
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
    clearSet: Set<number>;
    keepSet: Set<number>;
    reason: string;
};
export declare function extractPostCompactArtifacts(message: any): {
    files: string[];
    skills: string[];
    verification: string[];
    blockers: string[];
};
export declare function postCompactTaskStatusReceiptChecksum(receipt: any): string;
export declare function normalizePostCompactTaskStatus(value: any): string;
export declare function postCompactTaskUpdatedAtMs(task: any): number;
export declare function postCompactTaskWasRetrieved(task: any): boolean;
export declare function verifyGroupPostCompactTaskStatusProjectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildGroupPostCompactTaskStatusProjection(tasks?: any[], options?: any): {
    tasks: any[];
    receipt: any;
};
export declare function normalizePostCompactReadPath(value: any): string;
export declare function postCompactMessageBlocks(message: any): any[];
export declare function collectPreservedReadPaths(messages?: any[]): {
    paths: Set<string>;
    readToolUseCount: number;
    unchangedStubToolIds: Set<string>;
};
export declare function postCompactFileRestoreDedupReceiptChecksum(receipt: any): string;
export declare function verifyGroupPostCompactFileRestoreDedupReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildGroupPostCompactFileRestoreDedupProjection(fileCandidates?: any[], preservedMessages?: any[], options?: any): {
    files: any[];
    receipt: any;
};
export declare function invokedSkillAttachmentReceiptChecksum(receipt: any): string;
export declare function invokedSkillNameAndHash(value: any): {
    name: string;
    contentHash: string;
    invokedAt?: undefined;
} | {
    name: string;
    contentHash: string;
    invokedAt: string;
};
export declare function collectExactSessionInvokedSkills(messages?: any[]): any[];
export declare function isPathWithin(root: string, candidate: string): boolean;
export declare function currentControlledSkillBody(skillName: string, catalog: any[]): {
    status: string;
    body: string;
    skill: any;
    sourcePath: string;
    sourceKind: string;
};
export declare function truncateSkillBodyToTokens(body: string, maxTokens: number): {
    text: string;
    originalTokens: number;
    tokens: number;
    truncated: boolean;
};
export declare function truncatePostCompactBodyPreservingEdges(body: string, maxTokens: number): {
    text: string;
    originalTokens: number;
    tokens: number;
    truncated: boolean;
};
export declare function verifyGroupPostCompactInvokedSkillAttachmentReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildGroupPostCompactInvokedSkillAttachmentProjection(messages?: any[], options?: any): {
    attachments: any[];
    receipt: any;
};
export declare function postCompactPlanAttachmentReceiptChecksum(receipt: any): string;
export declare function postCompactPlanObject(task: any): {
    source: any;
    plan: any;
};
export declare function postCompactPlanTaskId(task: any): string;
export declare function postCompactPlanTaskStatus(task: any): string;
export declare function postCompactPlanTaskIsTerminal(task: any): boolean;
export declare function postCompactPlanConfirmationState(task: any, plan: any): {
    intakeState: string;
    confirmed: boolean;
    planModeActive: boolean;
    confirmationStatus: string;
};
export declare function compactPostCompactPlanBody(body: string): {
    text: string;
    originalTokens: number;
    tokens: number;
    truncated: boolean;
};
export declare function verifyGroupPostCompactPlanAttachmentReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildGroupPostCompactPlanAttachmentProjection(tasks?: any[], options?: any): {
    attachment: any;
    receipt: any;
};
export declare function postCompactDynamicContextDeltaReceiptChecksum(receipt: any): string;
export declare function dynamicContextTextHash(value: any): string;
export declare function normalizeDynamicContextRows(values: any, kind: "line" | "block"): any[];
export declare function collectToolReferenceNames(value: any, names: Set<string>, depth?: number): void;
export declare function extractGroupPreCompactLoadedToolNames(messages?: any[], carriedValues?: any[]): string[];
export declare function buildPreCompactLoadedToolState(catalogTools: any[], messages: any[], carriedValues?: any[]): {
    schema: string;
    version: number;
    sourceCount: number;
    carriedNames: string[];
    carriedHashes: any[];
    droppedNames: string[];
};
export declare function collectDynamicContextDeltaAttachments(values: any[]): any[];
export declare function reconstructDynamicContextAnnouncements(attachments: any[]): {
    deferredTools: Map<string, string>;
    agentListing: Map<string, string>;
    mcpInstructions: Map<string, string>;
};
export declare function buildDynamicContextCategory(rows: any[], announced: Map<string, string>): {
    addedNames: any[];
    addedHashes: any[];
    addedTexts: any[];
    removedNames: string[];
    isInitial: boolean;
};
export declare function dynamicContextAttachmentManifest(attachment: any): any;
export declare function verifyGroupPostCompactDynamicContextDeltaReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildGroupPostCompactDynamicContextDeltaProjection(catalog?: any, options?: any): {
    attachment: any;
    receipt: any;
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
        taskStatuses: number;
        invokedSkillSingleTokens: any;
        invokedSkillsTotalTokens: any;
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
        taskStatuses: any;
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
export declare function buildGroupPostCompactCleanupAudit(input?: any): any;
export declare function buildGroupPartialCompactSidecarSegment(input: any): {
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
        status: "failed" | "degraded" | "pass";
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
            taskStatuses: number;
            invokedSkillSingleTokens: any;
            invokedSkillsTotalTokens: any;
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
    factAnchors: FactAnchor[];
    persistentRequirements: FactAnchor[];
    rawTranscriptPath: any;
    rawTranscriptUnmodified: boolean;
    reason: string;
    createdAt: any;
};
export declare function mergeGroupPartialCompactSegments(existing?: any[], incoming?: any, limit?: number): any[];
export declare function buildPartialSidecarOnlyMemory(input: any): any;
export declare function memorySeed(memory: any): {
    completed: any;
    blocked: any;
    decisions: any;
};
export declare function buildDeterministicConversationSummary(messages: any[], memory: any, previous?: any): ConversationSummary;
export declare function normalizeSummary(value: any, fallback: ConversationSummary): ConversationSummary;
export declare function renderConversationSummary(summary: any, maxChars?: number): string;
export declare function buildBoundedRecentGroupContext(messages: any[], fullCount?: number): string;
export declare function buildGroupTruePostCompactPayloadBudget(input?: any): {
    payload_checksum: string;
    schema: string;
    version: number;
    group_id: string;
    group_session_id: string;
    trigger_tokens: number;
    true_post_compact_token_count: number;
    will_retrigger_next_turn: boolean;
    status: string;
    components: {
        summary: number;
        recent_window: number;
        reinjection: number;
        persistent_memory: number;
        session_memory_restore: number;
        tool_continuity_restore: number;
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
    };
};
