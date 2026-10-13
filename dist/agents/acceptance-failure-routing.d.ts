/** Structured observations decide repair eligibility; prose is display only. */
export declare function classifyAcceptanceFailure(input?: any): {
    failure_kind: string;
    failed_criteria: {
        criterion: string;
        status: any;
    }[];
    failed_checks: {
        check_id: string;
        exit_code: any;
    }[];
    evidence_refs: unknown[];
    recommended_route: string;
    can_auto_rework: boolean;
    review_cycle: any;
};
