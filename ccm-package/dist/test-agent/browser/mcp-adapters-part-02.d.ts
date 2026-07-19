import { BrowserActionSpec, BrowserAssertionSpec, BrowserRecoveryEvidence, BrowserStepResult, NormalizedTestAgentProjectTarget } from "../types";
import { Caller, McpBrowserAdapter, McpBrowserAdapterId, McpBrowserSignals } from "./mcp-adapters-part-01";
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
