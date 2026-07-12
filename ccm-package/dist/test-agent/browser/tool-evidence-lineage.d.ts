import { BrowserCheckExecutionIdentity, BrowserCheckResult, BrowserToolCallRecord, BrowserToolEvidenceLineageSummary } from "../types";
export declare function browserExecutionLineageKey(execution: BrowserCheckExecutionIdentity): string;
export declare function buildBrowserToolEvidenceLineage(browserResults: BrowserCheckResult[], browserToolCalls: BrowserToolCallRecord[]): BrowserToolEvidenceLineageSummary;
export declare function browserToolEvidenceLineageErrors(input: {
    browserResults: BrowserCheckResult[];
    browserToolCalls: BrowserToolCallRecord[];
    summary?: BrowserToolEvidenceLineageSummary;
    reportStatus?: string;
}): string[];
export declare function formatBrowserToolEvidenceLineageLine(summary?: BrowserToolEvidenceLineageSummary): string;
export declare function formatBrowserToolEvidenceLineageAttentionLines(summary?: BrowserToolEvidenceLineageSummary, limit?: number): string[];
