import type { NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "./types";
import type { VerificationFailureObservation } from "./failure-observation";
type PreflightFailure = VerificationFailureObservation & {
    project?: string;
    status: "blocked";
};
/** No subprocess, model call, installation, login or target request. */
export declare function preflightVerificationEnvironment(workOrder: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions, phase: "before_planning" | "before_execution"): Promise<{
    schema: string;
    phase: "before_planning" | "before_execution";
    status: string;
    identity: {
        status: string;
        taskId: string;
        runId?: undefined;
        attemptId?: undefined;
        traceId?: undefined;
    } | {
        status: string;
        taskId: string;
        runId: string;
        attemptId: string;
        traceId: string;
    };
    bindingChecksum: string;
    failures: PreflightFailure[];
    providers: import("./browser/registry").BrowserProviderPreflightResult[];
}>;
export {};
