import { type AgentReasoningState } from "../reasoning-loop";
import type { GlobalAgentDecision, GlobalAgentLoopRuntime, GlobalAgentRun } from "./loop";
export declare function compactObservation(value: any): any;
export declare const GLOBAL_MODEL_ROUTE_KEYS: Set<string>;
export declare const GLOBAL_MODEL_FORBIDDEN_FIELD: RegExp;
export declare const GROUP_SESSION_ID_PATTERN: RegExp;
export declare function redactGroupSessionIds(value: any): any;
export declare function redactGroupSessionFields(value: any): any;
export declare function projectRoutingValue(value: any): any;
export declare function projectProjectRows(rows: any): {
    name: any;
    work_dir: any;
    agent: any;
    platform: any;
}[];
export declare function projectGroupRows(rows: any): {
    id: any;
    name: any;
    members: any;
}[];
export declare function projectGlobalTaskRows(observation: any): any;
export declare function projectGlobalAgentObservationForModel(toolName: string, observation: any): any;
export declare function projectGlobalAgentReasoningForModel(reasoning: AgentReasoningState): {
    version: 1;
    original_goal: string;
    effective_goal: string;
    authorization_scope: string[];
    clarification_chain: {
        question: string;
        answer: string;
        at: string;
    }[];
    plan_version: number;
    replan_required: boolean;
    fact_snapshots: {
        id: string;
        source: string;
        hash: string;
        at: string;
    }[];
    assertions: {
        id: string;
        kind: string;
        status: import("../reasoning-loop").ReasoningAssertionStatus;
        updated_at: string;
    }[];
    deviations: {
        id: string;
        type: string;
        severity: "info" | "error" | "warning";
        at: string;
    }[];
    recovery_checks: {
        goal_revalidated: boolean;
        state_revalidated: boolean;
        acceptance_revalidated: boolean;
        remaining_gap_count: number;
        at: string;
    }[];
    updated_at: string;
};
export declare function parseGlobalAgentDecision(raw: string | GlobalAgentDecision): GlobalAgentDecision;
export declare function normalizeDecision(value: any): GlobalAgentDecision;
export declare function buildToolPrompt(): string;
export declare function buildGlobalAgentModelMessages(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime, options?: {
    sessionContinuationOverride?: any;
}): Promise<any[]>;
