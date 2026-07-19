export declare function typedMemoryStaleCandidateRejection(scopeId: string, row: any, codes: string[], at: string): {
    checksum: string;
    schema: string;
    version: number;
    rejection_id: string;
    scope_id: string;
    task_id: string;
    execution_id: string;
    task_agent_session_id: string;
    rel_path: string;
    requested_action: string;
    rejection_codes: string[];
    rejected_at: string;
};
export declare function recordGroupTypedMemoryStaleCandidates(groupId: string, input?: any): any;
export declare function verifyTypedMemoryStaleCandidateCurrentSource(candidate: any): {
    valid: boolean;
    status: string;
    observed_checksum?: undefined;
} | {
    valid: boolean;
    status: string;
    observed_checksum: string;
};
export declare function resolveGroupTypedMemoryStaleCandidate(groupId: string, input?: any): {
    event: {
        checksum: string;
        schema: string;
        version: number;
        event_id: string;
        candidate_id: string;
        candidate_checksum: string;
        scope_id: string;
        action: any;
        status: string;
        rel_path: any;
        document_checksum: any;
        replacement_rel_path: string;
        replacement_document_checksum: string;
        actor: string;
        reason: string;
        resolved_at: string;
    };
    candidate: any;
    ledger: any;
};
export declare function buildGroupTypedMemoryRecallFreshness(doc: any, nowMs?: number): {
    schema: string;
    version: number;
    observed_mtime_ms: number;
    observed_at: string;
    evaluated_at: string;
    age_days: number;
    age_label: string;
    stale_after_days: number;
    stale: boolean;
    current_source_verification_required: boolean;
    warning: string;
};
export declare function buildGroupTypedMemoryRecall(groupId: string, query: string, options?: any): any;
export declare function renderGroupTypedMemoryRecall(recall: any): any;
