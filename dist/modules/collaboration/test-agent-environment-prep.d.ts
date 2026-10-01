/**
 * Structured TestAgent environment preparation checklist.
 * Used when independent review is blocked on login / env / runtime conditions.
 * Never embeds secret values — only env names and non-sensitive hints.
 */
export type TestAgentEnvironmentPrep = {
    schema: "ccm-test-agent-environment-prep-v1";
    missingEnvNames: string[];
    storageStateHint: string;
    seedHints: string[];
    userSummary: string;
    readyEnvNames: string[];
};
export declare function buildTestAgentEnvironmentPrepChecklist(report?: any, verdict?: any): TestAgentEnvironmentPrep | null;
export declare function formatTestAgentEnvironmentPrepUserLines(prep: TestAgentEnvironmentPrep | null): string[];
export declare function applyTestAgentEnvironmentPrepToHandoff(handoff: any, prep: TestAgentEnvironmentPrep | null): any;
export type TestAgentScreenshotRef = {
    stepName: string;
    path: string;
    kind: "failure" | "capture";
    checkName?: string;
};
export declare function collectTestAgentFailureScreenshotRefs(report?: any): TestAgentScreenshotRef[];
export declare function formatFailureScreenshotTechnicalRows(refs?: TestAgentScreenshotRef[]): string[];
export declare function countTestAgentFlakyStabilityGroups(report?: any, verdict?: any): number;
