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
    workItemId: string;
    stepId: string;
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
    sourceManifestChecksum: string;
    strategy: "conflict_aware_parallel";
    workItems: CcmPlanDispatchWorkItem[];
    dispatchReady?: boolean;
    blockers?: string[];
    contractChecksum: string;
    contentStored: false;
};
export declare function validatePlanForDispatch(plan: any, options?: {
    allowedProjects?: string[];
}): {
    ok: boolean;
    issues: string[];
};
export declare function buildPlanDispatchContract(input: {
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
