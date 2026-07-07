import { BrowserAssertionSpec } from "../types";
export interface AcceptanceDerivedBrowserAssertion {
    criterion: string;
    assertion: BrowserAssertionSpec;
    reason: "quoted_text" | "explicit_url_path";
}
export declare function buildAcceptanceDerivedBrowserAssertions(criteria: string[]): AcceptanceDerivedBrowserAssertion[];
