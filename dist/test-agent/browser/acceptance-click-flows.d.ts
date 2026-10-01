import { BrowserAssertionSpec, BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_CLICK_FLOW_PROBE_TYPE = "acceptance_click_flow";
export interface AcceptanceClickTarget {
    targetRole: "button" | "link";
    targetName: string;
}
export interface AcceptanceClickFlow {
    criterion: string;
    url: string;
    path: string;
    expectedUrlPath: string;
    targetRole: "button" | "link";
    targetName: string;
    targets: AcceptanceClickTarget[];
    expectedText: string;
    derivedAssertions: BrowserAssertionSpec[];
}
export declare function buildAcceptanceClickFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceClickFlow[];
export declare function buildAcceptanceClickFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
