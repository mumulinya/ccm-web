export declare function runTestAgentAutoBrowserSmokeSelfTest(): Promise<{
    pass: boolean;
    report: import("..").TestAgentReport;
    calls: any[];
    autoCheck: import("..").BrowserCheckSpec;
    derivedAssertions: import("../browser/acceptance-derived-checks").AcceptanceDerivedBrowserAssertion[];
}>;
