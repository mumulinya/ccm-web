export type AgentRuntimeId = "claudecode" | "claude" | "cursor" | "gemini" | "codex";
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
    buildCommand: (msgFile: string) => string;
}
export declare const AGENT_RUNTIMES: AgentRuntimeDescriptor[];
export declare function normalizeAgentRuntimeId(agentType?: string): AgentRuntimeId;
export declare function getAgentRuntime(agentType?: string): AgentRuntimeDescriptor;
export declare function buildAgentCommand(agentType: string, msgFile: string): string;
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
