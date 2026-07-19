export declare function recordGroupTypedMemoryConsumptionLedger(groupId: string, input?: any): any;
export declare function typedMemoryStaleCandidateLedgerChecksum(candidates: any[], events: any[], rejections: any[], updatedAt: string): string;
export declare function readGroupTypedMemoryStaleCandidateLedger(groupId: string): any;
export declare function writeGroupTypedMemoryStaleCandidateLedger(scopeId: string, input: any): any;
export declare function typedMemoryConsumptionQueryRelevance(entry: any, queryFeatures: any): {
    relevant: boolean;
    concept_coverage: number;
    relation_match: boolean;
};
export declare function buildGroupTypedMemoryConsumptionSummary(groupId: string, options?: any): {
    schema: string;
    version: number;
    group_id: string;
    target_project: string;
    ledger_file: any;
    ledger_checksum_valid: boolean;
    invalid_entry_count: number;
    entry_count: any;
    relevant_entry_count: any;
    stale_entry_count: any;
    proof_verified_entry_count: any;
    downgraded_verified_entry_count: any;
    anomaly_entry_count: any;
    average_evidence_confidence: number;
    rows: any;
    query_concepts: any;
    query_polarities: any;
    query_relations: any;
    half_life_days: number;
    stale_after_days: number;
};
export declare function scoreGroupTypedMemoryConsumptionRecall(doc: any, summary: any): {
    schema: string;
    adjustment: number;
    matched_count: any;
    weighted: {
        [k: string]: number;
    };
    positive_score: number;
    negative_score: number;
    conflict: boolean;
    conflict_ratio: number;
    current_document_checksum: string;
    matched_entries: any;
};
