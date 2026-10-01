import { BrowserCheckResult, BrowserToolCallRecord, CommandRunResult, DevServerResult, HttpCheckResult, NormalizedTestAgentWorkOrder, RequiredCheckCoverageItem } from "./types";
export declare function buildRequiredCheckCoverage(input: {
    workOrder: NormalizedTestAgentWorkOrder;
    commandResults: CommandRunResult[];
    devServerResults: DevServerResult[];
    httpResults: HttpCheckResult[];
    browserResults: BrowserCheckResult[];
    browserToolCalls: BrowserToolCallRecord[];
}): RequiredCheckCoverageItem[];
