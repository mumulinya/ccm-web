import type { NormalizedTestAgentWorkOrder, WorkOrderIssue } from "./types";
import type { TestAgentIsolationSession } from "./isolation";
export type TestAgentIsolationExecutionGate = {
    schema: "ccm-test-agent-isolation-execution-gate-v1";
    allowed: boolean;
    blockedCount: number;
    commandBlockedCount: number;
    httpBlockedCount: number;
    browserBlockedCount: number;
    receiptChecksum: string;
    contentStored: false;
};
/** Apply the isolation policy after planning so model-added checks cannot bypass it. */
export declare function applyTestAgentIsolationExecutionGate(workOrder: NormalizedTestAgentWorkOrder, session: TestAgentIsolationSession | null): {
    workOrder: NormalizedTestAgentWorkOrder;
    issues: WorkOrderIssue[];
    gate: TestAgentIsolationExecutionGate;
};
