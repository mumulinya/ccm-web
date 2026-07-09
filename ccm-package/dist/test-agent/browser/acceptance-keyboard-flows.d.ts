import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE = "acceptance_keyboard_flow";
export interface AcceptanceKeyboardFlow {
    criterion: string;
    url: string;
    path: string;
    key: string;
    expectedText: string;
}
export declare function acceptanceKeyboardIntent(criterion: string): boolean;
export declare function buildAcceptanceKeyboardFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceKeyboardFlow[];
export declare function buildAcceptanceKeyboardFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
