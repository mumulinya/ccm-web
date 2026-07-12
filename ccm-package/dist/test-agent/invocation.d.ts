import { TestAgentArtifactVerification } from "./artifact-verifier";
import { TestAgentContractIssue } from "./contract";
import { TestAgentReport, TestAgentRuntimeOptions, TestAgentStatus, TestAgentVerdict, TestAgentWorkOrder } from "./types";
import { TestAgentHandoff } from "./work-order-builder";
export interface TestAgentInvocationRequest {
    schema: "ccm-test-agent-invocation-request-v1";
    source: "handoff" | "work_order";
    payload: TestAgentHandoff | TestAgentWorkOrder | unknown;
}
export interface TestAgentInvocationValidation {
    valid: boolean;
    errors: TestAgentContractIssue[];
    warnings: TestAgentContractIssue[];
}
export interface TestAgentInvocationResult {
    schema: "ccm-test-agent-invocation-result-v1";
    invocationId: string;
    source: "handoff" | "work_order" | "unknown";
    status: "completed" | "rejected" | "runtime_error";
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    inputValidation: TestAgentInvocationValidation;
    outputValidation?: TestAgentInvocationValidation;
    outcome?: TestAgentStatus;
    recommendation?: TestAgentReport["recommendation"];
    canAccept: boolean;
    report?: TestAgentReport;
    verdict?: TestAgentVerdict;
    artifactVerification?: TestAgentArtifactVerification;
    error?: string;
}
export declare function invokeTestAgent(request: unknown, runtime?: TestAgentRuntimeOptions): Promise<TestAgentInvocationResult>;
export declare function invokeTestAgentHandoff(handoff: TestAgentHandoff, runtime?: TestAgentRuntimeOptions): Promise<TestAgentInvocationResult>;
export declare function invokeTestAgentWorkOrder(workOrder: TestAgentWorkOrder, runtime?: TestAgentRuntimeOptions): Promise<TestAgentInvocationResult>;
