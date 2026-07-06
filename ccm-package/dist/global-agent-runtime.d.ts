import type { GlobalAgentRun, GlobalAgentToolRisk, GlobalAgentToolSpec } from "./global-agent-loop";
type HookPhase = "pre_tool_use" | "post_tool_use";
type PermissionDecision = "allow" | "deny";
type TodoStatus = "pending" | "in_progress" | "blocked" | "done";
export interface GlobalAgentToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    required: string[];
    risk: "read" | "write" | "high" | "dynamic";
    renderer: {
        kind: string;
        title: string;
    };
    permissionScope: string;
}
export interface GlobalAgentPermissionRule {
    id: string;
    tool: string;
    target?: string;
    decision: PermissionDecision;
    risk?: GlobalAgentToolRisk | "dynamic";
    reason?: string;
    actor?: string;
    created_at: string;
    updated_at: string;
    expires_at?: string;
}
export interface GlobalAgentHookRule {
    id: string;
    enabled: boolean;
    phase: HookPhase;
    tool?: string;
    effect: "annotate" | "block";
    message: string;
    actor?: string;
    created_at: string;
    updated_at: string;
}
interface RuntimeTodo {
    id: string;
    text: string;
    status: TodoStatus;
    tool?: string;
    updated_at: string;
}
interface RuntimeRunState {
    run_id: string;
    trace_id: string;
    session_id: string;
    status: string;
    todos: RuntimeTodo[];
    output: any[];
    hooks: any[];
    permissions: any[];
    compaction_boundaries: any[];
    updated_at: string;
}
export declare function buildGlobalAgentToolDefinitions(specs: GlobalAgentToolSpec[]): GlobalAgentToolDefinition[];
export declare function loadGlobalAgentPermissionRules(): GlobalAgentPermissionRule[];
export declare function saveGlobalAgentPermissionRule(input: Partial<GlobalAgentPermissionRule>): GlobalAgentPermissionRule;
export declare function deleteGlobalAgentPermissionRule(id: string): {
    deleted: boolean;
};
export declare function evaluateGlobalAgentPermission(input: {
    run: GlobalAgentRun;
    tool: string;
    args: any;
    risk: GlobalAgentToolRisk;
    signature: string;
}): {
    allowed: boolean;
    denied: boolean;
    rule: GlobalAgentPermissionRule;
    target: string;
};
export declare function loadGlobalAgentHooks(): GlobalAgentHookRule[];
export declare function saveGlobalAgentHook(input: Partial<GlobalAgentHookRule>): GlobalAgentHookRule;
export declare function deleteGlobalAgentHook(id: string): {
    deleted: boolean;
};
export declare function runGlobalAgentHooks(phase: HookPhase, input: {
    run: GlobalAgentRun;
    tool: string;
    args: any;
    risk: GlobalAgentToolRisk;
    observation?: any;
}): {
    blocked: boolean;
    message: string;
    fired: {
        id: string;
        phase: HookPhase;
        tool: string;
        effect: "annotate" | "block";
        message: string;
        at: string;
    }[];
};
export declare function initializeGlobalAgentRuntimeRun(run: GlobalAgentRun): RuntimeRunState;
export declare function updateGlobalAgentTodoLedger(run: GlobalAgentRun, plan?: string[], activeTool?: string): RuntimeTodo[];
export declare function markGlobalAgentToolTodo(run: GlobalAgentRun, tool: string, status: TodoStatus, text?: string): RuntimeTodo[];
export declare function recordGlobalAgentRuntimeOutput(run: GlobalAgentRun, event: any): void;
export declare function getGlobalAgentRuntimeRunState(runId: string): RuntimeRunState;
export declare function getGlobalAgentBackgroundOutput(runId: string): {
    run_id: string;
    output: any[];
    todos: RuntimeTodo[];
    hooks: any[];
    permissions: any[];
};
export declare function buildGlobalAgentSessionDebug(run: GlobalAgentRun | null): {
    run_id: string;
    trace_id: string;
    session_id: string;
    status: import("./global-agent-loop").GlobalAgentRunStatus;
    phase: import("./global-agent-loop").GlobalAgentDecisionState;
    pending_tool: {
        name: string;
        arguments: any;
        risk: GlobalAgentToolRisk;
        signature: string;
    };
    last_step: import("./global-agent-loop").GlobalAgentRunStep;
    resume_count: number;
    model_calls: number;
    tool_calls: number;
    todos: RuntimeTodo[];
    hooks: any[];
    permissions: any[];
    output_tail: any[];
    reasoning: {
        plan_version: number;
        assertions: {
            id: string;
            label: string;
            kind: string;
            status: import("./agent-reasoning-loop").ReasoningAssertionStatus;
            evidence: string[];
            reason: string;
            updated_at: string;
        }[];
        deviations: {
            id: string;
            type: string;
            detail: string;
            severity: "info" | "warning" | "error";
            at: string;
        }[];
        recovery_checks: {
            reason: string;
            goal_revalidated: boolean;
            state_revalidated: boolean;
            acceptance_revalidated: boolean;
            remaining_gaps: string[];
            at: string;
        }[];
    };
};
export declare function runGlobalAgentRuntimeSelfTest(specs: GlobalAgentToolSpec[]): {
    pass: boolean;
    checks: {
        toolDefinitionsHaveSchemas: boolean;
        todoLedgerPersists: boolean;
        backgroundOutputPersists: boolean;
        debugSnapshotIncludesRuntime: boolean;
    };
    definitions: GlobalAgentToolDefinition[];
    debug: {
        run_id: string;
        trace_id: string;
        session_id: string;
        status: import("./global-agent-loop").GlobalAgentRunStatus;
        phase: import("./global-agent-loop").GlobalAgentDecisionState;
        pending_tool: {
            name: string;
            arguments: any;
            risk: GlobalAgentToolRisk;
            signature: string;
        };
        last_step: import("./global-agent-loop").GlobalAgentRunStep;
        resume_count: number;
        model_calls: number;
        tool_calls: number;
        todos: RuntimeTodo[];
        hooks: any[];
        permissions: any[];
        output_tail: any[];
        reasoning: {
            plan_version: number;
            assertions: {
                id: string;
                label: string;
                kind: string;
                status: import("./agent-reasoning-loop").ReasoningAssertionStatus;
                evidence: string[];
                reason: string;
                updated_at: string;
            }[];
            deviations: {
                id: string;
                type: string;
                detail: string;
                severity: "info" | "warning" | "error";
                at: string;
            }[];
            recovery_checks: {
                reason: string;
                goal_revalidated: boolean;
                state_revalidated: boolean;
                acceptance_revalidated: boolean;
                remaining_gaps: string[];
                at: string;
            }[];
        };
    };
};
export {};
