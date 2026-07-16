export declare function createGlobalAgentDirectDispatchRuntime(deps: any): {
    GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN: RegExp;
    sanitizeGlobalDirectAgentOutput: (value: any, fallback?: string, max?: number) => any;
    formatGlobalDevelopmentDispatchVisibleResult: (result?: any, params?: any) => string;
    formatGlobalTaskDispatchVisibleResult: (result?: any, params?: any) => string;
    resolveGlobalDispatchProject: (project: string) => {
        project: string;
        config: any;
        workDir: any;
        agentType: any;
        platform: any;
    };
    inferGlobalDirectDispatchRequiresCodeChanges: (message: string) => boolean;
    buildGlobalDirectDispatchHandoff: (input: {
        kind: "group" | "project";
        message: string;
        originalText?: string;
        project?: string;
        group?: any;
        targetProject?: string;
        traceId?: string;
    }) => {
        handoff: any;
        summary: any;
        runtime: {
            project: string;
            config: any;
            workDir: any;
            agentType: any;
            platform: any;
        };
    };
    buildGlobalSingleProjectMissionPayload: (input: {
        project: string;
        message: string;
        originalText?: string;
        traceId?: string;
        globalRunId?: string;
        sessionId?: string;
        source?: string;
        idempotencyKey?: string;
    }) => {
        title: any;
        business_goal: string;
        acceptance: string;
        targets: {
            type: string;
            project: string;
            task: string;
            reason: string;
            requires_code_changes: boolean;
            requires_verification: boolean;
            requires_independent_review: boolean;
        }[];
        requires_code_changes: boolean;
        requires_verification: boolean;
        requires_independent_review: boolean;
        auto_execute: boolean;
        source: string;
        trace_id: string;
        global_run_id: string;
        session_id: string;
        idempotency_key: string;
        single_project_supervision: {
            schema: string;
            project: string;
            group_orchestration_required: boolean;
            global_agent_review_owner: boolean;
            test_agent_owner: string;
            independent_review_required: boolean;
            post_review_spot_check_required: boolean;
        };
    };
    renderGlobalDirectGroupWorkOrder: (input: {
        group: any;
        targetProject: string;
        message: string;
        originalText?: string;
        handoff: any;
    }) => string;
    renderGlobalDirectProjectWorkOrder: (input: {
        project: string;
        message: string;
        originalText?: string;
        handoff: any;
    }) => string;
    renderGlobalDirectGroupDispatchAcceptedSummary: (input: {
        group?: any;
        groupId?: string;
        taskId?: string;
        queueText?: string;
        reply?: string;
    }) => string;
};
