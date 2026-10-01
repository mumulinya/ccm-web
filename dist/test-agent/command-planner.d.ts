import { NormalizedTestAgentWorkOrder, WorkOrderIssue } from "./types";
export interface PlannedVerificationCommand {
    project: string;
    command: string;
    script: string;
    reason: string;
    source: string;
    packageManager: string;
}
export declare function planVerificationCommands(workOrder: NormalizedTestAgentWorkOrder, issues?: WorkOrderIssue[]): {
    workOrder: NormalizedTestAgentWorkOrder;
    issues: WorkOrderIssue[];
    plannedCommands: PlannedVerificationCommand[];
};
