import { type ResolvedProjectTestTarget } from "./project-test-targets";
export declare function buildProjectTestTargetBrowserChecks(target: ResolvedProjectTestTarget, workDir: string): any[];
export declare function projectTestAgentProblems(review: any): string[];
export declare function projectTestAgentReworkProblems(review: any): string[];
export declare function runProjectTaskTestAgentReview(input: {
    task: any;
    project: string;
    workDir: string;
    workerResults: any[];
    acceptanceCriteria?: string[];
    workItems?: any[];
    fallbackVerificationCommands?: string[];
    round: number;
    reviewCycleId?: string;
    issuedBy?: string;
    previousReview?: any;
}): Promise<{
    canAccept: boolean;
    status: string;
    error: string;
    plan: any;
    handoff: {
        schema: string;
        id: string;
        taskId: any;
        groupId: string;
        issuedBy: string;
        originalUserGoal: any;
        acceptanceCriteria: string[];
        completedTasks: string[];
        completedByProjectAgents: string[];
        projects: {
            name: string;
            workDir: string;
            targetUrl: string;
            devServerCommand: string;
            changedFiles: string[];
            completedTasks: string[];
            acceptanceCriteria: string[];
            verificationCommands: string[];
            browserChecks: any[];
            browserScenarios: string[];
            agentSummary: string;
            risks: any[];
        }[];
        options: {
            agenticPlanning: boolean;
            adversarialProbeWaiver?: string;
            verificationOnly: boolean;
            browserProvider: string;
            autoDiscoverVerificationCommands: boolean;
            collectBrowserArtifacts: boolean;
            requireAdversarialProbe: boolean;
        };
        metadata: {
            handoffSource: string;
            projectSessionId: any;
            projectMainRunId: any;
            projectTestTargets: {
                id: string;
                name: string;
                kind: import("./project-test-targets").ProjectTestTargetKind;
                environment: string;
                checksum: string;
                required: boolean;
                authMode: import("./project-test-targets").ProjectTestTargetAuthMode;
                auth: {
                    loginPath: string;
                    submitLabel: string;
                    successText: string;
                    successUrlIncludes: string;
                    storageStatePath: string;
                    existingSessionProvider: string;
                    fields: {
                        label: string;
                        envName: string;
                        inputLabel: string;
                    }[];
                };
            }[];
            reviewRound: number;
            reviewCycleId: string;
            reviewPolicy: import("../collaboration/test-agent-review-policy").TestAgentReviewPolicy;
            incrementalScope: import("../collaboration/test-agent-review-policy").TestAgentIncrementalScope;
        };
    };
} | {
    decision: {
        route: import("../collaboration/test-agent-review-policy").TestAgentFailureRoute;
        reason: string;
    };
    failureRoute: import("../collaboration/test-agent-review-policy").TestAgentFailureRoute;
    canAccept: boolean;
    status: "completed" | "cancelled" | "failed" | "passed" | "running" | "partial" | "blocked" | "interrupted" | "rejected" | "queued" | "runtime_error";
    error: string;
    plan: any;
    invocation: import("../../test-agent").TestAgentInvocationResult;
    report: import("../../test-agent").TestAgentReport;
    verdict: import("../../test-agent").TestAgentVerdict;
    handoff: {
        schema: string;
        id: string;
        taskId: any;
        groupId: string;
        issuedBy: string;
        originalUserGoal: any;
        acceptanceCriteria: string[];
        completedTasks: string[];
        completedByProjectAgents: string[];
        projects: {
            name: string;
            workDir: string;
            targetUrl: string;
            devServerCommand: string;
            changedFiles: string[];
            completedTasks: string[];
            acceptanceCriteria: string[];
            verificationCommands: string[];
            browserChecks: any[];
            browserScenarios: string[];
            agentSummary: string;
            risks: any[];
        }[];
        options: {
            agenticPlanning: boolean;
            adversarialProbeWaiver?: string;
            verificationOnly: boolean;
            browserProvider: string;
            autoDiscoverVerificationCommands: boolean;
            collectBrowserArtifacts: boolean;
            requireAdversarialProbe: boolean;
        };
        metadata: {
            handoffSource: string;
            projectSessionId: any;
            projectMainRunId: any;
            projectTestTargets: {
                id: string;
                name: string;
                kind: import("./project-test-targets").ProjectTestTargetKind;
                environment: string;
                checksum: string;
                required: boolean;
                authMode: import("./project-test-targets").ProjectTestTargetAuthMode;
                auth: {
                    loginPath: string;
                    submitLabel: string;
                    successText: string;
                    successUrlIncludes: string;
                    storageStatePath: string;
                    existingSessionProvider: string;
                    fields: {
                        label: string;
                        envName: string;
                        inputLabel: string;
                    }[];
                };
            }[];
            reviewRound: number;
            reviewCycleId: string;
            reviewPolicy: import("../collaboration/test-agent-review-policy").TestAgentReviewPolicy;
            incrementalScope: import("../collaboration/test-agent-review-policy").TestAgentIncrementalScope;
        };
    };
    runner: import("../collaboration/test-agent-runner").TestAgentRunnerRecord;
    reviewPolicy: import("../collaboration/test-agent-review-policy").TestAgentReviewPolicy;
    incrementalScope: import("../collaboration/test-agent-review-policy").TestAgentIncrementalScope;
}>;
