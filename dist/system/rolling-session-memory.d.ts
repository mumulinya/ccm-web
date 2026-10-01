import type { SessionCompactionScope } from "./session-compaction-core";
import type { CcmSessionMemoryTokenBasisV1 } from "./session-memory-token-basis";
import type { CcmUnifiedSessionSummaryV1, UnifiedCompactionSnapshot } from "./unified-session-compaction-types";
export type CcmRollingSessionMemoryV1 = {
    schema: "ccm-rolling-session-memory-v1";
    scope: SessionCompactionScope;
    exactSessionId: string;
    generation: number;
    summarizedThroughMessageId: string;
    summarizedMessageCount: number;
    tokensAtLastExtraction: number;
    toolCallsAtLastExtraction: number;
    tokenBasis?: CcmSessionMemoryTokenBasisV1;
    summary: CcmUnifiedSessionSummaryV1;
    summaryChecksum: string;
    sourceMessageIds: string[];
    provider: string;
    model: string;
    updatedAt: string;
    checksum: string;
    sourceContentStored: false;
    extractionCore: "ccm_shared";
};
type RollingMemoryModelCall = (input: {
    system: string;
    user: string;
    maxOutputTokens: number;
    attempt: number;
    scope: SessionCompactionScope;
    exactSessionId: string;
}) => Promise<any>;
export declare function buildCcmRollingSessionMemoryV1(input: {
    scope: SessionCompactionScope;
    exactSessionId: string;
    generation?: number;
    summary: any;
    messages: any[];
    cadence?: any;
    provider?: string;
    model?: string;
}): CcmRollingSessionMemoryV1;
export declare function finalizeSharedRollingSessionMemory(input: {
    scope: SessionCompactionScope;
    exactSessionId: string;
    generation?: number;
    summary: any;
    messages: any[];
    summarizedThroughMessageId: string;
    cadence?: any;
    provider?: string;
    model?: string;
}): CcmRollingSessionMemoryV1;
export declare function validateCcmRollingSessionMemoryV1(value: any, input: {
    scope: SessionCompactionScope;
    exactSessionId: string;
    generation?: number;
    messages?: any[];
    requiredThroughIndex?: number;
}): {
    valid: boolean;
    issues: string[];
    memory: CcmRollingSessionMemoryV1;
    cursorIndex: number;
};
export declare function selectRollingSessionMemoryForCompaction(value: any, snapshot: UnifiedCompactionSnapshot, requiredThroughIndex: number): {
    valid: boolean;
    issues: string[];
    memory: CcmRollingSessionMemoryV1;
    cursorIndex: number;
};
export declare function runRollingSessionMemoryExtraction(input: {
    scope: SessionCompactionScope;
    exactSessionId: string;
    generation?: number;
    messages: any[];
    executionEvents?: any[];
    previous?: CcmRollingSessionMemoryV1 | null;
    cadence?: any;
    modelCall: RollingMemoryModelCall;
    reason?: string;
}): Promise<CcmRollingSessionMemoryV1>;
export {};
