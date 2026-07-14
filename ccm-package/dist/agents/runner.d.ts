#!/usr/bin/env node
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
    runtimeToolScope: {
        ok: boolean;
        skipped: boolean;
        reason?: undefined;
        current?: undefined;
        requested?: undefined;
        scope?: undefined;
    } | {
        ok: boolean;
        reason: any;
        current: any;
        skipped?: undefined;
        requested?: undefined;
        scope?: undefined;
    } | {
        ok: boolean;
        reason: string;
        requested: {
            mcp: any;
            skill: any;
        };
        current: {
            mcp: any;
            skill: any;
        };
        scope: any;
        skipped?: undefined;
    } | {
        ok: boolean;
        current: {
            mcp: any;
            skill: any;
        };
        scope: any;
        skipped?: undefined;
        reason?: undefined;
        requested?: undefined;
    };
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
    runtimeToolScope: {
        ok: boolean;
        skipped: boolean;
        reason?: undefined;
        current?: undefined;
        requested?: undefined;
        scope?: undefined;
    } | {
        ok: boolean;
        reason: any;
        current: any;
        skipped?: undefined;
        requested?: undefined;
        scope?: undefined;
    } | {
        ok: boolean;
        reason: string;
        requested: {
            mcp: any;
            skill: any;
        };
        current: {
            mcp: any;
            skill: any;
        };
        scope: any;
        skipped?: undefined;
    } | {
        ok: boolean;
        current: {
            mcp: any;
            skill: any;
        };
        scope: any;
        skipped?: undefined;
        reason?: undefined;
        requested?: undefined;
    };
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
    runtimeToolScope: {
        ok: boolean;
        skipped: boolean;
        reason?: undefined;
        current?: undefined;
        requested?: undefined;
        scope?: undefined;
    } | {
        ok: boolean;
        reason: any;
        current: any;
        skipped?: undefined;
        requested?: undefined;
        scope?: undefined;
    } | {
        ok: boolean;
        reason: string;
        requested: {
            mcp: any;
            skill: any;
        };
        current: {
            mcp: any;
            skill: any;
        };
        scope: any;
        skipped?: undefined;
    } | {
        ok: boolean;
        current: {
            mcp: any;
            skill: any;
        };
        scope: any;
        skipped?: undefined;
        reason?: undefined;
        requested?: undefined;
    };
    runtimeToolDispatchGate: any;
    reason?: undefined;
};
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
        runnerGateBlocksRuntimeSnapshotMismatch: boolean;
    };
};
