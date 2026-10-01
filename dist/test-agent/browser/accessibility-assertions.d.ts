import { BrowserAssertionSpec } from "../types";
export declare function browserAccessibilityAssertionExpected(assertion: BrowserAssertionSpec): string;
export declare function browserAccessibilityAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function waitForBrowserAccessibilityAssertion(locator: any, assertion: BrowserAssertionSpec, timeout: number): Promise<{
    passed: boolean;
    actualLength: number;
    expectedLength: number;
}>;
