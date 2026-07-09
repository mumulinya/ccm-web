import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE = "acceptance_download_flow";
export interface AcceptanceDownloadFlow {
    criterion: string;
    url: string;
    path: string;
    buttonName: string;
    fileName: string;
    contentIncludes: string;
}
export declare function buildAcceptanceDownloadFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceDownloadFlow[];
export declare function buildAcceptanceDownloadFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
