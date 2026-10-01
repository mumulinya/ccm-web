import { AcceptanceCoverageItem, BrowserCheckResult, BrowserToolCallRecord, CommandRunResult, DevServerResult, EvidenceItem, HttpCheckResult, NormalizedTestAgentWorkOrder, TestAgentStatus, WorkOrderIssue } from "./types";
export declare function buildAcceptanceCoverage(input: {
    workOrder: NormalizedTestAgentWorkOrder;
    status: TestAgentStatus;
    issues: WorkOrderIssue[];
    commandResults: CommandRunResult[];
    devServerResults: DevServerResult[];
    httpResults: HttpCheckResult[];
    browserResults: BrowserCheckResult[];
    browserToolCalls: BrowserToolCallRecord[];
    evidence: EvidenceItem[];
}): AcceptanceCoverageItem[];
