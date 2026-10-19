export declare function createAgentRunnerSupport(deps: any): {
    normalizeToolSelection: (tools?: any) => {
        mcp: any;
        skill: any;
    };
    hasToolSelection: (tools?: any) => boolean;
    buildAgentRunnerRuntimeToolPayload: (projectName: string, agentType: string, allowedTools?: any, mcpConfigPath?: string, executionInfo?: any) => {
        runtimeToolSnapshot: any;
        runtimeToolDispatchGate: any;
        runtimeToolSnapshotPath: any;
        runtimeToolSnapshotRequired: boolean;
    };
    normalizeVerificationCommands: (value: any) => string[];
    extractVerificationCommandsFromMessage: (message: string) => string[];
    buildAgentCliAllowedTools: (projectName: string, message?: string) => string[];
    isSpawnPermissionError: (error: any) => boolean;
    nativeContinuationDoneFields: (evidence: any) => {
        requestedNativeSessionId: string;
        returnedNativeSessionId: string;
        effectiveNativeSessionId: string;
        nativeSessionEvidenceSource: string;
        nativeResumeRequested: boolean;
        nativeContinuationAcknowledged: boolean;
        nativeSessionReusable: boolean;
        providerOutputContractStatus: string;
        providerOutputFormatFingerprint: string;
        providerRuntimeVersion: string;
        providerRuntimeVersionStatus: string;
        providerContractId: string;
        expectedProviderContractId: string;
        providerContractTransition: boolean;
        providerContractContinuityVerified: boolean;
        nativeContinuationEvidence: any;
    };
    callAgentViaExternalRunner: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools?: any, mcpConfigPath?: string, agentSession?: any, executionInfo?: any) => Promise<{
        agentRunId: string;
        nativeContinuationEvidence: any;
        output: any;
        nativeSessionId: any;
        nativeModelCapabilityReceipt: any;
        nativeModelCapabilityRecord: any;
        modelCapabilityRefreshOutcome: any;
        providerToolAccessEvidence: any;
        providerMemoryChannelEvidence: any;
        memoryContextConsumptionReceipt: any;
        memoryContextConsumptionRecovery: any;
        requestedNativeSessionId: string;
        returnedNativeSessionId: string;
        effectiveNativeSessionId: string;
        nativeSessionEvidenceSource: string;
        nativeResumeRequested: boolean;
        nativeContinuationAcknowledged: boolean;
        nativeSessionReusable: boolean;
        providerOutputContractStatus: string;
        providerOutputFormatFingerprint: string;
        providerRuntimeVersion: string;
        providerRuntimeVersionStatus: string;
        providerContractId: string;
        expectedProviderContractId: string;
        providerContractTransition: boolean;
        providerContractContinuityVerified: boolean;
        fileChanges: any;
        usage: any;
        runnerRequestId: string;
    }>;
    getProjectToolSelection: (projectName: string) => {
        mcp: any[];
        skill: any[];
    };
    findRuntimeToolSnapshotPath: (mcpConfigPath?: string) => any;
    readJsonFileSafe: (file?: string) => any;
    runtimeToolSnapshotFromAudit: (audit?: any, allowedTools?: any) => {
        schema: string;
        snapshotId: string;
        snapshotPath: string;
        mcpConfigPath: string;
        runtime: any;
        allowedTools: {
            mcp: any;
            skill: any;
        };
        requested: {
            mcp: any;
            skill: any;
        };
        configuredTools: {
            mcp: any;
            skill: any;
        };
        executionRoleSkills: unknown[];
        enforceExecutionRoleSkills: boolean;
        effectiveTools: {
            mcp: any;
            skill: any;
        };
        permissionRules: any;
        permission_rules: any;
        authorizationReadiness: any;
        authorization_readiness: any;
        dispatchGate: any;
        dispatch_gate: any;
        catalogRevision: string;
    };
    normalizeAgentRunnerRuntimeToolSnapshot: (snapshot?: any, allowedTools?: any, mcpConfigPath?: string) => any;
    getProjectVerificationCommandsForRunner: (projectName: string, workDir?: string) => string[];
    runIndependentProjectVerification: (projectName: string, workDir: string, timeoutMs: number, taskId: string, executionId: string, agentType: string) => Promise<string>;
    buildProjectToolContext: (projectName: string, workDir?: string, agentType?: string, options?: any) => {
        prompt: string;
        allowedTools: {
            skill: any[];
            configuredTools: {
                mcp: any[];
                skill: any[];
            };
            executionRoleSkills: any;
            enforceExecutionRoleSkills: boolean;
            mcp: any[];
        };
        audit: any;
        workEvent: {
            id: string;
            time: string;
            agent: string;
            kind: string;
            text: string;
            runtimeToolSync: any;
        };
        dispatchGate: any;
        runtimeToolSnapshot: {
            schema: string;
            snapshotId: string;
            snapshotPath: string;
            mcpConfigPath: string;
            runtime: any;
            allowedTools: {
                mcp: any;
                skill: any;
            };
            requested: {
                mcp: any;
                skill: any;
            };
            configuredTools: {
                mcp: any;
                skill: any;
            };
            executionRoleSkills: unknown[];
            enforceExecutionRoleSkills: boolean;
            effectiveTools: {
                mcp: any;
                skill: any;
            };
            permissionRules: any;
            permission_rules: any;
            authorizationReadiness: any;
            authorization_readiness: any;
            dispatchGate: any;
            dispatch_gate: any;
            catalogRevision: string;
        };
        selectedRoleSkills: any;
    };
    sendRuntimeToolDispatchBlocked: (res: any, toolContext: any) => any;
    ensureAgentRunnerDirs: () => void;
    cleanupAgentRunnerEphemeralResults: (maxAgeMs?: number) => {
        removed: number;
        contentStored: boolean;
    };
    createAgentRunnerRequest: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools?: any, mcpConfigPath?: string, agentSession?: any, executionInfo?: any) => Promise<{
        id: string;
        requestFile: any;
        resultFile: any;
        agentRunId: string;
        heartbeatWakeId: string;
        leaseOwnerId: string;
        leaseId: string;
        taskId: string;
        run_id: string;
        trace_id: string;
        task_id: string;
        attempt_id: string;
        runtime_id: any;
        lease_id: string;
        task_agent_session_id: string;
        native_session_id: string;
    }>;
    waitForAgentRunnerResult: (resultFile: string, timeoutMs: number, assertWaiting?: () => void) => Promise<any>;
    recordNativeCapacityRefreshOutcome: (agentType: string, model: string, capabilityRecord: any, binding?: any) => any;
    callAgentViaExternalRunnerRaw: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools?: any, mcpConfigPath?: string, agentSession?: any, executionInfo?: any) => Promise<{
        nativeModelCapabilityReceipt: any;
        nativeModelCapabilityRecord: any;
        modelCapabilityRefreshOutcome: any;
        providerToolAccessEvidence: any;
        providerMemoryChannelEvidence: any;
        memoryContextConsumptionReceipt: any;
        memoryContextConsumptionRecovery: any;
        requestedNativeSessionId: string;
        returnedNativeSessionId: string;
        effectiveNativeSessionId: string;
        nativeSessionEvidenceSource: string;
        nativeResumeRequested: boolean;
        nativeContinuationAcknowledged: boolean;
        nativeSessionReusable: boolean;
        providerOutputContractStatus: string;
        providerOutputFormatFingerprint: string;
        providerRuntimeVersion: string;
        providerRuntimeVersionStatus: string;
        providerContractId: string;
        expectedProviderContractId: string;
        providerContractTransition: boolean;
        providerContractContinuityVerified: boolean;
        nativeContinuationEvidence: any;
        agentRunId: string;
        output: string;
        fileChanges: any;
        usage: any;
        runnerRequestId: string;
        nativeSessionId: any;
    }>;
    runManagedAgentContinuation: (input: {
        projectName: string;
        prompt: string;
        workDir: string;
        agentType: string;
        timeoutMs: number;
        mcpConfigPath?: string;
        agentSession?: any;
        nativeSessionId?: string;
        taskId: string;
        executionId?: string;
        round: number;
        envAllowlist?: string[];
        maxOutputBytes?: number;
        maxContextOutputBytes?: number;
        nativeContinuationEvidence?: any;
        initialUsage?: any;
    }) => Promise<{
        output: any;
        nativeSessionId: any;
        nativeContinuationEvidence: any;
    }>;
    continueAgentToolCalls: (input: {
        output: string;
        nativeSessionId?: string;
        projectName: string;
        workDir: string;
        agentType: string;
        timeoutMs: number;
        allowedTools?: any;
        mcpConfigPath?: string;
        agentSession?: any;
        groupId?: string;
        taskId: string;
        executionId?: string;
        envAllowlist?: string[];
        maxOutputBytes?: number;
        maxContextOutputBytes?: number;
        onEvent?: (event: any) => void;
        nativeContinuationEvidence?: any;
        initialUsage?: any;
        continueAgent?: (prompt: string, state: any) => Promise<{
            output: string;
            nativeSessionId?: string;
        }>;
    }) => Promise<any>;
    processAgentHeartbeatWake: (wake: any, run: any) => Promise<{
        runId: any;
        status: string;
        result: {
            runnerRequestId: string;
            nativeSessionId: any;
        };
    }>;
};
