import type { AgentRuntimeId as RegisteredAgentRuntimeId } from "./catalog";
export type AgentRuntimeId = RegisteredAgentRuntimeId;
export interface AgentCommandOptions {
    cliAllowedTools?: string[];
    mcpConfigPath?: string;
    sessionId?: string;
    resumeSession?: boolean;
    persistSession?: boolean;
    appendSystemPromptFile?: string;
    developerInstructionsFile?: string;
}
export interface AgentRuntimeDescriptor {
    id: AgentRuntimeId;
    aliases: string[];
    label: string;
    commandLabel: string;
    capabilities: {
        print: boolean;
        streaming: boolean;
        externalRunner: boolean;
        worktreeIsolation: boolean;
        sessionResume: boolean;
        scratchpadContinuation: boolean;
    };
    buildCommand: (msgFile: string, options?: AgentCommandOptions) => string;
}
export interface AgentRuntimeVersionSnapshot {
    schema: "ccm-agent-runtime-version-snapshot-v1";
    version: 1;
    provider: string;
    command: string;
    executablePaths: string[];
    executableIdentityChecksum: string;
    versionText: string;
    semanticVersion: string;
    status: "ok" | "command_missing" | "version_probe_failed";
    observedAt: string;
    snapshotChecksum: string;
}
export declare function captureAgentRuntimeVersionSnapshot(agentType: string): AgentRuntimeVersionSnapshot;
export declare const AGENT_RUNTIMES: AgentRuntimeDescriptor[];
export declare function normalizeAgentRuntimeId(agentType?: string): RegisteredAgentRuntimeId;
export declare function getAgentRuntime(agentType?: string): AgentRuntimeDescriptor;
export declare function buildAgentCommand(agentType: string, msgFile: string, options?: AgentCommandOptions): string;
export declare function getAgentCommandLabel(agentType: string): string;
export declare function getPublicAgentRuntimes(): Array<{
    id: RegisteredAgentRuntimeId;
    aliases: string[];
    label: string;
    commandLabel: string;
    capabilities: AgentRuntimeDescriptor["capabilities"];
    nativeContinuation: any;
}>;
export declare function isAgentRuntimeAvailable(agentType: string): boolean;
export declare function getAgentRuntimeFallbackChain(preferred?: string): ("claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder")[];
export declare function resolveAvailableAgentRuntime(preferred?: string): {
    selected: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    preferred: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    chain: ("claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder")[];
    switched: boolean;
};
export declare function extractAgentCommandUsage(rawOutput: string, agentType?: string): {
    inputTokens: number;
    directInputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    cacheReadIncludedInInput: boolean;
    outputTokens: number;
    providerTotalTokens: number;
    totalTokens: number;
    totalCostUsd: number;
    reported: boolean;
    provider: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
};
export declare function extractProviderOutputContractEvidence(agentType: string, rawOutput: string, options?: any): {
    schema: string;
    version: number;
    provider: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    parserVersion: number;
    providerContractId: string;
    contractDefinition: {
        eventType: string;
        sessionIdPath: string;
        eventTypes?: undefined;
        acknowledgement?: undefined;
    } | {
        eventTypes: string[];
        sessionIdPath: string;
        eventType?: undefined;
        acknowledgement?: undefined;
    } | {
        acknowledgement: string;
        eventType?: undefined;
        sessionIdPath?: undefined;
        eventTypes?: undefined;
    };
    runtimeVersionSnapshot: any;
    runtimeVersionStatus: string;
    runtimeVersion: string;
    runtimeIdentityChecksum: string;
    status: string;
    sessionId: string;
    trustedSessionId: string;
    sessionIdPath: string;
    matchedEventType: string;
    parsedJsonEventCount: number;
    recognizedContractEventCount: number;
    invalidJsonLineCount: number;
    observedSessionIdCount: number;
    eventShapes: string[];
    formatFingerprint: string;
    driftReasons: string[];
};
export declare function normalizeAgentCommandOutput(agentType: string, rawOutput: string, options?: any): {
    output: string;
    sessionId: string;
    rawSessionId: string;
    usage: {
        inputTokens: number;
        directInputTokens: number;
        cacheCreationInputTokens: number;
        cacheReadInputTokens: number;
        cacheReadIncludedInInput: boolean;
        outputTokens: number;
        providerTotalTokens: number;
        totalTokens: number;
        totalCostUsd: number;
        reported: boolean;
        provider: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    };
    providerOutputContractEvidence: {
        schema: string;
        version: number;
        provider: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
        parserVersion: number;
        providerContractId: string;
        contractDefinition: {
            eventType: string;
            sessionIdPath: string;
            eventTypes?: undefined;
            acknowledgement?: undefined;
        } | {
            eventTypes: string[];
            sessionIdPath: string;
            eventType?: undefined;
            acknowledgement?: undefined;
        } | {
            acknowledgement: string;
            eventType?: undefined;
            sessionIdPath?: undefined;
            eventTypes?: undefined;
        };
        runtimeVersionSnapshot: any;
        runtimeVersionStatus: string;
        runtimeVersion: string;
        runtimeIdentityChecksum: string;
        status: string;
        sessionId: string;
        trustedSessionId: string;
        sessionIdPath: string;
        matchedEventType: string;
        parsedJsonEventCount: number;
        recognizedContractEventCount: number;
        invalidJsonLineCount: number;
        observedSessionIdCount: number;
        eventShapes: string[];
        formatFingerprint: string;
        driftReasons: string[];
    };
};
export declare function extractNativeModelCapabilityReceipt(agentType: string, rawOutput: string, binding?: any): any;
export declare function verifyNativeModelCapabilityReceipt(receipt: any, expected?: any): {
    valid: boolean;
    gaps: string[];
};
export declare function runNativeModelCapabilityReceiptSelfTest(): {
    pass: boolean;
    checks: {
        nativeTopLevelMetadataExtracted: boolean;
        completeBindingAccepted: boolean;
        checksumForgeryRejected: boolean;
        sessionBindingMismatchRejected: boolean;
        agentTextCannotClaimCapacity: boolean;
    };
    receipt: any;
    forgedGaps: string[];
    wrongSessionGaps: string[];
};
export declare function detectAgentCommandFailure(agentType: string, rawOutput: string, exitCode?: number | null, rawError?: string): {
    failed: boolean;
    message: string;
};
export declare function runAgentRuntimeSessionSelfTest(): {
    pass: boolean;
    checks: {
        claudeAutomatedModeAllowsProjectVerification: boolean;
        claudeCreatesNamedSession: boolean;
        claudeResumesSameSession: boolean;
        codexInitialIsPersistent: boolean;
        codexResumesSameSession: any;
        codexCapturesNativeSession: boolean;
        cursorInitialCapturesSession: boolean;
        cursorTrustsHeadlessWorkspace: any;
        cursorResumesSameSession: any;
        cursorParsesNativeSession: boolean;
        codexJsonFailureDetected: boolean;
        cursorJsonFailureDetected: boolean;
    };
};
