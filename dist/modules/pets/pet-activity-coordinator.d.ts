export type PetActivityState = "idle" | "thinking" | "planning" | "working" | "building" | "debugging" | "reviewing" | "waiting" | "happy" | "attention" | "notification" | "error" | "carrying" | "sweeping" | "juggling" | "yawning" | "dozing" | "collapsing" | "sleeping" | "waking" | "drag";
export type PetActorKind = "global" | "group-main" | "project" | "third-party" | "test-agent" | "scheduled";
export interface PetActivityUpdate {
    actor: string;
    displayName?: string;
    actorKind?: PetActorKind;
    runtime?: string;
    state: string;
    detail?: string;
    source?: string;
    workspaceTarget?: any;
    timestamp?: number;
    durationMs?: number;
}
export interface CoordinatedPetActivity {
    actor: string;
    displayName: string;
    actorKind: PetActorKind;
    runtime: string;
    state: PetActivityState;
    detail: string;
    source: string;
    workspaceTarget: any;
    timestamp: number;
    expiresAt: number;
    priority: number;
}
export declare function normalizeCoordinatedPetState(state: string): PetActivityState;
export declare function inferPetActorKind(update: Partial<PetActivityUpdate>): PetActorKind;
export declare class GlobalPetActivityCoordinator {
    private activities;
    update(update: PetActivityUpdate): CoordinatedPetActivity | null;
    resolve(at?: number): CoordinatedPetActivity | null;
    snapshot(at?: number): CoordinatedPetActivity[];
}
export declare function runPetActivityCoordinatorSelfTest(): {
    schema: string;
    pass: boolean;
    checks: {
        worker_beats_planning: boolean;
        test_agent_beats_worker: boolean;
        worker_resumes_after_review: boolean;
        success_does_not_override_active_planning: boolean;
        expired_returns_idle: boolean;
        actor_is_visible_in_detail: boolean;
    };
};
