import type { BrowserCheckSpec, HttpCheckSpec, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "./types";
export type TestAgentRiskLevel = "lightweight" | "standard" | "interactive" | "critical";
export type TestAgentIsolationMode = "sandbox_preferred" | "controlled_worktree" | "disposable_copy" | "readonly_allowlist" | "none";
export type TestAgentSideEffectClass = "read_only" | "sandbox_write" | "tenant_write" | "forbidden" | "uncertain";
export interface TestAgentSideEffectDecision {
    allowed: boolean;
    class: TestAgentSideEffectClass;
    reason: string;
    requiresSandbox: boolean;
    requiresTestTenant: boolean;
    mutating: boolean;
    normalized?: string;
}
export interface TestAgentSideEffectPolicyContext {
    riskLevel?: TestAgentRiskLevel | string;
    isolationMode?: TestAgentIsolationMode | string;
    sandboxReady?: boolean;
    testTenantPresent?: boolean;
    allowedHosts?: string[];
    allowExternalHosts?: boolean;
    allowHttpMutation?: boolean;
    allowBrowserMutation?: boolean;
    allowedCommands?: string[];
    project?: NormalizedTestAgentProjectTarget | null;
}
/** Classify a command without executing it. */
export declare function evaluateTestAgentCommandSideEffect(command: string, context?: TestAgentSideEffectPolicyContext): TestAgentSideEffectDecision;
/** Classify an HTTP check, including write methods and host restrictions. */
export declare function evaluateTestAgentHttpSideEffect(check: HttpCheckSpec, context?: TestAgentSideEffectPolicyContext): TestAgentSideEffectDecision;
/** Classify browser actions; navigation/assertion-only checks remain read-only. */
export declare function evaluateTestAgentBrowserSideEffect(check: BrowserCheckSpec, context?: TestAgentSideEffectPolicyContext): TestAgentSideEffectDecision;
export declare function testAgentRiskLevel(workOrder: Partial<NormalizedTestAgentWorkOrder> | any): TestAgentRiskLevel;
export declare function testAgentIsolationMode(workOrder: Partial<NormalizedTestAgentWorkOrder> | any): TestAgentIsolationMode;
export declare function testAgentTestTenant(workOrder: Partial<NormalizedTestAgentWorkOrder> | any): {
    present: boolean;
    reference: string;
};
export declare function summarizeSideEffectPolicy(input: {
    commands?: Array<{
        project?: string;
        command: string;
    }>;
    httpChecks?: Array<{
        project?: string;
        check: HttpCheckSpec;
    }>;
    browserChecks?: Array<{
        project?: string;
        check: BrowserCheckSpec;
    }>;
    context?: TestAgentSideEffectPolicyContext;
}): {
    schema: string;
    allowed: boolean;
    blockedCount: number;
    mutatingCount: number;
    decisions: {
        commands: {
            project: string;
            command: string;
            decision: TestAgentSideEffectDecision;
        }[];
        http: {
            project: string;
            check: HttpCheckSpec;
            decision: TestAgentSideEffectDecision;
        }[];
        browser: {
            project: string;
            check: BrowserCheckSpec;
            decision: TestAgentSideEffectDecision;
        }[];
    };
    checksum: string;
};
