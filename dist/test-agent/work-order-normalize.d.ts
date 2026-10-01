import { NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions, TestAgentWorkOrder, WorkOrderIssue } from "./types";
export declare function normalizeTestAgentWorkOrder(input: TestAgentWorkOrder, overrides?: TestAgentRuntimeOptions): {
    workOrder: NormalizedTestAgentWorkOrder;
    issues: WorkOrderIssue[];
};
