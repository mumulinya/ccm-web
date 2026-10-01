/** Pure recovery-boundary classification. Input must be a verified server ledger. */
export type TaskContextAnchor = {
    taskId: string;
    conversationSessionId: string;
    contextRevision: number;
    lastIncludedMessageId: string;
    lastIncludedMessageSequence: number;
    taskContextChecksum: string;
    executionSessionId: string;
    generation: number;
    attempt: number;
    capturedAt: string;
};
export type SessionEvent = {
    messageId?: string;
    conversationSessionId?: string;
    taskId?: string;
    messageKind?: string;
    sequence?: number;
    createdAt?: string;
    stateBoundary?: boolean;
};
export type ContaminationDecision = {
    status: "clean_resume" | "context_contaminated" | "state_changed" | "blocked";
    reason: string;
    events: Array<{
        sequence: number;
        messageKind: string;
        createdAt: string;
    }>;
    eventCount: number;
    contentStored: false;
};
export declare function detectTaskContextContamination(anchor: TaskContextAnchor, events: SessionEvent[]): ContaminationDecision;
