import { AdversarialEvidenceSummary, BrowserCheckResult, HttpCheckResult } from "./types";
export declare function buildAdversarialEvidenceSummary(input: {
    required: boolean;
    waiverReason?: string;
    originalUserGoal?: string;
    acceptanceCriteria?: string[];
    httpResults: HttpCheckResult[];
    browserResults: BrowserCheckResult[];
}): AdversarialEvidenceSummary;
export declare function formatAdversarialEvidenceSummaryLine(summary: AdversarialEvidenceSummary | undefined): string;
export declare function adversarialEvidenceSummaryErrors(summary: AdversarialEvidenceSummary | Record<string, any> | undefined, httpResults?: HttpCheckResult[], browserResults?: BrowserCheckResult[], originalUserGoal?: string, acceptanceCriteria?: string[], label?: string): string[];
