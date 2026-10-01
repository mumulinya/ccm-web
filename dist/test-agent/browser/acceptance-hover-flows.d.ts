import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_HOVER_FLOW_PROBE_TYPE = "acceptance_hover_flow";
export interface AcceptanceHoverFlow {
    criterion: string;
    url: string;
    path: string;
    targetRole: "button" | "link";
    targetName: string;
    expectedText: string;
}
export declare function buildAcceptanceHoverFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceHoverFlow[];
export declare function buildAcceptanceHoverFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
