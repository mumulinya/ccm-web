type DeliveryStatus = "done" | "waiting" | "failed";
export declare function formatDeliveryMissingVerification(item: any): string;
export declare function formatDeliveryReworkItem(item: any): string;
export declare function formatDeliveryAssignmentItem(item: any): string;
export declare function buildUserDeliveryReport(task: any, summary: any, status: DeliveryStatus, detail?: string): string;
export declare function buildTaskDeliveryReport(task: any, summary: any, status: DeliveryStatus, detail?: string): {
    schema: string;
    surface: import("../../agents/delivery-report").MainAgentDeliverySurface;
    status: import("../../agents/delivery-report").MainAgentDeliveryStatus;
    status_label: string;
    title: string;
    headline: string;
    sections: {
        id: string;
        title: string;
        items: string[];
    }[];
    user_text: string;
    markdown: string;
    files: string[];
    plan_review: string[];
    planReview: string[];
    verification: string[];
    verification_evidence: {
        schema: string;
        title: string;
        status: string;
        status_label: string;
        metric_value: string;
        metric_detail: string;
        metric_tone: string;
        executed_count: number;
        failed_count: number;
        incomplete_count: number;
        weak_missing_count: number;
        suggested_count: number;
        missing_required_count: number;
        external_runner_count: number;
        required_gate_passed: boolean;
        source_gate_passed: boolean;
        executed: string[];
        failed: string[];
        incomplete: string[];
        weak_missing: string[];
        suggested: string[];
        missing_required: string[];
        items: string[];
        next_action: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    verificationEvidence: {
        schema: string;
        title: string;
        status: string;
        status_label: string;
        metric_value: string;
        metric_detail: string;
        metric_tone: string;
        executed_count: number;
        failed_count: number;
        incomplete_count: number;
        weak_missing_count: number;
        suggested_count: number;
        missing_required_count: number;
        external_runner_count: number;
        required_gate_passed: boolean;
        source_gate_passed: boolean;
        executed: string[];
        failed: string[];
        incomplete: string[];
        weak_missing: string[];
        suggested: string[];
        missing_required: string[];
        items: string[];
        next_action: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    acceptance: string[];
    independent_review: string[];
    independentReview: string[];
    risks: string[];
    next_action: string;
    final_summary_quality: {
        schema: string;
        source: string;
        required: boolean;
        passed: boolean;
        checks: {
            id: string;
            label: string;
            passed: any;
        }[];
        missing: string[];
        technical_default_collapsed: boolean;
    };
    summary_quality: {
        schema: string;
        source: string;
        required: boolean;
        passed: boolean;
        checks: {
            id: string;
            label: string;
            passed: any;
        }[];
        missing: string[];
        technical_default_collapsed: boolean;
    };
    completion_card: {
        schema: string;
        title: string;
        surface: import("../../agents/delivery-report").MainAgentDeliverySurface;
        status: import("../../agents/delivery-report").MainAgentDeliveryStatus;
        status_label: string;
        headline: string;
        metrics: ({
            id: string;
            label: string;
            value: string;
            tone: string;
            detail?: undefined;
        } | {
            id: string;
            label: string;
            value: string;
            detail: string;
            tone?: undefined;
        } | {
            id: string;
            label: string;
            value: any;
            detail: any;
            tone: any;
        })[];
        highlights: string[];
        verification: any;
        verification_evidence: any;
        verificationEvidence: any;
        acceptance: string[];
        risks: string[];
        next_action: string;
        technical_hint: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    completionCard: {
        schema: string;
        title: string;
        surface: import("../../agents/delivery-report").MainAgentDeliverySurface;
        status: import("../../agents/delivery-report").MainAgentDeliveryStatus;
        status_label: string;
        headline: string;
        metrics: ({
            id: string;
            label: string;
            value: string;
            tone: string;
            detail?: undefined;
        } | {
            id: string;
            label: string;
            value: string;
            detail: string;
            tone?: undefined;
        } | {
            id: string;
            label: string;
            value: any;
            detail: any;
            tone: any;
        })[];
        highlights: string[];
        verification: any;
        verification_evidence: any;
        verificationEvidence: any;
        acceptance: string[];
        risks: string[];
        next_action: string;
        technical_hint: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    pickup_summary: {
        schema: string;
        title: string;
        status: import("../../agents/delivery-report").MainAgentDeliveryStatus;
        status_label: string;
        headline: string;
        current_state: string;
        review_items: string[];
        resume_action: string;
        technical_hint: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
        source: import("../../agents/delivery-report").MainAgentDeliverySurface;
    };
    pickupSummary: {
        schema: string;
        title: string;
        status: import("../../agents/delivery-report").MainAgentDeliveryStatus;
        status_label: string;
        headline: string;
        current_state: string;
        review_items: string[];
        resume_action: string;
        technical_hint: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
        source: import("../../agents/delivery-report").MainAgentDeliverySurface;
    };
    user_handoff: {
        schema: string;
        title: string;
        surface: import("../../agents/delivery-report").MainAgentDeliverySurface;
        status: string;
        status_label: string;
        headline: string;
        primary_action: any;
        primaryAction: any;
        secondary_actions: any[];
        secondaryActions: any[];
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
    userHandoff: {
        schema: string;
        title: string;
        surface: import("../../agents/delivery-report").MainAgentDeliverySurface;
        status: string;
        status_label: string;
        headline: string;
        primary_action: any;
        primaryAction: any;
        secondary_actions: any[];
        secondaryActions: any[];
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
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
    technical_details: any[];
    raw_report: any;
};
export declare function buildTaskGroupReportMessage(task: any, status: DeliveryStatus, detail?: string): string;
export {};
