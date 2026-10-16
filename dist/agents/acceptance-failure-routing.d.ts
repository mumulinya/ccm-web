/** Structured observations decide repair eligibility; prose is display only. */
export declare function classifyAcceptanceFailure(input?: any): {
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
