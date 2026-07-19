/**
 * Lightweight credibility self-tests (no browser launch).
 * Locks fail-closed URL waits, upload path escape, review decision alignment,
 * and provider-gap → Playwright recheck reroute.
 */
export declare function runTestAgentMcpLiveUrlFailClosedSelfTest(): Promise<{
    pass: boolean;
}>;
export declare function runTestAgentUploadPathEscapeSelfTest(): {
    pass: boolean;
};
export declare function runTestAgentIndependentReviewDecisionAlignmentSelfTest(): {
    pass: boolean;
};
export declare function runTestAgentProviderGapForcesPlaywrightRecheckSelfTest(): {
    pass: boolean;
};
export declare function runTestAgentFlakyHardBlocksAcceptSelfTest(): {
    pass: boolean;
};
export declare function runTestAgentEnvironmentPrepStructuredSelfTest(): {
    pass: boolean;
};
export declare function runTestAgentPetActivityKeySelfTest(): {
    pass: boolean;
};
