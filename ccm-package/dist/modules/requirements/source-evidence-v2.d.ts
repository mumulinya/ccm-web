export declare const REQUIREMENT_SOURCE_MANIFEST_SCHEMA = "ccm-requirement-source-manifest-v2";
export declare const REQUIREMENT_SOURCE_COVERAGE_SCHEMA = "ccm-requirement-source-coverage-receipt-v2";
export declare const REQUIREMENT_SOURCE_EVIDENCE_SCHEMA = "ccm-requirement-source-evidence-v2";
export type RequirementSourceChunkV2 = {
    id: string;
    index: number;
    checksum: string;
    token_count: number;
    char_count: number;
    content: string;
};
export type RequirementSourceEvidenceV2 = {
    schema: typeof REQUIREMENT_SOURCE_EVIDENCE_SCHEMA;
    source_id: string;
    source_checksum: string;
    chunk_ids: string[];
    evidence_checksum: string;
};
export declare function sourceHash(value: any): string;
export declare function chunkRequirementSource(content: string, sourceId: string, targetTokens?: number): RequirementSourceChunkV2[];
export declare function buildRequirementSourceManifest(source: any): {
    schema: string;
    version: number;
    source_id: string;
    source_type: string;
    name: string;
    kind: string;
    parser: string;
    status: string;
    required: boolean;
    source_checksum: string;
    byte_count: number;
    char_count: number;
    token_count: number;
    chunk_count: number;
    chunks: {
        id: string;
        index: number;
        checksum: string;
        token_count: number;
        char_count: number;
    }[];
    coverage_state: string;
    snapshot_at: string;
    final_url: string;
    error: string;
    checksum: string;
};
export declare function evidenceForSource(source: any): RequirementSourceEvidenceV2;
export declare function buildRequirementCoverageReceipt(sources: any[], extractionFailures?: string[]): {
    checksum: string;
    schema: string;
    version: number;
    generated_at: string;
    required_source_count: number;
    covered_source_count: number;
    total_tokens: any;
    complete: boolean;
    blocking_sources: any[];
    sources: {
        source_id: any;
        source_checksum: any;
        required: boolean;
        chunk_count: any;
        covered_chunk_count: any;
        coverage_state: string;
        failed_chunk_ids: string[];
    }[];
};
export declare function attachSourceManifests(sources: any[]): any[];
export declare function validateSourceEvidence(evidence: any[], sources: any[]): {
    valid: RequirementSourceEvidenceV2[];
    errors: string[];
    complete: boolean;
};
export declare function assertRequirementPlanEvidence(plan: any, manifests: any[], coverageReceipt: any): {
    valid: boolean;
    covered_source_ids: string[];
    checksum: string;
};
