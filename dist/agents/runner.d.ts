#!/usr/bin/env node
export declare function isMissingNativeSessionFailure(value: any): boolean;
export declare function validateAgentRunnerSessionLifecycleFence(request?: any): {
    schema: string;
    valid: boolean;
    required: boolean;
    status: string;
    issues: string[];
    fence: {
        schema: string;
        required: boolean;
        groupId: string;
        groupSessionId: string;
        lifecycleGeneration: number;
        lifecycleStatus: string;
        lifecycleHeadId: string;
        lifecycleHeadChecksum: string;
        memoryContextSnapshotId: string;
        memoryContextSnapshotChecksum: string;
    };
    expected: {
        lifecycleHeadId: string;
        generation: number;
        status: string;
        lifecycleHeadChecksum: string;
    };
};
export declare function validateExternalRunnerRuntimeToolGate(request: any, options?: any): {
    ok: boolean;
    runtimeToolSnapshot: any;
    runtimeToolDispatchGate: any;
    reason?: undefined;
    runtimeToolScope?: undefined;
    runtimeToolReadiness?: undefined;
} | {
    ok: boolean;
    reason: any;
    runtimeToolSnapshot: any;
    runtimeToolDispatchGate: {
        schema: string;
        dispatchReady: boolean;
        status: string;
        reason: string;
        blockers: any[];
        source_gate: any;
        checkedAt: string;
    };
    runtimeToolScope?: undefined;
    runtimeToolReadiness?: undefined;
} | {
    ok: boolean;
    reason: any;
    runtimeToolSnapshot: any;
    runtimeToolScope: any;
    runtimeToolDispatchGate: {
        schema: string;
        dispatchReady: boolean;
        status: string;
        reason: string;
        blockers: any[];
        source_gate: any;
        checkedAt: string;
    };
    runtimeToolReadiness?: undefined;
} | {
    ok: boolean;
    reason: string;
    runtimeToolSnapshot: any;
    runtimeToolReadiness: import("../tools/runtime-tool-sync").RuntimeToolReadiness;
    runtimeToolScope: any;
    runtimeToolDispatchGate: {
        schema: string;
        dispatchReady: boolean;
        status: string;
        reason: string;
        blockers: any[];
        source_gate: any;
        checkedAt: string;
    };
} | {
    ok: boolean;
    runtimeToolSnapshot: any;
    runtimeToolReadiness: import("../tools/runtime-tool-sync").RuntimeToolReadiness;
    runtimeToolScope: any;
    runtimeToolDispatchGate: any;
    reason?: undefined;
};
export declare function runAgentRunnerRequestFile(file: string): Promise<boolean>;
export declare function runAgentRunnerSelfTest(): {
    pass: boolean;
    checks: {
        runnerGateAcceptsFreshSnapshot: boolean;
        runnerGateBlocksMissingSnapshot: boolean;
        runnerGateBlocksDispatchGate: boolean;
        runnerGateBlocksScopeDrift: boolean;
        runnerGateAcceptsMatchingNonEmptyScope: any;
        runnerGateBlocksChangedMcpSkillScope: any;
        runnerGateReportsAuthorizationScopeBlocker: boolean;
        runnerFallsBackToPersistedSnapshotScope: any;
        runnerBlocksPayloadScopeForgery: boolean;
        runnerUsesSnapshotMcpConfigWhenTopLevelMissing: boolean;
        runnerLaunchesClaudeWithSnapshotMcpConfig: boolean;
        runnerLaunchesCursorWithSnapshotPluginDir: any;
        runnerLaunchesCodexWithSnapshotIsolatedHome: boolean;
        runnerRecognizesMissingNativeSessionForRehydration: boolean;
        runnerDoesNotRehydrateUnrelatedProviderFailures: boolean;
        runnerGateBlocksRuntimeSnapshotMismatch: boolean;
    };
};
