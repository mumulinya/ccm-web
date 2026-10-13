export declare function buildDispatchProjection(task: any, executions?: any[]): {
    dispatch_profile?: undefined;
    dispatch_diagnostic?: undefined;
    profile_reason?: undefined;
    required_gates?: undefined;
    verification_mode?: undefined;
    worktree_mode?: undefined;
    scope_expansion_state?: undefined;
    delivery_approvals?: undefined;
    rework_round?: undefined;
    rework_max_rounds?: undefined;
    rework_remaining_rounds?: undefined;
} | {
    dispatch_profile: any;
    dispatch_diagnostic: string;
    profile_reason?: undefined;
    required_gates?: undefined;
    verification_mode?: undefined;
    worktree_mode?: undefined;
    scope_expansion_state?: undefined;
    delivery_approvals?: undefined;
    rework_round?: undefined;
    rework_max_rounds?: undefined;
    rework_remaining_rounds?: undefined;
} | {
    dispatch_profile: any;
    profile_reason: any;
    required_gates: any;
    verification_mode: any;
    worktree_mode: any;
    scope_expansion_state: any;
    delivery_approvals: {
        approvalId: any;
        runId: any;
        status: any;
        actionFingerprint: any;
        changedFiles: any;
    }[];
    rework_round: number;
    rework_max_rounds: number;
    rework_remaining_rounds: number;
    dispatch_diagnostic: any;
};
