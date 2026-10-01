export declare function classifyGroupOrchestratorFailure(error: any): {
    kind: string;
    userSummary: string;
    userGuidance: string;
} & {
    guidance: string;
};
export declare function summarizeGroupOrchestratorProviderError(error: any): string;
export declare function runGroupOrchestratorFailureSelfTest(): {
    pass: boolean;
    checks: {
        workflowKeepsContract: boolean;
        payloadIsContextAfterTools: boolean;
        providerAfterToolsDoesNotSayUnavailable: boolean;
        emptyReplyIsNotUnavailable: boolean;
        coldProviderStillUnavailable: boolean;
    };
};
