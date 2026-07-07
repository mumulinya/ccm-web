import { BrowserAssertionSpec, BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
export declare const AUTO_BROWSER_SMOKE_PROBE_TYPE = "auto_target_url_smoke";
export declare function autoPageContentAssertion(): BrowserAssertionSpec;
export declare function buildAutoBrowserSmokeCheck(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec | null;
export declare function buildBrowserChecksForProject(project: NormalizedTestAgentProjectTarget, acceptanceCriteria?: string[]): BrowserCheckSpec[];
