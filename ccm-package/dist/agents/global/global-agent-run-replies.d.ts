import type { GlobalAgentDecision, GlobalAgentLoopRuntime, GlobalAgentRun, GlobalAgentRunStatus, GlobalAgentToolRisk } from "./loop";
export declare function nowIso(runtime?: GlobalAgentLoopRuntime): string;
export declare function stripNonExecutionReportSections(value: any): string;
export declare const GLOBAL_USER_SUMMARY_INTERNAL_PATTERN: RegExp;
export declare const GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN: RegExp;
export declare function hasGlobalUserSummaryTechnicalDetails(value: any): boolean;
export declare function compactGlobalUserSummaryText(value: any, fallback?: string, max?: number): string;
export declare function uniqueGlobalStrings(values: any[]): string[];
export declare function sanitizeGlobalVisibleReplyTerminology(value: string): string;
export declare function globalVisibleReplyFallback(status?: GlobalAgentRunStatus): "已受理并进入持续跟踪；最终交付通过验收后，我会再给你完整总结。" | "这次处理没有完成；原因和排障信息已放在技术详情里。" | "本次处理已停止，不会继续执行。" | "我已整理处理结果，技术细节已放入技术详情。";
export declare function buildGlobalVisibleReplyContent(input?: {
    value?: any;
    rawSource?: any;
    fallback?: string;
    status?: GlobalAgentRunStatus;
    max?: number;
}): {
    text: string;
    user_text: string;
    technical_content: string;
    changed: boolean;
    hidden_protocol: boolean;
    hidden_visible_protocol: boolean;
};
export declare function attachGlobalReplyTechnicalContent(target: any, content: any): void;
export declare function getGlobalToolUserLabel(toolName: string): string;
export declare function summarizeGlobalToolTarget(args?: any): string;
export declare function buildGlobalClarificationSummary(input: {
    run: GlobalAgentRun;
    question?: string;
    decision?: any;
    reason?: string;
}): {
    schema: string;
    surface: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    question: string;
    reason: string;
    answer_suggestions: string[];
    next_action: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_todo: boolean;
        show_for_ordinary_conversation: boolean;
    };
    technical: {
        run_id: string;
        trace_id: string;
        phase: import("./loop").GlobalAgentDecisionState;
        source: string;
    };
};
export declare function buildGlobalConfirmationSummary(input: {
    run: GlobalAgentRun;
    pendingTool?: {
        name: string;
        arguments: any;
        risk: GlobalAgentToolRisk;
        signature: string;
    } | null;
    reply?: string;
    decision?: any;
    permission?: any;
}): {
    schema: string;
    surface: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    action: string;
    risk: GlobalAgentToolRisk;
    risk_label: string;
    target: string;
    question: string;
    reason: string;
    answer_suggestions: string[];
    next_action: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_todo: boolean;
        show_for_ordinary_conversation: boolean;
    };
    technical: {
        run_id: string;
        trace_id: string;
        tool: string;
        risk: string;
        signature: string;
        permission_decision: any;
        source: string;
    };
};
export declare function buildGlobalPlanSteps(decision: GlobalAgentDecision, toolName?: string): {
    id: string;
    label: string;
    detail: string;
    status: string;
}[];
export declare function buildGlobalPlanExecutionFollowup(planMode?: any, at?: string, feedback?: string): {
    schema: string;
    status: string;
    title: string;
    headline: string;
    accepted_at: string;
    accepted_feedback: string;
    next_action: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
};
export declare function buildGlobalPlanModeSummary(input: {
    run: GlobalAgentRun;
    decision: GlobalAgentDecision;
    risk: GlobalAgentToolRisk;
    pendingTool?: {
        name: string;
        arguments: any;
        risk: GlobalAgentToolRisk;
        signature: string;
    } | null;
    requiresConfirmation?: boolean;
    confirmationStatus?: string;
}): {
    schema: string;
    title: string;
    mode: string;
    source: string;
    requirement: string;
    action: string;
    steps: {
        id: string;
        label: string;
        detail: string;
        status: string;
    }[];
    risk: {
        level: string;
        summary: string;
        reasons: string[];
    };
    impact_scope: {
        projects: string[];
        areas: string[];
        multi_agent: boolean;
    };
    read_only_exploration: {
        summary: string;
        projects: string[];
        knowledge_used: boolean;
        code_snapshot_used: boolean;
    };
    acceptance: string[];
    permission_boundaries: string[];
    requires_confirmation: boolean;
    auto_continue: boolean;
    confirmation_status: string;
    next_step: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
    generated_at: string;
} | {
    plan_execution_followup: {
        schema: string;
        status: string;
        title: string;
        headline: string;
        accepted_at: string;
        accepted_feedback: string;
        next_action: string;
        display_policy: {
            user_text_first: boolean;
            technical_default_collapsed: boolean;
            hide_internal_protocols: boolean;
            show_for_ordinary_conversation: boolean;
        };
    };
    schema: string;
    title: string;
    mode: string;
    source: string;
    requirement: string;
    action: string;
    steps: {
        id: string;
        label: string;
        detail: string;
        status: string;
    }[];
    risk: {
        level: string;
        summary: string;
        reasons: string[];
    };
    impact_scope: {
        projects: string[];
        areas: string[];
        multi_agent: boolean;
    };
    read_only_exploration: {
        summary: string;
        projects: string[];
        knowledge_used: boolean;
        code_snapshot_used: boolean;
    };
    acceptance: string[];
    permission_boundaries: string[];
    requires_confirmation: boolean;
    auto_continue: boolean;
    confirmation_status: string;
    next_step: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
    generated_at: string;
};
export declare function updateGlobalPlanModeStatus(planMode: any, status: "confirmed" | "completed" | "cancelled" | "failed", at: string, feedback?: string): any;
export declare const GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN: RegExp;
export declare function sanitizeGlobalDispatchVisibleText(value: any, fallback?: string, max?: number): string;
export declare function normalizeDispatchDependency(item: any): string;
export declare function buildGlobalDispatchRow(input: {
    id: string;
    kind: string;
    agent: string;
    role: string;
    task: string;
    reason: string;
    status?: string;
    statusLabel?: string;
    dependsOn?: any[];
}): {
    id: string;
    kind: string;
    agent: string;
    role: string;
    task: string;
    reason: string;
    depends_on: string[];
    status: string;
    status_label: string;
};
export declare function isGlobalDispatchTool(name: any): boolean;
export declare function normalizeGlobalDispatchLaunchRowStatus(target?: any, fallback?: string): {
    status: string;
    label: string;
};
export declare function buildGlobalDispatchLaunchSummary(run: GlobalAgentRun, status: GlobalAgentRunStatus, stepsOverride?: any[]): {
    schema: string;
    source: string;
    title: string;
    count_label: string;
    headline: string;
    rows: any[];
    acceptance: string[];
    next_action: string;
    technical_hint: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
        show_when_plan_archived: boolean;
    };
};
