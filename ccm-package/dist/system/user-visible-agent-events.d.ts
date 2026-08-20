import type { CcmInternalPromptBindings } from "../agents/internal-prompt-contract";
import { type ToolDisplayDetailV1 } from "./tool-display-projection";
import { type AssistantProgressKind } from "./assistant-progress";
export declare const USER_VISIBLE_AGENT_EVENT_SCHEMA: "ccm-user-visible-agent-event-v1";
export declare const USER_VISIBLE_AGENT_RESULT_SCHEMA: "ccm-user-visible-agent-result-v1";
export type UserVisibleAgentEventType = "turn_started" | "thinking_status" | "assistant_text_delta" | "assistant_progress" | "model_activity" | "requirement_plan" | "tool_started" | "tool_progress" | "tool_completed" | "tool_failed" | "agent_started" | "agent_progress" | "agent_completed" | "agent_failed" | "permission_required" | "clarification_required" | "context_compacted" | "result";
export type UserVisibleAgentEvent = {
    schema: typeof USER_VISIBLE_AGENT_EVENT_SCHEMA;
    eventId: string;
    sequence: number;
    eventType: UserVisibleAgentEventType;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    anchorMessageId?: string;
    originMessageId?: string;
    /** Stable identity for one visible request/recovery attempt. */
    turnId?: string;
    /** Recovery/work attempt number; omitted for legacy events without one. */
    attempt?: number;
    /** Authoritative assistant response row, when known. */
    responseMessageId?: string;
    taskId?: string;
    workItemId?: string;
    agentRunId?: string;
    toolCallId?: string;
    toolName?: string;
    parentEventId?: string;
    parallelGroupId?: string;
    display: {
        title: string;
        target?: string;
        summary?: string;
        status: "running" | "success" | "failed" | "waiting";
        durationMs?: number;
        toolUseCount?: number;
        tokenCount?: number;
        tokenType?: "tool_output" | "provider_total";
        tokenAccuracy?: "reported" | "estimated";
    };
    detail?: {
        toolContractVersion?: 2 | 3;
        safeArguments?: any;
        safeResult?: any;
        evidenceIds?: string[];
        fileChanges?: any[];
        usage?: any;
        agentDisplay?: {
            projectId: string;
            projectName: string;
            runtimeLabel: string;
            workItemTitle: string;
            phase: string;
            attempt: number;
            queuePosition?: number;
            isParallel: boolean;
        };
        executionStage?: {
            kind: "preparation" | "coordination_dispatch" | "project_execution" | "independent_verification" | "main_agent_summary";
            stageRunId: string;
            reviewCycleId?: string;
            attempt: number;
            startedAt: string;
            completedAt?: string;
            activeDurationMs?: number;
        };
        toolDisplay?: ToolDisplayDetailV1;
        timing?: {
            totalMs: number;
            modelMs?: number;
            toolWallMs?: number;
            dependencyWaitMs?: number;
            queueWaitMs?: number;
            otherMs?: number;
            projectAgentWallMs?: number;
            verificationMs?: number;
            summaryMs?: number;
            stages?: {
                preparationMs?: number;
                projectAgentWallMs?: number;
                testAgentWallMs?: number;
                mainAgentSummaryMs?: number;
            };
        };
        progress?: {
            kind: AssistantProgressKind;
            text: string;
            modelCallIndex: number;
            relatedToolCallIds: string[];
            batchId: string;
            milestoneChecksum: string;
            source?: "agent_reported" | "runtime_structured" | "system_observed";
            confidence?: "declared" | "observed";
            sourceEventChecksum?: string;
        };
        modelActivity?: {
            state: "started" | "waiting" | "retrying" | "streaming" | "completed" | "failed";
            phase: "understanding" | "tool_decision" | "tool_result_review" | "verification" | "final_synthesis";
            modelCallIndex: number;
            retryAttempt?: number;
            startedAt: string;
            firstDeltaAt?: string;
            safeLabel: string;
            contentStored: false;
        };
        promptBindings?: CcmInternalPromptBindings;
        liveProgress?: {
            phase: "starting" | "running" | "testing" | "building" | "finishing" | "retrying";
            safeSummary: string;
            completed?: number;
            total?: number;
            updatedAt: string;
            contentStored: false;
        };
        stream?: {
            sequence: number;
            final: boolean;
            checksum?: string;
        };
        availableActions?: UserVisibleAgentAction[];
        replayLink?: {
            schema: "ccm-task-event-link-v1";
            taskId: string;
            replayEventId?: string;
            scope: "global" | "project" | "group";
            scopeId: string;
            exactSessionId: string;
            anchorMessageId: string;
            generation: number;
            attempt: number;
            planStepId?: string;
            workItemId?: string;
            batchId?: string;
            evidenceIds?: string[];
            contentStored: false;
        };
        causalRefs?: {
            planStepId?: string;
            workItemId?: string;
            dependencyIds?: string[];
            criterionIds?: string[];
            evidenceIds?: string[];
        };
        requirementPlan?: UserVisibleRequirementPlanV1;
        runtimeObservation?: {
            eventType?: string;
            source: "agent_reported" | "runtime_structured" | "system_observed";
            confidence: "declared" | "observed";
            runtime?: string;
            runtimeVersion?: string;
            sourceEventChecksum: string;
            contentStored: false;
        };
    };
    visibility: "default" | "transcript" | "technical";
    contentStored: false;
    createdAt: string;
};
export type UserVisibleAgentAction = {
    id: string;
    kind: "retry" | "resolve_permission" | "view_error" | "recheck" | "takeover";
    label: string;
    enabled: boolean;
    disabledReason?: string;
    revision?: number;
    generation?: number;
    bindingChecksum?: string;
};
export type UserVisibleRequirementPlanStepV1 = {
    id: string;
    title: string;
    description: string;
    outcome: string;
    project?: string;
    dependsOn: string[];
    status: "pending" | "running" | "completed" | "blocked" | "skipped";
};
export type UserVisibleRequirementPlanV1 = {
    schema: "ccm-user-visible-requirement-plan-v1";
    planId: string;
    revision: number;
    title: string;
    goal: string;
    overview?: string;
    steps: UserVisibleRequirementPlanStepV1[];
    scope: string[];
    expectedResults: string[];
    exclusions: string[];
    status: "ready" | "executing" | "completed" | "blocked" | "superseded";
    createdAt: string;
    updatedAt: string;
    planChecksum: string;
    contentStored: false;
    quality?: {
        ok: boolean;
        repaired: boolean;
        issues: string[];
    };
};
export declare function sanitizeUserVisibleAgentDetail(value: any, depth?: number, seen?: WeakSet<object>): any;
export declare function normalizeUserVisibleAgentEvent(input: any, sequence?: number): UserVisibleAgentEvent;
export declare function appendUserVisibleAgentEvent(input: any): UserVisibleAgentEvent;
export declare function appendAssistantProgress(input: any): UserVisibleAgentEvent;
export declare function appendUserVisibleRequirementPlan(input: any): UserVisibleAgentEvent;
export declare function listUserVisibleAgentEvents(filter: any): {
    schema: string;
    events: UserVisibleAgentEvent[];
    nextCursor: number;
    hasMore: boolean;
    contentStored: boolean;
};
export declare function getUserVisibleAgentEvent(filter: any, eventId: string): UserVisibleAgentEvent;
export declare function subscribeUserVisibleAgentEvents(handler: (event: UserVisibleAgentEvent) => void): () => boolean;
/** Live-only text/progress events. They deliberately bypass the projection store. */
export declare function publishEphemeralUserVisibleAgentEvent(input: any): UserVisibleAgentEvent;
export declare function buildUserVisibleAgentResult(input: any): {
    schema: "ccm-user-visible-agent-result-v1";
    status: string;
    text: string;
    durationMs: number;
    modelDurationMs: number;
    turns: number;
    toolCalls: number;
    stopReason: string;
    agentStats: any;
    fileChanges: {
        deleted?: boolean;
        binary?: boolean;
        deletions?: number;
        additions?: number;
        status?: string;
        project?: string;
        path: string;
    }[];
    verification: any;
    unfinished: string[];
    usage: any;
    contentStored: boolean;
};
export declare function appendToolProjection(input: any): UserVisibleAgentEvent;
export declare function clearUserVisibleAgentEventsForTest(): void;
export declare function runUserVisibleAgentEventSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        ccLabel: boolean;
        secretRedacted: boolean;
        bodyProjected: boolean;
        noContent: boolean;
        replayLinkSafe: boolean;
        causalRefsSafe: boolean;
        progressLengthBounded: boolean;
        internalProgressRejected: boolean;
        globalDispatchStage: boolean;
        projectDispatchStage: boolean;
        workspaceMcpUsesNativeFacade: boolean;
        nativeRuntimeToolLocalized: boolean;
        inlineCommandBodyHidden: boolean;
        nestedBatchCountProjected: boolean;
        nestedBatchUsesRuntimeTokenCount: boolean;
        legacyBatchCountRecovered: boolean;
        nextTurnProgressAfterPreviousResult: boolean;
    };
    event: UserVisibleAgentEvent;
};
