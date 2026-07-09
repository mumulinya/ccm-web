import { BrowserAssertionSpec } from "../types";
export interface AcceptanceDerivedBrowserAssertion {
    criterion: string;
    assertion: BrowserAssertionSpec;
    reason: "quoted_text" | "explicit_url_path";
}
export interface AcceptanceDerivedBrowserCriterionAssertions {
    criterion: string;
    assertions: AcceptanceDerivedBrowserAssertion[];
}
export declare function buildAcceptanceDerivedBrowserAssertionsByCriterion(criteria: string[]): AcceptanceDerivedBrowserCriterionAssertions[];
export declare function buildAcceptanceDerivedBrowserAssertions(criteria: string[]): AcceptanceDerivedBrowserAssertion[];
