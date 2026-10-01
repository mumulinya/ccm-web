import type { CcmCanonicalContextAccountingReceiptV2 } from "./canonical-context-accounting";
import type { SessionCompactionScope } from "./session-compaction-core";
export type CcmSessionMemoryTokenBasisV1 = {
    schema: "ccm-session-memory-token-basis-v1";
    scope: SessionCompactionScope;
    exactSessionId: string;
    scopeId: string;
    generation: number;
    boundaryGeneration: number;
    payloadChecksum: string;
    tokens: number;
    source: "provider_reported" | "canonical_payload_estimate";
    measuredAt: string;
    contentStored: false;
};
export declare function selectCanonicalSessionMemoryTokenBasis(receipt: CcmCanonicalContextAccountingReceiptV2 | null | undefined, expected: {
    scope: SessionCompactionScope;
    scopeId?: string;
    exactSessionId: string;
    generation?: number;
    boundaryGeneration?: number;
    payloadChecksum?: string;
}): {
    valid: boolean;
    issues: string[];
    basis: any;
} | {
    valid: boolean;
    issues: any[];
    basis: CcmSessionMemoryTokenBasisV1;
};
