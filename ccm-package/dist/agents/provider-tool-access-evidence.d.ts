export declare const PROVIDER_TOOL_ACCESS_EVIDENCE_SCHEMA = "ccm-provider-tool-access-evidence-v1";
export declare function extractProviderToolAccessEvidence(agentType: string, rawOutput: string, binding?: any): {
    checksum: string;
    schema: string;
    version: number;
    provider: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    captureStatus: string;
    source: string;
    groupId: string;
    groupSessionId: string;
    taskId: string;
    executionId: string;
    taskAgentSessionId: string;
    nativeSessionId: string;
    runnerRequestId: string;
    parsedJsonEventCount: number;
    invalidJsonLineCount: number;
    accessEventCount: number;
    events: {
        eventIndex: number;
        eventType: string;
        toolName: string;
        operation: string;
        paths: string[];
        commands: string[];
        success: boolean;
        eventChecksum: string;
        searchableTextChecksum: string;
        searchableText: string;
    }[];
    capturedAt: string;
};
export declare function verifyProviderToolAccessEvidence(evidence: any, expected?: any): {
    valid: boolean;
    gaps: string[];
};
export declare function matchProviderToolAccessEvidence(evidence: any, references?: any[]): {
    matched: boolean;
    eventCount: any;
    events: any;
    verification: {
        valid: boolean;
        gaps: string[];
    };
};
export declare function runProviderToolAccessEvidenceSelfTest(): {
    valid: boolean;
    observed: boolean;
    matched: boolean;
    siblingRejected: boolean;
    tamperRejected: boolean;
    unsupportedExplicit: boolean;
};
