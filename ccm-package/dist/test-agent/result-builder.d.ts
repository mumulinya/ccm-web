import { BrowserCheckResult, BrowserToolCallRecord, BrowserResourceLifecycleEvent, CommandRunResult, DevServerResult, HttpCheckResult, NormalizedTestAgentWorkOrder, TestAgentReport, WorkOrderIssue } from "./types";
export declare function buildTestAgentReport(input: {
    workOrder: NormalizedTestAgentWorkOrder;
    startedAt: string;
    issues: WorkOrderIssue[];
    commandResults: CommandRunResult[];
    devServerResults: DevServerResult[];
    httpResults?: HttpCheckResult[];
    browserResults: BrowserCheckResult[];
    browserToolCalls?: BrowserToolCallRecord[];
    browserResourceLifecycleEvents?: BrowserResourceLifecycleEvent[];
}): TestAgentReport;
