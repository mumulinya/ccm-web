import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_POPUP_FLOW_PROBE_TYPE = "acceptance_popup_flow";
export interface AcceptancePopupFlow {
    criterion: string;
    url: string;
    path: string;
    targetRole: "button" | "link";
    targetName: string;
    popupUrlPath: string;
    popupTextIncludes: string;
    popupTitleIncludes: string;
}
export declare function acceptancePopupIntent(criterion: string): boolean;
export declare function buildAcceptancePopupFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptancePopupFlow[];
export declare function buildAcceptancePopupFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
