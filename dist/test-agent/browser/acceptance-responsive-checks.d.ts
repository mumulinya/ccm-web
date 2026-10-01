import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const ACCEPTANCE_RESPONSIVE_PROBE_TYPE = "acceptance_responsive_viewport";
export declare function buildAcceptanceResponsiveBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
