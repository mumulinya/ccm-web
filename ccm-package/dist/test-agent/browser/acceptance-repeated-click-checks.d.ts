import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE = "acceptance_repeated_click";
export declare function acceptanceRepeatedClickIntent(criterion: string): boolean;
export declare function buildAcceptanceRepeatedClickBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
