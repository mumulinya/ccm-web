import { BrowserEvidenceArtifact, BrowserStepResult } from "../types";
import { McpBrowserAdapter } from "./mcp-adapters";
export declare function captureMcpFailureScreenshot(input: {
    adapter: McpBrowserAdapter;
    artifactDir: string;
    projectName: string;
    checkName: string;
    index: number;
    failedStep?: BrowserStepResult;
    collectBrowserArtifacts?: boolean;
}): Promise<{
    screenshots: string[];
    browserArtifacts: BrowserEvidenceArtifact[];
}>;
