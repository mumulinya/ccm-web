/** Pure shared projection. Callers supply persisted facts, never model-inferred completion. */
export declare function projectUserWorkflow(task: any, facts?: any): {
    revision: string;
    phase: string;
    summary: string;
    waiting_on: string;
    blockers: any[];
    primary_action: string;
    available_actions: string[];
    acceptance_feedback: {
        failure_kind: string;
        failure_kinds: any[];
        failed_criteria: {
            criterion: string;
            status: any;
        }[];
        failed_checks: {
            check_id: string;
            exit_code: any;
            failure_code: string;
            failure_stage: string;
            failure_kind: any;
            reproduction: string;
            expected_summary: string;
            actual_summary: string;
            evidence_refs: string[];
        }[];
        evidence_refs: string[];
        recommended_route: string;
        can_auto_rework: boolean;
        review_cycle: any;
    };
    code_review_summary: any;
    verification_summary: any;
    compatible_action_kinds: string[];
    approval_items: any;
    runtime_continuity: any;
};
/** Existing controls are compatibility projections, never a second decision source. */
export declare function filterUserWorkflowActions(workflow: any, actions: any[]): any[];
export declare function readUserWorkflow(task: any): {
    revision: string;
    phase: string;
    summary: string;
    waiting_on: string;
    blockers: any[];
    primary_action: string;
    available_actions: string[];
    acceptance_feedback: {
        failure_kind: string;
        failure_kinds: any[];
        failed_criteria: {
            criterion: string;
            status: any;
        }[];
        failed_checks: {
            check_id: string;
            exit_code: any;
            failure_code: string;
            failure_stage: string;
            failure_kind: any;
            reproduction: string;
            expected_summary: string;
            actual_summary: string;
            evidence_refs: string[];
        }[];
        evidence_refs: string[];
        recommended_route: string;
        can_auto_rework: boolean;
        review_cycle: any;
    };
    code_review_summary: any;
    verification_summary: any;
    compatible_action_kinds: string[];
    approval_items: any;
    runtime_continuity: any;
};
