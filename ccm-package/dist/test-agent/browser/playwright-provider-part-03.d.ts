import { BrowserActionSpec, BrowserAssertionSpec, BrowserCheckResult, BrowserCheckSpec, BrowserStepResult, NormalizedTestAgentProjectTarget } from "../types";
import { BrowserProviderContext } from "./provider-types";
import { BrowserRuntimeSignals } from "./playwright-provider-part-01";
export declare function runAction(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult>;
export declare function runAssertion(page: any, assertion: BrowserAssertionSpec, signals: BrowserRuntimeSignals, defaultTimeout: number): Promise<BrowserStepResult>;
export declare function runBrowserCheck(browser: any, context: BrowserProviderContext, project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number): Promise<BrowserCheckResult>;
