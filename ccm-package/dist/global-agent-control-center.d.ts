type IntentRoute = "system_health" | "development_dispatch" | "mission_supervision" | "governance" | "system_management" | "ordinary_question" | "ambiguous";
type Severity = "ok" | "warn" | "error";
export declare function classifyGlobalControlIntent(message: string, resources?: any): {
    route: IntentRoute;
    confidence: number;
    reason: string;
    recommended_tool: string;
    matched_projects: any[];
    matched_groups: {
        id: any;
        name: any;
    }[];
    dry_run: {
        will_execute: boolean;
        requires_confirmation: boolean;
        needs_clarification: boolean;
        safe_default: boolean;
    };
};
export declare function buildGlobalDispatchStrategy(message: string, resources?: any): {
    mode: string;
    confidence: number;
    targets: {
        type: string;
        id: any;
        name: any;
        reason: string;
    }[];
    missing: string[];
    instruction: string;
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
    tools: import("./global-agent-runtime").GlobalAgentToolDefinition[];
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
    permissions: import("./global-agent-runtime").GlobalAgentPermissionRule[];
    hooks: import("./global-agent-runtime").GlobalAgentHookRule[];
};
export declare function buildGlobalSupervisionDashboard(resources?: any): {
    total: any;
    rows: any;
};
export declare function buildGlobalControlCenterSnapshot(message?: string): {
    updated_at: string;
    intent: {
        route: IntentRoute;
        confidence: number;
        reason: string;
        recommended_tool: string;
        matched_projects: any[];
        matched_groups: {
            id: any;
            name: any;
        }[];
        dry_run: {
            will_execute: boolean;
            requires_confirmation: boolean;
            needs_clarification: boolean;
            safe_default: boolean;
        };
    };
    dispatch: {
        mode: string;
        confidence: number;
        targets: {
            type: string;
            id: any;
            name: any;
            reason: string;
        }[];
        missing: string[];
        instruction: string;
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
        tools: import("./global-agent-runtime").GlobalAgentToolDefinition[];
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
        permissions: import("./global-agent-runtime").GlobalAgentPermissionRule[];
        hooks: import("./global-agent-runtime").GlobalAgentHookRule[];
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
        dispatchFindsGroupAndProject: boolean;
        governanceHasTools: boolean;
    };
    intent: {
        route: IntentRoute;
        confidence: number;
        reason: string;
        recommended_tool: string;
        matched_projects: any[];
        matched_groups: {
            id: any;
            name: any;
        }[];
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
        mode: string;
        confidence: number;
        targets: {
            type: string;
            id: any;
            name: any;
            reason: string;
        }[];
        missing: string[];
        instruction: string;
    };
};
export {};
