import { AcceptanceCoverageItem, BrowserCheckResult, CommandRunResult, DevServerResult, HttpCheckResult, RequiredCheckCoverageItem, TestAgentFailureSummaryItem, WorkOrderIssue } from "./types";
export declare function buildTestAgentFailureSummary(input: {
    issues: WorkOrderIssue[];
    commandResults: CommandRunResult[];
    devServerResults: DevServerResult[];
    httpResults: HttpCheckResult[];
    browserResults: BrowserCheckResult[];
    requiredCheckCoverage: RequiredCheckCoverageItem[];
    acceptanceCoverage: AcceptanceCoverageItem[];
}): TestAgentFailureSummaryItem[];
