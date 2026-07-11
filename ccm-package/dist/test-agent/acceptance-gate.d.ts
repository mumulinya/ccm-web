import { AcceptanceCoverageItem, AcceptanceEvidenceGateSummary } from "./types";
export declare function buildAcceptanceEvidenceGateSummary(coverage?: AcceptanceCoverageItem[]): AcceptanceEvidenceGateSummary;
export declare function formatAcceptanceEvidenceGateSummaryLine(summary: AcceptanceEvidenceGateSummary | undefined): string;
export declare function acceptanceEvidenceGateSummaryErrors(summary: AcceptanceEvidenceGateSummary | Record<string, any> | undefined, coverage?: AcceptanceCoverageItem[], label?: string): string[];
