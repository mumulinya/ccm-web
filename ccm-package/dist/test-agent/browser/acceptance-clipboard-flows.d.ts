import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE = "acceptance_clipboard_flow";
export interface AcceptanceClipboardFlow {
    criterion: string;
    url: string;
    path: string;
    targetRole: "button" | "link";
    targetName: string;
    expectation: "equals" | "includes";
    expectedClipboardText: string;
}
export declare function acceptanceClipboardIntent(criterion: string): boolean;
export declare function buildAcceptanceClipboardFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceClipboardFlow[];
export declare function buildAcceptanceClipboardFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
