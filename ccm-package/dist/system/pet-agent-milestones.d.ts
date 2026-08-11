import { type UserVisibleAgentEvent } from "./user-visible-agent-events";
export declare const PET_AGENT_MILESTONE_SCHEMA: "ccm-pet-agent-milestone-v1";
export type PetAgentMilestoneKind = "planning" | "implementation_started" | "key_finding" | "direction_change" | "blocked" | "verification_started" | "rework" | "verification_passed" | "summary_started" | "result_submitted" | "completed" | "failed" | "cancelled" | "needs_user";
export type PetAgentMilestoneV1 = {
    schema: typeof PET_AGENT_MILESTONE_SCHEMA;
    milestoneId: string;
    kind: PetAgentMilestoneKind;
    source: "main_agent" | "runtime" | "test_agent" | "system";
    confidence: "declared" | "observed";
    taskId?: string;
    workItemId?: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId?: string;
    anchorMessageId?: string;
    originMessageId?: string;
    generation?: number;
    attempt?: number;
    agentRunId?: string;
    projectName?: string;
    runtimeLabel?: string;
    title: string;
    summary: string;
    petState: "planning" | "building" | "debugging" | "reviewing" | "waiting" | "happy" | "error" | "idle";
    terminal: boolean;
    durable: boolean;
    dedupeKey: string;
    action: Record<string, string>;
    contentStored: false;
};
type ProjectorOptions = {
    getMode?: () => "milestones" | "terminal_only";
    fallbackTimeoutMs?: number;
    emit: (milestone: PetAgentMilestoneV1) => void;
    persist?: (milestone: PetAgentMilestoneV1) => void;
};
declare function project(event: UserVisibleAgentEvent): PetAgentMilestoneV1 | null;
export declare function createPetAgentMilestoneProjector(options: ProjectorOptions): {
    stop(): void;
    project: typeof project;
};
export declare function runPetAgentMilestoneSelfTest(): {
    pass: boolean;
    started: PetAgentMilestoneV1;
    submitted: PetAgentMilestoneV1;
    terminal: PetAgentMilestoneV1;
};
export {};
