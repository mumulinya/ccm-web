/** Resolve only short lived environment values. The returned object must never be persisted. */
export declare function injectAgentRunSecrets(runId: string): {
    environment: Record<string, string>;
    bindingIds: string[];
};
export declare function revokeAgentRunSecrets(runId: string): string[];
