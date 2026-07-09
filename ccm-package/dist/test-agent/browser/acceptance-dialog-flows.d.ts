import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE = "acceptance_dialog_flow";
export interface AcceptanceDialogFlow {
    criterion: string;
    url: string;
    path: string;
    targetRole: "button" | "link";
    targetName: string;
    dialogType: "alert" | "confirm" | "prompt" | "";
    messageIncludes: string;
}
export declare function acceptanceDialogIntent(criterion: string): boolean;
export declare function buildAcceptanceDialogFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceDialogFlow[];
export declare function buildAcceptanceDialogFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
