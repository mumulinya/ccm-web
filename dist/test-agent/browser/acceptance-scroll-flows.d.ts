import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE = "acceptance_scroll_flow";
export interface AcceptanceScrollFlow {
    criterion: string;
    url: string;
    path: string;
    direction: "up" | "down" | "left" | "right";
    amount: number;
    repetitions: number;
    expectedText: string;
}
export declare function buildAcceptanceScrollFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceScrollFlow[];
export declare function buildAcceptanceScrollFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
