export type MainAgentWorkchainSurface = "group" | "global";
export interface MainAgentWorkchainInput {
    surface: MainAgentWorkchainSurface;
    mode?: string;
    status?: string;
    phase?: string;
    userText?: any;
    goal?: any;
    actionIds?: any[];
    steps?: any[];
    workers?: any[];
    executions?: any[];
    summary?: any;
    completion?: any;
    technical?: any;
    traceId?: string;
    taskId?: string;
    runId?: string;
    missionId?: string;
    supervisorId?: string;
    rawEvents?: any[];
}
export declare function sanitizeWorkchainUserText(value: any, fallback?: string, max?: number): string;
export declare function buildMainAgentWorkchain(input: MainAgentWorkchainInput): {
    schema: string;
    surface: MainAgentWorkchainSurface;
    mode: string;
    status: string;
    phase: string;
    user_visible_text: string;
    stages: {
        id: string;
        label: string;
        status: string;
        summary: string;
    }[];
    progress_checkpoints: {
        schema: string;
        title: string;
        display_policy: {
            user_visible: boolean;
            hide_for_ordinary_conversation: boolean;
            raw_events_default_collapsed: boolean;
        };
        items: any[];
    };
    completion_summary: {
        headline: string;
        evidence: string[];
        files: any[];
        verification: string[];
        risks: string[];
        next_action: any;
        verification_status: string;
        risk_status: string;
        final_summary_quality: {
            schema: string;
            required: boolean;
            passed: boolean;
            checks: {
                id: string;
                label: string;
                passed: boolean;
                detail: string;
            }[];
            missing: string[];
            verification_status: string;
            risk_status: string;
            source: string;
        };
        terminal: boolean;
    };
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        final_summary_required: boolean;
    };
    technical_details: {
        id: string;
        title: string;
        items: any[];
    }[];
};
export declare function formatMainAgentCompletionReply(options: {
    reply?: any;
    workchain: any;
    includeDetails?: boolean;
}): string;
export declare function runMainAgentWorkchainSelfTest(): {
    pass: boolean;
    checks: {
        simpleHasSummary: boolean;
        groupEvidenceVisible: boolean;
        finalSummaryQualityRequired: boolean;
        technicalCollapsedPolicy: boolean;
        noInternalLeakInUserText: boolean;
        replyHasSummary: boolean;
        shapedReplyAddsRequiredSections: boolean;
        ordinaryReplyStaysPlain: boolean;
        traceInTechnical: boolean;
        progressCheckpointsVisible: boolean;
        progressCheckpointsHideRawProtocol: boolean;
    };
    simple: {
        schema: string;
        surface: MainAgentWorkchainSurface;
        mode: string;
        status: string;
        phase: string;
        user_visible_text: string;
        stages: {
            id: string;
            label: string;
            status: string;
            summary: string;
        }[];
        progress_checkpoints: {
            schema: string;
            title: string;
            display_policy: {
                user_visible: boolean;
                hide_for_ordinary_conversation: boolean;
                raw_events_default_collapsed: boolean;
            };
            items: any[];
        };
        completion_summary: {
            headline: string;
            evidence: string[];
            files: any[];
            verification: string[];
            risks: string[];
            next_action: any;
            verification_status: string;
            risk_status: string;
            final_summary_quality: {
                schema: string;
                required: boolean;
                passed: boolean;
                checks: {
                    id: string;
                    label: string;
                    passed: boolean;
                    detail: string;
                }[];
                missing: string[];
                verification_status: string;
                risk_status: string;
                source: string;
            };
            terminal: boolean;
        };
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            final_summary_required: boolean;
        };
        technical_details: {
            id: string;
            title: string;
            items: any[];
        }[];
    };
    group: {
        schema: string;
        surface: MainAgentWorkchainSurface;
        mode: string;
        status: string;
        phase: string;
        user_visible_text: string;
        stages: {
            id: string;
            label: string;
            status: string;
            summary: string;
        }[];
        progress_checkpoints: {
            schema: string;
            title: string;
            display_policy: {
                user_visible: boolean;
                hide_for_ordinary_conversation: boolean;
                raw_events_default_collapsed: boolean;
            };
            items: any[];
        };
        completion_summary: {
            headline: string;
            evidence: string[];
            files: any[];
            verification: string[];
            risks: string[];
            next_action: any;
            verification_status: string;
            risk_status: string;
            final_summary_quality: {
                schema: string;
                required: boolean;
                passed: boolean;
                checks: {
                    id: string;
                    label: string;
                    passed: boolean;
                    detail: string;
                }[];
                missing: string[];
                verification_status: string;
                risk_status: string;
                source: string;
            };
            terminal: boolean;
        };
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            final_summary_required: boolean;
        };
        technical_details: {
            id: string;
            title: string;
            items: any[];
        }[];
    };
    reply: string;
    shapedReply: string;
    ordinaryReply: string;
};
