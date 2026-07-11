import { TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
export declare const TEST_AGENT_SELF_TEST_ADVERSARIAL_WAIVER = "This legacy self-test isolates a different TestAgent capability; the adversarial gate has dedicated strict-mode coverage.";
export declare function normalizeTestAgentWorkOrderForSelfTest(input: TestAgentWorkOrder, overrides?: TestAgentRuntimeOptions): {
    workOrder: import("./types").NormalizedTestAgentWorkOrder;
    issues: import("./types").WorkOrderIssue[];
};
export declare function runTestAgentForSelfTest(input: TestAgentWorkOrder, options?: TestAgentRuntimeOptions): Promise<import("./types").TestAgentReport>;
