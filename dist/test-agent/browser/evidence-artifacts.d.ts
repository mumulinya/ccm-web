import { BrowserEvidenceArtifact } from "../types";
interface BrowserEvidenceArtifactInput {
    artifactDir: string;
    projectName: string;
    checkName: string;
    index: number;
    captures: any[];
    source: string;
}
export declare function writeBrowserEvidenceArtifacts(input: BrowserEvidenceArtifactInput): BrowserEvidenceArtifact[];
export {};
