import { BrowserAuthenticationEvidence, BrowserActionSpec, BrowserAssertionSpec, BrowserCheckResult, BrowserEvidenceArtifact, BrowserCheckSpec, BrowserStepResult, BrowserResourceLifecycleRecorder, NormalizedTestAgentProjectTarget } from "../types";
import { BrowserProvider, BrowserProviderContext } from "./provider-types";
import { BrowserSecretBinding, ResolvedBrowserActionValue } from "./authentication";
import { BrowserActionEffectObservation } from "./action-effects";
export declare function delay(ms: number): Promise<unknown>;
type PlaywrightLoader = () => any;
export interface CapturedBrowserDownload {
    suggestedFilename: string;
    path: string;
    url: string;
    failure?: string;
    sizeBytes?: number;
    mediaType?: string;
}
export interface CapturedBrowserDialog {
    type: string;
    message: string;
    defaultValue?: string;
    accepted: boolean;
    occurredAt: string;
    error?: string;
}
export interface CapturedBrowserPopup {
    url: string;
    title: string;
    textPreview: string;
    openedAt: string;
    error?: string;
}
export interface BrowserRuntimeSignals {
    consoleMessages: string[];
    consoleErrors: string[];
    networkErrors: string[];
    networkRequests: string[];
    downloads: CapturedBrowserDownload[];
    downloadPromises: Promise<CapturedBrowserDownload>[];
    dialogs: CapturedBrowserDialog[];
    popups: CapturedBrowserPopup[];
    viewport?: {
        width: number;
        height: number;
        isMobile?: boolean;
        deviceScaleFactor?: number;
    };
}
export interface PlaywrightMultiSessionRuntime extends BrowserRuntimeSignals {
    name: string;
    initialUrl: string;
    browserContext: any;
    page: any;
    traceStarted: boolean;
    tracePath: string;
    harPath: string;
    artifactBase: string;
    screenshots: string[];
    screenshotRefs?: Array<{
        stepName: string;
        path: string;
        kind: "failure" | "capture";
    }>;
    pageSnapshots: string[];
    browserArtifacts: BrowserEvidenceArtifact[];
    consoleLogPath?: string;
    networkLogPath?: string;
    consoleMessages: string[];
    dialogMessages: string[];
    popupMessages: string[];
    pageErrors: string[];
    popupCapturePromises: Promise<CapturedBrowserPopup>[];
    monitoredOrigins: Set<string>;
    authentication?: BrowserAuthenticationEvidence;
    secretBindings: BrowserSecretBinding[];
    collectBrowserVideo: boolean;
    lifecycleResourceId?: string;
}
export interface BrowserContextRuntimeOptions {
    userAgent?: string;
    locale?: string;
    timezoneId?: string;
    colorScheme?: string;
    reducedMotion?: string;
    permissions?: string[];
    geolocation?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    storageStatePath?: string;
    storageState?: NonNullable<BrowserCheckResult["contextOptions"]>["storageState"];
}
export declare function redactBrowserStepResult(step: BrowserStepResult, secretBindings: BrowserSecretBinding[]): BrowserStepResult;
export declare function capturePlaywrightActionEffectObservation(page: any, signals: Pick<BrowserRuntimeSignals, "networkRequests" | "dialogs" | "popups" | "downloads">): Promise<BrowserActionEffectObservation>;
export declare function launchChromiumWithFallback(playwright: any, baseOptions?: Record<string, any>): Promise<{
    browser: any;
    channel: any;
    launchAttempt: string;
    errors: string[];
}>;
export declare function checkPlaywrightAvailability(loadPlaywright?: PlaywrightLoader): Promise<{
    available: boolean;
    reason: string;
    diagnostics: {
        packageAvailable: boolean;
        launchChecked: boolean;
        browser?: undefined;
        channel?: undefined;
        launchAttempt?: undefined;
        launchFallbackErrors?: undefined;
        launchAttempts?: undefined;
    };
} | {
    available: boolean;
    diagnostics: {
        packageAvailable: boolean;
        launchChecked: boolean;
        browser: string;
        channel: any;
        launchAttempt: string;
        launchFallbackErrors: string[];
        launchAttempts?: undefined;
    };
    reason?: undefined;
} | {
    available: boolean;
    reason: string;
    diagnostics: {
        packageAvailable: boolean;
        launchChecked: boolean;
        browser: string;
        launchAttempts: string[];
        channel?: undefined;
        launchAttempt?: undefined;
        launchFallbackErrors?: undefined;
    };
}>;
export declare function expectedValue(assertion: BrowserAssertionSpec): string;
export declare function valuesEqual(actual: any, expected: any): boolean;
export declare function cookieName(assertion: BrowserAssertionSpec): string;
export declare function cookieAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function inputValueAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function attributeName(assertion: BrowserAssertionSpec): string;
export declare function attributeAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function computedStyleAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function clipboardExpectedText(assertion: BrowserAssertionSpec | BrowserActionSpec): string;
export declare function clipboardAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function optionalTableIndex(...values: any[]): number;
export declare function tableExpectedTexts(assertion: BrowserAssertionSpec): string[];
export declare function textOrderExpectedTexts(assertion: BrowserAssertionSpec): string[];
export declare function tableRowText(assertion: BrowserAssertionSpec): string;
export declare function tableColumnName(assertion: BrowserAssertionSpec): string;
export declare function tableAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function optionalVisualNumber(value: any): number;
export declare function visualAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function textOrderAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function urlAssertionExpected(assertion: BrowserAssertionSpec): string;
export declare function comparableUrl(actualUrl: string, expected: string): string;
export declare function titleAssertionExpected(assertion: BrowserAssertionSpec): string;
export declare function expectedOnlineState(assertion: BrowserAssertionSpec): boolean;
export declare function waitForTitleMatch(page: any, predicate: (title: string) => boolean, timeout: number): Promise<any>;
export declare function waitForOnlineState(page: any, expected: boolean, timeout: number): Promise<any>;
export declare function stateAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function capturePageFinalState(page: any, secretBindings?: BrowserSecretBinding[]): Promise<{
    pageTextPreview?: string;
    title?: string;
    finalUrl?: string;
}>;
export declare function evaluatePageNotBlank(page: any): Promise<any>;
export declare function evaluateNoHorizontalOverflow(page: any, expectedViewportWidth?: number): Promise<any>;
export declare function evaluateElementInViewport(locator: any, expectedViewportWidth?: number, expectedViewportHeight?: number): Promise<any>;
export declare function readBrowserCookie(page: any, assertion: BrowserAssertionSpec): Promise<any>;
export declare function waitForComputedStyle(page: any, assertion: BrowserAssertionSpec, timeout: number): Promise<{
    passed: boolean;
    actualLength: number;
    expectedLength: number;
}>;
export declare function waitForFocusedState(locator: any, expectedFocused: boolean, timeout: number): Promise<{
    focused: boolean;
}>;
export declare function waitForElementCount(locator: any, assertion: BrowserAssertionSpec, timeout: number): Promise<{
    actual: number;
    expected: number;
}>;
export declare function waitForBrowserDialog(signals: BrowserRuntimeSignals, assertion: BrowserAssertionSpec, timeout: number): Promise<CapturedBrowserDialog>;
export declare function browserPopupLogLine(record: CapturedBrowserPopup): string;
export declare function captureBrowserPopup(popup: any, secretBindings?: BrowserSecretBinding[]): Promise<CapturedBrowserPopup>;
export declare function waitForBrowserPopup(signals: BrowserRuntimeSignals, assertion: BrowserAssertionSpec, timeout: number): Promise<CapturedBrowserPopup>;
export declare function writeClipboardText(page: any, value: string): Promise<void>;
export declare function waitForClipboardText(page: any, assertion: BrowserAssertionSpec, timeout: number): Promise<{
    passed: boolean;
    actualLength: number;
    expectedLength: number;
}>;
export interface PngPixelStats {
    width: number;
    height: number;
    uniqueColors: number;
    nonTransparentPixels: number;
    nonWhitePixels: number;
}
export declare function pngChannelCount(colorType: number): 1 | 2 | 0 | 3 | 4;
export declare function pngPaeth(left: number, up: number, upperLeft: number): number;
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
export declare function runAction(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult>;
export declare function runAssertion(page: any, assertion: BrowserAssertionSpec, signals: BrowserRuntimeSignals, defaultTimeout: number): Promise<BrowserStepResult>;
export declare function runBrowserCheck(browser: any, context: BrowserProviderContext, project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number): Promise<BrowserCheckResult>;
export declare const PlaywrightBrowserProvider: BrowserProvider;
export {};
