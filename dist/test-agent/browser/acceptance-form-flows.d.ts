import { BrowserAssertionSpec, BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_FORM_FLOW_PROBE_TYPE = "acceptance_form_flow";
export interface AcceptanceFormFlowField {
    actionType?: "fill" | "selectOption" | "check" | "uncheck";
    fieldLabel: string;
    inputValue: string;
}
export interface AcceptanceFormFlow {
    criterion: string;
    url: string;
    path: string;
    expectedUrlPath: string;
    reloadBeforeAssertions: boolean;
    adversarial: boolean;
    fields: AcceptanceFormFlowField[];
    fieldLabel: string;
    inputValue: string;
    buttonName: string;
    expectedText: string;
    derivedAssertions: BrowserAssertionSpec[];
}
export declare function buildAcceptanceFormFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceFormFlow[];
export declare function buildAcceptanceFormFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
