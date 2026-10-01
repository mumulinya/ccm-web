import { BrowserActionSpec, BrowserAssertionSpec, BrowserExistingSessionProvider, BrowserRecoveryEvidence, BrowserStepResult, NormalizedTestAgentProjectTarget } from "../types";
export type McpBrowserAdapterId = "playwright-mcp" | "claude-in-chrome" | "chrome-devtools" | "computer-use";
export interface McpBrowserAdapter {
    id: McpBrowserAdapterId;
    label: string;
    tools: string[];
    currentUrl: string;
    runAction: (project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) => Promise<BrowserStepResult>;
    runAssertion: (assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) => Promise<BrowserStepResult>;
    readConsoleMessages?: () => Promise<string[]>;
    readConsoleErrors: () => Promise<string[]>;
    readNetworkRequests: () => Promise<string[]>;
    readNetworkErrors: () => Promise<string[]>;
    captureScreenshot: (name: string) => Promise<string[]>;
    prepareExistingSession?: (url?: string) => Promise<void>;
    existingSessionContextEvidence?: () => {
        provider: Exclude<BrowserExistingSessionProvider, "auto">;
        tabContextChecked: boolean;
        tabCount?: number;
        createdNewTab: boolean;
    };
    browserRecoveryEvidence?: () => BrowserRecoveryEvidence | undefined;
    pageText?: () => Promise<string>;
}
export interface McpBrowserSignals {
    pageText: string;
    consoleMessages?: string[];
    consoleErrors: string[];
    networkRequests?: string[];
    networkErrors: string[];
}
export type Caller = (toolName: string, input: Record<string, any>) => Promise<any>;
type ComputerCoordinate = [number, number];
export declare function has(tools: string[], pattern: RegExp): boolean;
export declare function pick(tools: string[], patterns: RegExp[]): string;
export declare function extractToolText(output: any): any;
export declare function extractUrlFromObservation(text: string): string;
export declare function evaluateActionResult(adapterName: string, action: BrowserActionSpec, toolOutput: any): BrowserStepResult;
export declare function extractTabId(output: any): number | string | undefined;
export declare function extractTabCount(output: any): number | undefined;
export declare function emptyLike(text: string): boolean;
export declare function targetInput(action: BrowserActionSpec): {
    selector: string;
    locator: string;
    testId: string;
    label: string;
    placeholder: string;
    role: string;
    name: string;
    altText: string;
    title: string;
    element: string;
    ref: string;
    text: string;
    value: string;
};
export declare function typedText(action: BrowserActionSpec): string;
export declare function typedTextDetail(action: BrowserActionSpec): string;
export declare function pressKeyText(action: BrowserActionSpec, fallback?: string): string;
export declare function isCookieAction(action: BrowserActionSpec): boolean;
export declare function cookieActionDetail(action: BrowserActionSpec): string;
export declare function cookieActionScript(action: BrowserActionSpec): string;
export declare function isStorageAction(action: BrowserActionSpec): boolean;
export declare function isNetworkStateAction(action: BrowserActionSpec): boolean;
export declare function storageActionDetail(action: BrowserActionSpec): string;
export declare function storageActionScript(action: BrowserActionSpec): string;
export declare function step(kind: "action" | "assertion", name: string, status: BrowserStepResult["status"], detail?: string, error?: string): BrowserStepResult;
export declare function coordinateInput(action: BrowserActionSpec): {
    coordinate: ComputerCoordinate;
} | {
    coordinate?: undefined;
};
export declare function computerActionDetail(action: BrowserActionSpec): string;
export declare function browserAddressShortcut(): "command+l" | "ctrl+l";
export declare function assertWithCurrentUrl(adapterName: string, currentUrl: string, assertion: BrowserAssertionSpec): BrowserStepResult;
export declare function assertWithLiveUrl(adapterName: string, assertion: BrowserAssertionSpec, readLiveUrl?: () => Promise<string | null | undefined>): Promise<BrowserStepResult>;
export declare function waitForMcpUrl(adapterName: string, currentUrl: string, action: BrowserActionSpec, defaultTimeout: number, readLiveUrl?: () => Promise<string | null | undefined>): Promise<BrowserStepResult>;
export declare function normalizeComputerUseApps(apps: BrowserActionSpec["apps"]): {
    displayName: string;
    bundle_id: string;
}[];
export declare function assertWithText(adapterName: string, assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout?: number): Promise<BrowserStepResult>;
export declare class PlaywrightMcpAdapter implements McpBrowserAdapter {
    tools: string[];
    private call;
    id: McpBrowserAdapterId;
    label: string;
    currentUrl: string;
    constructor(tools: string[], call: Caller);
    private readLiveUrl;
    runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult>;
    runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number): Promise<BrowserStepResult>;
    readConsoleMessages(): Promise<string[]>;
    readConsoleErrors(): Promise<string[]>;
    readNetworkErrors(): Promise<string[]>;
    readNetworkRequests(): Promise<string[]>;
    captureScreenshot(name: string): Promise<any[]>;
    pageText(): Promise<any>;
}
export declare class ClaudeChromeAdapter implements McpBrowserAdapter {
    tools: string[];
    private call;
    id: McpBrowserAdapterId;
    label: string;
    currentUrl: string;
    private tabId;
    private tabReady;
    private tabContextChecked;
    private tabCount;
    private createdNewTab;
    private recoveryTracker;
    constructor(tools: string[], call: Caller);
    private readLiveUrl;
    private readTabContext;
    prepareExistingSession(url?: string): Promise<void>;
    existingSessionContextEvidence(): {
        createdNewTab: boolean;
        tabCount?: number;
        provider: "claude-in-chrome";
        tabContextChecked: boolean;
    };
    browserRecoveryEvidence(): BrowserRecoveryEvidence;
    private ensureTab;
    private withTab;
    private recoverTab;
    private callTabTool;
    runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult>;
    runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number): Promise<BrowserStepResult>;
    readConsoleMessages(): Promise<string[]>;
    readConsoleErrors(): Promise<string[]>;
    readNetworkErrors(): Promise<string[]>;
    readNetworkRequests(): Promise<string[]>;
    captureScreenshot(name: string): Promise<any[]>;
    pageText(): Promise<any>;
}
export declare class ChromeDevtoolsAdapter implements McpBrowserAdapter {
    tools: string[];
    private call;
    id: McpBrowserAdapterId;
    label: string;
    currentUrl: string;
    private tabContextChecked;
    private tabCount;
    private createdNewTab;
    private recoveryTracker;
    constructor(tools: string[], call: Caller);
    private readLiveUrl;
    private readPageContext;
    private createPage;
    prepareExistingSession(url?: string): Promise<void>;
    existingSessionContextEvidence(): {
        createdNewTab: boolean;
        tabCount?: number;
        provider: "chrome-devtools";
        tabContextChecked: boolean;
    };
    browserRecoveryEvidence(): BrowserRecoveryEvidence;
    private recoverPage;
    private callPageTool;
    runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number): Promise<BrowserStepResult>;
    runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number): Promise<BrowserStepResult>;
    readConsoleMessages(): Promise<string[]>;
    readConsoleErrors(): Promise<string[]>;
    readNetworkErrors(): Promise<string[]>;
    readNetworkRequests(): Promise<string[]>;
    captureScreenshot(name: string): Promise<any[]>;
    pageText(): Promise<any>;
}
export declare function createMcpBrowserAdapter(tools: string[], call: Caller, options?: {
    existingSession?: boolean;
    preferredAdapter?: BrowserExistingSessionProvider;
}): McpBrowserAdapter | null;
export {};
