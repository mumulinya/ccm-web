import { BrowserEvidenceArtifact, BrowserStepResult } from "../types";
import { safeSegment } from "../utils";
import { McpBrowserAdapter } from "./mcp-adapters";
import { writeBrowserEvidenceArtifacts } from "./evidence-artifacts";
import { writeMcpScreenshotArtifacts } from "./screenshot-artifacts";

export async function captureMcpFailureScreenshot(input: {
  adapter: McpBrowserAdapter;
  artifactDir: string;
  projectName: string;
  checkName: string;
  index: number;
  failedStep?: BrowserStepResult;
  collectBrowserArtifacts?: boolean;
}): Promise<{ screenshots: string[]; browserArtifacts: BrowserEvidenceArtifact[] }> {
  const stepName = safeSegment(input.failedStep?.name || "browser-failure") || "browser-failure";
  const failureCheckName = `${input.checkName}-failure-${stepName}`;
  try {
    const captures = await input.adapter.captureScreenshot(failureCheckName);
    const screenshots = writeMcpScreenshotArtifacts({
      artifactDir: input.artifactDir,
      projectName: input.projectName,
      checkName: failureCheckName,
      index: input.index,
      captures,
    });
    const browserArtifacts = input.collectBrowserArtifacts
      ? writeBrowserEvidenceArtifacts({
          artifactDir: input.artifactDir,
          projectName: input.projectName,
          checkName: failureCheckName,
          index: input.index,
          captures,
          source: `${input.adapter.id}:failureScreenshot`,
        })
      : [];
    return { screenshots, browserArtifacts };
  } catch {
    return { screenshots: [], browserArtifacts: [] };
  }
}
