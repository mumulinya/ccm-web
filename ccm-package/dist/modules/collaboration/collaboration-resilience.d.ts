import { type AgentRuntimeId } from "../../agents/runtime";
export declare function isRuntimeCommandAvailable(agentType: string): boolean;
export declare function buildRuntimeRecoveryCandidates(primary: string, configured?: any, availability?: (runtime: string) => boolean): AgentRuntimeId[];
export declare function shouldSwitchRuntime(error: any): {
    permissionDrift: boolean;
    switchRuntime: boolean;
    failureClass: import("../../agents/execution-kernel").FailureClass;
    recoverable: boolean;
    recovery: string[];
    message: string;
};
export declare function buildRuntimeRecoveryPrompt(input: {
    originalPrompt: string;
    previousOutput?: string;
    previousReceipt?: any;
    failure?: any;
    fromRuntime: string;
    toRuntime: string;
    attempt: number;
}): string;
export declare function inferTaskPathScopes(task: string): string[];
export type ConflictLaneInput = {
    key: string;
    project: string;
    task: string;
    workDir: string;
    writablePaths?: string[];
    /** Verification-only lanes (e.g. native TestAgent) serialize after writers on the same repo. */
    verificationOnly?: boolean;
};
export declare function buildCollaborationConflictPlan(inputs: ConflictLaneInput[], requestedOrder?: string): {
    requestedOrder: string;
    effectiveOrder: string;
    conflicts: any[];
    lanes: {
        conflictWorkspaceKey: string;
        conflictGroup: string;
        mergeOwner: boolean;
        runAfterWriters: boolean;
        index: number;
        verificationOnly: boolean;
        repoKey: string;
        scopes: string[];
        key: string;
        project: string;
        task: string;
        workDir: string;
        writablePaths?: string[];
    }[];
    protected: boolean;
};
/** Stable order: writers first, then verification-only (TestAgent) lanes in the same conflict group. */
export declare function orderMentionsForConflictPlan(mentions: any[], conflictPlan?: {
    lanes?: any[];
}): any[];
export declare function runCollaborationResilienceSelfTest(): {
    pass: boolean;
    checks: {
        keepsPrimaryRuntimeFirst: boolean;
        usesConfiguredFallbackNext: boolean;
        classifiesProviderFailureForSwitch: boolean;
        nonzeroExitSwitchesWithoutReadableStderr: boolean;
        permissionDriftForcesSessionRecovery: boolean;
        authenticationFailureSwitchesRuntime: boolean;
        serializesOverlappingRepoLanes: boolean;
        keepsSeparateReposParallel: boolean;
        serializesSameRepoWriteThenVerify: boolean;
        recoveryPromptPreservesOriginalTask: boolean;
    };
};
export declare function runCollaborationResilienceIntegrationSelfTest(): {
    pass: boolean;
    checks: {
        conflictBecomesSequential: boolean;
        agentsShareConflictWorktree: boolean;
        downstreamSeesUpstreamChanges: boolean;
        singleMergeOwner: boolean;
    };
};
