export type CcmVisibleContextCompactionState = "running" | "completed" | "failed" | "cancelled";
export type CcmVisibleContextCompactionTrigger = "automatic" | "manual" | "prompt_too_long";
export type ContextCompactionLifecycleInput = {
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    compactionRunId: string;
    trigger: CcmVisibleContextCompactionTrigger;
    mode?: "full" | "partial";
    turnId?: string;
    taskId?: string;
    generation?: number;
    attempt?: number;
    anchorMessageId?: string;
};
export type ContextCompactionLifecycleUpdate = Partial<Pick<ContextCompactionLifecycleInput, "mode" | "turnId" | "taskId" | "generation" | "attempt" | "anchorMessageId">> & {
    state: CcmVisibleContextCompactionState;
    stage?: string;
    beforeTokens?: number;
    afterTokens?: number;
    errorCode?: string;
};
/** `force` is also used for pressure recovery; only an authoritative manual
 * reason may be projected as a user `/compact` operation. */
export declare function resolveContextCompactionTrigger(input?: {
    promptTooLong?: boolean;
    force?: boolean;
    reason?: string;
}): CcmVisibleContextCompactionTrigger;
export declare function publishContextCompactionLifecycle(input: ContextCompactionLifecycleInput, update: ContextCompactionLifecycleUpdate): import("./user-visible-agent-events").UserVisibleAgentEvent;
