import { NormalizedTestAgentWorkOrder, TestAgentOptions, TestAgentWorkOrder, WorkOrderIssue } from "./types";
export declare function normalizeTestAgentWorkOrder(input: TestAgentWorkOrder, overrides?: Partial<TestAgentOptions>): {
    workOrder: NormalizedTestAgentWorkOrder;
    issues: WorkOrderIssue[];
};
