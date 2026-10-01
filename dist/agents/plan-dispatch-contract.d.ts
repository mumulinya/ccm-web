import { type AcceptanceContract } from "./acceptance-contract";
import { type CcmEvidencePolicyV1 } from "./evidence-policy";
import { type CcmCompiledExecutionPlanV1 } from "./compiled-execution-plan";
export declare const CCM_PLAN_DISPATCH_CONTRACT_SCHEMA: "ccm-plan-dispatch-contract-v1";
export type CcmProviderCapabilities = {
    structuredToolStream?: boolean;
    fileEvents?: boolean;
    streaming?: boolean;
    pause?: boolean;
    resume?: boolean;
    cancel?: boolean;
    worktree?: boolean;
    nativeSession?: boolean;
    structuredReceipt?: boolean;
    writeScope?: boolean;
    sessionBinding?: boolean;
};
export declare function providerCapabilitiesFromRuntime(runtime: any, options?: {
    sessionBinding?: boolean;
    structuredReceipt?: boolean;
    structuredToolStream?: boolean;
}): CcmProviderCapabilities;
export type CcmPlanDispatchWorkItem = {
    editablePaths?: string[];
    readOnlyPaths?: string[];
    cleanupPaths?: string[];
    synchronizedFixturePaths?: Array<{
        path: string;
        allowedChanges: string[];
    }>;
    workItemId: string;
    stepId: string;
    title: string;
    objective: string;
    businessGoal: string;
    requirementId: string;
    requirementRevision: number;
    requirementChecksum: string;
    planRevision: number;
    planChecksum: string;
    evidencePolicy: CcmEvidencePolicyV1;
    project: string;
    files: string[];
    sourceEvidenceIds: string[];
    dependsOn: string[];
    parallelGroup: string;
    executor: {
        provider: string;
        agentType: string;
        model?: string;
        transport: "acp" | "cli" | "websocket";
        capabilities: string[];
        degraded: boolean;
        degradedReason?: string;
    };
    worktree: {
        strategy: "isolated" | "shared";
        branch?: string;
    };
    allowedTools: string[];
    forbiddenPaths: string[];
    constraints: string[];
    exclusions: string[];
    acceptanceCriterionIds: string[];
    acceptance: string[];
    verification: Array<{
        command?: string;
        expected: string;
        evidenceRequired: boolean;
    }>;
    artifacts: string[];
    timeoutMs: number;
    maxAttempts: number;
    contractChecksum: string;
    contentStored: false;
};
export type CcmPlanDispatchContractV1 = {
    schema: typeof CCM_PLAN_DISPATCH_CONTRACT_SCHEMA;
    contractId: string;
    planId: string;
    planRevision: number;
    planChecksum: string;
    requirementId: string;
    requirementRevision: number;
    requirementChecksum: string;
    sourceManifestChecksum: string;
    evidencePolicy: CcmEvidencePolicyV1;
    strategy: "conflict_aware_parallel";
    workItems: CcmPlanDispatchWorkItem[];
    compiledPlan?: CcmCompiledExecutionPlanV1;
    acceptanceContract?: AcceptanceContract;
    dispatchReady?: boolean;
    blockers?: string[];
    contractChecksum: string;
    contentStored: false;
};
export declare function validatePlanForDispatch(plan: any, options?: {
    allowedProjects?: string[];
    evidencePolicy?: CcmEvidencePolicyV1;
}): {
    ok: boolean;
    issues: string[];
};
export declare function buildPlanDispatchContract(input: {
    acceptanceScope?: {
        scope: AcceptanceContract["scope"];
        scopeId: string;
        exactSessionId: string;
    };
    plan: any;
    taskId: string;
    generation?: number;
    project?: string;
    sourceManifestChecksum?: string;
    provider?: string;
    agentType?: string;
    model?: string;
    transport?: string;
    capabilities?: CcmProviderCapabilities;
    worktreeStrategy?: "isolated" | "shared";
    allowedTools?: string[];
    forbiddenPaths?: string[];
    timeoutMs?: number;
    maxAttempts?: number;
    evidencePolicy?: CcmEvidencePolicyV1;
}): CcmPlanDispatchContractV1;
export declare function validatePlanDispatchContract(contract: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function runPlanDispatchContractSelfTest(): {
    pass: boolean;
    checks: {
        hasContract: boolean;
        ready: boolean;
        parallel: boolean;
        validates: boolean;
    };
    contract: CcmPlanDispatchContractV1;
};
