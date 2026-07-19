import { BrowserActionSpec, BrowserAssertionSpec, BrowserCheckResult, BrowserEvidenceArtifact, BrowserCheckSpec, BrowserResourceLifecycleRecorder, NormalizedTestAgentProjectTarget } from "../types";
import { BrowserSecretBinding, ResolvedBrowserActionValue } from "./authentication";
import { BrowserContextRuntimeOptions, BrowserRuntimeSignals, CapturedBrowserDialog, CapturedBrowserDownload, PngPixelStats } from "./playwright-provider-part-01";
export declare function evaluateElementScreenshotNotBlank(page: any, assertion: BrowserAssertionSpec, timeout: number): Promise<{
    ok: boolean;
    stats: PngPixelStats;
    minUniqueColors: number;
    minNonWhitePixels: number;
}>;
export declare function waitForTextOrder(page: any, assertion: BrowserAssertionSpec, timeout: number): Promise<{
    ok: boolean;
    expectedCount: number;
    positions: number[];
    foundCount?: undefined;
    missingIndex?: undefined;
} | {
    ok: boolean;
    expectedCount: number;
    foundCount: number;
    missingIndex: number;
    positions?: undefined;
}>;
export declare function waitForTableAssertion(page: any, assertion: BrowserAssertionSpec, timeout: number): Promise<any>;
export declare function writePlaywrightPageSnapshots(page: any, artifactDir: string, projectName: string, checkName: string, index: number, secretBindings?: BrowserSecretBinding[]): Promise<string[]>;
export declare function writeBrowserTelemetryLogs(input: {
    artifactDir: string;
    projectName: string;
    checkName: string;
    index: number;
    consoleMessages: string[];
    dialogMessages: string[];
    popupMessages?: string[];
    networkRequests: string[];
}): {
    consoleLogPath: string;
    dialogLogPath: string;
    popupLogPath: string;
    networkLogPath: string;
};
export declare function browserArtifactBase(projectName: string, checkName: string, index: number): string;
export declare function browserCheckViewport(check: BrowserCheckSpec): {
    width: number;
    height: number;
    isMobile: boolean;
    deviceScaleFactor: number;
};
export declare function browserCheckContextOptions(check: BrowserCheckSpec): BrowserContextRuntimeOptions;
export declare function browserContextEvidenceOptions(options: BrowserContextRuntimeOptions): BrowserCheckResult["contextOptions"];
export declare function browserContextLaunchOptions(options: BrowserContextRuntimeOptions): {
    storageState?: string;
    geolocation?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    reducedMotion?: string;
    colorScheme?: string;
    timezoneId?: string;
    locale?: string;
    userAgent?: string;
};
export declare function browserDialogLogLine(record: CapturedBrowserDialog): string;
export declare function savePlaywrightDownload(download: any, downloadDir: string, artifactBase: string, index: number): Promise<CapturedBrowserDownload>;
export declare function downloadedFileDetail(assertion: BrowserAssertionSpec): string;
export declare function waitForDownloadedFile(signals: BrowserRuntimeSignals, assertion: BrowserAssertionSpec, timeout: number): Promise<CapturedBrowserDownload>;
export declare function downloadArtifacts(downloads: CapturedBrowserDownload[]): BrowserEvidenceArtifact[];
export declare function uploadFileActionDetail(action: BrowserActionSpec): string;
export declare function uploadFilePayload(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec): string | {
    name: string;
    mimeType: string;
    buffer: Buffer<ArrayBuffer>;
} | (string | {
    name: string;
    mimeType: string;
    buffer: Buffer<ArrayBuffer>;
})[];
export declare function originOf(rawUrl: string): string;
export declare function responseResourceType(response: any): string;
export declare function playwrightNetworkErrorForResponse(input: {
    status: number;
    responseUrl: string;
    resourceType: string;
    monitoredOrigins: Set<string>;
    failOnHttpResourceError: boolean;
}): string;
export declare function grantClipboardPermissions(browserContext: any, origins: Set<string>): Promise<void>;
export declare function grantBrowserContextPermissions(browserContext: any, origins: Set<string>, permissions: string[]): Promise<void>;
export declare function requestDetailsLine(request: any, secretBindings?: BrowserSecretBinding[]): string;
export declare function installPlaywrightNetworkSafetyBoundary(browserContext: any, page: any, onBlocked?: (event: {
    url: string;
    error: string;
}) => void): Promise<boolean>;
export declare function responseDetailsLine(response: any, status: number, resourceType: string, responseUrl: string, secretBindings?: BrowserSecretBinding[]): Promise<string>;
export declare function finalizePlaywrightBrowserArtifacts(input: {
    browserContext: any;
    page: any;
    traceStarted: boolean;
    tracePath: string;
    harPath: string;
    collectVideo: boolean;
    lifecycle?: BrowserResourceLifecycleRecorder;
    lifecycleResourceId?: string;
}): Promise<BrowserEvidenceArtifact[]>;
export declare function dragDestinationTarget(action: BrowserActionSpec): Partial<BrowserActionSpec>;
export declare function dragActionDetail(action: BrowserActionSpec): string;
export declare function resolvedValueDetail(resolved?: ResolvedBrowserActionValue): string;
export declare function clipboardActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue): string;
export declare function cookieActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue): string;
export declare function buildPlaywrightCookie(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue): Record<string, any>;
export declare function clearBrowserCookies(page: any, action: BrowserActionSpec): Promise<void>;
export declare function storageActionValue(action: BrowserActionSpec): string;
