/** Compact governance state used by existing task, group and global runtime cards. */
export declare function buildAgentGovernanceProjection(task: any): {
    run_id: string;
    run_status: string;
    runtime_id: string;
    run_started_at: string;
    run_finished_at: string;
    run_recovery_state: string;
    heartbeat_wake_id: string;
    heartbeat_status: string;
    heartbeat_coalesced: boolean;
    activity: {
        eventType: string;
        summary: string;
        actorType: import("./agent-governance-types").ActivityActorType;
        createdAt: string;
    }[];
    pending_approvals: import("./agent-governance-types").AgentApproval[];
    budget_state: {
        incidentId: string;
        policyId: string;
        runId: string;
        taskId: string;
        level: string;
        tokenUsed: number;
        costUsedUsd: number;
        reason: string;
        createdAt: string;
    }[];
    checkout_state: import("./agent-governance-types").AgentTaskCheckout;
    context_reuse: {
        mode: "native_session_delta" | "native_session_full" | "fresh_session";
        cursor: string;
        delta_checksum: string;
        input_tokens: number;
        output_tokens: number;
    };
    artifact_summary: {
        count: number;
        kinds: ("receipt" | "file" | "external" | "diff" | "report" | "test_evidence")[];
    };
    dependency_state: {
        dependencyId: string;
        taskId: string;
        dependsOnTaskId: string;
        relation: "blocks" | "related";
        status: "failed" | "active" | "released";
    }[];
    secret_binding_state: {
        envName: string;
        scope: "agent" | "runtime" | "project" | "run";
        status: "failed" | "revoked" | "injected" | "requested";
    }[];
    consistency: import("./agent-run-consistency").TaskRunConsistencyProjection;
};
