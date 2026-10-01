import { TestAgentReport, TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
export declare function runTestAgent(input: TestAgentWorkOrder, options?: TestAgentRuntimeOptions): Promise<TestAgentReport>;
