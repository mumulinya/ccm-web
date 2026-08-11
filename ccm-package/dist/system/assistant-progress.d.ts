export type AssistantProgressKind = "before_tools" | "key_finding" | "direction_change" | "blocker" | "rework" | "verification" | "before_summary";
export declare const USER_VISIBLE_PROGRESS_MAX_CHARS = 120;
export declare function normalizeAssistantProgressKind(value: any, fallback?: AssistantProgressKind): AssistantProgressKind;
export declare function sanitizeAssistantProgressText(value: any, max?: number): string;
export declare function assistantProgressToolFamily(nameInput: any): "agent" | "git" | "tool" | "search" | "read" | "knowledge" | "verify";
export declare function buildAssistantProgressFallback(requests: any[], context?: {
    target?: any;
    goal?: any;
}): string;
export type AssistantProgressValidationContext = {
    firstBatch?: boolean;
    hasSuccessfulObservation?: boolean;
    hasFailure?: boolean;
    directionChanged?: boolean;
    attempt?: number;
    verificationActive?: boolean;
    summaryReady?: boolean;
    terminal?: boolean;
};
export declare function validateAssistantProgressKind(value: any, context?: AssistantProgressValidationContext): "verification" | "blocker" | "before_tools" | "key_finding" | "direction_change" | "rework" | "before_summary";
export declare function assistantProgressMilestoneChecksum(input: {
    kind: AssistantProgressKind;
    text: string;
    modelCallIndex: number;
    relatedToolCallIds?: string[];
    batchId?: string;
}): string;
export declare function assistantProgressBatchId(input: {
    turnId?: any;
    generation?: any;
    modelCallIndex?: any;
    relatedToolCallIds?: string[];
}): string;
export declare function assistantProgressNarrationEnabled(config: any): boolean;
