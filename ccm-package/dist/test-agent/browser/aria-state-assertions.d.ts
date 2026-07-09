import { BrowserAssertionSpec } from "../types";
export declare function isBrowserAriaStateAssertion(assertion: BrowserAssertionSpec): any;
export declare function browserAriaStateAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function waitForBrowserAriaStateAssertion(locator: any, assertion: BrowserAssertionSpec, timeout: number): Promise<{
    passed: boolean;
    actual: string;
    expected: string;
    attribute: string;
}>;
