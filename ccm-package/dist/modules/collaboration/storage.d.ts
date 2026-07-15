export declare function loadGroups(): any[];
export declare function saveGroups(groups: any[]): void;
type GroupMessageAppendHook = (groupId: string, message: any, messages: any[]) => void;
export declare function getGroupChatSessionMessagesFile(groupId: string, sessionId?: string): string;
export declare function listGroupChatSessions(groupId: string): {
    sessions: any[];
    schema: string;
    groupId: string;
    activeSessionId: string;
    updatedAt: string;
};
export declare function getActiveGroupChatSessionId(groupId: string): string;
export declare function resolveWritableGroupChatSession(groupId: string, requestedSessionId?: string, options?: any): any;
export declare function findGroupChatSessionContainingMessage(groupId: string, messageId: string): {
    session: any;
    messages: any[];
};
export declare function createGroupChatSession(groupId: string, title?: string): {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    legacy: boolean;
};
export declare function selectGroupChatSession(groupId: string, sessionId: string): any;
export declare function renameGroupChatSession(groupId: string, sessionId: string, title: string): any;
export declare function archiveGroupChatSession(groupId: string, sessionId: string, archived?: boolean): any;
export declare function findActiveGroupSessionTasks(groupId: string, sessionId: string, tasks?: any[]): any[];
export declare function reconcileGroupSessionLifecycleAgentCancellations(tasks?: any[]): {
    schema: string;
    checked: number;
    active: number;
    revoked: number;
    taskCount: any;
    scopes: any[];
    reconciledAt: string;
};
export declare function deleteGroupChatSession(groupId: string, sessionId: string, options?: any): {
    session: any;
    deletedMessageFile: string;
    postTurnSummaries: {
        deleted: string[];
        deletedCount: number;
    };
    activeTaskCount: number;
    forced: boolean;
    replacement: any;
    lifecycleTombstone: {
        committed: boolean;
        idempotent: boolean;
        head: any;
        file: string;
        journal?: undefined;
        receipt?: undefined;
    } | {
        committed: boolean;
        idempotent: boolean;
        head: any;
        journal: {
            committed: boolean;
            idempotent: boolean;
            record: any;
            file: string;
        };
        receipt: {
            committed: boolean;
            idempotent: boolean;
            receipt: any;
            file: string;
        };
        file: string;
    };
    lifecycleCancellation: {
        schema: string;
        groupId: string;
        groupSessionId: string;
        reason: string;
        actor: string;
        taskIds: string[];
        matchedRunnerRequests: number;
        cancellations: ({
            success: boolean;
            taskId: string;
            killedProcesses: number;
            externalRunnerRequests: number;
            executions: string[];
        } | {
            success: boolean;
            taskId: string;
            error: any;
        })[];
        requestedAt: string;
    };
};
export declare function purgeLegacyDefaultGroupChatSession(groupId: string, options?: any): {
    schema: string;
    groupId: string;
    purged: boolean;
    reason: string;
    legacySessionId?: undefined;
    deletedMessageFile?: undefined;
    activeTaskCount?: undefined;
    forced?: undefined;
    replacement?: undefined;
    activeSessionId?: undefined;
    purgedAt?: undefined;
} | {
    schema: string;
    groupId: string;
    purged: boolean;
    legacySessionId: string;
    deletedMessageFile: string;
    activeTaskCount: number;
    forced: boolean;
    replacement: {
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        messageCount: number;
        legacy: boolean;
    };
    activeSessionId: any;
    purgedAt: string;
    reason?: undefined;
};
export declare function pruneArchivedGroupChatSessions(groupId: string, options?: any): {
    schema: string;
    groupId: string;
    dryRun: boolean;
    retentionDays: number;
    maxArchived: number;
    archivedCount: number;
    candidateCount: number;
    candidates: any[];
    results: ({
        id: any;
        deleted: boolean;
        result: {
            session: any;
            deletedMessageFile: string;
            postTurnSummaries: {
                deleted: string[];
                deletedCount: number;
            };
            activeTaskCount: number;
            forced: boolean;
            replacement: any;
            lifecycleTombstone: {
                committed: boolean;
                idempotent: boolean;
                head: any;
                file: string;
                journal?: undefined;
                receipt?: undefined;
            } | {
                committed: boolean;
                idempotent: boolean;
                head: any;
                journal: {
                    committed: boolean;
                    idempotent: boolean;
                    record: any;
                    file: string;
                };
                receipt: {
                    committed: boolean;
                    idempotent: boolean;
                    receipt: any;
                    file: string;
                };
                file: string;
            };
            lifecycleCancellation: {
                schema: string;
                groupId: string;
                groupSessionId: string;
                reason: string;
                actor: string;
                taskIds: string[];
                matchedRunnerRequests: number;
                cancellations: ({
                    success: boolean;
                    taskId: string;
                    killedProcesses: number;
                    externalRunnerRequests: number;
                    executions: string[];
                } | {
                    success: boolean;
                    taskId: string;
                    error: any;
                })[];
                requestedAt: string;
            };
        };
        error?: undefined;
    } | {
        id: any;
        deleted: boolean;
        error: any;
        result?: undefined;
    })[];
    generatedAt: string;
};
export declare function registerGroupMessageAppendHook(hook: GroupMessageAppendHook): () => boolean;
export declare function resolveGroupMessageSessionId(groupId: string, msg: any, tasks?: any[]): string;
export declare function getGroupMessages(groupId: string, sessionId?: string): any[];
export declare function appendGroupMessage(groupId: string, msg: any): any;
export declare function saveGroupMessages(groupId: string, messages: any[], sessionId?: string): void;
export declare function runGroupChatSessionsSelfTest(): {
    pass: boolean;
    checks: {
        createsIndependentSessionIds: boolean;
        firstSessionContainsOnlyFirstSentinel: boolean;
        secondSessionContainsOnlySecondSentinel: boolean;
        switchingRestoresSelectedSession: boolean;
        messagesCarrySessionIdentity: boolean;
        lateReceiptStaysWithTaskSession: boolean;
        legacyTaskNeverFallsIntoActiveSession: boolean;
        deleteGuardCountsOnlyActiveTasks: boolean;
        renamePersists: boolean;
        archiveSwitchesActiveSession: boolean;
        retentionFindsExpiredArchive: boolean;
        deleteRemovesOnlyTargetSession: boolean;
        lifecycleGenerationTracksArchiveRestore: boolean;
        deletionLeavesDurableTombstone: boolean;
    };
    first: {
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        messageCount: number;
        legacy: boolean;
    };
    second: {
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        messageCount: number;
        legacy: boolean;
    };
    manifest: {
        sessions: any[];
        schema: string;
        groupId: string;
        activeSessionId: string;
        updatedAt: string;
    };
};
export {};
