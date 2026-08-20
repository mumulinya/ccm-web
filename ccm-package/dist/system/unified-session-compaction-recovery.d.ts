import { type UnifiedCompactionScope } from "./unified-session-compaction";
import type { CcmUnifiedSessionSummaryV1, UnifiedCompactionSnapshot } from "./unified-session-compaction-types";
export declare function buildUnifiedRecoveryAttachment(input: {
    snapshot: UnifiedCompactionSnapshot;
    summary: CcmUnifiedSessionSummaryV1;
}): {
    schema: string;
    scope: UnifiedCompactionScope;
    exactSessionId: string;
    unifiedRecoveryContext: import("./unified-session-compaction").UnifiedRecoveryContext;
    provider: {
        provider: string;
        model: string;
        checksum: string;
    };
    skills: any;
    mcp: any;
    attachmentReferences: string[];
    contentStored: boolean;
    checksum: string;
};
export declare function verifyUnifiedRecoveryAttachment(value: any, expected?: {
    scope?: UnifiedCompactionScope;
    exactSessionId?: string;
}): {
    valid: boolean;
    issues: string[];
};
