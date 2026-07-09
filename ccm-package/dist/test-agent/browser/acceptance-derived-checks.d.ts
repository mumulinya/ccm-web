import { BrowserAssertionSpec } from "../types";
export interface AcceptanceDerivedBrowserAssertion {
    criterion: string;
    assertion: BrowserAssertionSpec;
    reason: "quoted_text" | "explicit_url_path" | "accessible_name" | "accessible_description" | "aria_state" | "web_storage" | "browser_cookie" | "browser_network" | "negative_ui";
}
export interface AcceptanceDerivedBrowserCriterionAssertions {
    criterion: string;
    assertions: AcceptanceDerivedBrowserAssertion[];
}
export declare function buildAcceptanceDerivedBrowserAssertionsByCriterion(criteria: string[]): AcceptanceDerivedBrowserCriterionAssertions[];
export declare function buildAcceptanceDerivedBrowserAssertions(criteria: string[]): AcceptanceDerivedBrowserAssertion[];
