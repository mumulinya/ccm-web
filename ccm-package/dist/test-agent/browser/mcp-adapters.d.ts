import { BrowserActionSpec, BrowserAssertionSpec, BrowserStepResult, NormalizedTestAgentProjectTarget } from "../types";
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
}
export interface McpBrowserSignals {
    pageText: string;
    consoleMessages?: string[];
    consoleErrors: string[];
    networkRequests?: string[];
    networkErrors: string[];
}
type Caller = (toolName: string, input: Record<string, any>) => Promise<any>;
export declare function createMcpBrowserAdapter(tools: string[], call: Caller): McpBrowserAdapter | null;
export {};
