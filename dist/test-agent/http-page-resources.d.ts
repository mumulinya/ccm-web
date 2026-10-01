import { HttpCheckResult, HttpPageResourceKind, HttpResourceCheckResult } from "./types";
export interface HttpPageResourceCandidate {
    url: string;
    kind: HttpPageResourceKind;
    source: string;
    discoveredFrom: string;
}
export declare function extractCssPageResources(pageUrl: string, stylesheetUrl: string, css: string, limit?: number): HttpPageResourceCandidate[];
export declare function extractHtmlPageResources(pageUrl: string, html: string, limit?: number): HttpPageResourceCandidate[];
export declare function expectedHttpResourceContentTypes(kind: HttpPageResourceKind): string[];
export declare function httpResourceContentTypeMatches(kind: HttpPageResourceKind, contentType: string): boolean;
export declare function redactHttpPageResourceUrl(value: string): string;
export declare function httpPageResourceFailureDetail(resources: HttpResourceCheckResult[]): string;
export declare function buildHttpPageResourceSummary(results: HttpCheckResult[]): {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    contentTypeMismatches: number;
    kinds: Record<string, number>;
};
export declare function formatHttpPageResourceSummary(results: HttpCheckResult[]): string;
export declare function httpPageResourceEvidenceErrors(result: HttpCheckResult, label?: string): string[];
