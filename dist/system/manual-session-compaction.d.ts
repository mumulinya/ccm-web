import type { SessionCompactionScope } from "./session-compaction-core";
export type CcmManualCompactionRequestV2 = {
    schema: "ccm-manual-compaction-request-v2";
    scope: SessionCompactionScope;
    exactSessionId: string;
    trigger: "manual" | "auto" | "prompt_too_long";
    mode: "full" | "partial";
    pivotMessageId?: string;
    direction?: "up_to" | "from";
    customInstructions?: string;
    expectedGeneration: number;
    expectedPayloadChecksum: string;
};
export type CcmPartialCompactionProjectionV2 = {
    schema: "ccm-partial-compaction-projection-v2";
    mode: "partial";
    direction: "up_to" | "from";
    pivotMessageId: string;
    pivotIndex: number;
    safeBoundaryIndex: number;
    summaryPlacement: "before_preserved" | "after_preserved";
    summarizedMessageIds: string[];
    preservedMessageIds: string[];
    filteredMessageIds: string[];
    filteredReasons: Record<string, "progress" | "old_boundary" | "old_summary">;
    sourceBoundaryGeneration: number;
    previousBoundaryId: string;
    firstPreservedMessageId: string;
    lastPreservedMessageId: string;
    sourceChecksum: string;
    contentStored: false;
};
export declare function compactionMessageId(message: any, index?: number): string;
export declare function normalizeManualCompactionRequest(input: any, expected: {
    scope: SessionCompactionScope;
    exactSessionId: string;
    generation: number;
    payloadChecksum?: string;
}): CcmManualCompactionRequestV2;
export declare function selectPartialCompactionProjection(messagesInput: any[], request: CcmManualCompactionRequestV2): {
    projection: CcmPartialCompactionProjectionV2;
    summarized: any[];
    preserved: any[];
};
