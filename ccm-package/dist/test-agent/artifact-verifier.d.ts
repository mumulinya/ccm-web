import { TestAgentArtifactManifest, TestAgentArtifactManifestItem } from "./types";
export interface TestAgentArtifactVerificationItem {
    type: TestAgentArtifactManifestItem["type"] | string;
    title: string;
    path: string;
    status: "passed" | "failed" | "skipped";
    expectedSizeBytes?: number;
    actualSizeBytes?: number;
    expectedSha256?: string;
    actualSha256?: string;
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
export declare function verifyTestAgentArtifactManifest(manifest: TestAgentArtifactManifest, manifestPath?: string): TestAgentArtifactVerification;
export declare function verifyTestAgentArtifactManifestFile(manifestPath: string): TestAgentArtifactVerification;
