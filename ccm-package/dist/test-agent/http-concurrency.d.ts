import { HttpCheckResult, HttpConcurrencyAssertionSpec, HttpConcurrencyEvidence, HttpConcurrencySpec, HttpConcurrencySummary, HttpConcurrentRequestResult, HttpAssertionResult } from "./types";
export declare const MIN_HTTP_CONCURRENT_REQUESTS = 2;
export declare const MAX_HTTP_CONCURRENT_REQUESTS = 50;
export declare function httpConcurrencyValueAtPath(input: any, path: string): any;
export declare function concurrencyAggregatePaths(assertions?: HttpConcurrencyAssertionSpec[]): string[];
export declare function buildHttpConcurrencyValueEvidence(json: any, assertions?: HttpConcurrencyAssertionSpec[]): ({
    path: string;
    present: boolean;
    sha256?: undefined;
    serializedBytes?: undefined;
} | {
    path: string;
    present: boolean;
    sha256: string;
    serializedBytes: number;
})[];
export declare function interpolateHttpConcurrencyValue(value: any, requestIndex: number): any;
export declare function httpConcurrencySpecFor(check: {
    concurrency?: number | HttpConcurrencySpec;
}): HttpConcurrencySpec | undefined;
export declare function evaluateHttpConcurrencyAssertions(assertions: HttpConcurrencyAssertionSpec[], requests: HttpConcurrentRequestResult[]): HttpAssertionResult[];
export declare function buildHttpConcurrencyEvidence(input: {
    requested: number;
    requests: HttpConcurrentRequestResult[];
    aggregateAssertions: HttpConcurrencyAssertionSpec[];
}): HttpConcurrencyEvidence;
export declare function httpConcurrencyResultStatus(evidence: HttpConcurrencyEvidence | undefined): "passed" | "failed" | "blocked";
export declare function buildHttpConcurrencySummary(httpResults?: HttpCheckResult[]): HttpConcurrencySummary;
export declare function formatHttpConcurrencySummaryLine(summary: HttpConcurrencySummary | undefined): string;
export declare function httpConcurrencyEvidenceErrors(evidence: HttpConcurrencyEvidence | undefined, label?: string): string[];
export declare function httpConcurrencySummaryErrors(summary: HttpConcurrencySummary | undefined, httpResults: HttpCheckResult[], label?: string): string[];
