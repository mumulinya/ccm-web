import { BrowserAssertionSpec } from "../types";
export interface AcceptanceNetworkBrowserAssertion {
    assertion: BrowserAssertionSpec;
    urlPath: string;
}
export declare function buildAcceptanceNetworkBrowserAssertions(criterion: string): AcceptanceNetworkBrowserAssertion[];
