import { type AgentDecisionIntent } from "./agent-quality-center";
import { type AgentReasoningState } from "./agent-reasoning-loop";
export type GlobalAgentRunStatus = "running" | "supervising" | "paused" | "waiting_confirmation" | "waiting_clarification" | "completed" | "failed" | "cancelled";
export type GlobalAgentDecisionState = "answer" | "investigate" | "plan" | "execute" | "needs_confirmation" | "complete";
export type GlobalAgentToolRisk = "read" | "write" | "high";
export interface GlobalAgentToolSpec {
    name: string;
    description: string;
    required?: string[];
    risk: GlobalAgentToolRisk | ((args: any) => GlobalAgentToolRisk);
}
export interface GlobalAgentDecision {
    state: GlobalAgentDecisionState;
    message?: string;
    plan?: string[];
    tool?: {
        name: string;
        arguments?: any;
    } | null;
    intent?: Partial<AgentDecisionIntent>;
    completion?: {
        summary?: string;
        evidence?: string[];
        risks?: string[];
        next_action?: string;
    };
}
export interface GlobalAgentRunStep {
    index: number;
    at: string;
    state: GlobalAgentDecisionState;
    message: string;
    plan: string[];
    tool?: {
        name: string;
        arguments: any;
        risk: GlobalAgentToolRisk;
        signature: string;
    };
    observation?: any;
    error?: string;
    duration_ms?: number;
    decision?: any;
}
export interface GlobalAgentRun {
    version: 1;
    id: string;
    trace_id: string;
    session_id: string;
    source: string;
    user_message: string;
    history: Array<{
        role: string;
        content: string;
    }>;
    status: GlobalAgentRunStatus;
    phase: GlobalAgentDecisionState;
    explicit_write_authorization: boolean;
    created_at: string;
    updated_at: string;
    started_at: string;
    completed_at?: string;
    deadline_at: string;
    max_steps: number;
    steps: GlobalAgentRunStep[];
    pending_tool?: {
        name: string;
        arguments: any;
        risk: GlobalAgentToolRisk;
        signature: string;
    } | null;
    approved_tool_signatures: string[];
    final_reply: string;
    error: string;
    resume_count: number;
    model_calls: number;
    tool_calls: number;
    consecutive_failures: number;
    client_effects: any[];
    mission_id?: string;
    supervisor_id?: string;
    supervision_state?: string;
    final_delivery_report?: any;
    decision_summary?: any;
    clarification_question?: string;
    shadow_mode?: boolean;
    original_user_message?: string;
    reasoning_loop: AgentReasoningState;
}
export interface GlobalAgentLoopRuntime {
    callModel: (messages: Array<{
        role: string;
        content: string;
    }>, run: GlobalAgentRun) => Promise<string | GlobalAgentDecision>;
    executeTool: (name: string, args: any, run: GlobalAgentRun) => Promise<any>;
    getContext?: (run: GlobalAgentRun) => Promise<any> | any;
    fallbackDecision?: (run: GlobalAgentRun, error: any) => Promise<GlobalAgentDecision | null> | GlobalAgentDecision | null;
    onEvent?: (event: any, run: GlobalAgentRun) => void;
    persist?: boolean;
    now?: () => number;
    qualityPolicyOverride?: any;
}
export declare const GLOBAL_AGENT_TOOL_SPECS: GlobalAgentToolSpec[];
export declare function getGlobalAgentRun(id: string): GlobalAgentRun;
export declare function attachGlobalAgentRunSupervision(run: GlobalAgentRun, link: {
    mission_id: string;
    supervisor_id: string;
    state?: string;
}): GlobalAgentRun;
export declare function completeGlobalAgentSupervision(id: string, report: any, outcome?: "completed" | "failed" | "cancelled"): GlobalAgentRun;
export declare function updateGlobalAgentSupervisionState(id: string, state: string): GlobalAgentRun;
export declare function listGlobalAgentRuns(options?: {
    sessionId?: string;
    status?: string;
    limit?: number;
}): GlobalAgentRun[];
export declare function findWaitingGlobalAgentRun(sessionId: string): GlobalAgentRun;
export declare function findClarifyingGlobalAgentRun(sessionId: string, maxAgeMs?: number): GlobalAgentRun;
export declare function getGlobalAgentToolSpec(name: string): GlobalAgentToolSpec;
export declare function classifyGlobalAgentToolRisk(name: string, args: any): GlobalAgentToolRisk;
export declare function parseGlobalAgentDecision(raw: string | GlobalAgentDecision): GlobalAgentDecision;
export declare function startGlobalAgentRun(input: {
    message: string;
    history?: any[];
    sessionId?: string;
    source?: string;
    explicitWriteAuthorization?: boolean;
    traceId?: string;
    maxSteps?: number;
    timeoutMs?: number;
}, runtime: GlobalAgentLoopRuntime): Promise<GlobalAgentRun>;
export declare function resumeGlobalAgentRun(id: string, runtime: GlobalAgentLoopRuntime, options?: {
    approved?: boolean;
    cancelled?: boolean;
}): Promise<GlobalAgentRun>;
export declare function continueGlobalAgentRunWithClarification(id: string, answer: string, runtime: GlobalAgentLoopRuntime, options?: {
    explicitWriteAuthorization?: boolean;
}): Promise<GlobalAgentRun>;
export declare function pauseGlobalAgentRun(id: string): GlobalAgentRun;
export declare function cancelGlobalAgentRun(id: string): GlobalAgentRun;
export declare function recoverInterruptedGlobalAgentRuns(runtime: GlobalAgentLoopRuntime): Promise<{
    total: number;
    resumed: number;
    results: any[];
}>;
export declare function runGlobalAgentLoopSelfTest(): Promise<{
    multiStepCompletes: boolean;
    dispatchIsNotDeliveryCompletion: boolean;
    finalGateCompletesOriginalRun: boolean;
    modelObservesAndContinues: boolean;
    consultationDoesNotDispatch: boolean;
    ambiguousConsultationNeedsClarification: boolean;
    clarificationContinuesSameRun: boolean;
    clarificationPreservesOriginalGoal: boolean;
    reasoningPlanAndFactsAreAudited: boolean;
    clarificationCanRevokeAuthorization: boolean;
    toolFailureTriggersAuditedReplan: boolean;
    destructiveAlwaysNeedsConfirmation: boolean;
    confirmationExecutesExactPendingToolOnce: boolean;
    invalidToolsConvergeToFailure: boolean;
    duplicateLoopIsStopped: boolean;
    pauseAndResumeWorks: boolean;
    fencedJsonParses: boolean;
    shadowModeHasNoSideEffect: boolean;
    pass: boolean;
}>;
