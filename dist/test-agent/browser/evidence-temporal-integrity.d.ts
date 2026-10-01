import { BrowserCheckExecutionPlan, BrowserCheckResult, BrowserEvidenceTemporalIntegritySummary, BrowserToolCallRecord, TestAgentReport } from "../types";
export declare const BROWSER_TEMPORAL_TOLERANCE_MS = 100;
interface TemporalInput {
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    plan?: BrowserCheckExecutionPlan;
    browserResults: BrowserCheckResult[];
    browserToolCalls: BrowserToolCallRecord[];
}
export declare function buildBrowserEvidenceTemporalIntegrity(input: TemporalInput, toleranceMs?: number): BrowserEvidenceTemporalIntegritySummary;
export declare function browserEvidenceTemporalIntegrityErrors(report: Pick<TestAgentReport, "startedAt" | "finishedAt" | "durationMs" | "browserResults" | "browserToolCalls" | "browserEvidenceTemporalIntegrity" | "metadata" | "status">): string[];
export declare function formatBrowserEvidenceTemporalIntegrityLine(summary?: BrowserEvidenceTemporalIntegritySummary): string;
export declare function formatBrowserEvidenceTemporalIntegrityAttentionLines(summary?: BrowserEvidenceTemporalIntegritySummary, limit?: number): string[];
export {};
