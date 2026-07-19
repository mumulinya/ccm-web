export declare function buildGroupMemoryDispatchFreshnessGate(input?: any): {
    context_budget: {
        chars: number;
        estimated_tokens: number;
        max_chars: number;
        max_tokens: number;
        reserved_output_tokens: number;
        auto_compact_threshold: number;
        warning_threshold: number;
        blocking_threshold: number;
        pressure: number;
        compact_recommended: boolean;
        boundary: {
            type: string;
            preserved_head_chars: number;
            preserved_tail_chars: number;
        };
    };
    schema: string;
    version: number;
    dispatch_gate_id: string;
    group_id: string;
    target_project: string;
    scope: string;
    generated_at: string;
    status: string;
    memory_ignored: boolean;
    action: string;
    source_manifest: {
        checksum: string;
        status: string;
        entry_count: number;
        typed_doc_count: number;
        latest_mtime: any;
        missing_required: any;
    };
    reload_audit: {
        reason: string;
        original_reason: any;
        should_reload: boolean;
        cache_action: any;
        hook_event: any;
        previous_audit_at: any;
        source_changed: boolean;
        load_plan_changed: boolean;
        source_change_trigger: any;
    };
    receipt_contract: {
        memory_used_should_reference_gate: boolean;
        memory_ignored_should_reference_gate: boolean;
        required_receipt_fields: string[];
    };
};
export declare function recordGroupPostCompactFirstDispatchMarker(groupId: string, input?: any): any;
