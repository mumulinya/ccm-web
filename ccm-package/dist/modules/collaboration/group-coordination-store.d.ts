export type GroupCoordinationRequestKind = "information" | "implementation" | "review" | "risk";
export type GroupCoordinationRequestStatus = "submitted" | "triaged" | "waiting_agent" | "work_item_created" | "executing" | "needs_user" | "evidence_review" | "merging" | "merge_conflict" | "resolved" | "resumed" | "failed" | "timeout" | "cancelled";
export interface GroupCoordinationContext {
    schema?: "ccm-group-coordination-context-v1";
    groupId: string;
    taskId: string;
    groupSessionId?: string;
    sourceProject: string;
    sourceAgentType?: string;
    sourceTaskAgentSessionId?: string;
    sourceNativeSessionId?: string;
    sourceWorkDir?: string;
    role?: "child_agent";
}
export interface GroupCoordinationRequestInput {
    kind?: GroupCoordinationRequestKind;
    summary?: string;
    question?: string;
    reason?: string;
    blocking?: boolean;
    requiredCapabilities?: string[];
    targetHint?: string;
    evidence?: string[];
    acceptanceCriteria?: string[];
    requestedWritePaths?: string[];
    idempotencyKey?: string;
    metadata?: any;
}
export interface GroupCoordinationRequestRecord {
    schema: "ccm-group-coordination-request-v1";
    id: string;
    status: GroupCoordinationRequestStatus;
    kind: GroupCoordinationRequestKind;
    group_id: string;
    task_id: string;
    group_session_id: string;
    source_project: string;
    source_agent_type: string;
    source_task_agent_session_id: string;
    source_native_session_id: string;
    source_work_dir: string;
    summary: string;
    question: string;
    reason: string;
    blocking: boolean;
    required_capabilities: string[];
    target_hint: string;
    evidence: string[];
    acceptance_criteria: string[];
    requested_write_paths: string[];
    idempotency_key: string;
    coordinator_claim_id: string;
    work_item_task_id: string;
    resolution: any;
    metadata: any;
    audit: Array<{
        at: string;
        type: string;
        detail: string;
    }>;
    created_at: string;
    updated_at: string;
}
export declare function submitGroupCoordinationRequest(contextInput: GroupCoordinationContext, input: GroupCoordinationRequestInput): {
    record: GroupCoordinationRequestRecord;
    deduplicated: boolean;
};
export declare function listGroupCoordinationRequests(query?: Partial<GroupCoordinationContext> & {
    statuses?: GroupCoordinationRequestStatus[];
}): GroupCoordinationRequestRecord[];
export declare function claimSubmittedGroupCoordinationRequests(contextInput: GroupCoordinationContext, claimId: string): GroupCoordinationRequestRecord[];
export declare function updateGroupCoordinationRequest(id: string, patch: Partial<GroupCoordinationRequestRecord> & {
    auditType?: string;
    auditDetail?: string;
}): GroupCoordinationRequestRecord;
export declare function getGroupCoordinationStoreDiagnostics(): {
    schema: string;
    file: string;
    total: number;
    open: number;
    by_status: {
        [k: string]: number;
    };
};
