import { BrowserCheckSpec, WorkOrderIssue } from "./types";
export declare function browserCheckContractPrompt(): string;
export interface PlannedBrowserCheckValidation {
    checks: BrowserCheckSpec[];
    issues: WorkOrderIssue[];
    droppedChecks: number;
    droppedActions: number;
    droppedAssertions: number;
}
/**
 * 校验规划模型产出的浏览器检查：丢弃无法识别的动作/断言，
 * 保留仍有断言的检查，并强制打开截图与验收标准绑定。
 */
export declare function validatePlannedBrowserChecks(raw: any, projectName: string, acceptanceCriteria?: string[]): PlannedBrowserCheckValidation;
