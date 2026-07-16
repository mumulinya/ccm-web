import { CollabCtx } from "./collaboration";
export declare function getTaskPlanMode(task: any): any;
export declare function buildDispatchLaunchSummary(input: {
    task?: any;
    goal?: any;
    assignments?: any[];
    dispatchPolicy?: any;
    mode?: string;
    taskId?: string;
}): {
    schema: string;
    title: string;
    mode: string;
    task_id: any;
    headline: string;
    rows: {
        id: any;
        agent: string;
        role: string;
        task: string;
        reason: string;
        depends_on: any;
        status: string;
        status_label: string;
    }[];
    acceptance: string[];
    next_action: string;
    technical_hint: string;
    display_policy: {
        user_visible: boolean;
        hide_for_ordinary_conversation: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
    };
};
export declare function buildRevisedPlanModeDraft(planMode?: any, feedback?: string): any;
export declare function buildAcceptedPlanModeDraft(planMode?: any, feedback?: string, acceptedAt?: string): any;
export declare function classifyGroupProjectTaskIntent(message: string, uploadedFiles?: any[]): {
    executable: boolean;
    analysisEligible: boolean;
    kind: string;
    reason: string;
};
export declare function normalizeGroupAgentGatewayTaskIntent(fallback: any, coordinatorResult: any, messageMode?: string): any;
export declare function classifyGroupProjectTaskIntentWithAgent(input: {
    group: any;
    message: string;
    uploadedFiles?: any[];
    isOrchestrated?: boolean;
    messageMode?: string;
    forceProjectTask?: boolean;
    sharedFilesContext?: string;
    groupSessionId?: string;
    group_session_id?: string;
}): Promise<any>;
export declare function shouldUseProjectAnalysisMode(input: {
    isOrchestrated?: boolean;
    messageMode?: string;
    taskIntent?: any;
}): boolean;
export declare function shouldCreatePersistentGroupTask(input: {
    isOrchestrated?: boolean;
    messageMode?: string;
    taskIntent?: any;
    forceProjectTask?: boolean;
}): boolean;
export declare function classifyPlanModeRisk(message: string, group: any, taskIntent?: any, attachmentCount?: number): {
    level: string;
    requiresConfirmation: boolean;
    reasons: string[];
    signals: {
        destructive: boolean;
        migration: boolean;
        crossProject: boolean;
        vague: boolean;
        attachment: boolean;
    };
    summary: string;
    lower: string;
};
export declare function buildPlanModeClarificationQuestions(message: string, risk?: any, selectedProjects?: string[]): any[];
export declare function buildGroupPlanModePreflight(input: {
    group: any;
    message: string;
    ctx: CollabCtx;
    configs?: any[];
    taskIntent?: any;
    attachmentCount?: number;
    coordinatorProject?: string;
}): {
    title: string;
    mode: string;
    source: string;
    coordinator: any;
    group_id: any;
    requirement: string;
    read_only_exploration: {
        summary: string;
        projects: any;
        knowledge_used: boolean;
        code_snapshot_used: boolean;
    };
    steps: {
        id: string;
        label: string;
        detail: string;
        status: string;
    }[];
    impact_scope: {
        areas: string[];
        projects: any;
        multi_agent: boolean;
    };
    risk: {
        level: string;
        requiresConfirmation: boolean;
        reasons: string[];
        signals: {
            destructive: boolean;
            migration: boolean;
            crossProject: boolean;
            vague: boolean;
            attachment: boolean;
        };
        summary: string;
        lower: string;
    };
    acceptance: string[];
    clarification_questions: any[];
    needs_clarification: boolean;
    permission_boundaries: string[];
    sub_agent_work_order_requirements: string[];
    session_strategy: {
        native_resume_first: boolean;
        keep_task_session_until_final_review: boolean;
        fallback: string;
    };
    requires_confirmation: boolean;
    auto_continue: boolean;
    next_step: string;
    generated_at: string;
};
export declare function buildProjectCodeReadOnlySnapshot(project: string, workDir: string, message: string): string;
export declare function buildChildAgentWorkerHandoff(targetProject: string, taskText?: string, options?: any): {
    schema: string;
    handoff_id: string;
    project: string;
    source: string;
    reason: string;
    user_goal: string;
    task: string;
    work_dir: string;
    agent_type: string;
    worker_context_packet: any;
    scope: {
        allowed: string[];
        forbidden: string[];
        expected_files: string[];
        dependencies: {
            project: string;
            reason: string;
        }[];
        continuation: any;
        advisory_only: boolean;
    };
    references: {
        document_findings: string[];
        constraints: string[];
        memory_context: any;
        memory_summary: string;
        contract_injections: any;
        memory_freshness_gate: any;
        post_compact_reinjection_gate: any;
        post_compact_dispatch_marker: any;
        read_plan_revalidation_gate: any;
        global_memory_health_gate: any;
        api_microcompact_native_apply_plan: any;
    };
    verification: {
        required: string;
        hints: string[];
        acceptance: string[];
    };
    done_criteria: string[];
    ack_gate: {
        required: boolean;
        fields: string[];
        rule: string;
    };
    receipt_schema: {
        marker: string;
        required_fields: string[];
        status_values: string[];
    };
    user_summary: {
        label: string;
        text: string;
        completeness: {
            has_goal: boolean;
            has_scope: boolean;
            has_done_criteria: boolean;
            has_receipt_schema: boolean;
            has_ack_gate: boolean;
            has_memory_freshness_gate: boolean;
            has_post_compact_reinjection_gate: boolean;
            has_post_compact_dispatch_marker: boolean;
            has_read_plan_revalidation_gate: boolean;
            has_global_memory_health_gate: boolean;
            has_api_microcompact_native_apply_plan: boolean;
        };
    };
};
export declare function buildQueuedGroupTaskMessage(task: any): string;
