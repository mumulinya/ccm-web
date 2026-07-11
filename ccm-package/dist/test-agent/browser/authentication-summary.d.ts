import { BrowserAuthenticationEvidence, BrowserCheckResult } from "../types";
export interface BrowserAuthenticationSummary {
    configuredChecks: number;
    managedChecks: number;
    existingSessionChecks: number;
    passedChecks: number;
    failedChecks: number;
    blockedChecks: number;
    authenticatedSessions: number;
    credentialEnvNames: string[];
    storageStateCount: number;
    sensitiveArtifactSuppressionCount: number;
    existingSessionProviders: string[];
    minimalEvidenceChecks: number;
    fullEvidenceChecks: number;
    tabContextCheckedChecks: number;
    newTabChecks: number;
}
export declare function buildBrowserAuthenticationSummary(results: BrowserCheckResult[]): BrowserAuthenticationSummary;
export declare function formatBrowserAuthenticationEvidence(evidence?: BrowserAuthenticationEvidence): string;
export declare function formatBrowserAuthenticationSummaryLine(summary: BrowserAuthenticationSummary): string;
