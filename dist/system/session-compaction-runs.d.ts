export type SessionCompactionRunScope = "global" | "group" | "project";
export type SessionCompactionRun = {
    scope: SessionCompactionRunScope;
    exactSessionId: string;
    runId: string;
    reason: string;
    startedAt: string;
    updatedAt: string;
    stage: string;
    committed: boolean;
    controller: AbortController;
    detachExternalSignal?: () => void;
};
export declare function throwIfSessionCompactionAborted(signal?: AbortSignal | null): void;
export declare function startSessionCompactionRun(input: {
    scope: SessionCompactionRunScope;
    exactSessionId: string;
    runId?: string;
    reason?: string;
    signal?: AbortSignal | null;
}): {
    run: SessionCompactionRun;
    reused: boolean;
};
export declare function updateSessionCompactionRun(scope: SessionCompactionRunScope, exactSessionId: string, runId: string, updates: {
    stage?: string;
    committed?: boolean;
}): SessionCompactionRun;
export declare function finishSessionCompactionRun(scope: SessionCompactionRunScope, exactSessionId: string, runId: string): boolean;
export declare function cancelSessionCompactionRun(input: {
    scope: SessionCompactionRunScope;
    exactSessionId: string;
    runId?: string;
    reason?: string;
}): {
    success: boolean;
    cancelled: boolean;
    status: string;
    committed: boolean;
    compactionRunId: string;
};
export declare function getSessionCompactionRunActivity(scope: SessionCompactionRunScope, exactSessionId: string): {
    active: boolean;
    status: string;
    stage: string;
    reason: string;
    startedAt: string;
    updatedAt: string;
    compactionRunId: string;
    committed: boolean;
    cancellable: boolean;
    contentStored: boolean;
};
export declare function cancelAllSessionCompactionRuns(reason?: string): {
    cancelled: number;
    compactionRunIds: string[];
    contentStored: false;
};
