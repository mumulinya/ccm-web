import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE = "acceptance_history_flow";
export interface AcceptanceHistoryFlow {
    criterion: string;
    url: string;
    initialPath: string;
    destinationPath: string;
    targetRole: "button" | "link";
    targetName: string;
    mode: "back" | "back_forward";
    backExpectedText: string;
    forwardExpectedText: string;
}
export declare function acceptanceHistoryIntent(criterion: string): boolean;
export declare function buildAcceptanceHistoryFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceHistoryFlow[];
export declare function buildAcceptanceHistoryFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
