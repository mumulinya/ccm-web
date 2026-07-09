export type MainAgentDeliverySurface = "group" | "global";
export type MainAgentDeliveryStatus = "done" | "waiting" | "failed" | "cancelled";
export interface MainAgentDeliveryReportInput {
    surface: MainAgentDeliverySurface;
    status?: any;
    title?: any;
    goal?: any;
    detail?: any;
    task?: any;
    run?: any;
    summary?: any;
    report?: any;
    completion?: any;
    workchain?: any;
    technical?: any;
    executed?: boolean;
    ordinaryConversation?: boolean;
}
export declare function sanitizeMainAgentDeliveryText(value: any, fallback?: string, max?: number): string;
export declare function formatDeliveryFileItem(item: any): string;
export declare function shouldShowMainAgentDeliveryReport(input: MainAgentDeliveryReportInput): boolean;
export declare function buildMainAgentDeliveryReport(input: MainAgentDeliveryReportInput): {
    schema: string;
    surface: MainAgentDeliverySurface;
    status: MainAgentDeliveryStatus;
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
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
        status: MainAgentDeliveryStatus;
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
        source: MainAgentDeliverySurface;
    };
    pickupSummary: {
        schema: string;
        title: string;
        status: MainAgentDeliveryStatus;
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
        source: MainAgentDeliverySurface;
    };
    user_handoff: {
        schema: string;
        title: string;
        surface: MainAgentDeliverySurface;
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
        surface: MainAgentDeliverySurface;
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
export declare function formatMainAgentDeliveryReply(report: any): any;
export declare function runMainAgentDeliveryReportSelfTest(): {
    pass: boolean;
    checks: {
        groupHasFriendlySections: boolean;
        groupKeepsFilesReadable: boolean;
        groupHasPlanReview: boolean;
        groupPlanReviewIncludesAcceptedFeedback: boolean;
        globalPlanReviewIncludesAcceptedFeedback: boolean;
        groupFinalSummaryQualityRequiresAcceptedFeedback: boolean;
        globalFinalSummaryQualityRequiresAcceptedFeedback: boolean;
        groupHasAcceptanceConclusion: boolean;
        groupHasVerificationEvidenceQuality: boolean;
        groupHasCompletionCard: boolean;
        groupHasFinalSummaryQualityGate: boolean;
        finalSummaryQualityRequiresVisibleProtocolSanitizer: boolean;
        finalSummaryQualityRequiresVisibleCardSanitizer: boolean;
        visibleCardQualityGateCatchesProtocolLeaks: boolean;
        finalSummaryQualityCatchesFalseDoneForFailedStatus: boolean;
        formattedDeliveryReplyHasRequiredSections: any;
        groupHasPickupSummary: boolean;
        groupHasUserHandoff: boolean;
        globalShowsRiskAndNextAction: boolean;
        globalCompletionCardShowsRisk: boolean;
        globalPickupShowsRisk: boolean;
        globalHasIndependentReviewConclusion: boolean;
        globalHandoffPrioritizesRisk: boolean;
        ordinaryConversationHiddenByPolicy: boolean;
        failedReviewEvidenceShowsByPolicy: boolean;
        failedReportHasRisk: boolean;
        failedPlanReviewShowsGapDetail: boolean;
        failedHandoffPrioritizesPlanGap: boolean;
        failedNextActionPrioritizesPlanGap: boolean;
        explicitNextActionCannotOverridePlanGap: boolean;
        doneWithFailedIndependentReviewPrioritizesRework: boolean;
        explicitNextActionCannotOverrideFailedReview: boolean;
        failedIndependentReviewEvidenceOnlyDonePrioritizesRework: boolean;
        failedVerificationResultDoneBlocksCompletion: boolean;
        failedDeliveryPrimarySummaryAvoidsOptimisticHeadline: boolean;
        partialIndependentReviewDoneBlocksCompletion: boolean;
        weakPassedIndependentReviewDoneBlocksCompletion: boolean;
        weakPassedReviewPrimarySummaryAvoidsOptimisticHeadline: boolean;
        incompleteVerificationResultDoneBlocksCompletion: boolean;
        noVerificationEvidenceDoneBlocksCompletion: boolean;
        failedFinalSummaryQualityRequiresPlanGapNextAction: boolean;
        cancelledReportHasStopSummary: boolean;
        legacyProtocolTextSanitized: boolean;
        noInternalLeak: boolean;
    };
    group: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    global: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    failed: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    cancelled: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    legacy: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    structuredLeakQuality: {
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
    falseDoneFailedQuality: {
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
    failedIndependentReviewEvidenceOnlyDone: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    failedVerificationResultDone: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    partialIndependentReviewDone: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    weakPassedIndependentReviewDone: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    incompleteVerificationResultDone: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
    noVerificationEvidenceDone: {
        schema: string;
        surface: MainAgentDeliverySurface;
        status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            surface: MainAgentDeliverySurface;
            status: MainAgentDeliveryStatus;
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
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        pickupSummary: {
            schema: string;
            title: string;
            status: MainAgentDeliveryStatus;
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
            source: MainAgentDeliverySurface;
        };
        user_handoff: {
            schema: string;
            title: string;
            surface: MainAgentDeliverySurface;
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
            surface: MainAgentDeliverySurface;
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
};
