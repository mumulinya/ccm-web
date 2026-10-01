/**
 * Produce the exact object shape that is serialized into model messages.
 * Arrays are intentionally left in their source order because line and search
 * result order is evidence; plain-object keys are sorted for cache stability.
 */
export declare function canonicalModelValue(value: any): any;
export declare function stableModelJson(value: any): string;
export type WorkspaceModelProjection = {
    modelOutput: any;
    auditReceipt: {
        schema: "ccm-workspace-tool-audit-v1";
        sourceChecksum: string;
        modelVisibleChecksum: string;
        originalTokens: number;
        modelVisibleTokens: number;
        strippedFields: string[];
        model_visible_tokens: number;
        audit_only_tokens: number;
        stripped_dynamic_field_count: number;
        stable_model_payload_checksum: string;
        provider_cache_hit_ratio: number | null;
        tool_usage_policy_version?: string;
        search_scope?: string;
        search_scope_explicit?: boolean;
        search_scope_too_broad?: boolean;
        requested_result_count?: number;
        returned_result_count?: number;
        omitted_result_count?: number;
        respect_gitignore?: boolean;
        excluded_directory_count?: number;
        delegation_recommended?: boolean;
        ignore_policy?: "native" | "degraded" | "disabled";
        ignore_degraded_reason?: string;
        contentStored: false;
    };
};
export type WorkspaceModelAuditSummary = {
    model_visible_tokens: number;
    audit_only_tokens: number;
    stripped_dynamic_field_count: number;
    stable_model_payload_checksum: string;
    provider_cache_hit_ratio: number | null;
    tool_count: number;
};
export declare function aggregateWorkspaceModelAuditReceipts(values: any[]): WorkspaceModelAuditSummary;
export declare function projectWorkspaceToolResultForModel(value: any, workspaceToolName?: string): WorkspaceModelProjection;
