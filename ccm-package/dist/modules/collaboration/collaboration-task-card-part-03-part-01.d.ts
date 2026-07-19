export declare function buildUserAcceptanceReview(task: any, summary?: any, executions?: any[], phase?: string): {
    title: string;
    pass: boolean;
    status: string;
    headline: string;
    checks: any[];
    missing: any[];
    next_action: string;
    technical: {
        raw_gate_checks: any;
    };
};
export declare function planAlignmentEvidenceLabels(summary?: any, task?: any): {
    files: string[];
    verification: string[];
    receipts: any[];
    assignments: any;
};
export declare function planCriterionStatus(criterion: string, summary?: any, task?: any, acceptanceReview?: any): {
    ok: boolean;
    evidence: any[];
    detail: string;
};
export declare function buildUserPlanAlignmentReview(task: any, summary?: any, phase?: string, planMode?: any, workOrderPreview?: any, acceptanceReview?: any): {
    schema: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    checks: any[];
    deviations: {
        id: any;
        label: any;
        reason: any;
    }[];
    next_action: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
    };
};
export declare function buildUserHandoffSummary(task: any, summary?: any, phase?: string, nextAction?: string, blockers?: string[], acceptanceReview?: any, planAlignment?: any, changeSummary?: any): {
    schema: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    primary_action: any;
    secondary_actions: any[];
    summary_cards: {
        id: string;
        label: string;
        value: string;
        tone: string;
    }[];
    evidence: string[];
    unresolved: string[];
    next_action: any;
    technical_hint: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
};
