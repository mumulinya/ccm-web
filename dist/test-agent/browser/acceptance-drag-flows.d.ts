import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_DRAG_FLOW_PROBE_TYPE = "acceptance_drag_flow";
export interface AcceptanceDragFlow {
    criterion: string;
    url: string;
    path: string;
    sourceText: string;
    destinationText: string;
    expectedText: string;
}
export declare function acceptanceDragIntent(criterion: string): boolean;
export declare function buildAcceptanceDragFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceDragFlow[];
export declare function buildAcceptanceDragFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
