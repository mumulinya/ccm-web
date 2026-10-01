export type CcmMainAgentContextScope = "global" | "group" | "project";
export type CcmMainAgentContextLayer = "stablePrefix" | "scopeDirectory" | "sessionContext" | "turnContext" | "toolResults";
export type CcmMainAgentCapabilityDirectoryV1 = {
    schema: "ccm-main-agent-capability-directory-v1";
    identity: {
        scope: CcmMainAgentContextScope;
        scopeId: string;
        exactSessionId: string;
        generation: number;
    };
    scopeInstructions: CcmCapabilityCatalogGroupV1;
    sharedFiles: CcmCapabilityCatalogGroupV1;
    knowledge: CcmCapabilityCatalogGroupV1;
    skills: CcmCapabilityCatalogGroupV1;
    mcp: CcmCapabilityCatalogGroupV1;
    memberProjects: Array<{
        projectId: string;
        name: string;
    }>;
    checksum: string;
    contentStored: false;
};
export type CcmCapabilityCatalogGroupV1 = {
    available: number;
    catalogVisible: number;
    loaded: number;
    invoked: number;
    tokens: number;
    names: string[];
    readTools: string[];
    contentStored: false;
};
export type CcmMainAgentContextEnvelopeV1 = {
    schema: "ccm-main-agent-context-envelope-v1";
    identity: {
        scope: CcmMainAgentContextScope;
        scopeId: string;
        exactSessionId: string;
        generation: number;
    };
    stablePrefixChecksum: string;
    scopeDirectoryChecksum: string;
    capabilityDirectoryChecksum: string;
    sessionContextChecksum: string;
    loadedContextChecksums: string[];
    turnContextChecksum: string;
    toolResultsChecksum: string;
    layerTokens: Record<CcmMainAgentContextLayer, number>;
    contentStored: false;
};
export declare function buildMainAgentCapabilityDirectoryV1(input: {
    scope: CcmMainAgentContextScope;
    scopeId: string;
    exactSessionId: string;
    generation?: number;
    toolContext?: any;
    loadedContextItems?: any;
    memberProjects?: Array<{
        projectId?: string;
        id?: string;
        name?: string;
    }>;
    sharedFiles?: {
        available?: number;
        names?: string[];
        loaded?: number;
        tokens?: number;
        readTool?: string;
    };
    scopeInstructions?: {
        available?: number;
        names?: string[];
        loaded?: number;
        tokens?: number;
    };
}): CcmMainAgentCapabilityDirectoryV1;
export declare function buildMainAgentContextEnvelopeV1(input: {
    scope: CcmMainAgentContextScope;
    scopeId: string;
    exactSessionId: string;
    generation?: number;
    messages?: any[];
    tools?: any[];
    capabilityDirectory: CcmMainAgentCapabilityDirectoryV1;
    loadedContextChecksums?: unknown[];
}): CcmMainAgentContextEnvelopeV1;
export declare function alignMainAgentContextEnvelopeTokens(envelope: CcmMainAgentContextEnvelopeV1 | null | undefined, totalTokensInput: number): {
    layerTokens: Record<CcmMainAgentContextLayer, number>;
    schema: "ccm-main-agent-context-envelope-v1";
    identity: {
        scope: CcmMainAgentContextScope;
        scopeId: string;
        exactSessionId: string;
        generation: number;
    };
    stablePrefixChecksum: string;
    scopeDirectoryChecksum: string;
    capabilityDirectoryChecksum: string;
    sessionContextChecksum: string;
    loadedContextChecksums: string[];
    turnContextChecksum: string;
    toolResultsChecksum: string;
    contentStored: false;
};
export declare function mainAgentLoadedContextChecksums(loadedContextItems: any): string[];
