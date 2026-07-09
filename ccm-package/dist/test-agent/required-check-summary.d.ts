import { RequiredCheckCoverageItem, TestAgentRequiredCheckSummary } from "./types";
export interface RequiredCheckSummaryOptions {
    evidenceLimit?: number;
    textLimit?: number;
}
export declare function buildRequiredCheckSummary(coverage: RequiredCheckCoverageItem[], options?: RequiredCheckSummaryOptions): TestAgentRequiredCheckSummary;
export declare function formatRequiredCheckStatusCounts(summary: TestAgentRequiredCheckSummary): string;
export declare function formatRequiredCheckAttentionLines(summary: TestAgentRequiredCheckSummary, limit?: number): string[];
export declare function formatRequiredCheckVerifiedEvidenceLines(summary: TestAgentRequiredCheckSummary, limit?: number): string[];
export declare function formatRequiredCheckMarkdownSummaryLines(summary: TestAgentRequiredCheckSummary): string[];
