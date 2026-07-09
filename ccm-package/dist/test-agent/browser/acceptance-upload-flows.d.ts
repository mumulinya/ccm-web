import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE = "acceptance_upload_flow";
export interface AcceptanceUploadFlow {
    criterion: string;
    url: string;
    path: string;
    fieldLabel: string;
    fileName: string;
    fileContent: string;
    mediaType: string;
    buttonName: string;
    expectedText: string;
}
export declare function buildAcceptanceUploadFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): AcceptanceUploadFlow[];
export declare function buildAcceptanceUploadFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
