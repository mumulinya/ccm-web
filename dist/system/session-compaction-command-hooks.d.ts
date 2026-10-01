import type { SessionCompactionHookPhase } from "./session-compaction-core";
export type CcmSessionCompactionHookConfigV1 = {
    id: string;
    name: string;
    phase: SessionCompactionHookPhase;
    scope: "global" | "group" | "project";
    scopeId?: string;
    triggers: Array<"manual" | "auto" | "prompt_too_long">;
    projectId?: string;
    command: string;
    timeoutMs: number;
    enabled: boolean;
};
export declare function listSessionCompactionCommandHooks(filter?: {
    scope?: string;
    scopeId?: string;
}): CcmSessionCompactionHookConfigV1[];
export declare function saveSessionCompactionCommandHook(input: any): CcmSessionCompactionHookConfigV1;
export declare function deleteSessionCompactionCommandHook(idInput: string): {
    deleted: boolean;
    id: string;
};
export declare function readSessionCompactionCommandHookReceipts(scopeInput: string, sessionIdInput: string): any;
export declare function projectSessionCompactionHookResults(input: any): {
    schema: string;
    phase: string;
    scope: string;
    sessionId: string;
    status: string;
    reason: string;
    results: any;
    contentStored: boolean;
}[];
export declare function runConfiguredSessionCompactionCommandHooks(phase: SessionCompactionHookPhase, input: any): Promise<{
    schema: string;
    phase: SessionCompactionHookPhase;
    scope: any;
    sessionId: string;
    status: string;
    results: any[];
    customInstructions: string;
    contentStored: boolean;
}>;
export declare function inspectSessionCompactionHookCommand(command: string): {
    file: string;
    args: string[];
    safe: boolean;
    reason?: undefined;
} | {
    safe: boolean;
    reason: string;
};
