import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE = "acceptance_network_state_flow";
export interface AcceptanceNetworkStateFlow {
    criterion: string;
    url: string;
    path: string;
    mode: "offline" | "online_recovery";
    expectedText: string;
}
export declare function acceptanceNetworkStateIntent(criterion: string): boolean;
export declare function buildAcceptanceNetworkStateFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceNetworkStateFlow[];
export declare function buildAcceptanceNetworkStateFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
