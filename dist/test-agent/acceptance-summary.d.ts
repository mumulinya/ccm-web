import { AcceptanceCoverageItem, TestAgentAcceptanceSummary } from "./types";
export interface AcceptanceSummaryOptions {
    evidenceLimit?: number;
    textLimit?: number;
}
export declare function buildAcceptanceSummary(coverage: AcceptanceCoverageItem[], options?: AcceptanceSummaryOptions): TestAgentAcceptanceSummary;
export declare function formatAcceptanceStatusCounts(summary: TestAgentAcceptanceSummary): string;
export declare function formatAcceptanceMatchStrengthCounts(summary: TestAgentAcceptanceSummary): string;
export declare function formatAcceptanceEvidenceSourceCounts(summary: TestAgentAcceptanceSummary): string;
export declare function formatAcceptanceAttentionLines(summary: TestAgentAcceptanceSummary, limit?: number): string[];
export declare function formatAcceptanceVerifiedEvidenceLines(summary: TestAgentAcceptanceSummary, limit?: number): string[];
export declare function formatAcceptanceMarkdownSummaryLines(summary: TestAgentAcceptanceSummary): string[];
