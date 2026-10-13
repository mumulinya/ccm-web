export declare function prepareDispatchPolicyUpgrade(task: any, updates: any): {
    acceptance_policy_snapshot?: import("./task-acceptance-policy").TaskAcceptancePolicySnapshotV3;
    acceptance_mode?: import("./task-acceptance-policy").TaskAcceptanceMode;
    test_agent_enabled?: boolean;
    acceptance_level?: import("./task-acceptance-policy").TaskAcceptanceLevel;
    acceptance_route?: import("./task-acceptance-policy").TaskAcceptanceRoute;
    acceptance_reasons?: string[];
    task_spec?: import("./task-workflow-model").TaskSpecV1;
    dispatch_profile: import("../../agents/dispatch-profile").DispatchProfile;
    dispatch_profile_snapshot: import("../../agents/dispatch-profile").DispatchProfileSnapshot;
    workflow_policy_snapshot: import("./task-workflow-model").TaskExecutionPolicy;
    rework_max_rounds: number;
};
export declare function auditDispatchPolicyUpgrade(task: any, previous: any): void;
