import type { AgentRuntimeDescriptor } from "./runtime";
import type { AgentRunContext, ResumeInspection, RuntimeEvent, RuntimeHandle, RuntimeResult } from "./agent-run-types";
export interface AgentRuntimeAdapter {
    describe(): AgentRuntimeDescriptor;
    /** Construct the provider command while preserving runtime.ts semantics. */
    buildCommand?(messageFile: string, options?: any): string;
    start(input: AgentRunContext & {
        messageFile?: string;
        options?: any;
    }): Promise<RuntimeHandle>;
    resume(input: AgentRunContext & {
        messageFile?: string;
        options?: any;
    }): Promise<RuntimeHandle>;
    inspectResume(input: AgentRunContext & {
        options?: any;
    }): Promise<ResumeInspection>;
    cancel(input: AgentRunContext & {
        handle?: RuntimeHandle;
    }): Promise<void>;
    subscribe(handle: RuntimeHandle, onEvent: (event: RuntimeEvent) => void): void;
    collectUsage(result: RuntimeResult): any | null;
}
export interface RuntimeProbeResult {
    runtimeId: string;
    available: boolean;
    executablePath?: string;
    version?: string;
    capabilities: string[];
    modelIds?: string[];
    sessionResumeSupported: boolean;
    workspaceEditingSupported: boolean;
    externalRunnerSupported: boolean;
    reason?: string;
    checkedAt: string;
}
export interface AgentRuntimeRegistry {
    register(adapter: AgentRuntimeAdapter): void;
    unregister(runtimeId: string): void;
    resolve(runtimeId: string, deps?: any): AgentRuntimeAdapter;
    describe(runtimeId: string): AgentRuntimeDescriptor;
    probe(runtimeId: string): Promise<RuntimeProbeResult>;
    list(): AgentRuntimeDescriptor[];
}
export declare function getAgentRuntimeRegistry(): AgentRuntimeRegistry;
/**
 * Command construction stays in runtime.ts. This adapter is the stable
 * boundary used by persisted AgentRun records and future remote runtimes.
 */
export declare function createCommandRuntimeAdapter(runtimeId: string, deps?: any): AgentRuntimeAdapter;
export declare function getAgentRuntimeAdapter(runtimeId: string, deps?: any): AgentRuntimeAdapter;
