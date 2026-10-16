import type { NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "./types";
export declare function prepareTestAgentReverification(original: NormalizedTestAgentWorkOrder, execution: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions): {
    workOrder: NormalizedTestAgentWorkOrder;
    summary: {
        mode: string;
        fallbackReasons: string[];
        reusedEvidence: any[];
        configurationChecksum?: undefined;
        selectedCheckIds?: undefined;
    };
} | {
    workOrder: {
        projects: {
            verificationCommands: string[];
            name: string;
            workDir: string;
            runCommand: string;
            devServerCommand: string;
            targetUrl: string;
            startupUrl: string;
            startupTimeoutMs: number;
            env: Record<string, string>;
            changedFiles: string[];
            httpChecks: import("./types-specs").HttpCheckSpec[];
            adversarialHttpChecks: import("./types-specs").HttpCheckSpec[];
            adversarialBrowserChecks: import("./types-specs").BrowserCheckSpec[];
            browserChecks: import("./types-specs").BrowserCheckSpec[];
            browserScenarios?: string[];
            agentSummary: string;
            risks: string[];
            editablePaths?: string[];
            readOnlyPaths?: string[];
            cleanupPaths?: string[];
            synchronizedFixturePaths?: Array<{
                path: string;
                allowedChanges: string[];
            }>;
            verificationRoot?: string;
        }[];
        schema: "ccm-test-agent-work-order-v1";
        id: string;
        taskId: string;
        groupId: string;
        issuedBy: string;
        originalUserGoal: string;
        acceptanceCriteria: string[];
        requiredChecks: import("./types-specs").TestAgentRequiredCheck[];
        options: Required<import("./types-specs").TestAgentOptions>;
        metadata: Record<string, any>;
    };
    summary: {
        mode: string;
        fallbackReasons: any[];
        configurationChecksum: string;
        selectedCheckIds: any[];
        reusedEvidence: any[];
    };
};
