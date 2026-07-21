import type { MainAgentWorkchainInput, MainAgentWorkchainSurface } from "./workchain-part-01-part-01";
import { collectCompletionEvidence } from "./workchain-part-01-part-01";
export declare function buildWorkchainTodoPlan(input: MainAgentWorkchainInput, stages: any[], evidence: ReturnType<typeof collectCompletionEvidence>, terminal: boolean, options?: {
    qualityFollowup?: any;
}): {
    schema: string;
    source: string;
    title: string;
    surface: MainAgentWorkchainSurface;
    mode: string;
    task_id: string;
    run_id: string;
    mission_id: string;
    steps: any[];
    current_step: any;
    currentStep: any;
    completed_count: number;
    total_count: number;
    progress_label: string;
    visible_steps: any[];
    visibleSteps: any[];
    archived_steps_count: number;
    archivedStepsCount: number;
    archive_summary: string;
    archiveSummary: string;
    quality_followup_required: boolean;
    qualityFollowupRequired: boolean;
    quality_followup: any;
    qualityFollowup: any;
    verification_nudge: boolean;
    verification_reminder: {
        schema: string;
        status: string;
        title: string;
        headline: string;
        reason: string;
        next_action: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    verificationReminder: {
        schema: string;
        status: string;
        title: string;
        headline: string;
        reason: string;
        next_action: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    display_policy: {
        user_visible: boolean;
        hide_for_ordinary_conversation: boolean;
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        quiet_completed: boolean;
        archive_completed_todo: boolean;
        archiveCompletedTodo: boolean;
        archived_when_complete: boolean;
        archivedWhenComplete: boolean;
        visible_when_completed: boolean;
        visibleWhenCompleted: boolean;
        max_visible_steps: number;
    };
};
export declare function buildMainAgentProgressCheckpoints(input: MainAgentWorkchainInput, stages: any[], evidence: ReturnType<typeof collectCompletionEvidence>, options?: {
    qualityFollowup?: any;
}): {
    schema: string;
    title: string;
    display_policy: {
        user_visible: boolean;
        hide_for_ordinary_conversation: boolean;
        raw_events_default_collapsed: boolean;
    };
    items: any[];
};
export declare function stageStatus(input: MainAgentWorkchainInput, stage: string): "in_progress" | "pending" | "completed" | "cancelled" | "failed" | "needs_confirmation";
export declare function terminalWorkchain(input: MainAgentWorkchainInput): boolean;
export declare function collectWorkchainVisibleQualityText(value: any, depth?: number): string[];
export declare function buildFinalSummaryQuality(input: MainAgentWorkchainInput, evidence: ReturnType<typeof collectCompletionEvidence>, terminal: boolean, headline: string, nextAction: string, options?: {
    todoPlan?: any;
    progressCheckpoints?: any;
}): {
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
