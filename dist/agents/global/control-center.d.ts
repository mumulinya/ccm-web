type Severity = "ok" | "warn" | "error";
export declare function classifyGlobalControlIntent(_message: string, resources?: any): {
    route: "ambiguous" | "system_health" | "development_dispatch" | "system_management" | "ordinary_question";
    confidence: number;
    reason: any;
    recommended_tool: any;
    matched_projects: any;
    matched_groups: any;
    dry_run: {
        will_execute: boolean;
        requires_confirmation: boolean;
        needs_clarification: boolean;
        safe_default: boolean;
    };
};
export declare function buildGlobalDispatchStrategy(_message: string, resources?: any): {
    mode: any;
    confidence: number;
    targets: any;
    missing: any;
    instruction: any;
};
export declare function buildGlobalSystemHealth(resources?: any): {
    severity: Severity;
    score: number;
    rows: {
        detail: string;
        id: string;
        label: string;
        severity: string;
        summary: string;
    }[];
    counts: {
        projects: any;
        groups: any;
        active_tasks: any;
        failed_tasks: any;
        supervisors: any;
        missions: any;
        cron_jobs: any;
        mcp_tools: any;
        skills: any;
    };
};
export declare function buildGlobalGovernanceSnapshot(): {
    tools: import("./runtime").GlobalAgentToolDefinition[];
    summary: {
        tools: number;
        high_risk_tools: number;
        permission_rules: number;
        deny_rules: number;
        allow_rules: number;
        hooks: number;
        blocking_hooks: number;
    };
    high_risk_tools: string[];
    permissions: import("./runtime").GlobalAgentPermissionRule[];
    hooks: import("./runtime").GlobalAgentHookRule[];
};
export declare function buildGlobalSupervisionDashboard(resources?: any): {
    total: any;
    rows: any;
};
export declare function buildGlobalControlCenterSnapshot(message?: string): {
    updated_at: string;
    intent: {
        route: string;
        confidence: number;
        reason: string;
        recommended_tool: string;
    };
    dispatch: {
        mode: string;
        targets: any[];
        reason: string;
    };
    health: {
        severity: Severity;
        score: number;
        rows: {
            detail: string;
            id: string;
            label: string;
            severity: string;
            summary: string;
        }[];
        counts: {
            projects: any;
            groups: any;
            active_tasks: any;
            failed_tasks: any;
            supervisors: any;
            missions: any;
            cron_jobs: any;
            mcp_tools: any;
            skills: any;
        };
    };
    governance: {
        tools: import("./runtime").GlobalAgentToolDefinition[];
        summary: {
            tools: number;
            high_risk_tools: number;
            permission_rules: number;
            deny_rules: number;
            allow_rules: number;
            hooks: number;
            blocking_hooks: number;
        };
        high_risk_tools: string[];
        permissions: import("./runtime").GlobalAgentPermissionRule[];
        hooks: import("./runtime").GlobalAgentHookRule[];
    };
    supervision: {
        total: any;
        rows: any;
    };
};
export declare function runGlobalControlCenterSelfTest(): {
    pass: boolean;
    checks: {
        developmentRoutesToDispatch: boolean;
        healthFindsWarningsAndErrors: boolean;
        dispatchFindsGroupAndProject: any;
        governanceHasTools: boolean;
    };
    intent: {
        route: "ambiguous" | "system_health" | "development_dispatch" | "system_management" | "ordinary_question";
        confidence: number;
        reason: any;
        recommended_tool: any;
        matched_projects: any;
        matched_groups: any;
        dry_run: {
            will_execute: boolean;
            requires_confirmation: boolean;
            needs_clarification: boolean;
            safe_default: boolean;
        };
    };
    health: {
        severity: Severity;
        score: number;
        rows: {
            detail: string;
            id: string;
            label: string;
            severity: string;
            summary: string;
        }[];
        counts: {
            projects: any;
            groups: any;
            active_tasks: any;
            failed_tasks: any;
            supervisors: any;
            missions: any;
            cron_jobs: any;
            mcp_tools: any;
            skills: any;
        };
    };
    dispatch: {
        mode: any;
        confidence: number;
        targets: any;
        missing: any;
        instruction: any;
    };
};
export {};
