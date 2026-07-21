import { BrowserCheckSpec, BrowserCheckResult, CommandRunResult, HttpCheckResult, HttpCheckSpec, NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions, WorkOrderIssue } from "./types";
export interface AgenticTestProjectPlan {
    name: string;
    rationale?: string;
    commands?: string[];
    httpChecks?: HttpCheckSpec[];
    browserChecks?: BrowserCheckSpec[];
}
export interface AgenticTestPlan {
    summary?: string;
    inspectedFiles?: string[];
    projects?: AgenticTestProjectPlan[];
}
export interface AgenticTestPlanningInput {
    workOrder: NormalizedTestAgentWorkOrder;
    sourceContext: Array<{
        project: string;
        files: string[];
        packageScripts: Record<string, string>;
        excerpts: Array<{
            file: string;
            content: string;
        }>;
    }>;
}
export interface AgenticTestFollowupInput {
    workOrder: NormalizedTestAgentWorkOrder;
    commandResults: CommandRunResult[];
    httpResults: HttpCheckResult[];
    browserResults: BrowserCheckResult[];
}
export interface AgenticTestFollowupPlan {
    summary?: string;
    projects?: Array<{
        name: string;
        rationale?: string;
        commands?: string[];
    }>;
}
export declare function applyAgenticTestPlanning(workOrder: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions): Promise<{
    workOrder: NormalizedTestAgentWorkOrder;
    issues: WorkOrderIssue[];
}>;
export declare function planAgenticTestFollowup(input: AgenticTestFollowupInput, runtime: TestAgentRuntimeOptions): Promise<{
    workOrder: NormalizedTestAgentWorkOrder | null;
    metadata: any;
    issue?: WorkOrderIssue;
}>;
