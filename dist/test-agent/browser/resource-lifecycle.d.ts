import { BrowserCheckExecutionPlan, BrowserResourceLifecycleEvent, BrowserResourceLifecycleRecorder, BrowserResourceLifecycleSummary, TestAgentReport } from "../types";
export declare function createBrowserResourceLifecycleRecorder(): BrowserResourceLifecycleRecorder;
export declare function buildBrowserResourceLifecycleSummary(input: {
    events: BrowserResourceLifecycleEvent[];
    plan?: BrowserCheckExecutionPlan;
    reportStartedAt: string;
    reportFinishedAt: string;
}): BrowserResourceLifecycleSummary;
export declare function browserResourceLifecycleErrors(report: Pick<TestAgentReport, "startedAt" | "finishedAt" | "status" | "browserResourceLifecycleEvents" | "browserResourceLifecycleSummary" | "metadata">): string[];
export declare function formatBrowserResourceLifecycleLine(summary?: BrowserResourceLifecycleSummary): string;
export declare function formatBrowserResourceLifecycleAttentionLines(summary?: BrowserResourceLifecycleSummary, limit?: number): string[];
