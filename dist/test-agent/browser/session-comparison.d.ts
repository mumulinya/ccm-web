import { BrowserSessionComparisonResult, BrowserSessionComparisonSpec, BrowserSessionComparisonValueSummary, BrowserStepResult } from "../types";
export interface BrowserSessionComparisonRuntime {
    name: string;
    page: {
        evaluate(expression: string): Promise<any>;
    };
}
export declare function summarizeBrowserSessionComparisonValue(value: any): BrowserSessionComparisonValueSummary;
export declare function runBrowserSessionComparison(input: {
    spec: BrowserSessionComparisonSpec;
    left: BrowserSessionComparisonRuntime;
    right: BrowserSessionComparisonRuntime;
    defaultTimeoutMs: number;
}): Promise<{
    step: BrowserStepResult;
    result: BrowserSessionComparisonResult;
}>;
