import { BrowserEvidenceArtifact } from "../types";
export declare function writePlaywrightAccessibilitySnapshotArtifact(page: any, artifactDir: string, projectName: string, checkName: string, index: number, redactText?: (value: string) => string): Promise<BrowserEvidenceArtifact[]>;
