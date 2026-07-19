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
