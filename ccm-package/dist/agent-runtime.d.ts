export type AgentRuntimeId = "claudecode" | "claude" | "cursor" | "gemini" | "codex" | "qoder";
export interface AgentCommandOptions {
    cliAllowedTools?: string[];
    mcpConfigPath?: string;
    sessionId?: string;
    resumeSession?: boolean;
    persistSession?: boolean;
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
export declare const AGENT_RUNTIMES: AgentRuntimeDescriptor[];
export declare function normalizeAgentRuntimeId(agentType?: string): AgentRuntimeId;
export declare function getAgentRuntime(agentType?: string): AgentRuntimeDescriptor;
export declare function buildAgentCommand(agentType: string, msgFile: string, options?: AgentCommandOptions): string;
export declare function getAgentCommandLabel(agentType: string): string;
export declare function getPublicAgentRuntimes(): {
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
}[];
export declare function isAgentRuntimeAvailable(agentType: string): boolean;
export declare function getAgentRuntimeFallbackChain(preferred?: string): AgentRuntimeId[];
export declare function resolveAvailableAgentRuntime(preferred?: string): {
    selected: AgentRuntimeId;
    preferred: AgentRuntimeId;
    chain: AgentRuntimeId[];
    switched: boolean;
};
export declare function normalizeAgentCommandOutput(agentType: string, rawOutput: string): {
    output: string;
    sessionId: string;
};
export declare function detectAgentCommandFailure(agentType: string, rawOutput: string, exitCode?: number | null, rawError?: string): {
    failed: boolean;
    message: string;
};
export declare function runAgentRuntimeSessionSelfTest(): {
    pass: boolean;
    checks: {
        claudeCreatesNamedSession: boolean;
        claudeResumesSameSession: boolean;
        codexInitialIsPersistent: boolean;
        codexResumesSameSession: boolean;
        codexCapturesNativeSession: boolean;
        cursorInitialCapturesSession: boolean;
        cursorResumesSameSession: boolean;
        cursorParsesNativeSession: boolean;
        codexJsonFailureDetected: boolean;
        cursorJsonFailureDetected: boolean;
    };
};
