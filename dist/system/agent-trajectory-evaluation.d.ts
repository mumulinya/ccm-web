import type { CcmMainAgentHarnessV1, CcmMainAgentHarnessReceiptV1 } from "../agents/main-agent-harness";
import type { NativeQueryLoopResult } from "../agents/native-query-loop";
export declare const CCM_AGENT_TRAJECTORY_EVALUATION_SCHEMA: "ccm-agent-trajectory-evaluation-v1";
type Check = "passed" | "warning" | "failed" | "not_applicable";
export type CcmAgentTrajectoryEvaluationV1 = {
    schema: typeof CCM_AGENT_TRAJECTORY_EVALUATION_SCHEMA;
    scope: "global" | "group" | "project";
    exactSessionId: string;
    taskId?: string;
    score: number;
    checks: Record<string, Check>;
    blockerCodes: string[];
    contentStored: false;
};
export declare function evaluateAgentTrajectory(input: {
    harness: CcmMainAgentHarnessV1;
    harnessReceipt: CcmMainAgentHarnessReceiptV1;
    result: NativeQueryLoopResult;
    taskId?: string;
    elapsedMs?: number;
}): CcmAgentTrajectoryEvaluationV1;
export declare function recordAgentTrajectoryEvaluation(input: {
    harness: CcmMainAgentHarnessV1;
    harnessReceipt: CcmMainAgentHarnessReceiptV1;
    evaluation: CcmAgentTrajectoryEvaluationV1;
}): string;
export declare function loadAgentTrajectoryMetrics(): any[];
export {};
