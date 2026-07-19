import * as path from "path";
import { BrowserStepResult } from "../types";
import { ensureDir, safeSegment } from "../utils";

export type BrowserScreenshotRef = {
  stepName: string;
  path: string;
  kind: "failure" | "capture";
};

export async function writePlaywrightFailureScreenshot(input: {
  page: any;
  artifactDir: string;
  projectName: string;
  checkName: string;
  index: number;
  failedStep?: BrowserStepResult;
}): Promise<BrowserScreenshotRef[]> {
  if (!input.page) return [];
  const screenshotDir = ensureDir(path.join(input.artifactDir, "screenshots"));
  const stepName = safeSegment(input.failedStep?.name || "browser-failure") || "browser-failure";
  const screenshotPath = path.join(
    screenshotDir,
    `${safeSegment(input.projectName)}-${safeSegment(input.checkName)}-${input.index + 1}-${stepName}.failure.png`,
  );
  try {
    await input.page.screenshot({ path: screenshotPath, fullPage: true });
    return [{ stepName, path: screenshotPath, kind: "failure" }];
  } catch {
    return [];
  }
}
