import { AcceptanceCoverageItem, RequiredCheckCoverageItem, TestAgentArtifactManifestItem, TestAgentReport } from "./types";
export interface TestAgentArtifactVerificationItem {
    type: TestAgentArtifactManifestItem["type"] | string;
    title: string;
    path: string;
    status: "passed" | "failed" | "skipped";
    expectedSizeBytes?: number;
    actualSizeBytes?: number;
    expectedSha256?: string;
    actualSha256?: string;
    imageFormat?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageUniqueColors?: number;
    imageBlank?: boolean;
    artifactFormat?: string;
    artifactEntries?: number;
    artifactEvents?: number;
    error?: string;
}
export interface TestAgentArtifactVerification {
    schema: "ccm-test-agent-artifact-verification-v1";
    manifestPath: string;
    reportId: string;
    workOrderId: string;
    checkedAt: string;
    status: "passed" | "failed";
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
    };
    items: TestAgentArtifactVerificationItem[];
}
export declare function sha256(filePath: string): string;
export declare function readJson(filePath: string): any;
export declare function resolveArtifactPath(manifestPath: string, filePath: string): string;
export declare function verifyManifestItem(manifestPath: string, item: TestAgentArtifactManifestItem): TestAgentArtifactVerificationItem;
export declare function verifyScreenshotMetadata(manifestPath: string, manifestFiles: TestAgentArtifactManifestItem[], integrityItems: TestAgentArtifactVerificationItem[]): TestAgentArtifactVerificationItem[];
export declare function verifyBrowserEvidenceArtifactMetadata(manifestPath: string, manifestFiles: TestAgentArtifactManifestItem[], integrityItems: TestAgentArtifactVerificationItem[]): TestAgentArtifactVerificationItem[];
export declare function semanticItem(reportItem: TestAgentArtifactManifestItem | undefined, verdictItem: TestAgentArtifactManifestItem | undefined, status: TestAgentArtifactVerificationItem["status"], error?: string): TestAgentArtifactVerificationItem;
export declare function readJsonForSemantic(manifestPath: string, item: TestAgentArtifactManifestItem): any;
export declare function hasVerdictArtifactReference(report: any): boolean;
export declare function sameJson(left: any, right: any): boolean;
export declare function statusCoverageKeys<T extends RequiredCheckCoverageItem | AcceptanceCoverageItem>(items: T[] | undefined, status: T["status"], key: keyof T): string[];
export declare function compareStringList(label: string, expected: string[], actual: string[], errors: string[]): void;
export declare function expectEqual(label: string, actual: any, expected: any, errors: string[]): void;
export declare function coverageStatusCounts(items: Array<{
    status: string;
}> | undefined): {
    verified: number;
    not_verified: number;
    unknown: number;
};
export declare function acceptanceMatchStrengthCounts(items: Array<{
    matchStrength?: string;
}> | undefined): {
    direct: number;
    token: number;
    fallback: number;
    none: number;
};
export declare function acceptanceEvidenceSourceCounts(items: Array<{
    evidenceSource?: string;
}> | undefined): {
    matched_evidence: number;
    single_criterion_report_status: number;
    none: number;
};
export declare function browserNetworkErrorCount(report: TestAgentReport): number;
export declare function browserInteractionCount(report: TestAgentReport, key: "actionCount" | "failedActions" | "assertionCount" | "failedAssertions"): number;
export declare function verifyBrowserAuthenticationEvidenceConsistency(report: TestAgentReport, errors: string[]): void;
export declare function verifyBrowserRecoveryEvidenceConsistency(report: TestAgentReport, errors: string[]): void;
export declare function verifyBrowserActionEffectEvidenceConsistency(report: TestAgentReport, errors: string[]): void;
export declare function verifyAdversarialEvidenceConsistency(report: TestAgentReport, errors: string[]): void;
export declare function verifyAcceptanceEvidenceConsistency(report: TestAgentReport, errors: string[]): void;
export declare function verifyHttpConcurrencyConsistency(report: TestAgentReport, errors: string[]): void;
