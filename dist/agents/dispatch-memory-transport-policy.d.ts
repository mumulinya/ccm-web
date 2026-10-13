/** A reference to a scoped MCP snapshot is not evidence that its full memory
 * text was injected into the provider prompt. Keep the two transport claims
 * separate; the MCP server independently checks scope and read authorization. */
export declare function dispatchMemoryTransportPolicy(memory: any, renderedText: string): {
    renderedMemoryContext: string;
    requireMemoryPromptInjectionProof: boolean;
    requireTrustedMemoryPromptEnvelope: boolean;
    requireProviderMemoryChannelAcknowledgement: boolean;
};
export declare function admitDispatchMemoryTransport(memoryBundle: any, options: any, admitPrompt: (memory: any, options: any) => any): any;
