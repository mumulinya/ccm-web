export type CcmTimelineScope = "global" | "group" | "project" | "feishu";
export type CcmSessionTimelineEventType = "user_message" | "assistant_message" | "tool_use" | "tool_result" | "file_read" | "file_change" | "verification" | "task_started" | "task_attempt_started" | "task_finished" | "task_failed" | "task_interrupted" | "task_cancelled";
export type CcmTaskTimelineCursorV1 = {
    spanId: string;
    exactSessionId: string;
    sequence: number;
    eventChecksum: string;
};
export type CcmTaskContextHeadV1 = {
    taskId: string;
    revision: number;
    checksum: string;
    activeSpanId?: string;
    appliedCursors: CcmTaskTimelineCursorV1[];
    latestSnapshotRevision: number;
    status: "ready" | "drifted" | "locked";
    contentStored: false;
};
export type CcmSessionTimelineEventV2 = {
    schema: "ccm-session-timeline-event-v2";
    sequence: number;
    eventId: string;
    exactSessionId: string;
    scope: CcmTimelineScope;
    type: CcmSessionTimelineEventType;
    taskId?: string;
    workItemId?: string;
    generation?: number;
    attempt?: number;
    leaseId?: string;
    timestamp: string;
    payloadRef?: string;
    idempotencyKey: string;
    previousChecksum: string;
    checksum: string;
    contentStored: false;
};
export type CcmSessionTimelineEventV1 = CcmSessionTimelineEventV2;
export type CcmTaskTimelineSpanV1 = {
    schema: "ccm-task-timeline-span-v1";
    spanId: string;
    taskId: string;
    exactSessionId: string;
    startMarkerId: string;
    startSequence: number;
    endMarkerId?: string;
    endSequence?: number;
    attemptSpans: Array<{
        attempt: number;
        startSequence: number;
        endSequence?: number;
        status: "running" | "success" | "failed" | "blocked" | "interrupted" | "cancelled";
    }>;
    status: "open" | "completed" | "failed" | "blocked" | "interrupted" | "cancelled";
    latestSequence: number;
    summary?: {
        title: string;
        goal: string;
        result: string;
        evidenceIds: string[];
        contentStored: false;
    };
    checksum: string;
    contentStored: false;
};
export type CcmSessionTaskIndexV1 = {
    schema: "ccm-session-task-index-v1";
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    events: CcmSessionTimelineEventV2[];
    taskSpans: CcmTaskTimelineSpanV1[];
    activeTaskId?: string;
    latestSequence: number;
    checksum: string;
    contentStored: false;
};
type TimelineInput = {
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    type: CcmSessionTimelineEventType;
    eventId?: string;
    idempotencyKey?: string;
    taskId?: string;
    workItemId?: string;
    generation?: number;
    attempt?: number;
    leaseId?: string;
    payloadRef?: string;
    timestamp?: string;
    activeTaskId?: string | null;
    span?: CcmTaskTimelineSpanV1;
    contextReason?: string;
    forceSnapshot?: boolean;
    projectContext?: boolean;
};
export declare function emptySessionTaskIndex(input: {
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
}): CcmSessionTaskIndexV1;
export declare function readSessionTaskIndex(input: {
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
}): CcmSessionTaskIndexV1;
export declare function readVerifiedSessionTaskIndex(input: {
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
}): CcmSessionTaskIndexV1;
export declare function drainTaskContextOutbox(limit?: number): {
    published: number;
    pending: number;
};
export declare function enqueueTaskConversationProjectionSync(input: {
    taskId: string;
    taskRevision?: number;
    reason?: string;
    issues?: string[];
}): {
    queued: boolean;
    reason: string;
    taskId?: undefined;
    taskRevision?: undefined;
    contentStored?: undefined;
} | {
    queued: boolean;
    taskId: string;
    taskRevision: number;
    contentStored: boolean;
    reason?: undefined;
};
export declare function appendSessionTimelineEvent(input: TimelineInput): CcmSessionTaskIndexV1;
export declare function persistTaskMutationWithTimelineAtomically(input: {
    task: any;
    position?: number;
    expectedTaskRevision?: number;
    validateStoredTask?: (storedTask: any, storedContext: any | null) => boolean;
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    type: CcmSessionTimelineEventType;
    eventId: string;
    idempotencyKey?: string;
    workItemId?: string;
    generation?: number;
    attempt?: number;
    leaseId?: string;
    payloadRef?: string;
    terminalStatus?: string;
    result?: string;
    evidenceIds?: string[];
    contextReason: string;
    forceSnapshot?: boolean;
    buildContext: (task: any, previousContext: any | null) => any;
}): {
    task: any;
    index: CcmSessionTaskIndexV1;
    span: CcmTaskTimelineSpanV1;
    event: CcmSessionTimelineEventV2;
};
export declare function createTaskStartedTimeline(input: {
    taskId: string;
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    generation?: number;
    attempt?: number;
    workItemId?: string;
    leaseId?: string;
    title?: string;
    goal?: string;
}): {
    index: CcmSessionTaskIndexV1;
    span: CcmTaskTimelineSpanV1;
    event: CcmSessionTimelineEventV2;
};
export declare function persistTaskStartedAtomically(input: {
    task: any;
    position: number;
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    generation?: number;
    attempt?: number;
    workItemId?: string;
    leaseId?: string;
    title?: string;
    goal?: string;
    buildContext: (task: any) => any;
}): {
    task: any;
    index: CcmSessionTaskIndexV1;
    span: CcmTaskTimelineSpanV1;
    event: CcmSessionTimelineEventV2;
};
export declare function createTaskAttemptStartedTimeline(input: {
    taskId: string;
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    attempt: number;
    generation?: number;
    workItemId?: string;
    leaseId?: string;
}): {
    index: CcmSessionTaskIndexV1;
    span: CcmTaskTimelineSpanV1;
    event: CcmSessionTimelineEventV2;
};
export declare function createTaskTerminalTimeline(input: {
    taskId: string;
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    status: string;
    attempt?: number;
    generation?: number;
    workItemId?: string;
    leaseId?: string;
    payloadRef?: string;
    result?: string;
    evidenceIds?: string[];
}): {
    index: CcmSessionTaskIndexV1;
    span: CcmTaskTimelineSpanV1;
    event: CcmSessionTimelineEventV2;
};
export declare function verifySessionTimelineChain(input: {
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
}): {
    valid: boolean;
    issues: string[];
    latestSequence: number;
    headChecksum: string;
    contentStored: boolean;
};
export declare function rebuildTaskContextFromSnapshot(taskId: string): {
    taskId: string;
    contentStored: boolean;
    success: boolean;
    status: string;
    issues: string[];
    context: any;
};
export declare function catchUpTaskContext(taskId: string): {
    success: boolean;
    status: string;
    taskId: string;
    issues: string[];
    contentStored: boolean;
    cursors?: undefined;
} | {
    success: boolean;
    status: string;
    taskId: string;
    contentStored: boolean;
    issues?: undefined;
    cursors?: undefined;
} | {
    success: boolean;
    status: string;
    taskId: string;
    cursors: CcmTaskTimelineCursorV1[];
    contentStored: boolean;
    issues?: undefined;
};
export declare function recoverTaskContextProjectors(): {
    checked: number;
    current: number;
    caughtUp: number;
    drifted: number;
    outbox: {
        published: number;
        pending: number;
    };
    contentStored: boolean;
};
export declare function readTaskContextHead(taskId: string): CcmTaskContextHeadV1 | null;
export declare function snapshotTaskContextForBoundary(taskId: string, reason?: string): {
    success: boolean;
    status: string;
    taskId: string;
    contentStored: boolean;
    revision?: undefined;
    checksum?: undefined;
} | {
    success: boolean;
    status: string;
    taskId: string;
    revision: any;
    checksum: any;
    contentStored: boolean;
};
export declare function projectPriorTaskSummaries(index: CcmSessionTaskIndexV1, currentTaskId?: string): {
    taskId: string;
    status: "open" | "completed" | "failed" | "cancelled" | "blocked" | "interrupted";
    title: string;
    goal: string;
    result: string;
    evidenceIds: string[];
    startSequence: number;
    endSequence: number;
    spanChecksum: string;
    contentStored: boolean;
}[];
export declare function recordSessionTimelineMessage(input: {
    exactSessionId: string;
    scope: CcmTimelineScope;
    scopeId: string;
    role: "user" | "assistant";
    messageId?: string;
    taskId?: string;
    timestamp?: string;
}): CcmSessionTaskIndexV1;
export declare function runSessionTaskTimelineSelfTest(): {
    pass: boolean;
    checks: {
        start: boolean;
        finish: boolean;
        independent: boolean;
        priorProjection: boolean;
        hashChain: boolean;
    };
};
export {};
