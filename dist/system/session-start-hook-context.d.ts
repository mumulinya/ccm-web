import type { UnifiedCompactionScope } from "./unified-session-compaction";
export type CcmSessionStartHookContextV1 = {
    schema: "ccm-session-start-hook-context-v1";
    scope: "global" | "group" | "project";
    exactSessionId: string;
    compactionRunId: string;
    hookIds: string[];
    contextChecksum: string;
    totalCharacters: number;
    appliedToFirstRequest: boolean;
    contentStored: false;
};
export declare function storeSessionStartHookContext(input: {
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    compactionRunId: string;
    generation: number;
    hookResults: any[];
}): CcmSessionStartHookContextV1;
export declare function takeSessionStartHookContext(scope: UnifiedCompactionScope, exactSessionId: string, generation: number): {
    projection: {
        appliedToFirstRequest: boolean;
        schema: "ccm-session-start-hook-context-v1";
        scope: "global" | "group" | "project";
        exactSessionId: string;
        compactionRunId: string;
        hookIds: string[];
        contextChecksum: string;
        totalCharacters: number;
        contentStored: false;
    };
    text: string;
};
export declare function clearSessionStartHookContext(scope: UnifiedCompactionScope, exactSessionId: string): boolean;
export declare function readSessionStartHookContextReceipt(scope: UnifiedCompactionScope, exactSessionId: string): {
    schema: any;
    scope: any;
    exactSessionId: any;
    compactionRunId: string;
    hookIds: any;
    contextChecksum: string;
    totalCharacters: number;
    appliedToFirstRequest: boolean;
    recordedAt: string;
    contentStored: false;
};
