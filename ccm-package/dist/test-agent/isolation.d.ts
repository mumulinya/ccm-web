import type { BrowserCheckSpec, HttpCheckSpec, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "./types";
import { evaluateTestAgentBrowserSideEffect, evaluateTestAgentCommandSideEffect, evaluateTestAgentHttpSideEffect, type TestAgentIsolationMode, type TestAgentRiskLevel, type TestAgentSideEffectPolicyContext } from "./side-effect-policy";
export type TestAgentIsolationStatus = "ready" | "degraded" | "blocked" | "cleanup_pending" | "cleanup_passed" | "cleanup_failed" | "recovery_required";
export interface TestAgentIsolationProjectBinding {
    project: string;
    sourceWorkDir: string;
    executionWorkDir: string;
    mode: Exclude<TestAgentIsolationMode, "sandbox_preferred" | "none"> | "none";
    sandboxId?: string;
    sourceChecksum?: string;
    copied: boolean;
}
export interface TestAgentIsolationReceipt {
    schema: "ccm-test-agent-isolation-receipt-v1";
    id: string;
    workOrderId: string;
    taskId: string;
    groupId: string;
    riskLevel: TestAgentRiskLevel;
    requestedMode: TestAgentIsolationMode;
    mode: "controlled_worktree" | "disposable_copy" | "readonly_allowlist" | "none" | "blocked";
    status: TestAgentIsolationStatus;
    reason: string;
    projectBindings: TestAgentIsolationProjectBinding[];
    sandboxId?: string;
    sandboxRoot?: string;
    testTenant: {
        present: boolean;
        referenceChecksum: string;
    };
    networkPolicy: {
        allowedHosts: string[];
        externalHosts: boolean;
        metadataBlocked: true;
    };
    credentialReferenceChecksum: string;
    sideEffectPolicyChecksum: string;
    sideEffectState: "none" | "read_only" | "known_write" | "uncertain";
    cleanup: {
        required: boolean;
        status: "not_required" | "pending" | "passed" | "failed";
        reason?: string;
    };
    contentStored: false;
    createdAt: string;
    updatedAt: string;
    checksum: string;
}
export interface TestAgentIsolationOptions {
    mode?: TestAgentIsolationMode | string;
    riskLevel?: TestAgentRiskLevel | string;
    /** Explicitly opt into creating copy-on-write temporary workspaces. */
    createDisposableCopies?: boolean;
    sandboxRoot?: string;
    allowedHosts?: string[];
    allowExternalHosts?: boolean;
    allowHttpMutation?: boolean;
    allowBrowserMutation?: boolean;
    allowReadonlyFallback?: boolean;
    testTenant?: {
        id?: string;
        reference?: string;
        name?: string;
    } | null;
    credentialReference?: string;
    executionId?: string;
}
export interface TestAgentIsolationSession {
    schema: "ccm-test-agent-isolation-session-v1";
    workOrder: NormalizedTestAgentWorkOrder;
    receipt: TestAgentIsolationReceipt;
    policyContext: TestAgentSideEffectPolicyContext;
    validateCommand: (project: NormalizedTestAgentProjectTarget, command: string) => ReturnType<typeof evaluateTestAgentCommandSideEffect>;
    validateHttpCheck: (project: NormalizedTestAgentProjectTarget, check: HttpCheckSpec) => ReturnType<typeof evaluateTestAgentHttpSideEffect>;
    validateBrowserCheck: (project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec) => ReturnType<typeof evaluateTestAgentBrowserSideEffect>;
    cleanup: () => Promise<TestAgentIsolationReceipt>;
}
/** Reconstruct the policy context from a persisted v1 isolation receipt. */
export declare function testAgentPolicyContextFromWorkOrder(workOrder: any): TestAgentSideEffectPolicyContext | null;
/**
 * Prepare a work order for verification.  The default does not copy user
 * files; it uses an already-created CCM worktree where available and falls
 * back to a strictly read-only allowlist for lightweight/standard checks.
 * Copy-on-write is opt-in through `createDisposableCopies` or mode.
 */
export declare function prepareTestAgentIsolation(input: NormalizedTestAgentWorkOrder, options?: TestAgentIsolationOptions): Promise<TestAgentIsolationSession>;
export declare function runTestAgentIsolationSelfTest(): {
    pass: boolean;
    safe: import("./side-effect-policy").TestAgentSideEffectDecision;
    install: import("./side-effect-policy").TestAgentSideEffectDecision;
    metadata: import("./side-effect-policy").TestAgentSideEffectDecision;
};
