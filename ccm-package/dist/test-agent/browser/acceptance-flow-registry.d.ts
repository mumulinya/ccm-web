import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_FLOW_BUILDERS: Array<{
    kind: string;
    build: (project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[]) => BrowserCheckSpec[];
}>;
export declare const MAX_ACCEPTANCE_FLOW_CHECKS = 24;
/**
 * 从验收标准派生的浏览器流程检查。每个构建器只在标准命中对应交互时产出检查，
 * 失败的构建器不会中断其余构建器。
 */
export declare function buildAcceptanceFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
