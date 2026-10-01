export type CcmGlobalContextLayer = "stablePrefix" | "routingDirectory" | "sessionContext" | "turnContext" | "toolResults";
export type CcmGlobalRoutingDirectoryV2 = {
    schema: "ccm-global-routing-directory-v2";
    projectCount: number;
    groupCount: number;
    projects: Array<{
        id: string;
        name: string;
        displayName?: string;
    }>;
    groups: Array<{
        id: string;
        name: string;
    }>;
    checksum: string;
    contentStored: false;
};
export type CcmGlobalAgentContextEnvelopeV2 = {
    schema: "ccm-global-agent-context-envelope-v2";
    identity: {
        scope: "global";
        scopeId: "global";
        exactSessionId: string;
        generation: number;
    };
    stablePrefixChecksum: string;
    routingDirectoryChecksum: string;
    sessionContextChecksum: string;
    loadedContextChecksums: string[];
    turnContextChecksum: string;
    layerTokens: Record<CcmGlobalContextLayer, number>;
    contentStored: false;
};
export type CcmGlobalModelContextProjectionV2 = {
    schema: "ccm-global-model-context-projection-v2";
    routingDirectory: CcmGlobalRoutingDirectoryV2;
    requestedDispatchTargets: any;
    sessionContext: {
        boundaryGeneration: number;
        summaryAvailable: boolean;
        loadedScopeInstructionCount: number;
        loadedContextChecksums: string[];
        loadedScopeInstructionContext: string;
    };
    scopeInstructionCatalog: Array<{
        documentId: string;
        kind: string;
        projectId?: string;
        groupId?: string;
        status: string;
        generation: number;
        revision: number;
        checksum?: string;
        readTool: "read_scope_instruction";
        contentStored: false;
    }>;
    availableDetailTools: string[];
    sourceInquiryTools: ["request_project_source_inquiry", "request_group_source_inquiry"];
    memoryContextBoundary: any;
    contentStored: false;
};
export declare function buildGlobalRoutingDirectoryV2(context: any): CcmGlobalRoutingDirectoryV2;
export declare function buildGlobalModelContextProjectionV2(context: any): CcmGlobalModelContextProjectionV2;
export declare function buildGlobalAgentContextEnvelopeV2(input: {
    exactSessionId: string;
    generation: number;
    stablePrefix: unknown;
    routingDirectory: CcmGlobalRoutingDirectoryV2;
    sessionContext: unknown;
    loadedContextChecksums?: unknown[];
    turnContext: unknown;
    toolResults?: unknown;
}): CcmGlobalAgentContextEnvelopeV2;
export declare function alignGlobalAgentContextEnvelopeTokens(envelope: CcmGlobalAgentContextEnvelopeV2 | null | undefined, totalTokensInput: number): {
    layerTokens: Record<CcmGlobalContextLayer, number>;
    schema: "ccm-global-agent-context-envelope-v2";
    identity: {
        scope: "global";
        scopeId: "global";
        exactSessionId: string;
        generation: number;
    };
    stablePrefixChecksum: string;
    routingDirectoryChecksum: string;
    sessionContextChecksum: string;
    loadedContextChecksums: string[];
    turnContextChecksum: string;
    contentStored: false;
};
