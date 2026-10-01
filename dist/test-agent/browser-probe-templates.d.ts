import { BrowserCheckSpec, BrowserProbeTemplateSpec, WorkOrderIssue } from "./types";
export declare function buildAdversarialBrowserProbeChecks(input: {
    project: string;
    templates: BrowserProbeTemplateSpec[];
    issues?: WorkOrderIssue[];
}): BrowserCheckSpec[];
