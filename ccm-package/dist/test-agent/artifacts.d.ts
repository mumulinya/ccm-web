import { TestAgentArtifactManifest, TestAgentReport } from "./types";
export declare function buildTestAgentArtifactManifest(report: TestAgentReport, manifestPath: string): TestAgentArtifactManifest;
export declare function buildTestAgentMarkdownReport(report: TestAgentReport): string;
export declare function writeTestAgentArtifacts(report: TestAgentReport): TestAgentReport;
