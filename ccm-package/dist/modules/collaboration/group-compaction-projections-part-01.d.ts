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
